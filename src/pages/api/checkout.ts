import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { validateCsrf } from '../../lib/admin/csrf';
import { getCartId } from '../../lib/cart/session';
import { getCartItems } from '../../lib/cart/items';
import { getPaymentProvider, type LineItem } from '../../lib/payments';

export const prerender = false;

export const POST: APIRoute = async ({ request, url, redirect }) => {
  const form = await request.formData();

  if (!validateCsrf(request, form.get('csrf_token'))) {
    return new Response('Invalid request', { status: 403 });
  }

  const email = form.get('email');
  if (typeof email !== 'string' || email.length === 0) {
    return new Response('Bad request', { status: 400 });
  }

  const cartId = getCartId(request);
  const items = cartId ? await getCartItems(env.DB, cartId) : [];

  if (items.length === 0) {
    return redirect('/cart?error=Your%20cart%20is%20empty.');
  }

  // The catalogue is single-currency today; this takes the first item's
  // currency for the whole order rather than silently mixing currencies
  // if that ever changes.
  const currency = items[0].currency;
  const totalCents = items.reduce((sum, item) => sum + item.price_cents, 0);

  const orderId = crypto.randomUUID();
  const now = Date.now();

  try {
    // Order exists before the provider is ever called, so the fulfilment
    // path has a 'pending' row to transition regardless of which provider
    // completes the checkout. cart_id lets fulfilment clear this cart once
    // payment succeeds.
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO orders (id, email, status, total_cents, currency, cart_id, created_at, updated_at)
         VALUES (?, ?, 'pending', ?, ?, ?, ?, ?)`,
      ).bind(orderId, email, totalCents, currency, cartId, now, now),
      ...items.map((item) =>
        env.DB.prepare(
          `INSERT INTO order_items (id, order_id, product_id, unit_price_cents, quantity)
           VALUES (?, ?, ?, ?, 1)`,
        ).bind(crypto.randomUUID(), orderId, item.product_id, item.price_cents),
      ),
    ]);

    const provider = getPaymentProvider({
      NAMESPACE: env.KV,
      ENVIRONMENT: env.ENVIRONMENT,
    });

    const lineItems: LineItem[] = items.map((item) => ({
      productId: item.product_id,
      variantId: item.product_id,
      name: item.title,
      unitAmount: item.price_cents,
      quantity: 1,
    }));

    const session = await provider.createCheckout({
      items: lineItems,
      currency,
      email,
      orderId,
      successUrl: new URL('/success', url).toString(),
      cancelUrl: new URL('/cart', url).toString(),
    });

    return Response.redirect(new URL(session.redirectUrl, url).toString(), 303);
  } catch (error) {
    console.error('checkout failed', error);
    return new Response('Checkout unavailable', { status: 503 });
  }
};
