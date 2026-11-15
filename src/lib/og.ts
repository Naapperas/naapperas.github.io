import type { APIContext } from 'astro';
import { extractPlainText, getEmDashEntry } from 'emdash';
import { readingMinutes } from './blog';
import { getSite } from './site';

/** `/projects/zon` → `/og/projects/zon.png`; the home page becomes `/og/index.png`. */
export function ogImagePath(pathname: string): string {
  return `/og/${pathname.replace(/\/+$/, '').slice(1) || 'index'}.png`;
}

export function pagePathFromSlug(slug: string): string {
  return `/${slug}`.replace(/(^|\/)index$/, '') || '/';
}

export interface Card {
  /** Shown in the window bar; empty for the home page. */
  path: string;
  title: string;
  description?: string;
  meta: string[];
  palette: string;
}

/** The social card for a page, or undefined when the page doesn't exist; nobody gets to brand arbitrary text. */
export async function getCard(context: Pick<APIContext, 'cache'>, route: string): Promise<Card | undefined> {
  const { profile, options } = await getSite({ cache: context.cache });
  const me = profile?.data;
  const role = me && [me.org ? `${me.role} @ ${me.org}` : me.role, me.location].filter(Boolean).join(' · ');
  const card = (fields: Omit<Card, 'path' | 'palette' | 'meta'> & { meta?: string[] }): Card => ({
    path: route === '/' ? '' : route,
    palette: options?.palette ?? 'ember-coral',
    meta: [],
    ...fields,
  });
  const [, section, slug, rest] = route.split('/');
  if (rest !== undefined) return undefined;

  if (route === '/') return card({ title: (me?.title ?? 'Nuno Pereira').toLowerCase(), description: role });
  if (route === '/cv') return card({ title: 'Curriculum Vitae', description: [me?.title, role].filter(Boolean).join(', ') });
  if (route === '/contact' && options?.contact_enabled !== false) return card({ title: "Let's talk.", description: 'Questions about something I built, a role, or anything else? Drop me a line. It lands straight in my inbox.' });
  if (route === '/projects') return card({ title: 'projects/', description: 'University work, side projects and open source. Click a card for the full write-up.' });
  if (route === '/blog' && options?.blog_enabled) return card({ title: 'blog/', description: 'Notes on things I build and learn.' });

  if (section === 'projects' && slug) {
    const { entry, cacheHint } = await getEmDashEntry('projects', slug);
    if (!entry) return undefined;
    if (context.cache?.enabled) context.cache.set(cacheHint);
    const p = entry.data;
    return card({
      title: p.title,
      description: p.summary,
      meta: [String(p.year), p.kind, ...(p.stack ?? []).slice(0, 3)],
    });
  }
  if (section === 'blog' && slug && options?.blog_enabled) {
    const { entry, cacheHint } = await getEmDashEntry('posts', slug);
    if (!entry?.data.publishedAt) return undefined;
    if (context.cache?.enabled) context.cache.set(cacheHint);
    const post = entry.data;
    return card({
      title: post.title,
      description: post.excerpt,
      meta: [post.publishedAt!.toISOString().slice(0, 10), `${readingMinutes(extractPlainText(post.content))} min read`],
    });
  }
  return undefined;
}

// Bump to re-render every stored card after changing the card's design.
const CARD_VERSION = 4;

/** Where a card's PNG lives in R2. The key changes whenever anything on the card does. */
export async function cardKey(card: Card): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([CARD_VERSION, card])));
  const hex = [...new Uint8Array(digest).slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `og/${hex}.png`;
}
