import { describe, expect, it } from 'vitest';
import { buildRss, readingMinutes, withFallback } from './blog';

describe('readingMinutes', () => {
  it('rounds up at about 220 words a minute', () => {
    expect(readingMinutes('word '.repeat(221))).toBe(2);
  });

  it('is at least one minute', () => {
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes('short')).toBe(1);
  });
});

describe('buildRss', () => {
  const channel = {
    title: 'Nuno Pereira · blog',
    description: 'Notes',
    link: 'https://naapperas.pt/blog',
    self: 'https://naapperas.pt/blog/rss.xml',
    language: 'en',
  };

  it('describes the channel', () => {
    const xml = buildRss(channel, []);
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<rss version="2.0"/);
    expect(xml).toContain('<title>Nuno Pereira · blog</title>');
    expect(xml).toContain('<atom:link href="https://naapperas.pt/blog/rss.xml" rel="self" type="application/rss+xml"/>');
    expect(xml).toContain('<language>en</language>');
    expect(xml).not.toContain('<lastBuildDate>');
  });

  it('lists items with their dates and categories', () => {
    const xml = buildRss(channel, [
      { title: 'Hello', link: 'https://naapperas.pt/blog/hello', date: new Date('2026-11-15T10:00:00Z'), description: 'First', categories: ['astro', 'workers'] },
    ]);
    expect(xml).toContain('<link>https://naapperas.pt/blog/hello</link>');
    expect(xml).toContain('<guid isPermaLink="true">https://naapperas.pt/blog/hello</guid>');
    expect(xml).toContain('<pubDate>Sun, 15 Nov 2026 10:00:00 GMT</pubDate>');
    expect(xml).toContain('<category>astro</category><category>workers</category>');
    expect(xml).toContain('<lastBuildDate>Sun, 15 Nov 2026 10:00:00 GMT</lastBuildDate>');
  });

  it('escapes markup in text', () => {
    const xml = buildRss(channel, [{ title: 'A <b> & "c"', link: 'https://naapperas.pt/blog/a?x=1&y=2', date: new Date(0) }]);
    expect(xml).toContain('<title>A &lt;b&gt; &amp; &quot;c&quot;</title>');
    expect(xml).toContain('<link>https://naapperas.pt/blog/a?x=1&amp;y=2</link>');
  });
});

describe('withFallback', () => {
  const post = (id: string, day: number, translationGroup?: string) => ({ id, translationGroup, publishedAt: new Date(2026, 10, day) });

  it('adds untranslated posts from the default language, newest first', () => {
    const pt = [post('pt-a', 10, 'a')];
    const en = [post('a', 10, 'a'), post('b', 14, 'b'), post('c', 2, 'c')];
    expect(withFallback(pt, en).map((p) => p.id)).toEqual(['b', 'pt-a', 'c']);
  });

  it('keeps the translation when both exist', () => {
    expect(withFallback([post('pt-a', 1, 'a')], [post('a', 1, 'a')]).map((p) => p.id)).toEqual(['pt-a']);
  });
});
