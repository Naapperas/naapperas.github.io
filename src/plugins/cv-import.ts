import { env } from 'cloudflare:workers';
import { definePlugin, definePluginRoute } from 'emdash';
import { cvImportFields, cvImportPrompt, cvJsonSchema, toCvPatch } from '../lib/cv-import';

const MODEL = '@cf/moonshotai/kimi-k2.6';

interface Invocation {
  type: 'editor_action';
  draft?: { fields: Record<string, unknown> };
}

const fail = (message: string) => ({ toast: { type: 'error' as const, message } });

async function ask(system: string, user: string): Promise<unknown> {
  const answer = await env.AI.run(MODEL, {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_schema', json_schema: { name: 'cv', schema: cvJsonSchema } },
    reasoning_effort: 'none',
    // A little temperature keeps the model from looping on long lists; the cap stops it if it does anyway.
    temperature: 0.2,
    max_tokens: 8192,
  });
  const [choice] = answer.choices;
  if (choice?.finish_reason === 'length') throw new Error('the answer was cut off. Try again.');
  return JSON.parse(choice?.message.content ?? '');
}

/** "Fill from PDF" on the CV editor: Workers AI reads the uploaded PDF and fills the editor, which you then review. */
export function createPlugin() {
  return definePlugin({
    id: 'cv-import',
    version: '1.0.0',
    capabilities: ['admin.editor-draft:read', 'admin.editor-draft:patch'],
    routes: {
      extract: definePluginRoute({
        request: { body: 'json' },
        permission: 'content:edit_any',
        handler: async (ctx) => {
          const { draft } = ctx.input as Invocation;
          const pdf = draft?.fields.pdf as { meta?: { storageKey?: unknown } } | null | undefined;
          const key = pdf?.meta?.storageKey;
          if (typeof key !== 'string') return fail('Upload the PDF first, then try again.');

          const object = await env.MEDIA.get(key);
          if (!object) return fail("The PDF couldn't be read from storage.");
          let parsed: unknown;
          try {
            const markdown = await env.AI.toMarkdown({ name: 'cv.pdf', blob: new Blob([await object.arrayBuffer()], { type: 'application/pdf' }) });
            if (markdown.format === 'error') return fail(`Workers AI couldn't read the PDF: ${markdown.error}`);
            parsed = await ask(cvImportPrompt, markdown.data);
          } catch (error) {
            ctx.log.error('cv-import: Workers AI step failed', error);
            if (error instanceof SyntaxError) return fail('Workers AI returned something unreadable. Try again.');
            return fail(`Workers AI failed: ${error instanceof Error ? error.message : String(error)}`);
          }

          const operations = toCvPatch(parsed);
          if (operations.length === 0) return fail("Couldn't find any CV content in the PDF.");
          return {
            patch: { type: 'editor-draft-patch', operations },
            toast: { type: 'success', message: `Filled ${operations.map((op) => op.field).join(', ')}. Review the changes, then save.` },
          };
        },
      }),
    },
    admin: {
      editorActions: [
        {
          id: 'extract',
          label: 'Fill from PDF',
          route: 'extract',
          placement: 'toolbar',
          collections: ['cv'],
          confirm: {
            title: 'Fill the CV from its PDF?',
            text: 'Workers AI reads the uploaded PDF and replaces the headline, summary and each section it finds. It takes about a minute. Nothing is saved until you save.',
            confirm: 'Fill from PDF',
            deny: 'Cancel',
          },
          draft: { read: { fields: ['pdf'] }, patch: { fields: cvImportFields } },
        },
      ],
    },
  });
}
