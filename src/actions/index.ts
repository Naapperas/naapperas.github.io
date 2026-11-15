import { ActionError, defineAction } from 'astro:actions';
import { z } from 'astro/zod';
import { env } from 'cloudflare:workers';
import { getEmDashEntry } from 'emdash';
import { buildContactEmail, verifyTurnstile } from '../lib/contact';

export const server = {
  contact: defineAction({
    accept: 'form',
    input: z.object({
      name: z.string().trim().min(1).max(100),
      email: z.email().max(200),
      message: z.string().trim().min(10).max(5000),
      'cf-turnstile-response': z.string().min(1),
    }),
    handler: async (input, { request }) => {
      const ip = request.headers.get('cf-connecting-ip');
      const { success } = await env.CONTACT_LIMITER.limit({ key: ip ?? 'unknown' });
      if (!success) throw new ActionError({ code: 'TOO_MANY_REQUESTS' });

      if (!(await verifyTurnstile(input['cf-turnstile-response'], env.TURNSTILE_SECRET_KEY, ip))) {
        throw new ActionError({ code: 'FORBIDDEN', message: 'Turnstile verification failed' });
      }

      const { entry: options } = await getEmDashEntry('site_options', 'default');
      if (options?.data.contact_enabled === false) throw new ActionError({ code: 'SERVICE_UNAVAILABLE' });

      const cf = request.cf as IncomingRequestCfProperties | undefined;
      await env.EMAIL.send(
        buildContactEmail(input, {
          to: 'nunoafonso2002@gmail.com',
          from: 'website@naapperas.pt',
          meta: cf && `Sent from ${[cf.city, cf.country].filter(Boolean).join(', ')} via ${cf.colo}`,
        }),
      );
      return { sent: true };
    },
  }),
};
