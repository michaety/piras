-- NUMBERING NOTE: 0003 and 0006 existed and have been deleted — they
-- inserted seed/demo content, which migrations must never do (content
-- belongs in scripts/seed-dev.sql, applied with `npm run seed:dev`,
-- never to remote). Left as a gap rather than renumbered: this repo's
-- local D1 already had 0001-0006 recorded as applied by filename, and
-- renaming 0004/0005 to fill the gap would have made wrangler try to
-- re-run their (already-applied) schema changes under new names. Local
-- D1 state was reset and migrations 0001, 0002, 0004, 0005 reapplied
-- clean to confirm the surviving migrations are content-free on their
-- own.
--
-- Admin-managed listing lifecycle: draft -> published -> archived, and the
-- direct-to-R2 upload bookkeeping that makes uploading a 2GB deliverable
-- through the Worker unnecessary (Cloudflare's request body limit is
-- 100MB on Free/Pro; a real ZIP of stems exceeds that routinely).
--
-- cover_key / preview_key / deliverable_key hold the R2 object key, not a
-- URL — the client never supplies these; they're generated server-side in
-- upload-url.ts and only ever written by finalize.ts after a head() check
-- confirms the object actually exists and matches what was authorised.

ALTER TABLE products ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'published', 'archived'));
ALTER TABLE products ADD COLUMN cover_key TEXT;
ALTER TABLE products ADD COLUMN preview_key TEXT;
ALTER TABLE products ADD COLUMN deliverable_key TEXT;

-- products.updated_at already exists (0001_init.sql) — not re-added.

CREATE TABLE pending_uploads (
  id              TEXT PRIMARY KEY,
  listing_id      TEXT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  kind            TEXT NOT NULL CHECK (kind IN ('cover', 'preview', 'deliverable')),
  r2_key          TEXT NOT NULL,
  expected_size   INTEGER NOT NULL CHECK (expected_size > 0),
  content_type    TEXT NOT NULL,
  expires_at      INTEGER NOT NULL,
  created_at      INTEGER NOT NULL
);

CREATE INDEX idx_pending_uploads_listing_id ON pending_uploads (listing_id);
CREATE INDEX idx_pending_uploads_expires_at ON pending_uploads (expires_at);
