# piras

A beat store: beats, stems, and sample packs sold as digital downloads. One
seller, no marketplace, no accounts, no subscriptions.

Astro on Cloudflare Workers, with D1, KV, and R2.

## What's real

- Storefront pages (`/`, `/shop`, `/shop/listings/[id]`, `/contact`,
  `/about`, `/success`) rendering from `src/lib/fixtures/listings.ts` — not
  wired to D1 yet.
- The D1 schema (`migrations/0001_init.sql`): products, product_files,
  orders, order_items, download_grants, provider_refs,
  contact_submissions, admin_sessions.
- The token-gated download route (`/api/download/[token]`): looks up a
  grant in D1, checks expiry and download count, and only then streams the
  file from the `piras-private` R2 bucket. No route accepts an R2 key from
  the caller.
- Admin auth: PBKDF2-hashed password (`src/lib/admin/password.ts`),
  session ids stored in `admin_sessions` and validated on every request
  (`src/middleware.ts`) — not just checked for presence — plus CSRF tokens
  on the login/logout forms.
- `/api/contact`: writes to `contact_submissions`, rate-limited via KV.
- A stub payment provider (`src/lib/payments/stub.ts`) that fakes a
  checkout session so the buy flow is exercisable end to end without any
  payment credentials. It refuses to run if `ENVIRONMENT=production`.

## What isn't real

- No `stripe.ts`. `src/lib/payments/index.ts` selects a provider by
  `PAYMENT_PROVIDER`; only `stub` exists. Payments are not live.
- No product/order data in D1 — the storefront reads fixtures. Connecting
  the pages to D1 is a follow-up pass.
- The stub checkout redirects to `/checkout/stub`, which doesn't exist yet
  — there's no local confirmation page to simulate a paid webhook.
- No admin product management UI. `/admin` is just the reachable end of
  the auth path.
- No cart. Each listing checks out on its own.

## Stack

- [Astro](https://astro.build) (`output: 'server'`) on the
  [Cloudflare adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- D1 (orders, grants, sessions), KV (rate limiting, stub checkout state),
  R2 (`piras-public` for previews, `piras-private` for full files — never
  public)
- Tailwind v3 via PostCSS (not `@astrojs/tailwind`, which doesn't support
  Astro 7 — see below)
- React, for the one interactive header component

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

Apply the schema to the local D1 database:

```powershell
npx wrangler d1 migrations apply piras-db --local
```

Run it:

```powershell
npm run dev        # Astro dev server
npm run build       # build to dist/
npx wrangler dev     # run the built Worker locally, with bindings
```

`npm run deploy` doesn't exist yet — there's nothing to deploy until
payments are real.

## Design system

`src/styles/tokens.css` is the only place a colour literal may appear.
Everything else — Tailwind config, component classes in
`src/styles/globals.css` — references those custom properties. See
`tailwind.config.mjs` and `globals.css` for the rest of the rules (no
rounded corners, grooves instead of borders, the seven-segment font
reserved for tabular numeric data).

## Notable decisions

- **No `@astrojs/tailwind`.** It only supports Astro 3–5; `@astrojs/cloudflare`
  requires Astro 7. Tailwind is wired directly via `postcss.config.mjs`
  instead.
- **`cloudflare:workers` over `Astro.locals.runtime.env`.** The installed
  `@astrojs/cloudflare` version removed `locals.runtime.env` in favour of
  `import { env } from 'cloudflare:workers'`; every route and the
  middleware use that import.
- **No `carts` table.** The schema step's design notes mention fixing a
  fixed-key cart bug, but the enumerated table list doesn't include
  `carts`, and there's no cart in this pass — each listing checks out on
  its own via a per-listing "Buy" form.
