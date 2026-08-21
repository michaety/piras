import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { validateCsrf } from '../../../../../lib/admin/csrf';

export const prerender = false;

interface ProductRow {
  cover_key: string | null;
  preview_key: string | null;
  deliverable_key: string | null;
}

async function archive(id: string): Promise<void> {
  await env.DB.prepare(`UPDATE products SET status = 'archived', updated_at = ? WHERE id = ?`)
    .bind(Date.now(), id)
    .run();
}

export const POST: APIRoute = async ({ request, params, redirect }) => {
  const id = params.id;
  if (typeof id !== 'string') {
    return new Response('Not found', { status: 404 });
  }

  const form = await request.formData();

  if (!validateCsrf(request, form.get('csrf_token'))) {
    return new Response('Invalid request', { status: 403 });
  }

  const product = await env.DB.prepare(
    `SELECT cover_key, preview_key, deliverable_key FROM products WHERE id = ?`,
  )
    .bind(id)
    .first<ProductRow>();

  if (!product) {
    return new Response('Not found', { status: 404 });
  }

  const grantCount = await env.DB.prepare(`SELECT COUNT(*) AS n FROM download_grants WHERE product_id = ?`)
    .bind(id)
    .first<{ n: number }>();

  if ((grantCount?.n ?? 0) > 0) {
    // Someone paid for this file. Its grant must keep working, so the
    // listing leaves the storefront rather than being removed outright.
    await archive(id);
    return redirect('/admin/listings?archived=1');
  }

  try {
    if (product.cover_key) await env.PUBLIC_BUCKET.delete(product.cover_key);
    if (product.preview_key) await env.PUBLIC_BUCKET.delete(product.preview_key);
    if (product.deliverable_key) await env.PRIVATE_BUCKET.delete(product.deliverable_key);

    // product_files cascades on delete (0001_init.sql). order_items does
    // not (ON DELETE RESTRICT) — a product with order_items from an
    // abandoned/failed checkout but zero grants would otherwise fail this
    // delete with a constraint error; archive instead in that case.
    await env.DB.prepare(`DELETE FROM products WHERE id = ?`).bind(id).run();
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('FOREIGN KEY')) {
      await archive(id);
      return redirect('/admin/listings?archived=1');
    }
    console.error('delete listing failed', error);
    return new Response('Could not delete listing', { status: 500 });
  }

  return redirect('/admin/listings?deleted=1');
};
