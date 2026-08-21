-- Initial schema for piras.
--
-- Design corrections over the previous build, all deliberate:
--   * Money is INTEGER minor units (price_cents). Never REAL, never a string.
--   * orders / order_items form a real purchase ledger from day one.
--   * download_grants is per (order, product): a grant, not a boolean on the
--     product. The first sale never unlocks a file for every future visitor.
--   * No provider_id columns on domain tables. provider_refs holds every
--     external id, keyed by (provider, entity_type, entity_id, ref_type).
--   * carts are keyed by an opaque per-visitor session id, not a fixed key.

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
CREATE TABLE products (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('beat', 'stems', 'sample', 'pack')),
  price_cents   INTEGER NOT NULL CHECK (price_cents >= 0),
  currency      TEXT NOT NULL DEFAULT 'usd' CHECK (currency IN ('usd', 'aud', 'gbp', 'eur')),
  bpm           INTEGER,
  musical_key   TEXT,
  duration      TEXT,
  formats       TEXT NOT NULL,
  licence       TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  featured      INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE INDEX idx_products_type ON products (type);
CREATE INDEX idx_products_featured ON products (featured);

-- ---------------------------------------------------------------------------
-- product_files
-- One row per deliverable asset. `bucket` records which R2 bucket the key
-- lives in; the download route uses it, but never accepts it from a caller.
-- ---------------------------------------------------------------------------
CREATE TABLE product_files (
  id           TEXT PRIMARY KEY,
  product_id   TEXT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('preview', 'full')),
  bucket       TEXT NOT NULL CHECK (bucket IN ('public', 'private')),
  r2_key       TEXT NOT NULL,
  filename     TEXT NOT NULL,
  size_bytes   INTEGER,
  created_at   INTEGER NOT NULL
);

CREATE INDEX idx_product_files_product_id ON product_files (product_id);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
CREATE TABLE orders (
  id           TEXT PRIMARY KEY,
  email        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  total_cents  INTEGER NOT NULL CHECK (total_cents >= 0),
  currency     TEXT NOT NULL CHECK (currency IN ('usd', 'aud', 'gbp', 'eur')),
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_email ON orders (email);

-- ---------------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------------
CREATE TABLE order_items (
  id                 TEXT PRIMARY KEY,
  order_id           TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id         TEXT NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  unit_price_cents   INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  quantity           INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0)
);

CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_order_items_product_id ON order_items (product_id);

-- ---------------------------------------------------------------------------
-- download_grants
-- One row per buyer per product. Access is per-grant, never per-product:
-- the download route only serves a file when a valid, unexpired,
-- not-exhausted grant matches the token presented.
-- ---------------------------------------------------------------------------
CREATE TABLE download_grants (
  id               TEXT PRIMARY KEY,
  token            TEXT NOT NULL UNIQUE,
  order_id         TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id       TEXT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  buyer_email      TEXT NOT NULL,
  max_downloads    INTEGER NOT NULL DEFAULT 5 CHECK (max_downloads > 0),
  download_count   INTEGER NOT NULL DEFAULT 0 CHECK (download_count >= 0),
  expires_at       INTEGER NOT NULL,
  created_at       INTEGER NOT NULL
);

CREATE INDEX idx_download_grants_order_id ON download_grants (order_id);
CREATE INDEX idx_download_grants_product_id ON download_grants (product_id);
CREATE INDEX idx_download_grants_expires_at ON download_grants (expires_at);

-- ---------------------------------------------------------------------------
-- provider_refs
-- Every external id (Stripe or otherwise) lives here, never on a domain
-- table. `entity_type`/`entity_id` point at the local row the ref belongs to.
-- ---------------------------------------------------------------------------
CREATE TABLE provider_refs (
  id            TEXT PRIMARY KEY,
  provider      TEXT NOT NULL CHECK (provider IN ('stripe')),
  entity_type   TEXT NOT NULL CHECK (entity_type IN ('order', 'product')),
  entity_id     TEXT NOT NULL,
  ref_type      TEXT NOT NULL,
  ref_value     TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  UNIQUE (provider, entity_type, entity_id, ref_type)
);

CREATE INDEX idx_provider_refs_entity ON provider_refs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- contact_submissions
-- ---------------------------------------------------------------------------
CREATE TABLE contact_submissions (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  message      TEXT NOT NULL,
  created_at   INTEGER NOT NULL
);

-- ---------------------------------------------------------------------------
-- admin_sessions
-- id is the session token itself, as presented in the session cookie.
-- Presence of the cookie is never sufficient — every request must look the
-- id up here and check expires_at.
-- ---------------------------------------------------------------------------
CREATE TABLE admin_sessions (
  id           TEXT PRIMARY KEY,
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL
);

CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions (expires_at);
