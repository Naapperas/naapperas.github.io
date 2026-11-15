import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getEmDashEntry } from 'emdash';

// EmDash's media route lives under /_emdash, which Access protects, so the public PDF is streamed from R2 here.
export const GET: APIRoute = async ({ cache }) => {
  const { entry, cacheHint } = await getEmDashEntry('cv', 'cv');
  const key = entry?.data.pdf?.meta?.storageKey;
  const object = typeof key === 'string' ? await env.MEDIA.get(key) : null;
  if (!object) return new Response('Not found', { status: 404 });

  if (cache?.enabled) cache.set(cacheHint);
  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="nuno-pereira-cv.pdf"',
      ETag: object.httpEtag,
    },
  });
};
