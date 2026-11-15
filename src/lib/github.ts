import type { Locale } from './locale';

interface GitHubRepo {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  pushed_at: string;
  fork: boolean;
  archived: boolean;
}

export interface Repo {
  name: string;
  url: string;
  description?: string;
  language?: string;
  stars: number;
  pushedAt: string;
}

export interface Activity {
  repos: Repo[];
  /** Only with a token: GitHub's contribution calendar needs GraphQL, which needs auth. */
  contributions?: { total: number; weeks: number[][] };
}

export function pickRepos(repos: GitHubRepo[], limit: number, user?: string): Repo[] {
  return repos
    .filter((r) => !r.fork && !r.archived && r.name.toLowerCase() !== user?.toLowerCase())
    .toSorted((a, b) => b.pushed_at.localeCompare(a.pushed_at))
    .slice(0, limit)
    .map((r) => ({
      name: r.name,
      url: r.html_url,
      ...(r.description && { description: r.description }),
      ...(r.language && { language: r.language }),
      stars: r.stargazers_count,
      pushedAt: r.pushed_at,
    }));
}

export function contributionLevel(count: number, max: number): number {
  return count <= 0 || max <= 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4));
}

export function timeAgo(date: Date, now: Date, locale: Locale): string {
  const rtf = new Intl.RelativeTimeFormat(locale === 'pt' ? 'pt-PT' : 'en', { numeric: 'auto' });
  const minutes = (date.getTime() - now.getTime()) / 60_000;
  const days = minutes / 1440;
  if (Math.abs(minutes) < 60) return rtf.format(Math.round(minutes), 'minute');
  if (Math.abs(minutes) < 1440) return rtf.format(Math.round(minutes / 60), 'hour');
  if (Math.abs(days) < 30) return rtf.format(Math.round(days), 'day');
  if (Math.abs(days) < 365) return rtf.format(Math.round(days / 30), 'month');
  return rtf.format(Math.round(days / 365), 'year');
}

const calendarQuery = `query($login: String!) {
  user(login: $login) {
    contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { contributionCount } } } }
  }
}`;

interface CalendarResponse {
  data?: { user?: { contributionsCollection: { contributionCalendar: { totalContributions: number; weeks: { contributionDays: { contributionCount: number }[] }[] } } } };
}

async function fetchCalendar(user: string, headers: Record<string, string>): Promise<Activity['contributions']> {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: calendarQuery, variables: { login: user } }),
  });
  if (!res.ok) return undefined;
  const calendar = ((await res.json()) as CalendarResponse).data?.user?.contributionsCollection.contributionCalendar;
  return calendar && { total: calendar.totalContributions, weeks: calendar.weeks.map((w) => w.contributionDays.map((d) => d.contributionCount)) };
}

/**
 * GitHub's answer is kept in KV and refreshed hourly; when a refresh fails (unauthenticated limits are per IP, and
 * Workers share theirs), the last good answer is served instead.
 */
export async function getActivity(user: string, kv: KVNamespace, token?: string): Promise<Activity | undefined> {
  const key = `github:${user}`;
  const cached = await kv.get<Activity & { fetchedAt: number }>(key, 'json');
  if (cached && Date.now() - cached.fetchedAt < 3_600_000) return cached;

  const headers: Record<string, string> = {
    'User-Agent': 'naapperas.pt',
    Accept: 'application/vnd.github+json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  try {
    const [repos, contributions] = await Promise.all([
      fetch(`https://api.github.com/users/${user}/repos?type=owner&sort=pushed&per_page=30`, { headers }),
      token ? fetchCalendar(user, headers) : undefined,
    ]);
    if (!repos.ok) return cached ?? undefined;
    const activity: Activity = { repos: pickRepos(await repos.json(), 4, user), ...(contributions && { contributions }) };
    await kv.put(key, JSON.stringify({ ...activity, fetchedAt: Date.now() }), { expirationTtl: 7 * 86_400 });
    return activity;
  } catch {
    return cached ?? undefined;
  }
}
