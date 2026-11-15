import type { APIContext } from 'astro';
import { getEmDashEntry } from 'emdash';

/** The profile and site options singletons, which every page renders. */
export async function getSite(Astro: Pick<APIContext, 'cache'>) {
  const [profile, options] = await Promise.all([getEmDashEntry('profile', 'me'), getEmDashEntry('site_options', 'default')]);
  if (Astro.cache?.enabled) {
    Astro.cache.set(profile.cacheHint);
    Astro.cache.set(options.cacheHint);
  }
  return { profile: profile.entry, options: options.entry?.data };
}
