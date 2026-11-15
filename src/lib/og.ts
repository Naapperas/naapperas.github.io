import type { APIContext } from 'astro';
import { extractPlainText, getEmDashEntry } from 'emdash';
import { useI18n } from '../i18n';
import { readingMinutes } from './blog';
import { defaultLocale, localeFromPath, localizePath, type Locale } from './locale';
import { getSite } from './site';

/** `/projects/zon` → `/og/projects/zon.png`; locale home pages become `…/index.png`. */
export function ogImagePath(pathname: string): string {
  const page = pathname.replace(/\/+$/, '') || '/';
  const locale = localeFromPath(page);
  const slug = localizePath(page, defaultLocale) === '/' ? `${locale === defaultLocale ? '' : `${locale}/`}index` : page.slice(1);
  return `/og/${slug}.png`;
}

export function pagePathFromSlug(slug: string): string {
  return `/${slug}`.replace(/(^|\/)index$/, '') || '/';
}

export interface Card {
  locale: Locale;
  /** Shown in the window bar, without the locale prefix. */
  path: string;
  prompt: string;
  title: string;
  description?: string;
  meta: string[];
  palette: string;
}

/** The social card for a page, or undefined when the page doesn't exist; nobody gets to brand arbitrary text. */
export async function getCard(context: Pick<APIContext, 'cache'>, pagePath: string): Promise<Card | undefined> {
  const locale = localeFromPath(pagePath);
  const route = localizePath(pagePath, defaultLocale);
  const { t } = useI18n(locale);
  const { profile, options } = await getSite({ currentLocale: locale, cache: context.cache });
  const me = profile?.data;
  const role = me && [me.org ? `${me.role} @ ${me.org}` : me.role, me.location].filter(Boolean).join(' · ');
  const card = (fields: Omit<Card, 'locale' | 'path' | 'palette' | 'meta'> & { meta?: string[] }): Card => ({
    locale,
    path: route === '/' ? '' : route,
    palette: options?.palette ?? 'ember-coral',
    meta: [],
    ...fields,
  });
  const [, section, slug, rest] = route.split('/');
  if (rest !== undefined) return undefined;

  if (route === '/') return card({ prompt: 'whoami', title: (me?.title ?? 'Nuno Pereira').toLowerCase(), description: role });
  if (route === '/cv') return card({ prompt: 'man nuno', title: t('cv.title'), description: [me?.title, role].filter(Boolean).join(', ') });
  if (route === '/contact' && options?.contact_enabled !== false) return card({ prompt: 'mail nuno', title: t('contact.heading'), description: t('contact.intro') });
  if (route === '/projects') return card({ prompt: 'ls ~/projects', title: `${t('projects.title')}/`, description: t('projects.intro') });
  if (route === '/blog' && options?.blog_enabled) return card({ prompt: 'ls -lt ~/blog', title: `${t('blog.title')}/`, description: t('blog.intro') });

  if (section === 'projects' && slug) {
    const { entry, cacheHint } = await getEmDashEntry('projects', slug, { locale });
    if (!entry) return undefined;
    if (context.cache?.enabled) context.cache.set(cacheHint);
    const p = entry.data;
    return card({
      prompt: `cat ~/projects/${p.slug}/README.md`,
      title: p.title,
      description: p.summary,
      meta: [String(p.year), t(`project.kind.${p.kind}`), ...(p.stack ?? []).slice(0, 3)],
    });
  }
  if (section === 'blog' && slug && options?.blog_enabled) {
    const { entry, cacheHint } = await getEmDashEntry('posts', slug, { locale });
    if (!entry?.data.publishedAt) return undefined;
    if (context.cache?.enabled) context.cache.set(cacheHint);
    const post = entry.data;
    return card({
      prompt: `cat ~/blog/${post.slug}.md`,
      title: post.title,
      description: post.excerpt,
      meta: [post.publishedAt!.toISOString().slice(0, 10), `${readingMinutes(extractPlainText(post.content))} ${t('blog.minutes')}`],
    });
  }
  return undefined;
}

// Bump to re-render every stored card after changing the card's design.
const CARD_VERSION = 3;

/** Where a card's PNG lives in R2. The key changes whenever anything on the card does. */
export async function cardKey(card: Card): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([CARD_VERSION, card])));
  const hex = [...new Uint8Array(digest).slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `og/${hex}.png`;
}
