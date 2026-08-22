import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

/**
 * Serves objects out of piras-public only — cover art and preview audio,
 * which are meant to be publicly reachable by design (see
 * migrations/0001_init.sql). This is not the same category of route as
 * /api/download/[token]: there is nothing to gate here, and this handler
 * never touches PRIVATE_BUCKET. The key comes straight from the URL
 * because that's exactly what a public asset route is — the private
 * bucket's key still only ever comes from a download_grants lookup.
 */
export const GET: APIRoute = async ({ params }) => {
  const key = params.key;
  if (typeof key !== 'string' || key.length === 0) {
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
