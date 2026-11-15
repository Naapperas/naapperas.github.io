import type { APIContext } from 'astro';
import { getEmDashCollection } from 'emdash';
import { useI18n } from '../i18n';
import type { Post } from '../../emdash-env';
import { defaultLocale } from './locale';
import { getSite } from './site';

export function readingMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

interface Channel {
  title: string;
  description: string;
  link: string;
  self: string;
  language: string;
}

interface Item {
  title: string;
  link: string;
  date: Date;
  description?: string;
  categories?: string[];
}

const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
const escapeXml = (text: string) => text.replace(/[&<>"']/g, (c) => entities[c]!);

export function buildRss(channel: Channel, items: Item[]): string {
  // Derived from the items rather than the clock, so an unchanged feed renders byte-for-byte the same.
  const lastBuild = items.reduce<Date | undefined>((latest, item) => (!latest || item.date > latest ? item.date : latest), undefined);
  const entries = items.map(
    (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="true">${escapeXml(item.link)}</guid>
      <pubDate>${item.date.toUTCString()}</pubDate>${item.description ? `\n      <description>${escapeXml(item.description)}</description>` : ''}${
        item.categories?.length ? `\n      ${item.categories.map((c) => `<category>${escapeXml(c)}</category>`).join('')}` : ''
      }
    </item>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <description>${escapeXml(channel.description)}</description>
    <link>${escapeXml(channel.link)}</link>
    <atom:link href="${escapeXml(channel.self)}" rel="self" type="application/rss+xml"/>
    <language>${channel.language}</language>${lastBuild ? `\n    <lastBuildDate>${lastBuild.toUTCString()}</lastBuildDate>` : ''}
${entries.join('\n')}
  </channel>
</rss>
`;
}

interface Translatable {
  id: string;
  translationGroup?: string;
  publishedAt: Date | null;
}

/** Posts in the reader's language, plus those only written in the default language, newest first. */
export function withFallback<T extends Translatable>(localized: T[], fallback: T[]): T[] {
  const translated = new Set(localized.map((p) => p.translationGroup ?? p.id));
  return [...localized, ...fallback.filter((p) => !translated.has(p.translationGroup ?? p.id))].toSorted(
    (a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
  );
}

// EmDash returns these at runtime, but the generated types leave them out.
export type LocalizedPost = Post & { translationGroup?: string; locale?: string };

export async function getPosts(context: Pick<APIContext, 'currentLocale' | 'cache'>, limit = 100): Promise<LocalizedPost[]> {
  const { locale } = useI18n(context.currentLocale);
  const query = (l: string) => getEmDashCollection('posts', { locale: l, orderBy: { published_at: 'desc' }, limit });
  const [localized, fallback] = await Promise.all([query(locale), locale === defaultLocale ? undefined : query(defaultLocale)]);
  if (context.cache?.enabled) for (const r of [localized, fallback]) if (r) context.cache.set(r.cacheHint);
  const data = (r?: typeof localized) => (r?.entries ?? []).map((e) => e.data as LocalizedPost).filter((p) => p.publishedAt);
  return withFallback(data(localized), data(fallback)).slice(0, limit);
}

export async function blogFeed(context: APIContext) {
  const { profile, options } = await getSite(context);
  if (!options?.blog_enabled) return new Response('Not found', { status: 404 });

  const { locale, t, path } = useI18n(context.currentLocale);
  const url = (p: string) => new URL(path(p), context.site ?? context.url).href;
  const posts = await getPosts(context, 50);
  const xml = buildRss(
    {
      title: `${profile?.data.title ?? 'Nuno Pereira'} · ${t('blog.title')}`,
      description: t('blog.intro'),
      link: url('/blog'),
      self: url('/blog/rss.xml'),
      language: locale === 'pt' ? 'pt-PT' : 'en',
    },
    posts.map((post) => ({
      title: post.title,
      link: url(`/blog/${post.slug}`),
      date: post.publishedAt!,
      description: post.excerpt,
      categories: post.terms?.tag?.map((tag) => tag.label),
    })),
  );
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
