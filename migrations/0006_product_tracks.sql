-- Track listing for a product's detail page (stems/packs mainly — a
-- single beat has none). No admin UI writes to this table yet — same
-- position product_files was in before finalize.ts existed — but the
-- storefront query layer needs somewhere to read a tracklist from.

CREATE TABLE product_tracks (
  id           TEXT PRIMARY KEY,
  product_id   TEXT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  position     INTEGER NOT NULL,
  title        TEXT NOT NULL,
  duration     TEXT
);

CREATE INDEX idx_product_tracks_product_id ON product_tracks (product_id);
