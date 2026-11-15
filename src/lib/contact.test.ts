import { describe, expect, it, vi } from 'vitest';
import { buildContactEmail, verifyTurnstile } from './contact';

describe('verifyTurnstile', () => {
  const respond = (body: unknown) => vi.fn(async (_url: string, _init?: RequestInit) => Response.json(body));

  it('posts the token, secret and visitor IP to siteverify', async () => {
    const fetcher = respond({ success: true });
    await verifyTurnstile('token-1', 'secret-1', '203.0.113.7', fetcher);

    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(init?.method).toBe('POST');
    const body = init?.body as FormData;
    expect(body.get('response')).toBe('token-1');
    expect(body.get('secret')).toBe('secret-1');
    expect(body.get('remoteip')).toBe('203.0.113.7');
  });

  it('accepts successful verifications', async () => {
    expect(await verifyTurnstile('t', 's', null, respond({ success: true }))).toBe(true);
  });

  it('rejects failed verifications', async () => {
    expect(await verifyTurnstile('t', 's', null, respond({ success: false, 'error-codes': ['invalid-input-response'] }))).toBe(false);
  });

  it('rejects when siteverify is unreachable', async () => {
    const fetcher = vi.fn(async () => new Response('bad gateway', { status: 502 }));
    expect(await verifyTurnstile('t', 's', null, fetcher)).toBe(false);
  });

  it('omits the IP when unknown', async () => {
    const fetcher = respond({ success: true });
    await verifyTurnstile('t', 's', null, fetcher);
    expect((fetcher.mock.calls[0][1]?.body as FormData).has('remoteip')).toBe(false);
  });
});

describe('buildContactEmail', () => {
  const input = { name: 'Ada Lovelace', email: 'ada@example.com', message: 'Hello!\nLet us talk.' };

  it('replies to the visitor and sends to the configured inbox', () => {
    const email = buildContactEmail(input, { to: 'me@example.com', from: 'website@naapperas.pt' });
    expect(email.to).toBe('me@example.com');
    expect(email.from).toEqual({ name: 'naapperas.pt', email: 'website@naapperas.pt' });
    expect(email.replyTo).toEqual({ name: 'Ada Lovelace', email: 'ada@example.com' });
    expect(email.subject).toBe('[naapperas.pt] Message from Ada Lovelace');
  });

  it('keeps the message in the body, with the sender details', () => {
    const email = buildContactEmail(input, { to: 'me@example.com', from: 'website@naapperas.pt', meta: 'Lisbon, PT' });
    expect(email.text).toContain('Hello!\nLet us talk.');
    expect(email.text).toContain('Ada Lovelace <ada@example.com>');
    expect(email.text).toContain('Lisbon, PT');
  });

  it('strips line breaks from header fields', () => {
    const email = buildContactEmail(
      { ...input, name: 'Eve\r\nBcc: victim@example.com' },
      { to: 'me@example.com', from: 'website@naapperas.pt' },
    );
    expect(email.subject).not.toMatch(/[\r\n]/);
    expect((email.replyTo as EmailAddress).name).not.toMatch(/[\r\n]/);
  });
});
