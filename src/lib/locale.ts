export const locales = ['en', 'pt'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const LOCALE_COOKIE = 'lang';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;

  const ranked = acceptLanguage
    .split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      return { lang: tag.trim().toLowerCase().split('-')[0], q: q ? Number(q.slice(2)) : 1, index };
    })
    .filter(({ q }) => q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);

  return ranked.map(({ lang }) => lang).find(isLocale) ?? defaultLocale;
}

export function readCookie(header: string | null, name: string): string | undefined {
  return header
    ?.split(';')
    .map((c) => c.trim().split('='))
    .find(([key]) => key === name)?.[1];
}

/** Where to send a visitor landing on `/`, or null to serve the English home page. */
export function localeRedirect(request: Request): string | null {
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.pathname !== '/' || url.searchParams.has('_preview')) return null;

  const chosen = readCookie(request.headers.get('cookie'), LOCALE_COOKIE);
  const locale = isLocale(chosen) ? chosen : negotiateLocale(request.headers.get('accept-language'));

  return locale === defaultLocale ? null : `/${locale}/${url.search}`;
}

const PREFIX = new RegExp(`^/(${locales.filter((l) => l !== defaultLocale).join('|')})(?=/|$)`);

export function localeFromPath(pathname: string): Locale {
  const prefix = PREFIX.exec(pathname)?.[1];
  return isLocale(prefix) ? prefix : defaultLocale;
}

/** The same page in another locale. Only the default locale is unprefixed. */
export function localizePath(pathname: string, locale: Locale): string {
  const bare = pathname.replace(PREFIX, '') || '/';
  return locale === defaultLocale ? bare : `/${locale}${bare}`;
}
