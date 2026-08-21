import { getCookie } from '../cookies';

export const CART_COOKIE = 'piras_cart';
const CART_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function getCartId(request: Request): string | null {
  return getCookie(request, CART_COOKIE);
}

export function cartCookie(cartId: string): string {
  // HttpOnly: nothing in the storefront reads this cookie client-side —
  // it's only ever echoed back by the browser on the next request.
  return `${CART_COOKIE}=${cartId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${CART_TTL_SECONDS}`;
}

/**
 * Returns an existing cart row for the id in the cookie, or creates a new
 * one. Every visitor gets their own opaque id — never a fixed key.
 */
export async function ensureCart(
  db: D1Database,
  cartId: string | null,
): Promise<{ id: string; isNew: boolean }> {
  const now = Date.now();

  if (cartId) {
    const existing = await db.prepare(`SELECT id FROM carts WHERE id = ?`).bind(cartId).first();
    if (existing) return { id: cartId, isNew: false };
  }

  const id = crypto.randomUUID();
  await db.prepare(`INSERT INTO carts (id, created_at, updated_at) VALUES (?, ?, ?)`).bind(id, now, now).run();
  return { id, isNew: true };
}

export async function touchCart(db: D1Database, cartId: string): Promise<void> {
  await db.prepare(`UPDATE carts SET updated_at = ? WHERE id = ?`).bind(Date.now(), cartId).run();
}

/** Called once an order's payment succeeds — a paid cart starts fresh. */
export async function clearCart(db: D1Database, cartId: string): Promise<void> {
  await db.prepare(`DELETE FROM cart_items WHERE cart_id = ?`).bind(cartId).run();
  await touchCart(db, cartId);
}
