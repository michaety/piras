-- Dev-only seed, applied locally so the checkout -> fulfilment ->
-- download_grants path has real product rows to satisfy the order_items
-- and product_files foreign keys. There's no admin UI to create products
-- yet, and the storefront pages still read from
-- src/lib/fixtures/listings.ts, not this table — this exists purely so
-- the payment seam is testable against D1 before Stripe exists.
--
-- ids match src/lib/fixtures/listings.ts exactly (1-8) so the fixture and
-- the D1 row for the same product agree, once the pages are wired to D1.

INSERT INTO products
  (id, slug, title, type, price_cents, currency, bpm, musical_key, duration, formats, licence, description, featured, cover_url, preview_url, created_at, updated_at)
VALUES
  ('1', 'midnight-loading', 'Midnight Loading', 'beat', 3400, 'usd', 140, 'Am', '2:41', 'WAV + MP3', 'Unlimited', 'Late, patient, and slightly detuned.', 1, '/covers/midnight-loading.jpg', '/previews/midnight-loading.mp3', 1755000000000, 1755000000000),
  ('2', 'slow-burn', 'Slow Burn', 'pack', 4900, 'usd', NULL, NULL, NULL, 'WAV', 'Royalty-free', 'Twelve loops pulled from a week of tape experiments.', 1, '/covers/slow-burn.jpg', '/previews/slow-burn.mp3', 1755000000000, 1755000000000),
  ('3', 'ceiling-fan', 'Ceiling Fan', 'beat', 3400, 'usd', 128, 'Dm', '3:07', 'WAV + MP3', 'Unlimited', 'Hypnotic and repetitive by design.', 0, '/covers/ceiling-fan.jpg', '/previews/ceiling-fan.mp3', 1755000000000, 1755000000000),
  ('4', 'rust-belt', 'Rust Belt', 'stems', 7500, 'usd', 86, 'Gm', '4:12', 'WAV stems', 'Exclusive', 'Full session stems, unprocessed and dry.', 1, '/covers/rust-belt.jpg', '/previews/rust-belt.mp3', 1755000000000, 1755000000000),
  ('5', 'coastal-access', 'Coastal Access', 'sample', 2200, 'usd', 174, 'C', NULL, 'WAV', 'Royalty-free', 'A single long field recording chopped into twenty one-shots.', 0, '/covers/coastal-access.jpg', '/previews/coastal-access.mp3', 1755000000000, 1755000000000),
  ('6', 'nothing-doing', 'Nothing Doing', 'beat', 3400, 'usd', 150, 'Bbm', '2:58', 'WAV + MP3', 'Unlimited', 'Sparse and impatient.', 0, '/covers/nothing-doing.jpg', '/previews/nothing-doing.mp3', 1755000000000, 1755000000000),
  ('7', 'transit-lounge', 'Transit Lounge', 'beat', 3400, 'usd', 96, 'F#m', '3:22', 'WAV + MP3', 'Unlimited', 'Muzak turned inside out.', 0, '/covers/transit-lounge.jpg', '/previews/transit-lounge.mp3', 1755000000000, 1755000000000),
  ('8', 'dry-signal', 'Dry Signal', 'pack', 4900, 'usd', NULL, NULL, NULL, 'WAV', 'Royalty-free', 'Drum one-shots recorded flat with no processing.', 0, '/covers/dry-signal.jpg', '/previews/dry-signal.mp3', 1755000000000, 1755000000000);

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
