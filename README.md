# piras

A beat store: beats, stems, and sample packs sold as digital downloads. One
seller, no marketplace, no accounts, no subscriptions.

Astro on Cloudflare Workers, with D1, KV, and R2.

## Launch state

The first public launch is a **portfolio, not a storefront**. Commerce
(cart, checkout, downloads, prices) is gated behind the `COMMERCE_ENABLED`
var in `wrangler.jsonc` — `"false"` by default. See `src/lib/site.ts`'s
`isCommerceEnabled()` and `src/middleware.ts` for the enforcement: gated
routes (`/cart`, `/checkout/*`, `/success`, `/api/cart/*`, `/api/checkout`,
`/api/download/*`) 404 outright when it's off, not redirect. Flip the var to
`"true"` and redeploy to go live with commerce — no code changes needed.

## What's real

- Storefront pages (`/`, `/shop`, `/shop/listings/[slug]`, `/contact`,
  `/about`) read D1 through `src/lib/products/queries.ts` —
  `status = 'published'` enforced in the query, not the template. A draft
  or archived listing 404s on its own URL, not just unlinked.
- Admin (`/admin/listings`): create, edit, publish, unpublish, and
  delete-or-archive listings. Cover art, preview audio, and the
  deliverable ZIP upload directly to R2 via presigned URLs
  (`src/lib/admin/r2-presign.ts`) — never through the Worker, since
  Cloudflare caps request bodies at 100MB on Free/Pro and a ZIP of stems
  exceeds that routinely. `finalize.ts` verifies each upload against what
  was authorised (size, content type) before publishing.
- `src/pages/media/[...key].ts`: serves `piras-public` objects, but only
  ones that match a `cover_key` or `preview_key` on some product in D1 —
  the key still arrives in the URL, but it's looked up first, never
  trusted on its own.
- The token-gated download route (`/api/download/[token]`): looks up a
  grant in D1, checks expiry and download count, and only then streams the
  file from `piras-private`. No route accepts an R2 key from the caller.
- Cart (`carts`/`cart_items`, keyed by an opaque `piras_cart` cookie, one
  per product per cart — no quantity, since "buy 2 copies" of a digital
  download has no clear meaning) and checkout, built against a stub
  payment provider (`src/lib/payments/stub.ts`) that exercises the full
  cart → order → pay → grant → download loop with no payment credentials.
  It refuses to run, and `/api/checkout/stub-complete` 404s, if
  `ENVIRONMENT=production`.
- Admin auth: PBKDF2-hashed password, session ids stored in
  `admin_sessions` and validated on every request — not just checked for
  presence — plus CSRF tokens on every state-changing form.
- `/api/contact`: writes to `contact_submissions`, rate-limited via KV.
  Detail pages link "Enquire about this track" → `/contact?ref={slug}`
  when commerce is off, prefilling the message.
- Daily cron (`src/worker-entry.ts`): reaps expired `pending_uploads` rows
  (and the R2 objects they reference) and carts abandoned 30+ days.

## What isn't real

- No `stripe.ts`. `src/lib/payments/index.ts` selects a provider by
  `PAYMENT_PROVIDER`; only `stub` exists.
- Not deployed. See `DEPLOY.md` for the exact sequence when that's ready —
  it's a plan, not a log of anything that's been run.

## Stack

- [Astro](https://astro.build) (`output: 'server'`) on the
  [Cloudflare adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/),
  via a custom worker entry (`src/worker-entry.ts`) so a `scheduled()`
  cron handler can sit alongside Astro's fetch handler
- D1 (products, orders, grants, sessions, cart), KV (rate limiting, stub
  checkout state), R2 (`piras-public` for cover/preview, `piras-private`
  for full files — never public; see `DEPLOY.md` for how to verify that)
- Tailwind v3 via PostCSS (not `@astrojs/tailwind`, which doesn't support
  Astro 7)
- React, for the two interactive components (`StoreHeader`, the admin
  `ListingForm`'s upload progress)

## Setup

```powershell
npm install
Copy-Item .dev.vars.example .dev.vars
```

Generate an admin password hash and put it in `.dev.vars` as
`ADMIN_PASSWORD_HASH` (never the plaintext password):

```powershell
node -e "(async()=>{const s=crypto.getRandomValues(new Uint8Array(16));const km=await crypto.subtle.importKey('raw',new TextEncoder().encode('YOUR_PASSWORD'),'PBKDF2',false,['deriveBits']);const h=await crypto.subtle.deriveBits({name:'PBKDF2',salt:s,iterations:210000,hash:'SHA-256'},km,256);const b64=b=>Buffer.from(b).toString('base64');console.log('pbkdf2$210000$'+b64(s)+'$'+b64(h))})()" --experimental-global-webcrypto
```

`.dev.vars` also needs `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` /
`R2_ACCOUNT_ID` for presigned uploads to work locally — see
`.dev.vars.example`.

Apply the schema to the local D1 database, then seed dev content
(fake listings — **local only**, see the warning in `scripts/seed-dev.sql`):

```powershell
npx wrangler d1 migrations apply piras-db --local
npm run seed:dev
```

Run it:

```powershell
npm run dev          # Astro dev server
npm run build         # build to dist/
npx wrangler dev       # run the built Worker locally, with bindings
```

`npm run deploy` exists now (`astro build && wrangler deploy`) but hasn't
been run — see `DEPLOY.md`.

## Design system

`src/styles/tokens.css` is the only place a colour literal may appear.
Everything else — Tailwind config, component classes in
`src/styles/globals.css` — references those custom properties. See
`tailwind.config.mjs` and `globals.css` for the rest of the rules (no
rounded corners, grooves instead of borders, the seven-segment font
reserved for tabular numeric data, the page-load LCD self-test on `/`).

## Notable decisions

- **No `@astrojs/tailwind`.** It only supports Astro 3–5; `@astrojs/cloudflare`
  requires Astro 7. Tailwind is wired directly via `postcss.config.mjs`
  instead.
- **`cloudflare:workers` over `Astro.locals.runtime.env`.** The installed
  `@astrojs/cloudflare` version removed `locals.runtime.env` in favour of
  `import { env } from 'cloudflare:workers'`.
- **Migrations never insert content.** `scripts/seed-dev.sql` (run with
  `npm run seed:dev`, hard-wired to `--local`) is the only source of fake
  data, and there is no `--remote` variant of it.
- **This sandbox has an authenticated Cloudflare session with real,
  unrelated production D1 databases from other projects on the account.**
  Treat any `--remote` command with real caution; see `DEPLOY.md` for the
  scoped-token setup this project expects before deploying.
