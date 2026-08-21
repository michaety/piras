import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { validateCsrf } from '../../../lib/admin/csrf';
import { cartCookie, ensureCart, getCartId } from '../../../lib/cart/session';
import { addToCart } from '../../../lib/cart/items';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();

  if (!validateCsrf(request, form.get('csrf_token'))) {
    return new Response('Invalid request', { status: 403 });
  }

  const productId = form.get('productId');
  if (typeof productId !== 'string' || productId.length === 0) {
    return new Response('Bad request', { status: 400 });
  }

  const cart = await ensureCart(env.DB, getCartId(request));
  const result = await addToCart(env.DB, cart.id, productId);

  const location = result.ok ? '/cart' : `/cart?error=${encodeURIComponent(result.error)}`;
  const headers = new Headers({ Location: location });
  if (cart.isNew) {
    headers.append('Set-Cookie', cartCookie(cart.id));
  }

  return new Response(null, { status: 303, headers });
};
