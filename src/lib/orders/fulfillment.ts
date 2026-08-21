import type { PaymentEvent } from '../payments';
import { clearCart } from '../cart/session';

const GRANT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_DOWNLOADS = 5;

interface OrderRow {
  id: string;
  email: string;
  status: string;
  cart_id: string | null;
}

interface OrderItemRow {
  product_id: string;
}

/**
 * The single order-update path. Every payment provider — the stub today,
 * Stripe later — funnels its normalised PaymentEvent through this
 * function. There is no provider-specific fulfilment logic anywhere else;
 * a stub that had its own copy would stop testing the thing it exists to
 * test.
 */
export async function applyPaymentEvent(db: D1Database, event: PaymentEvent): Promise<void> {
  if (!event.orderId) return;

  switch (event.type) {
    case 'payment.succeeded':
      await markOrderPaid(db, event.orderId);
      return;
    case 'payment.failed':
      await db
        .prepare(`UPDATE orders SET status = 'failed', updated_at = ? WHERE id = ? AND status = 'pending'`)
        .bind(Date.now(), event.orderId)
        .run();
      return;
    case 'payment.refunded':
      await db
        .prepare(`UPDATE orders SET status = 'refunded', updated_at = ? WHERE id = ?`)
        .bind(Date.now(), event.orderId)
        .run();
      return;
    case 'ignored':
      return;
  }
}

/**
 * Marks the order paid and issues one download grant per line item.
 * Guarded on status = 'pending' so a retried webhook (or a replayed stub
 * completion) can't issue a second batch of grants for the same order.
 */
async function markOrderPaid(db: D1Database, orderId: string): Promise<void> {
  const order = await db
    .prepare(`SELECT id, email, status, cart_id FROM orders WHERE id = ?`)
    .bind(orderId)
    .first<OrderRow>();

  if (!order || order.status !== 'pending') return;

  await db
    .prepare(`UPDATE orders SET status = 'paid', updated_at = ? WHERE id = ?`)
    .bind(Date.now(), orderId)
    .run();

  const items = await db
    .prepare(`SELECT product_id FROM order_items WHERE order_id = ?`)
    .bind(orderId)
    .all<OrderItemRow>();

  const now = Date.now();
  const expiresAt = now + GRANT_TTL_MS;

  for (const item of items.results ?? []) {
    await db
      .prepare(
        `INSERT INTO download_grants
           (id, token, order_id, product_id, buyer_email, max_downloads, download_count, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        crypto.randomUUID(),
        orderId,
        item.product_id,
        order.email,
        MAX_DOWNLOADS,
        expiresAt,
        now,
      )
      .run();
  }

  if (order.cart_id) {
    await clearCart(db, order.cart_id);
  }
}
