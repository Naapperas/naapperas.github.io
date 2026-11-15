import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { cardKey, getCard, pagePathFromSlug } from '../../lib/og';

/** Social images: a screenshot of /og-card/*, taken once per version of the card and kept in R2. */
export const GET: APIRoute = async (context) => {
  const slug = context.params.path?.match(/^(.+)\.png$/)?.[1];
  const card = slug && (await getCard(context, pagePathFromSlug(slug)));
  if (!card) return new Response('Not found', { status: 404 });

  const key = await cardKey(card);
  const stored = await env.MEDIA.get(key);
  if (stored) return png(stored.body);

  try {
    const image = await screenshot(new URL(`/og-card/${slug}`, context.url));
    await env.MEDIA.put(key, image, { httpMetadata: { contentType: 'image/png' } });
    return png(image);
  } catch (error) {
    console.error('og: render failed', slug, error);
    return new Response('Rendering failed', { status: 503, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } });
  }
};

const png = (body: BodyInit) => new Response(body, { headers: { 'Content-Type': 'image/png' } });

async function screenshot(url: URL): Promise<Uint8Array<ArrayBuffer>> {
  // Loaded on demand so the rest of the site doesn't pay for puppeteer at startup.
  const { default: puppeteer } = await import('@cloudflare/puppeteer');
  const browser = await puppeteer.launch(env.BROWSER);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630 });
    const response = await page.goto(url.href, { waitUntil: 'networkidle0' });
    if (!response?.ok()) throw new Error(`card returned ${response?.status()}`);
    await page.evaluate(() => document.fonts.ready);
    return new Uint8Array(await page.screenshot({ type: 'png' }));
  } finally {
    await browser.close();
  }
}
