-- Dev-only seed data. NOT a migration — migrations define schema only,
-- never content. Run with `npm run seed:dev`, which is hard-wired to
-- `--local`; there is no remote variant of this script and there must
-- never be one.
--
-- Replaces what used to be migrations/0003_seed_dev_products.sql +
-- 0006_publish_seeded_products.sql (deleted — inserting content from a
-- migration meant it would run against remote D1 too, putting eight
-- fake products with fake prices into a real storefront). Same 8
-- listings, already `published` — no separate migration needed
-- afterwards to fix up their status.
--
-- cover_key / preview_key are left NULL on purpose: there's no real
-- uploaded cover art or preview audio behind these rows, and the
-- storefront is required to render that case, not crash on it.
-- deliverable_key matches the product_files 'full' row below, same as a
-- real admin publish via finalize.ts would leave it — a checkout against
-- one of these will still 404 on download, since no object actually
-- exists at that key in local R2 either, which is the same "no
-- fabricated file" honesty as before.
--
-- ids match src/lib/fixtures/listings.ts (dev-seed reference only, not
-- imported by any page or route).

INSERT INTO products
  (id, slug, title, type, price_cents, currency, bpm, musical_key, duration, formats, licence, description, featured, status, deliverable_key, created_at, updated_at)
VALUES
  ('1', 'midnight-loading', 'Midnight Loading', 'beat', 3400, 'usd', 140, 'Am', '2:41', 'WAV + MP3', 'Unlimited', 'Late, patient, and slightly detuned.', 1, 'published', 'full/midnight-loading.zip', 1755000000000, 1755000000000),
  ('2', 'slow-burn', 'Slow Burn', 'pack', 4900, 'usd', NULL, NULL, NULL, 'WAV', 'Royalty-free', 'Twelve loops pulled from a week of tape experiments.', 1, 'published', 'full/slow-burn.zip', 1755000000000, 1755000000000),
  ('3', 'ceiling-fan', 'Ceiling Fan', 'beat', 3400, 'usd', 128, 'Dm', '3:07', 'WAV + MP3', 'Unlimited', 'Hypnotic and repetitive by design.', 0, 'published', 'full/ceiling-fan.zip', 1755000000000, 1755000000000),
  ('4', 'rust-belt', 'Rust Belt', 'stems', 7500, 'usd', 86, 'Gm', '4:12', 'WAV stems', 'Exclusive', 'Full session stems, unprocessed and dry.', 1, 'published', 'full/rust-belt.zip', 1755000000000, 1755000000000),
  ('5', 'coastal-access', 'Coastal Access', 'sample', 2200, 'usd', 174, 'C', NULL, 'WAV', 'Royalty-free', 'A single long field recording chopped into twenty one-shots.', 0, 'published', 'full/coastal-access.zip', 1755000000000, 1755000000000),
  ('6', 'nothing-doing', 'Nothing Doing', 'beat', 3400, 'usd', 150, 'Bbm', '2:58', 'WAV + MP3', 'Unlimited', 'Sparse and impatient.', 0, 'published', 'full/nothing-doing.zip', 1755000000000, 1755000000000),
  ('7', 'transit-lounge', 'Transit Lounge', 'beat', 3400, 'usd', 96, 'F#m', '3:22', 'WAV + MP3', 'Unlimited', 'Muzak turned inside out.', 0, 'published', 'full/transit-lounge.zip', 1755000000000, 1755000000000),
  ('8', 'dry-signal', 'Dry Signal', 'pack', 4900, 'usd', NULL, NULL, NULL, 'WAV', 'Royalty-free', 'Drum one-shots recorded flat with no processing.', 0, 'published', 'full/dry-signal.zip', 1755000000000, 1755000000000);

INSERT INTO product_files (id, product_id, kind, bucket, r2_key, filename, size_bytes, created_at)
VALUES
  ('pf_1_preview', '1', 'preview', 'public',  'previews/midnight-loading.mp3', 'midnight-loading-preview.mp3', NULL, 1755000000000),
  ('pf_1_full',    '1', 'full',    'private', 'full/midnight-loading.zip',     'midnight-loading.zip',         NULL, 1755000000000),
  ('pf_2_preview', '2', 'preview', 'public',  'previews/slow-burn.mp3',        'slow-burn-preview.mp3',        NULL, 1755000000000),
  ('pf_2_full',    '2', 'full',    'private', 'full/slow-burn.zip',            'slow-burn.zip',                NULL, 1755000000000),
  ('pf_3_preview', '3', 'preview', 'public',  'previews/ceiling-fan.mp3',      'ceiling-fan-preview.mp3',      NULL, 1755000000000),
  ('pf_3_full',    '3', 'full',    'private', 'full/ceiling-fan.zip',          'ceiling-fan.zip',              NULL, 1755000000000),
  ('pf_4_preview', '4', 'preview', 'public',  'previews/rust-belt.mp3',        'rust-belt-preview.mp3',        NULL, 1755000000000),
  ('pf_4_full',    '4', 'full',    'private', 'full/rust-belt.zip',            'rust-belt.zip',                NULL, 1755000000000),
  ('pf_5_preview', '5', 'preview', 'public',  'previews/coastal-access.mp3',   'coastal-access-preview.mp3',   NULL, 1755000000000),
  ('pf_5_full',    '5', 'full',    'private', 'full/coastal-access.zip',       'coastal-access.zip',           NULL, 1755000000000),
  ('pf_6_preview', '6', 'preview', 'public',  'previews/nothing-doing.mp3',    'nothing-doing-preview.mp3',    NULL, 1755000000000),
  ('pf_6_full',    '6', 'full',    'private', 'full/nothing-doing.zip',        'nothing-doing.zip',            NULL, 1755000000000),
  ('pf_7_preview', '7', 'preview', 'public',  'previews/transit-lounge.mp3',   'transit-lounge-preview.mp3',   NULL, 1755000000000),
  ('pf_7_full',    '7', 'full',    'private', 'full/transit-lounge.zip',       'transit-lounge.zip',           NULL, 1755000000000),
  ('pf_8_preview', '8', 'preview', 'public',  'previews/dry-signal.mp3',       'dry-signal-preview.mp3',       NULL, 1755000000000),
  ('pf_8_full',    '8', 'full',    'private', 'full/dry-signal.zip',           'dry-signal.zip',               NULL, 1755000000000);
