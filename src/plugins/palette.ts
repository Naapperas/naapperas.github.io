import { definePlugin } from 'emdash';

/** Palette previews in the admin: cards for the site options' palette field, and the live palette on the dashboard. */
export function createPlugin() {
  return definePlugin({
    id: 'palette',
    version: '1.0.0',
    admin: {
      // The runtime only checks that this is set, which marks the admin as React components. What gets bundled is
      // `adminEntry` in astro.config.ts; it can't be computed here, where import.meta.url is the Worker bundle's.
      entry: 'src/plugins/palette-admin.tsx',
      widgets: [{ id: 'current-palette', title: 'Colour palette' }],
    },
  });
}
