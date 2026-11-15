import { describe, expect, it } from 'vitest';
import { formatPeriod, groupConsecutive, splitLines, splitList } from './cv';

describe('formatPeriod', () => {
  it('formats month ranges in English', () => {
    expect(formatPeriod('2024-10', '2025-07', 'en')).toBe('Oct 2024 – Jul 2025');
  });

  it('formats month ranges in Portuguese', () => {
    expect(formatPeriod('2024-10', '2025-07', 'pt')).toBe('out. 2024 – jul. 2025');
  });

  it('translates "present"', () => {
    expect(formatPeriod('2025-10', 'present', 'en')).toBe('Oct 2025 – Present');
    expect(formatPeriod('2025-10', 'present', 'pt')).toBe('out. 2025 – presente');
  });

  it('accepts bare years', () => {
    expect(formatPeriod('2020', '2025', 'en')).toBe('2020 – 2025');
  });

  it('collapses a range within one period', () => {
    expect(formatPeriod('2023', '2023', 'en')).toBe('2023');
  });

  it('handles missing ends', () => {
    expect(formatPeriod('2023-02', null, 'en')).toBe('Feb 2023');
    expect(formatPeriod(null, '2023', 'en')).toBe('2023');
    expect(formatPeriod(undefined, undefined, 'en')).toBe('');
  });

  it('passes through values it cannot parse', () => {
    expect(formatPeriod('Spring 2022', '2023', 'en')).toBe('Spring 2022 – 2023');
  });
});

describe('groupConsecutive', () => {
  const role = (org: string, role: string) => ({ org, role });

  it('groups consecutive roles at the same organisation', () => {
    const groups = groupConsecutive([role('Cloudflare', 'Engineer'), role('Cloudflare', 'Intern'), role('K+N', 'Intern')]);
    expect(groups).toEqual([
      { org: 'Cloudflare', items: [role('Cloudflare', 'Engineer'), role('Cloudflare', 'Intern')] },
      { org: 'K+N', items: [role('K+N', 'Intern')] },
    ]);
  });

  it('keeps non-consecutive roles at the same organisation apart', () => {
    const groups = groupConsecutive([role('A', '1'), role('B', '2'), role('A', '3')]);
    expect(groups.map((g) => g.org)).toEqual(['A', 'B', 'A']);
  });

  it('ignores surrounding whitespace when comparing organisations', () => {
    expect(groupConsecutive([role('A ', '1'), role('A', '2')])).toHaveLength(1);
  });

  it('returns nothing for no entries', () => {
    expect(groupConsecutive(undefined)).toEqual([]);
  });
});

describe('splitLines', () => {
  it('turns one bullet per line into a list, dropping blanks', () => {
    expect(splitLines('First\n\n  Second  \n')).toEqual(['First', 'Second']);
  });

  it('returns nothing for empty values', () => {
    expect(splitLines(null)).toEqual([]);
    expect(splitLines('')).toEqual([]);
  });
});

describe('splitList', () => {
  it('splits comma-separated values', () => {
    expect(splitList('TypeScript, Terraform ,GraphQL,')).toEqual(['TypeScript', 'Terraform', 'GraphQL']);
  });

  it('returns nothing for empty values', () => {
    expect(splitList(undefined)).toEqual([]);
  });
});
