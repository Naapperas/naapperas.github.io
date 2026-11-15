/** A palette's tokens without the `--`, e.g. `accent`, each with its light and dark colour. */
export type Palette = Record<string, { light: string; dark: string }>;

/** The `[data-palette="name"] { --token: light-dark(light, dark); }` rules in a stylesheet, by palette name. */
export function parsePalettes(css: string): Record<string, Palette> {
  const palettes: Record<string, Palette> = {};
  for (const [, name, body] of css.matchAll(/\[data-palette="([\w-]+)"\]\s*\{([^}]*)\}/g)) {
    const palette: Palette = {};
    for (const [, token, raw] of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
      const value = raw.trim();
      const pair = value.match(/^light-dark\(\s*([^,]+?)\s*,\s*([^,]+?)\s*\)$/);
      palette[token] = pair ? { light: pair[1], dark: pair[2] } : { light: value, dark: value };
    }
    palettes[name] = palette;
  }
  return palettes;
}
