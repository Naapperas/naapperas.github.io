import type { APIContext } from 'astro';
import { getEmDashCollection, getEmDashEntry } from 'emdash';
import type { Project } from '../../emdash-env';

interface Orderable {
  id: string;
  year: number;
  title: string;
}

/** Projects in the order picked in the admin; projects it leaves out follow, newest first. */
export function orderProjects<T extends Orderable>(projects: T[], order: string[]): T[] {
  const rank = new Map(order.map((id, i) => [id, i]));
  const position = (p: T) => rank.get(p.id) ?? Number.MAX_SAFE_INTEGER;
  return projects.toSorted((a, b) => position(a) - position(b) || b.year - a.year || a.title.localeCompare(b.title));
}

export async function getProjects(Astro: Pick<APIContext, 'cache'>): Promise<Project[]> {
  const [projects, options] = await Promise.all([
    getEmDashCollection('projects', { limit: 100 }),
    getEmDashEntry('site_options', 'default', { references: { project_order: true } }),
  ]);
  if (Astro.cache?.enabled) {
    Astro.cache.set(projects.cacheHint);
    Astro.cache.set(options.cacheHint);
  }
  const order = (options.entry?.references?.project_order.entries ?? []).map((e) => e.data.id);
  return orderProjects(projects.entries.map((e) => e.data), order);
}
