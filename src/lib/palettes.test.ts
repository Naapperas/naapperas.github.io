import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parsePalettes } from './palettes';

describe('parsePalettes', () => {
  const css = `
@theme inline {
  --color-bg: var(--bg);
}
@layer base {
  /* Palettes */
  :root, [data-palette="one"] {
    --bg: light-dark(#fafaf9, #0c0c0e);
    --accent: light-dark( #b22f2f ,#ff6b6b );
  }
  [data-palette="two"] {
    --bg: #ffffff;
    --text: light-dark(#18181b, #ededef);
  }
  [data-palette="two"] .card {
    --bg: red;
  }
  html {
    color-scheme: light dark;
  }
  .chip[aria-pressed="true"] {
    --accent: blue;
  }
}`;

  it('reads every palette rule, the :root one included', () => {
    expect(Object.keys(parsePalettes(css))).toEqual(['one', 'two']);
  });

  it('splits light-dark() into its light and dark values', () => {
    expect(parsePalettes(css).one).toEqual({
      bg: { light: '#fafaf9', dark: '#0c0c0e' },
      accent: { light: '#b22f2f', dark: '#ff6b6b' },
    });
  });

  it('uses a plain value for both modes and ignores unrelated rules', () => {
    expect(parsePalettes(css).two).toEqual({
      bg: { light: '#ffffff', dark: '#ffffff' },
      text: { light: '#18181b', dark: '#ededef' },
    });
  });

  it("reads the site's stylesheet", () => {
    const palettes = parsePalettes(readFileSync(new URL('../styles/global.css', import.meta.url), 'utf8'));
    expect(Object.keys(palettes)).toEqual([
      'ember-coral',
      'ember',
      'ember-warm',
      'ember-mono',
      'ember-night',
      'classic',
      'classic-teal',
      'classic-cool',
      'classic-soft',
    ]);
    for (const palette of Object.values(palettes)) {
      expect(Object.keys(palette)).toEqual(expect.arrayContaining(['bg', 'surface', 'text', 'muted', 'border', 'accent', 'accent-ink']));
    }
  });
});
