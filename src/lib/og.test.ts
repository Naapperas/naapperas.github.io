import { describe, expect, it } from 'vitest';
import { ogImagePath, pagePathFromSlug } from './og';

describe('ogImagePath', () => {
  it('maps pages to image paths', () => {
    expect(ogImagePath('/')).toBe('/og/index.png');
    expect(ogImagePath('/projects/zon/')).toBe('/og/projects/zon.png');
    expect(ogImagePath('/blog/hello')).toBe('/og/blog/hello.png');
  });
});

describe('pagePathFromSlug', () => {
  it('reverses ogImagePath', () => {
    expect(pagePathFromSlug('index')).toBe('/');
    expect(pagePathFromSlug('projects/zon')).toBe('/projects/zon');
  });
});
