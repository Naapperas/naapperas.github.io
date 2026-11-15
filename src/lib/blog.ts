import type { APIContext } from 'astro';
import { getEmDashCollection } from 'emdash';
import type { Post } from '../../emdash-env';
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

export async function getPosts(context: Pick<APIContext, 'cache'>, limit = 100): Promise<Post[]> {
  const { entries, cacheHint } = await getEmDashCollection('posts', { orderBy: { published_at: 'desc' }, limit });
  if (context.cache?.enabled) context.cache.set(cacheHint);
  return entries.map((e) => e.data).filter((p) => p.publishedAt);
}

export async function blogFeed(context: APIContext) {
  const { profile, options } = await getSite(context);
  if (!options?.blog_enabled) return new Response('Not found', { status: 404 });

  const url = (p: string) => new URL(p, context.site ?? context.url).href;
  const posts = await getPosts(context, 50);
  const xml = buildRss(
    {
      title: `${profile?.data.title ?? 'Nuno Pereira'} · blog`,
      description: 'Notes on things I build and learn.',
      link: url('/blog'),
      self: url('/blog/rss.xml'),
      language: 'en',
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
