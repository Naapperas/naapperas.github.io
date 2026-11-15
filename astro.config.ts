import { fileURLToPath } from 'node:url';
import { defineConfig, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { cacheCloudflare } from '@astrojs/cloudflare/cache';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { access, d1, kvCache, r2 } from '@emdash-cms/cloudflare';
import emdash from 'emdash/astro';

const site = 'https://naapperas.pt';

const cached = (tags: string[]) => ({ maxAge: 86_400, swr: 604_800, tags: [...tags, 'all'] });

// Every public route gets an explicit rule. Tags are EmDash collection names, which EmDash
// invalidates on publish; `all` is a manual "purge everything" switch.
const publicRoutes = {
  '/': cached(['profile', 'site_options', 'projects']),
  '/projects': cached(['projects', 'site_options']),
  '/projects/[slug]': cached(['projects', 'site_options']),
  '/cv': cached(['cv', 'profile', 'site_options']),
  '/contact': cached(['profile', 'site_options']),
  '/blog': cached(['posts', 'site_options']),
  '/blog/[slug]': cached(['posts', 'site_options']),
  '/blog/rss.xml': cached(['posts', 'profile', 'site_options']),
};

export default defineConfig({
  site,
  output: 'server',
  trailingSlash: 'ignore',
  adapter: cloudflare({
    imageService: { build: 'compile', runtime: 'cloudflare-binding' },
    // AI and Browser Rendering only run remotely, through a proxy on workers.dev that sits behind Access.
    remoteBindings: process.env.REMOTE_BINDINGS === 'true',
  }),
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pt'],
  },
  cache: {
    provider: cacheCloudflare(),
  },
  routeRules: {
    ...publicRoutes,
    '/cv.pdf': cached(['cv']),
    '/og/[...path]': cached(['profile', 'site_options', 'projects', 'posts']),
    // Resized media. EmDash purges nothing when media changes, so a replaced original shows up once this expires.
    '/_image': cached([]),
    ...Object.fromEntries(Object.entries(publicRoutes).map(([path, rule]) => [`/pt${path === '/' ? '' : path}`, rule])),
  },
  image: {
    layout: 'constrained',
    responsiveStyles: true,
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains-mono',
      weights: [400, 500, 600, 700],
      styles: ['normal'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
    {
      provider: fontProviders.google(),
      name: 'IBM Plex Sans',
      cssVariable: '--font-plex-sans',
      weights: [400, 500, 600, 700],
      styles: ['normal', 'italic'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
  ],
  integrations: [
    react(),
    emdash({
      database: d1({ binding: 'DB', session: 'auto', coalesce: true }),
      storage: r2({ binding: 'MEDIA' }),
      // Known at build time, so EmDash allows its media route through Astro's image endpoint (EMDASH_SITE_URL does
      // the same at runtime). Without both, images load the original file from /_emdash, which is behind Access.
      siteUrl: site,
      objectCache: kvCache({ binding: 'CACHE' }),
      auth: access({
        teamDomain: 'naapperas.cloudflareaccess.com',
        audienceEnvVar: 'CF_ACCESS_AUDIENCE',
        defaultRole: 50,
      }),
      toolbar: 'client',
      plugins: [
        {
          id: 'cv-import',
          version: '1.0.0',
          format: 'native',
          entrypoint: fileURLToPath(new URL('./src/plugins/cv-import.ts', import.meta.url)),
          options: {},
        },
      ],
      admin: {
        siteName: 'naapperas.pt',
        hiddenNavItems: ['comments', 'widgets', 'sections', 'bylines', 'import'],
      },
    }),
  ],
  experimental: {
    // Hovered links are prerendered where the Speculation Rules API exists, and prefetched elsewhere.
    clientPrerender: true,
  },
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
  },
});
