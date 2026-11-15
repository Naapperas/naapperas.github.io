export async function verifyTurnstile(
  token: string,
  secret: string,
  ip: string | null,
  fetcher: (url: string, init?: RequestInit) => Promise<Response> = fetch,
): Promise<boolean> {
  const body = new FormData();
  body.set('secret', secret);
  body.set('response', token);
  if (ip) body.set('remoteip', ip);

  const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  if (!response.ok) return false;
  const result = await response.json<{ success?: boolean }>();
  return result.success === true;
}

const oneLine = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();

export function buildContactEmail(
  input: { name: string; email: string; message: string },
  options: { to: string; from: string; meta?: string },
): EmailMessageBuilder {
  const name = oneLine(input.name);
  return {
    from: { name: 'naapperas.pt', email: options.from },
    to: options.to,
    replyTo: { name, email: oneLine(input.email) },
    subject: `[naapperas.pt] Message from ${name}`,
    text: [`From: ${name} <${oneLine(input.email)}>`, options.meta, '', input.message].filter((l) => l !== undefined).join('\n'),
  };
}
