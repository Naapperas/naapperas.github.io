type Kind = 'text' | 'date' | 'lines' | 'list' | 'url';

const timeline = { role: 'text', org: 'text', location: 'text', start: 'date', end: 'date', details: 'lines', stack: 'list' } as const;

/** The CV collection's repeaters, and how the model's answer maps onto each sub-field. */
const sections: Record<string, { fields: Record<string, Kind>; required: string[] }> = {
  experience: { fields: timeline, required: ['role', 'org'] },
  activities: { fields: timeline, required: ['role', 'org'] },
  projects: { fields: { name: 'text', tagline: 'text', start: 'date', end: 'date', details: 'lines', url: 'url', stack: 'list' }, required: ['name'] },
  education: { fields: { degree: 'text', school: 'text', location: 'text', start: 'date', end: 'date', details: 'lines' }, required: ['degree', 'school'] },
  skills: { fields: { group: 'text', items: 'list' }, required: ['group', 'items'] },
  languages: { fields: { name: 'text', level: 'text' }, required: ['name', 'level'] },
  awards: { fields: { title: 'text', org: 'text', year: 'text' }, required: ['title'] },
};

/** Every field the import may fill. The PDF, title and phone are left alone. */
export const cvImportFields = ['headline', 'summary', ...Object.keys(sections)];

const kindSchema: Record<Kind, Record<string, unknown>> = {
  text: { type: 'string' },
  url: { type: 'string', description: 'Absolute URL from the entry, e.g. its GitHub line' },
  date: { type: 'string', description: 'YYYY-MM when the month is known, otherwise YYYY; "present" for ongoing' },
  lines: { type: 'array', items: { type: 'string' }, description: 'One entry per bullet point, without the bullet, the technology line or links' },
  list: { type: 'array', items: { type: 'string' }, description: 'One entry per item, e.g. from a "Technology:" line' },
};

export const cvJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    headline: { type: 'string', description: 'The professional title under the name, without the name, e.g. "Systems Engineer"' },
    summary: { type: 'string', description: 'The profile or summary paragraph; empty if the CV has none' },
    ...Object.fromEntries(
      Object.entries(sections).map(([name, { fields, required }]) => [
        name,
        {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: Object.fromEntries(Object.entries(fields).map(([field, kind]) => [field, kindSchema[kind]])),
            required,
          },
        },
      ]),
    ),
  },
  // Required, or the model tends to skip sections; it returns an empty list for the ones the CV lacks.
  required: cvImportFields,
};

export const cvImportPrompt = [
  'You turn a CV, converted from PDF to Markdown, into structured data in English.',
  'Use only what the CV says: never invent, merge or embellish. Keep the author’s wording and every bullet point.',
  'Fill every section the CV has, in the order the CV lists entries. "experience" is paid work; "activities" is volunteering, student groups and other extracurriculars; "languages" are spoken languages, never a skills group.',
  '"headline" is the professional title printed under the name, not the name itself. The Markdown can run them together, as in "Nuno PereiraSOFTWARE ENGiNEER".',
  'Project names run into their tagline the same way: "ZonZOD-LiKE VALiDATiON iN PYTHON" is the project "Zon" with the tagline "Zod-like validation in Python". The tagline is only the small-caps part; anything before it, a bracketed expansion included, is the name.',
  'Leave "summary" empty unless the CV has a profile or summary paragraph of its own; never write one.',
  'When the CV lists several roles under one organisation, repeat the organisation and location on each role.',
  'Each entry\'s "Technology:" line goes in "stack", and a "Github:" or other link line in "url"; neither belongs in "details".',
  'Text set in small caps comes through as capitals, sometimes with a stray lowercase i (e.g. "SOFTWARE ENGiNEER"). Write it in normal case: "Software Engineer".',
].join('\n');

/** Second step for Portuguese entries: translating the English extraction works far better than doing both at once. */
export const cvTranslatePrompt = [
  'Translate this CV data from English into European Portuguese (pt-PT), as a native speaker would write their own CV.',
  'Return the same JSON: the same fields, entries and order, nothing added or left out.',
  'Translate every value written in ordinary words: the headline, roles, taglines, bullet points, degrees, skill groups, concepts, locations, languages and levels.',
  'Keep as written: the names of people, organisations, schools, products, projects and technologies, plus links and dates.',
  'Write bullet points in the first person ("Implementei…", "a minha tese").',
].join('\n');

type Record_ = Record<string, unknown>;
const isRecord = (v: unknown): v is Record_ => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const items = (v: unknown) =>
  (Array.isArray(v) ? v : typeof v === 'string' ? v.split('\n') : [])
    .map((item) => text(item)?.replace(/^[•●▪\-*–]\s*/, ''))
    .filter((item): item is string => !!item);

// English and Portuguese abbreviations; the ones both languages share appear once.
const months: Record<string, number> = Object.fromEntries(
  ['jan', 'feb fev', 'mar', 'apr abr', 'may mai', 'jun', 'jul', 'aug ago', 'sep set', 'oct out', 'nov', 'dec dez'].flatMap((names, i) => names.split(' ').map((name) => [name, i + 1])),
);

const convert: Record<Kind, (v: unknown) => string | undefined> = {
  text,
  url: (v) => {
    const s = text(v);
    if (!s || !URL.canParse(s)) return undefined;
    return /^https?:$/.test(new URL(s).protocol) ? s : undefined;
  },
  date: (v) => {
    const s = text(v);
    if (!s) return undefined;
    if (/^(present|current|now|presente|atual)$/i.test(s)) return 'present';
    const m = /^(\d{4})(?:-(\d{1,2}))?$/.exec(s);
    if (m) return m[2] ? `${m[1]}-${m[2].padStart(2, '0')}` : m[1];
    const named = /^([a-z]{3})[a-z]*\.?\s+(\d{4})$/i.exec(s);
    const month = named && months[named[1].toLowerCase()];
    return month ? `${named[2]}-${String(month).padStart(2, '0')}` : undefined;
  },
  lines: (v) => items(v).join('\n') || undefined,
  list: (v) => items(v).join(', ') || undefined,
};

export type CvPatchOperation = { op: 'set'; field: string; value: unknown };

const linkLine = /^(?:[\p{L} ]{1,20}:\s*)?(https?:\/\/\S+)$/u;
const stackLine = /^(?:technolog(?:y|ies)|tecnologias?)\s*:\s*(.+)$/i;

/**
 * Editor patch operations for what the model read from the PDF. Model output is untrusted: anything malformed is
 * dropped, and a section it found nothing for keeps whatever the editor already has.
 */
export function toCvPatch(raw: unknown): CvPatchOperation[] {
  if (!isRecord(raw)) return [];
  const ops: CvPatchOperation[] = [];
  for (const field of ['headline', 'summary']) {
    const value = text(raw[field]);
    if (value) ops.push({ op: 'set', field, value });
  }
  for (const [name, { fields, required }] of Object.entries(sections)) {
    const entries = (Array.isArray(raw[name]) ? raw[name] : []).flatMap((entry) => {
      if (!isRecord(entry)) return [];
      const row: Record<string, string> = Object.fromEntries(
        Object.entries(fields)
          .map(([field, kind]) => [field, convert[kind](entry[field])])
          .filter(([, value]) => value !== undefined),
      );
      // The model sometimes leaves an entry's link or "Technology:" bullet in its details, where the page would repeat it.
      if (row.details) {
        const details = row.details.split('\n').filter((line) => {
          const url = 'url' in fields ? convert.url(linkLine.exec(line)?.[1]) : undefined;
          const stack = 'stack' in fields ? convert.list(stackLine.exec(line)?.[1]?.split(',')) : undefined;
          if (url) row.url ??= url;
          if (stack) row.stack ??= stack;
          return !url && !stack;
        });
        if (details.length > 0) row.details = details.join('\n');
        else delete row.details;
      }
      return required.every((field) => field in row) ? [row] : [];
    });
    if (entries.length > 0) ops.push({ op: 'set', field: name, value: entries });
  }
  return ops;
}
