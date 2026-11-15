import { describe, expect, it } from 'vitest';
import { orderProjects } from './projects';

const project = (id: string, year: number, title = id, translationGroup?: string) => ({ id, year, title, translationGroup });

describe('orderProjects', () => {
  it('follows the chosen order', () => {
    const projects = [project('a', 2020), project('b', 2024), project('c', 2022)];
    expect(orderProjects(projects, ['c', 'a', 'b']).map((p) => p.id)).toEqual(['c', 'a', 'b']);
  });

  it('puts projects missing from the order last, newest first', () => {
    const projects = [project('old', 2019), project('new', 2025), project('picked', 2021)];
    expect(orderProjects(projects, ['picked']).map((p) => p.id)).toEqual(['picked', 'new', 'old']);
  });

  it('breaks year ties by title', () => {
    const projects = [project('b', 2023, 'Beta'), project('a', 2023, 'alpha')];
    expect(orderProjects(projects, []).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('matches translations through their translation group', () => {
    const projects = [project('pt-1', 2020, 'Um', 'g1'), project('pt-2', 2024, 'Dois', 'g2')];
    expect(orderProjects(projects, ['g1', 'g2']).map((p) => p.id)).toEqual(['pt-1', 'pt-2']);
  });

  it('ignores order entries that no longer exist', () => {
    expect(orderProjects([project('a', 2020)], ['gone', 'a']).map((p) => p.id)).toEqual(['a']);
  });
});
