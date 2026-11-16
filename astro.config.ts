import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import icon from 'astro-icon';

import cloudflare from "@astrojs/cloudflare";

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://naapperas.pt',
  integrations: [icon(), sitemap()],
  trailingSlash: 'ignore',
  // Every page is prerendered, so images are optimised at build time and no IMAGES or SESSION bindings are needed.
  adapter: cloudflare({ imageService: 'compile' }),
  session: false,
  vite: {
    plugins: [tailwindcss()],
  },
});
