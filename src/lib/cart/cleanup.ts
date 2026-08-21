const CART_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // matches the cookie TTL

/**
 * Deletes carts untouched for 30+ days (cart_items cascade). Safe for an
 * order to reference one of these — orders.cart_id is ON DELETE SET NULL,
 * so a reaped cart never takes a historical order down with it.
 */
export async function cleanupAbandonedCarts(env: Cloudflare.Env): Promise<{ cartsDeleted: number }> {
  const cutoff = Date.now() - CART_MAX_AGE_MS;
  const result = await env.DB.prepare(`DELETE FROM carts WHERE updated_at < ?`).bind(cutoff).run();
  return { cartsDeleted: result.meta.changes ?? 0 };
}
