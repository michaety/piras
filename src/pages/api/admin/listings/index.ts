import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { validateCsrfToken } from '../../../../lib/admin/csrf';
import { parseListingInput, slugify } from '../../../../lib/admin/listings';

export const prerender = false;

/** Ensures the generated slug is unique, appending -2, -3, ... on collision. */
async function uniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let suffix = 2;
  // Bounded — a producer isn't going to create hundreds of same-titled drafts.
  for (let i = 0; i < 50; i++) {
    const existing = await env.DB.prepare(`SELECT id FROM products WHERE slug = ?`).bind(candidate).first();
    if (!existing) return candidate;
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export const POST: APIRoute = async ({ request }) => {
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

  const { data } = parsed;
  const id = crypto.randomUUID();
  const slug = await uniqueSlug(slugify(data.title));
  const now = Date.now();

  try {
    await env.DB.prepare(
      `INSERT INTO products
         (id, slug, title, type, price_cents, currency, bpm, musical_key, duration, formats, licence, description, featured, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'usd', ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
    )
      .bind(
        id,
        slug,
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
        now,
        now,
      )
      .run();
  } catch (error) {
    console.error('create listing failed', error);
    return new Response('Could not create listing', { status: 500 });
  }

  return Response.json({ id, slug }, { status: 201 });
};
