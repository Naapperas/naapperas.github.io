import { describe, expect, it } from 'vitest';
import { toCvPatch } from './cv-import';

const set = (ops: ReturnType<typeof toCvPatch>) => Object.fromEntries(ops.map((op) => [op.field, op.value]));

describe('toCvPatch', () => {
  it('turns lists into the text the CV fields store', () => {
    const ops = toCvPatch({
      headline: 'Systems Engineer',
      summary: 'Builds things.',
      experience: [{ role: 'Systems Engineer', org: 'Cloudflare', location: 'Lisbon', start: '2025-10', end: 'present', details: ['Did a', 'Did b'], stack: ['TypeScript', 'Go'] }],
      skills: [{ group: 'Languages', items: ['Go', 'Rust'] }],
    });
    expect(ops.every((op) => op.op === 'set')).toBe(true);
    expect(set(ops)).toEqual({
      headline: 'Systems Engineer',
      summary: 'Builds things.',
      experience: [{ role: 'Systems Engineer', org: 'Cloudflare', location: 'Lisbon', start: '2025-10', end: 'present', details: 'Did a\nDid b', stack: 'TypeScript, Go' }],
      skills: [{ group: 'Languages', items: 'Go, Rust' }],
    });
  });

  it('normalises dates and drops the ones it cannot read', () => {
    const [op] = toCvPatch({ education: [{ degree: 'M.Sc.', school: 'FEUP', start: '2023-9', end: 'Present' }, { degree: 'B.Sc.', school: 'FEUP', start: 'autumn', end: '2023' }] });
    expect(op.value).toEqual([
      { degree: 'M.Sc.', school: 'FEUP', start: '2023-09', end: 'present' },
      { degree: 'B.Sc.', school: 'FEUP', end: '2023' },
    ]);
  });

  it('reads dates written with month names, as in the PDF', () => {
    const [op] = toCvPatch({
      experience: [
        { role: 'A', org: 'B', start: 'Oct. 2025', end: 'Present' },
        { role: 'C', org: 'D', start: 'mar. 2022', end: 'Sept 2023' },
        { role: 'E', org: 'F', start: 'fev. 2021', end: 'Dez 2021' },
      ],
    });
    expect(op.value).toEqual([
      { role: 'A', org: 'B', start: '2025-10', end: 'present' },
      { role: 'C', org: 'D', start: '2022-03', end: '2023-09' },
      { role: 'E', org: 'F', start: '2021-02', end: '2021-12' },
    ]);
  });

  it('drops entries missing required fields, bad links and bullet markers', () => {
    const [op] = toCvPatch({
      projects: [
        { name: '  Zon ', url: 'github.com/Naapperas/zon', details: ['• Ported zod', '- to Python'] },
        { name: 'Site', url: 'https://naapperas.pt' },
        { tagline: 'no name' },
      ],
    });
    expect(op.value).toEqual([{ name: 'Zon', details: 'Ported zod\nto Python' }, { name: 'Site', url: 'https://naapperas.pt' }]);
  });

  it('moves link and technology bullets the model left in the details', () => {
    const [projects] = toCvPatch({
      projects: [
        { name: 'Zon', details: ['Ported zod', 'Github: https://github.com/Naapperas/zon/', 'Technology: Python, Pydantic'] },
        { name: 'Site', url: 'https://naapperas.pt', stack: ['Astro'], details: ['Built it', 'GitHub: https://github.com/x/y', 'Tecnologias: Go'] },
      ],
    });
    expect(projects.value).toEqual([
      { name: 'Zon', details: 'Ported zod', url: 'https://github.com/Naapperas/zon/', stack: 'Python, Pydantic' },
      { name: 'Site', details: 'Built it', url: 'https://naapperas.pt', stack: 'Astro' },
    ]);
    const [education] = toCvPatch({ education: [{ degree: 'M.Sc.', school: 'FEUP', details: ['Technology: none', 'Thesis'] }] });
    expect(education.value).toEqual([{ degree: 'M.Sc.', school: 'FEUP', details: 'Technology: none\nThesis' }]);
  });

  it('leaves sections alone when the PDF had nothing for them', () => {
    expect(toCvPatch({ headline: '  ', experience: [], awards: [{ org: 'missing title' }] })).toEqual([]);
  });

  it('ignores output that is not an object', () => {
    expect(toCvPatch('nope')).toEqual([]);
    expect(toCvPatch(null)).toEqual([]);
  });
});
