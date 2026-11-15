import { describe, expect, it } from 'vitest';
import { contributionLevel, pickRepos, timeAgo } from './github';

const repo = (name: string, pushed_at: string, extra: Record<string, unknown> = {}) => ({
  name,
  html_url: `https://github.com/Naapperas/${name}`,
  description: null,
  language: null,
  stargazers_count: 0,
  pushed_at,
  fork: false,
  archived: false,
  ...extra,
});

describe('pickRepos', () => {
  it('keeps the most recently pushed repos', () => {
    const repos = [repo('old', '2024-01-01T00:00:00Z'), repo('new', '2026-11-01T00:00:00Z'), repo('mid', '2025-06-01T00:00:00Z')];
    expect(pickRepos(repos, 2).map((r) => r.name)).toEqual(['new', 'mid']);
  });

  it('skips forks, archived repos and the profile README repo', () => {
    const repos = [
      repo('fork', '2026-11-01T00:00:00Z', { fork: true }),
      repo('archived', '2026-11-01T00:00:00Z', { archived: true }),
      repo('Naapperas', '2026-11-01T00:00:00Z'),
      repo('kept', '2026-10-01T00:00:00Z', { description: 'A thing', language: 'Rust', stargazers_count: 3 }),
    ];
    expect(pickRepos(repos, 4, 'Naapperas')).toEqual([
      { name: 'kept', url: 'https://github.com/Naapperas/kept', description: 'A thing', language: 'Rust', stars: 3, pushedAt: '2026-10-01T00:00:00Z' },
    ]);
  });
});

describe('contributionLevel', () => {
  it('is 0 on days without contributions', () => {
    expect(contributionLevel(0, 10)).toBe(0);
  });

  it('scales the rest into four steps of the busiest day', () => {
    expect(contributionLevel(1, 20)).toBe(1);
    expect(contributionLevel(10, 20)).toBe(2);
    expect(contributionLevel(15, 20)).toBe(3);
    expect(contributionLevel(20, 20)).toBe(4);
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-11-15T12:00:00Z');

  it('picks a sensible unit', () => {
    expect(timeAgo(new Date('2026-11-15T11:20:00Z'), now, 'en')).toBe('40 minutes ago');
    expect(timeAgo(new Date('2026-11-15T07:00:00Z'), now, 'en')).toBe('5 hours ago');
    expect(timeAgo(new Date('2026-11-14T10:00:00Z'), now, 'en')).toBe('yesterday');
    expect(timeAgo(new Date('2026-09-10T12:00:00Z'), now, 'en')).toBe('2 months ago');
    expect(timeAgo(new Date('2024-11-01T12:00:00Z'), now, 'en')).toBe('2 years ago');
  });

  it('speaks Portuguese', () => {
    expect(timeAgo(new Date('2026-11-12T12:00:00Z'), now, 'pt')).toBe('há 3 dias');
  });
});
