import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { validateCsrf } from '../../../../../lib/admin/csrf';

export const prerender = false;

/**
 * published -> draft, on purpose. Existing grants are untouched — this
 * only pulls the listing off the storefront, same as archiving does, but
 * reversible (finalize.ts republishes it once the producer's ready).
 */
export const POST: APIRoute = async ({ request, params, redirect }) => {
  const id = params.id;
  if (typeof id !== 'string') {
    return new Response('Not found', { status: 404 });
  }

  const form = await request.formData();

  if (!validateCsrf(request, form.get('csrf_token'))) {
    return new Response('Invalid request', { status: 403 });
  }

  const product = await env.DB.prepare(`SELECT status FROM products WHERE id = ?`).bind(id).first<{ status: string }>();
  if (!product) {
    return new Response('Not found', { status: 404 });
  }

  if (product.status === 'published') {
    await env.DB.prepare(`UPDATE products SET status = 'draft', updated_at = ? WHERE id = ?`)
      .bind(Date.now(), id)
      .run();
  }

  return redirect('/admin/listings?unpublished=1');
};
