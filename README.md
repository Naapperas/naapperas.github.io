# naapperas.pt

My personal site: who I am, my projects, my CV, a contact form and a (currently hidden) blog, in English and
European Portuguese.

It runs on [Astro](https://astro.build) on a single Cloudflare Worker, with [EmDash](https://github.com/emdash-cms/emdash) as the CMS.
Everything you see is edited in the admin at `/_emdash/admin`, which only I can reach through Cloudflare Access.

## How it fits together

- **Content** lives in D1 (text) and R2 (images, the CV PDF), edited through EmDash. `seed/seed.json` defines the
  collections and the starting content.
- **Pages** render on demand and sit behind Workers Cache. Publishing in the admin purges the affected pages by cache tag.
- **The gateway** (`src/worker.ts`) picks the language on `/` from `Accept-Language` or the `lang` cookie before the
  cache, adds security headers, and hands everything else to the cached `Site` entrypoint.
- **Site options** in the admin switch the colour palette, the blog and the home page panels on or off, and set the
  project order.

Cloudflare features in use:

| Feature | What for |
| :-- | :-- |
| D1, R2, KV | Content, media, EmDash's object cache and sessions |
| Workers Cache | Edge caching for pages, OG images and resized media |
| Access | The only way into `/_emdash` |
| Images binding | Resizing media served from R2 |
| Workers AI | "Fill from PDF" on the CV entry: reads the uploaded PDF and fills the structured fields for review |
| Browser Rendering | Open Graph images: screenshots of `/og-card/*`, stored in R2 |
| Turnstile, Email Routing, Rate Limiting | The contact form |
| Web Analytics | Page views (injected at the edge) |

## Local development

Requires Node 24.

```sh
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

Open http://127.0.0.1:4321/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin to sign in as a local admin.
The first visit applies the seed's schema, and the setup wizard can add its sample content.

Workers AI only runs remotely, and the remote proxy sits behind Access. To try "Fill from PDF" locally, run
`REMOTE_BINDINGS=true npm run dev` in a real terminal, so wrangler can open the Access login.

| Command | Action |
| :-- | :-- |
| `npm run dev` | Dev server on `localhost:4321` |
| `npm test` | Unit tests (Vitest) |
| `npm run check` | Type check (`astro check`) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Build, then serve it with workerd. Stop the dev server first; they share `.wrangler/state` |
| `npm run cf-typegen` | Regenerate `worker-configuration.d.ts` after changing bindings |

## Deployment

Workers Builds deploys `main` to the `website` Worker on naapperas.pt and uploads a preview version for every other
branch. Secrets are set once with `wrangler versions secret put`:

- `CF_ACCESS_AUDIENCE`: the audience tag of the Access application on `naapperas.pt/_emdash`.
- `TURNSTILE_SECRET_KEY`: the contact form's Turnstile widget.
- `GITHUB_TOKEN` (optional): a fine-grained token with public read access. It adds the contributions heatmap and
  avoids GitHub's anonymous rate limit.

Changing the content model of the deployed site goes through the admin, or through `seed/seed.json` on a fresh
database. See EmDash's guide on evolving a deployed site.
