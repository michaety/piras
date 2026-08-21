import { getCartId, touchCart } from './session';
import type { Currency } from '../payments';

export interface CartItemRow {
  product_id: string;
  title: string;
  type: string;
  price_cents: number;
  currency: Currency;
}

export type AddToCartResult = { ok: true } | { ok: false; error: string };

/**
 * Only published listings can be added — a draft has no verified files,
 * and an archived one has left the storefront on purpose.
 */
export async function addToCart(db: D1Database, cartId: string, productId: string): Promise<AddToCartResult> {
  const product = await db
    .prepare(`SELECT id FROM products WHERE id = ? AND status = 'published'`)
    .bind(productId)
    .first();

  if (!product) {
    return { ok: false, error: 'That listing is not available.' };
  }

  // INSERT OR IGNORE: adding an item already in the cart is a no-op, not
  // an error — there's no quantity to increment.
  await db
    .prepare(`INSERT OR IGNORE INTO cart_items (id, cart_id, product_id, added_at) VALUES (?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), cartId, productId, Date.now())
    .run();

  await touchCart(db, cartId);
  return { ok: true };
}

export async function removeFromCart(db: D1Database, cartId: string, productId: string): Promise<void> {
  await db
    .prepare(`DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?`)
    .bind(cartId, productId)
    .run();
  await touchCart(db, cartId);
}

/**
 * Items whose product has since been unpublished or deleted are silently
 * excluded — the FK cascade already removes the latter, this covers the
 * former (archived while sitting in someone's cart).
 */
export async function getCartItems(db: D1Database, cartId: string): Promise<CartItemRow[]> {
  const result = await db
    .prepare(
      `SELECT p.id AS product_id, p.title AS title, p.type AS type, p.price_cents AS price_cents, p.currency AS currency
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.cart_id = ? AND p.status = 'published'
       ORDER BY ci.added_at ASC`,
    )
    .bind(cartId)
    .all<CartItemRow>();

  return result.results ?? [];
}

export async function getCartItemCount(db: D1Database, cartId: string | null): Promise<number> {
  if (!cartId) return 0;
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.cart_id = ? AND p.status = 'published'`,
    )
    .bind(cartId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** Convenience for pages that only need the count for the header badge. */
export async function getCartCountFromRequest(db: D1Database, request: Request): Promise<number> {
  return getCartItemCount(db, getCartId(request));
}
