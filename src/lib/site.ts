import type { APIContext } from 'astro';
import { getEmDashEntry, getTranslations } from 'emdash';
import { isLocale, localizePath, type Locale } from './locale';

/** The profile and site options singletons, which every page renders. */
export async function getSite(Astro: Pick<APIContext, 'currentLocale' | 'cache'>) {
  const locale = Astro.currentLocale;
  const [profile, options] = await Promise.all([
    getEmDashEntry('profile', 'me', { locale }),
    getEmDashEntry('site_options', 'default', { locale }),
  ]);
  if (Astro.cache?.enabled) {
    Astro.cache.set(profile.cacheHint);
    Astro.cache.set(options.cacheHint);
  }
  return { profile: profile.entry, options: options.entry?.data };
}

/** Where each translation of an entry lives, e.g. `{ en: '/blog/hello', pt: '/pt/blog/ola' }`. */
export async function getTranslatedPaths(collection: string, id: string, base: string) {
  const { translations } = await getTranslations(collection, id);
  return Object.fromEntries(
    translations.filter((t) => t.slug && isLocale(t.locale)).map((t) => [t.locale, localizePath(`${base}/${t.slug}`, t.locale as Locale)]),
  ) as Partial<Record<Locale, string>>;
}
