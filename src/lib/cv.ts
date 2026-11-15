import type { Locale } from './locale';

const PRESENT: Record<Locale, string> = { en: 'Present', pt: 'presente' };
const INTL_LOCALE: Record<Locale, string> = { en: 'en-US', pt: 'pt-PT' };

function formatPoint(value: string, locale: Locale): string {
  if (value === 'present') return PRESENT[locale];
  const match = /^(\d{4})(?:-(\d{2}))?$/.exec(value);
  if (!match) return value;
  const [, year, month] = match;
  if (!month) return year;
  const name = new Intl.DateTimeFormat(INTL_LOCALE[locale], { month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(Number(year), Number(month) - 1)),
  );
  return `${name} ${year}`;
}

/** Formats CV dates stored as `YYYY`, `YYYY-MM` or `present`. */
export function formatPeriod(start: string | null | undefined, end: string | null | undefined, locale: Locale): string {
  const points = [start, end].filter((v): v is string => !!v?.trim()).map((v) => formatPoint(v.trim(), locale));
  return points.length === 2 && points[0] === points[1] ? points[0] : points.join(' – ');
}

export function groupConsecutive<T extends { org: string }>(entries: T[] | undefined): { org: string; items: T[] }[] {
  const groups: { org: string; items: T[] }[] = [];
  for (const entry of entries ?? []) {
    const last = groups.at(-1);
    if (last && last.org.trim() === entry.org.trim()) last.items.push(entry);
    else groups.push({ org: entry.org.trim(), items: [entry] });
  }
  return groups;
}

/** CV text fields hold one bullet per line. */
export function splitLines(text: string | null | undefined): string[] {
  return text?.split('\n').map((l) => l.trim()).filter(Boolean) ?? [];
}

/** CV technology fields hold comma-separated values. */
export function splitList(text: string | null | undefined): string[] {
  return text?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
}
