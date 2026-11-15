import { apiFetch, parseApiResponse } from 'emdash/plugin-utils';
import { useEffect, useState } from 'react';
import { parsePalettes } from '../lib/palettes';
import css from '../styles/global.css?raw';

const palettes = parsePalettes(css);
const DEFAULT_PALETTE = 'ember-coral';

interface FieldWidgetProps {
  value: unknown;
  onChange: (value: unknown) => void;
  label: string;
  id: string;
  options?: Record<string, unknown> | Array<{ value: string; label: string }>;
  minimal?: boolean;
}

interface SiteOptions {
  item: { id: string; data: { palette?: string }; liveData?: { palette?: string } };
}

/** A tiny page in the palette, light and dark side by side. */
function Preview({ name }: { name: string }) {
  // An unknown name gets the :root palette, as it would on the site.
  const palette = palettes[name] ?? palettes[DEFAULT_PALETTE];
  return (
    <div aria-hidden="true" style={{ display: 'flex', gap: '0.375rem' }}>
      {(['light', 'dark'] as const).map((mode) => {
        const color = (token: string) => palette[token]?.[mode];
        return (
          <div key={mode} style={{ flex: '1 1 0', minWidth: 0, height: '5.5rem', padding: '0.5rem', borderRadius: '0.4rem', background: color('bg') }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem',
                height: '100%',
                padding: '0.45rem',
                borderRadius: '0.3rem',
                border: `1px solid ${color('border')}`,
                background: color('surface'),
              }}
            >
              <div style={{ display: 'flex', gap: '0.2rem' }}>
                <div style={{ width: '55%', height: '0.35rem', borderRadius: '999px', background: color('text') }} />
                <div style={{ width: '0.6rem', height: '0.35rem', borderRadius: '999px', background: color('accent') }} />
              </div>
              <div style={{ width: '85%', height: '0.2rem', borderRadius: '999px', background: color('muted') }} />
              <span
                style={{
                  marginTop: 'auto',
                  alignSelf: 'flex-start',
                  padding: '0 0.4rem',
                  borderRadius: '999px',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  lineHeight: 1.6,
                  background: color('accent'),
                  color: color('accent-ink'),
                }}
              >
                Aa
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PaletteField({ value, onChange, label, id, options, minimal }: FieldWidgetProps) {
  const names = Array.isArray(options) ? options.map((option) => option.value) : Object.keys(palettes);
  return (
    <div role="group" aria-label={label} className="grid gap-2">
      {!minimal && <span className="text-sm font-medium">{label}</span>}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 19.5rem), 1fr))' }}>
        {names.map((name, index) => (
          <button
            key={name}
            type="button"
            id={index === 0 ? id : undefined}
            aria-pressed={name === value}
            onClick={() => onChange(name)}
            className={`grid cursor-pointer gap-1.5 rounded-lg border p-2 text-start ${name === value ? 'border-kumo-brand ring-2 ring-kumo-brand' : 'border-kumo-line hover:border-kumo-brand'}`}
          >
            <Preview name={name} />
            <span className="font-mono text-xs">{name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CurrentPalette() {
  const [entry, setEntry] = useState<SiteOptions['item']>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    apiFetch('/_emdash/api/content/site_options/default')
      .then((response) => parseApiResponse<SiteOptions>(response, "Couldn't load the site options."))
      .then(({ item }) => setEntry(item))
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, []);

  if (error) return <p role="alert" className="text-sm text-kumo-danger">{error}</p>;
  if (!entry) return <p className="text-sm text-kumo-subtle">Loading…</p>;

  // With a pending draft, `data` holds the draft and `liveData` what the site shows.
  const live = (entry.liveData ?? entry.data).palette ?? DEFAULT_PALETTE;
  const draft = entry.liveData && entry.data.palette !== live ? entry.data.palette : undefined;
  return (
    <div className="grid gap-2">
      <Preview name={live} />
      <p className="text-sm">
        <span className="font-mono">{live}</span>
        {draft && <span className="text-kumo-subtle"> (draft: {draft})</span>}
        {' · '}
        <a href={`/_emdash/admin/content/site_options/${entry.id}`} className="text-kumo-link hover:underline">
          Change palette
        </a>
      </p>
    </div>
  );
}

export const fields = { palette: PaletteField };

export const widgets = { 'current-palette': CurrentPalette };
