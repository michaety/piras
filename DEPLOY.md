# Deploying piras

This is the exact sequence for the first deploy. Nothing in this document has
been run — it's a plan, not a log. Every `--remote` command here needs a
scoped `CLOUDFLARE_API_TOKEN` in the environment (see the note at the top of
this repo's task history: the broad OAuth session `wrangler login` sets up is
not appropriate for this — it can see other, unrelated projects on the same
account). Run `wrangler whoami` first and confirm it's using the scoped
token, not an OAuth session, before anything below.

## 1. Create the remote resources

None of these exist yet — the ids in `wrangler.jsonc` right now
(`00000000-0000-0000-0000-000000000000` and similar) are placeholders for
local dev only.

```powershell
npx wrangler d1 create piras-db
npx wrangler kv namespace create piras-kv
npx wrangler r2 bucket create piras-public
npx wrangler r2 bucket create piras-private
```

Each command prints an id (D1: `database_id`; KV: `id`). Put them in
`wrangler.jsonc`:

| Command output | Goes in `wrangler.jsonc` at |
|---|---|
| `d1 create` → `database_id` | `d1_databases[0].database_id` |
| `kv namespace create` → `id` | `kv_namespaces[0].id` |
| R2 buckets need no id — `bucket_name` already matches | (no change) |

Commit that change. The bucket names (`piras-public`, `piras-private`) and
binding names (`DB`, `KV`, `PUBLIC_BUCKET`, `PRIVATE_BUCKET`) already match
what the code expects — only the ids are placeholders today.

## 2. Apply the schema — schema only

```powershell
npx wrangler d1 migrations apply piras-db --remote
```

This runs every file in `migrations/`. As of this pass, none of them insert
content — that rule is enforced by deleting any migration that did (see the
commit history: `0003_seed_dev_products.sql` and
`0006_publish_seeded_products.sql` were removed for exactly this reason).

**`scripts/seed-dev.sql` never runs against remote.** There is no
`--remote` variant of `npm run seed:dev`, and there must never be one — it
puts fake products with fake prices into whatever database it targets.
Don't add a flag or a second script that makes this one command away from
remote.

## 3. Secrets

```powershell
npx wrangler secret put ADMIN_PASSWORD_HASH
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
npx wrangler secret put R2_ACCOUNT_ID
```

Each prompts interactively — never pass the value as a CLI argument, never
put it in a committed file. `ADMIN_PASSWORD_HASH` is a PBKDF2 hash produced
by `hashPassword()` (see the README), not the plaintext password. The three
`R2_*` values come from an R2 API token scoped to the `piras-public` and
`piras-private` buckets only (Cloudflare dashboard → R2 → Manage R2 API
Tokens) — not your Cloudflare account's global API key.

## 4. Production vars

In `wrangler.jsonc`'s top-level `vars`, or via `wrangler.jsonc`'s `env.production.vars`
if a named environment is introduced later — either way, the deployed
Worker needs:

```jsonc
"vars": {
  "ENVIRONMENT": "production",
  "COMMERCE_ENABLED": "false"
}
```

`COMMERCE_ENABLED=false` for the first deploy — this is the whole point of
this pass. The site launches as a splash page and portfolio; flipping to
`"true"` later is a one-line config change and a redeploy, not code work.

`ENVIRONMENT=production` also matters beyond labelling: `StubProvider`
(`src/lib/payments/stub.ts`) refuses to initialise when
`ENVIRONMENT === 'production'`, and `/api/checkout/stub-complete` 404s under
the same condition. Getting this var right is what keeps the fake payment
path from being reachable on the live site.

## 5. Custom domain

In the Cloudflare dashboard: Workers & Pages → piras → Settings → Domains &
Routes → Add → Custom Domain. Cloudflare provisions the certificate and DNS
automatically for a zone already on the account. No code or config change
needed for this step — it's dashboard-only.

## 6. `piras-private` must not be public — verify, don't assume

R2 buckets are private by default (no public access), but confirm rather
than trust the default:

1. Cloudflare dashboard → R2 → `piras-private` → Settings → Public Access.
   Confirm "R2.dev subdomain" is **disabled** and no custom domain is
   attached to this bucket.
2. Then verify from outside the dashboard, not just by reading a setting:
   pick any real `deliverable_key` from the `products` table
   (`npx wrangler d1 execute piras-db --remote --command "SELECT deliverable_key FROM products WHERE deliverable_key IS NOT NULL LIMIT 1"`)
   and confirm there is **no URL that serves it directly** — no
   `pub-*.r2.dev` link, no bucket URL, nothing reachable without going
   through `/api/download/[token]`, which requires a valid, unexpired,
   not-exhausted `download_grants` row. If you can construct any URL that
   returns that file's bytes without a grant, the bucket is not actually
   private regardless of what the dashboard setting says.

`piras-public` is meant to be public — that's correct, not a mistake to fix.

## 7. Deploy

```powershell
npm run deploy
```

Which is:

```json
"deploy": "astro build && wrangler deploy"
```

`astro build` first, always — `wrangler deploy` on a stale `dist/` ships
whatever was last built, silently. Wrangler reads `wrangler.jsonc` directly;
there is no `--env production` flag needed unless a named environment gets
added later, in which case this script should be updated to pass it
explicitly rather than relying on wrangler's default environment.

## 8. Post-deploy checklist

Run every one of these against the live URL. Don't consider the deploy done
until all four pass.

- [ ] `GET /cart` → **404**. Also check `/checkout/stub`, `/api/checkout`
      (POST), `/api/download/anything` — all 404, not a redirect, not 403.
- [ ] View `/`, `/shop`, and any listing detail page — **no price string
      anywhere** in the rendered HTML (view source, don't just eyeball the
      layout; a price could be present but visually hidden).
- [ ] `GET /admin` while logged out → redirects to `/admin/login`, does
      **not** render the admin page. Confirm login actually works with the
      real `ADMIN_PASSWORD_HASH` secret before considering this done.
- [ ] Pick a real `preview_key` or `cover_key` from `products` and confirm
      `/media/<that key>` serves it (public assets should still work).
      Then pick a real `deliverable_key` and confirm there is **no**
      direct URL that serves it — same check as step 6, run again now
      that the Worker is actually live, not just the bucket setting.

If any of these fail, do not consider the deploy complete — this checklist
exists because a route that should 404 but doesn't is exactly the failure
class the original build shipped with.
