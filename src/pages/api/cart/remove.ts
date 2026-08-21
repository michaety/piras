import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { validateCsrf } from '../../../lib/admin/csrf';
import { getCartId } from '../../../lib/cart/session';
import { removeFromCart } from '../../../lib/cart/items';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();

  if (!validateCsrf(request, form.get('csrf_token'))) {
    return new Response('Invalid request', { status: 403 });
  }

  const productId = form.get('productId');
  if (typeof productId !== 'string' || productId.length === 0) {
    return new Response('Bad request', { status: 400 });
  }

  const cartId = getCartId(request);
  if (cartId) {
    await removeFromCart(env.DB, cartId, productId);
  }

  return redirect('/cart');
};
