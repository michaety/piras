import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { listings } from '../../lib/fixtures/listings';
import { getPaymentProvider } from '../../lib/payments';

export const prerender = false;

export const POST: APIRoute = async ({ request, url }) => {
  const form = await request.formData();
  const listingId = form.get('listingId');
  const email = form.get('email');

  if (typeof listingId !== 'string' || typeof email !== 'string') {
    return new Response('Bad request', { status: 400 });
  }

  const listing = listings.find((l) => l.id === listingId);
  if (!listing) {
    return new Response('Not found', { status: 404 });
  }

  const orderId = crypto.randomUUID();
  const now = Date.now();

  try {
    // Order exists before the provider is ever called, so the fulfilment
    // path has a 'pending' row to transition regardless of which provider
    // completes the checkout.
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO orders (id, email, status, total_cents, currency, created_at, updated_at)
         VALUES (?, ?, 'pending', ?, ?, ?, ?)`,
      ).bind(orderId, email, listing.price_cents, listing.currency, now, now),
      env.DB.prepare(
        `INSERT INTO order_items (id, order_id, product_id, unit_price_cents, quantity)
         VALUES (?, ?, ?, ?, 1)`,
      ).bind(crypto.randomUUID(), orderId, listing.id, listing.price_cents),
    ]);

    const provider = getPaymentProvider({
      NAMESPACE: env.KV,
      ENVIRONMENT: env.ENVIRONMENT,
    });

    const session = await provider.createCheckout({
      items: [
        {
          productId: listing.id,
          variantId: listing.id,
          name: listing.title,
          unitAmount: listing.price_cents,
          quantity: 1,
        },
      ],
      currency: listing.currency,
      email,
      orderId,
      successUrl: new URL('/success', url).toString(),
      cancelUrl: new URL(`/shop/listings/${listing.id}`, url).toString(),
    });

    return Response.redirect(new URL(session.redirectUrl, url).toString(), 303);
  } catch (error) {
    console.error('checkout failed', error);
    return new Response('Checkout unavailable', { status: 503 });
  }
};
