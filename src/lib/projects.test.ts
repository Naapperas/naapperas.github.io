import { describe, expect, it } from 'vitest';
import { orderProjects } from './projects';

const project = (id: string, year: number, title = id) => ({ id, year, title });

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

  it('ignores order entries that no longer exist', () => {
    expect(orderProjects([project('a', 2020)], ['gone', 'a']).map((p) => p.id)).toEqual(['a']);
  });
});
