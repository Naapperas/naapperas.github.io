import { describe, expect, it } from 'vitest';
import { localeFromPath, localeRedirect, localizePath, negotiateLocale } from './locale';

describe('negotiateLocale', () => {
  it('falls back to English without a header', () => {
    expect(negotiateLocale(null)).toBe('en');
    expect(negotiateLocale('')).toBe('en');
  });

  it('matches regional Portuguese variants', () => {
    expect(negotiateLocale('pt-PT')).toBe('pt');
    expect(negotiateLocale('pt-BR,pt;q=0.9')).toBe('pt');
  });

  it('honours quality values over order', () => {
    expect(negotiateLocale('en;q=0.4, pt;q=0.8')).toBe('pt');
    expect(negotiateLocale('pt;q=0.3, en-GB;q=0.9')).toBe('en');
  });

  it('skips unsupported languages', () => {
    expect(negotiateLocale('fr-FR, de;q=0.9, pt;q=0.5')).toBe('pt');
    expect(negotiateLocale('fr-FR, de;q=0.9')).toBe('en');
  });

  it('ignores languages explicitly refused with q=0', () => {
    expect(negotiateLocale('pt;q=0, en;q=0.1')).toBe('en');
  });

  it('treats the wildcard as no preference', () => {
    expect(negotiateLocale('*')).toBe('en');
  });
});

const get = (path: string, headers: Record<string, string> = {}) =>
  new Request(`https://naapperas.pt${path}`, { headers });

describe('localeRedirect', () => {
  it('sends Portuguese browsers from the root to /pt/', () => {
    expect(localeRedirect(get('/', { 'accept-language': 'pt-PT,pt;q=0.9,en;q=0.8' }))).toBe('/pt/');
  });

  it('keeps English browsers on the root', () => {
    expect(localeRedirect(get('/', { 'accept-language': 'en-US,en;q=0.9' }))).toBeNull();
  });

  it('lets an explicit choice in the cookie win over the browser', () => {
    expect(localeRedirect(get('/', { 'accept-language': 'pt-PT', cookie: 'theme=dark; lang=en' }))).toBeNull();
    expect(localeRedirect(get('/', { 'accept-language': 'en-US', cookie: 'lang=pt' }))).toBe('/pt/');
  });

  it('preserves the query string', () => {
    expect(localeRedirect(get('/?utm_source=cv', { cookie: 'lang=pt' }))).toBe('/pt/?utm_source=cv');
  });

  it('only negotiates on the root page', () => {
    expect(localeRedirect(get('/projects', { 'accept-language': 'pt' }))).toBeNull();
    expect(localeRedirect(get('/pt/', { cookie: 'lang=en' }))).toBeNull();
  });

  it('never redirects non-GET requests or preview links', () => {
    expect(localeRedirect(new Request('https://naapperas.pt/', { method: 'POST', headers: { cookie: 'lang=pt' } }))).toBeNull();
    expect(localeRedirect(get('/?_preview=abc', { cookie: 'lang=pt' }))).toBeNull();
  });
});

describe('localizePath', () => {
  it('adds the Portuguese prefix', () => {
    expect(localizePath('/', 'pt')).toBe('/pt/');
    expect(localizePath('/projects/zon', 'pt')).toBe('/pt/projects/zon');
  });

  it('removes the prefix for English', () => {
    expect(localizePath('/pt/', 'en')).toBe('/');
    expect(localizePath('/pt', 'en')).toBe('/');
    expect(localizePath('/pt/cv', 'en')).toBe('/cv');
  });

  it('leaves paths already in the target locale alone', () => {
    expect(localizePath('/pt/cv', 'pt')).toBe('/pt/cv');
    expect(localizePath('/cv', 'en')).toBe('/cv');
  });

  it('does not mistake other paths that start with "pt" for the prefix', () => {
    expect(localizePath('/ptolemy', 'pt')).toBe('/pt/ptolemy');
    expect(localizePath('/ptolemy', 'en')).toBe('/ptolemy');
  });
});

describe('localeFromPath', () => {
  it('reads the locale from the prefix', () => {
    expect(localeFromPath('/pt')).toBe('pt');
    expect(localeFromPath('/pt/projects')).toBe('pt');
    expect(localeFromPath('/projects')).toBe('en');
    expect(localeFromPath('/ptolemy')).toBe('en');
  });
});
