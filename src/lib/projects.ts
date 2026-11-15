import type { AstroGlobal } from 'astro';
import { getEmDashCollection, getEmDashEntry } from 'emdash';
import type { Project } from '../../emdash-env';

interface Orderable {
  id: string;
  year: number;
  title: string;
  translationGroup?: string;
}

/** Projects in the order picked in the admin; projects it leaves out follow, newest first. */
export function orderProjects<T extends Orderable>(projects: T[], order: string[]): T[] {
  const rank = new Map(order.map((group, i) => [group, i]));
  const position = (p: T) => rank.get(p.translationGroup ?? p.id) ?? Number.MAX_SAFE_INTEGER;
  return projects.toSorted((a, b) => position(a) - position(b) || b.year - a.year || a.title.localeCompare(b.title));
}

// EmDash returns the translation group at runtime, but the generated types leave it out.
type WithGroup = Project & { translationGroup?: string };

export async function getProjects(Astro: AstroGlobal): Promise<Project[]> {
  const locale = Astro.currentLocale;
  const [projects, options] = await Promise.all([
    getEmDashCollection('projects', { locale, limit: 100 }),
    getEmDashEntry('site_options', 'default', { locale, references: { project_order: true } }),
  ]);
  if (Astro.cache?.enabled) {
    Astro.cache.set(projects.cacheHint);
    Astro.cache.set(options.cacheHint);
  }
  // The order is shared by every translation, so match on translation groups rather than IDs.
  const order = (options.entry?.references?.project_order.entries ?? []).map((e) => (e.data as WithGroup).translationGroup ?? e.data.id);
  return orderProjects(
    projects.entries.map((e) => e.data as WithGroup),
    order,
  );
}
