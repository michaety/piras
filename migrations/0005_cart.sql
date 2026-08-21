-- Cart, keyed by an opaque per-visitor session id (piras_cart cookie) —
-- never a fixed key. The old build used the single KV key "cart" for
-- every visitor on the site; every visitor overwrote everyone else's cart.
--
-- No quantity column: a digital download has no clear meaning for "buy 2
-- copies" (download_grants are issued one per order_item regardless), so
-- a cart_item is a set membership — a listing is either in the cart or
-- not. UNIQUE(cart_id, product_id) enforces that directly.

CREATE TABLE carts (
  id           TEXT PRIMARY KEY,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE TABLE cart_items (
  id           TEXT PRIMARY KEY,
  cart_id      TEXT NOT NULL REFERENCES carts (id) ON DELETE CASCADE,
  product_id   TEXT NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  added_at     INTEGER NOT NULL,
  UNIQUE (cart_id, product_id)
);

CREATE INDEX idx_cart_items_cart_id ON cart_items (cart_id);
CREATE INDEX idx_cart_items_product_id ON cart_items (product_id);

-- Lets fulfilment clear the cart that produced an order once payment
-- succeeds, without guessing which cart a buyer's email belongs to.
-- ON DELETE SET NULL: an abandoned cart getting reaped by cleanup should
-- never take a historical order's row down with it.
ALTER TABLE orders ADD COLUMN cart_id TEXT REFERENCES carts (id) ON DELETE SET NULL;
