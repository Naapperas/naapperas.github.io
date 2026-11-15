import handler, { createScheduledHandler } from '@emdash-cms/cloudflare/worker';
import { WorkerEntrypoint } from 'cloudflare:workers';
import { localeRedirect } from './lib/locale';

/** Runs Astro + EmDash. Workers Cache sits in front of this entrypoint (see `exports` in wrangler.jsonc). */
export class Site extends WorkerEntrypoint<Env> {
  fetch(request: Request<unknown, IncomingRequestCfProperties>) {
    return handler.fetch(request, this.env, this.ctx);
  }
}

const securityHeaders: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'X-Frame-Options': 'SAMEORIGIN',
  // No script-src: inline theme script, Turnstile, analytics and prerender rules would all need carving out, for
  // little gain on a site only its owner writes to. EmDash sends its own strict policy on /_emdash, which wins here.
  'Content-Security-Policy': "base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'self'",
};

export default {
  async fetch(request, _env, ctx) {
    // The cache key ignores cookies and Accept-Language, so the choice has to happen before the cache.
    const redirect = localeRedirect(request);
    if (redirect) {
      return new Response(null, {
        status: 302,
        headers: { Location: redirect, 'Cache-Control': 'private, no-store', Vary: 'Accept-Language, Cookie' },
      });
    }

    const upstream = await ctx.exports.Site.fetch(request);
    if (upstream.webSocket) return upstream;

    const response = new Response(upstream.body, upstream);
    for (const [name, value] of Object.entries(securityHeaders)) {
      if (!response.headers.has(name)) response.headers.set(name, value);
    }
    // Keeps the edge from injecting the Web Analytics beacon into the admin, whose CSP would block it, and into the
    // cards Browser Rendering screenshots, which would count as visits.
    if (/^\/(_emdash|og-card)(\/|$)/.test(new URL(request.url).pathname)) {
      const cacheControl = response.headers.get('Cache-Control');
      response.headers.set('Cache-Control', cacheControl ? `${cacheControl}, no-transform` : 'no-transform');
    }
    return response;
  },
  scheduled: createScheduledHandler(),
} satisfies ExportedHandler<Env>;
