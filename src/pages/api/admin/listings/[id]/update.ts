import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { validateCsrfToken } from '../../../../../lib/admin/csrf';
import { parseListingInput } from '../../../../../lib/admin/listings';

export const prerender = false;

export const POST: APIRoute = async ({ request, params }) => {
  const id = params.id;
  if (typeof id !== 'string') {
    return new Response('Not found', { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const csrfToken = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).csrf_token : null;
  if (!validateCsrfToken(request, csrfToken)) {
    return new Response('Invalid request', { status: 403 });
  }

  const parsed = parseListingInput(body);
  if ('errors' in parsed) {
    return Response.json({ errors: parsed.errors }, { status: 400 });
  }

  const existing = await env.DB.prepare(`SELECT id FROM products WHERE id = ?`).bind(id).first();
  if (!existing) {
    return new Response('Not found', { status: 404 });
  }

  const { data } = parsed;

  try {
    await env.DB.prepare(
      `UPDATE products
       SET title = ?, type = ?, price_cents = ?, bpm = ?, musical_key = ?, duration = ?,
           formats = ?, licence = ?, description = ?, featured = ?, updated_at = ?
       WHERE id = ?`,
    )
      .bind(
        data.title,
        data.type,
        data.price_cents,
        data.bpm,
        data.musical_key,
        data.duration,
        data.formats,
        data.licence,
        data.description,
        data.featured ? 1 : 0,
        Date.now(),
        id,
      )
      .run();
  } catch (error) {
    console.error('update listing failed', error);
    return new Response('Could not update listing', { status: 500 });
  }

  return Response.json({ id }, { status: 200 });
};
