import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

/**
 * Serves objects out of piras-public — but only ones D1 actually
 * references as a cover_key or preview_key on some product. The key
 * still arrives in the URL (a public asset route has to work that way),
 * but it's never trusted on its own: it's looked up first, and only
 * served if it matches a row. That makes "an R2 key always comes from
 * the database" hold with no exception to remember, instead of resting
 * on "well, PUBLIC_BUCKET has nothing sensitive in it anyway."
 *
 * Still a different category of route from /api/download/[token]: this
 * only ever touches PUBLIC_BUCKET, and the private bucket's key still
 * only ever comes from a download_grants lookup.
 */
export const GET: APIRoute = async ({ params }) => {
  const key = params.key;
  if (typeof key !== 'string' || key.length === 0) {
    return new Response('Not found', { status: 404 });
  }

  const match = await env.DB.prepare(
    `SELECT 1 FROM products WHERE cover_key = ?1 OR preview_key = ?1 LIMIT 1`,
  )
    .bind(key)
    .first();

  if (!match) {
    return new Response('Not found', { status: 404 });
  }

  const object = await env.PUBLIC_BUCKET.get(key);
  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      // Keys are UUID-suffixed and never reused for different content
      // (finalize.ts mints a fresh key on replace) — safe to cache hard.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
