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

  try {
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
      orderId: crypto.randomUUID(),
      successUrl: new URL('/success', url).toString(),
      cancelUrl: new URL(`/shop/listings/${listing.id}`, url).toString(),
    });

    return Response.redirect(new URL(session.redirectUrl, url).toString(), 303);
  } catch (error) {
    console.error('checkout failed', error);
    return new Response('Checkout unavailable', { status: 503 });
  }
};
