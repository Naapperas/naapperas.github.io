import { defineConfig } from 'astro/config';

import tailwind from "@astrojs/tailwind";

import icon from 'astro-icon';

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  site: 'https://naapperas.github.io',
  integrations: [tailwind(), icon()],
  trailingSlash: 'ignore',
  adapter: cloudflare()
});