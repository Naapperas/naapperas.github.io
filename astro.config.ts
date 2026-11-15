import { defineConfig } from 'astro/config';

import tailwind from "@astrojs/tailwind";

import icon from 'astro-icon';

import cloudflare from "@astrojs/cloudflare";

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://naapperas.pt',
  integrations: [tailwind(), icon(), sitemap()],
  trailingSlash: 'ignore',
  adapter: cloudflare()
});