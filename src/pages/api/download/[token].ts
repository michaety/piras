import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { checkRateLimit, clientIp } from '../../../lib/rate-limit';

export const prerender = false;

interface GrantRow {
  id: string;
  product_id: string;
  max_downloads: number;
  download_count: number;
  expires_at: number;
}

interface FileRow {
  bucket: 'public' | 'private';
  r2_key: string;
  filename: string;
}

/**
 * The only route that returns a private file. The R2 key always comes from
 * the download_grants -> product_files lookup, never from the request —
 * there is no way to pass an R2 key to this handler.
 */
export const GET: APIRoute = async ({ params, request }) => {
  const token = params.token;

  if (typeof token !== 'string' || token.length === 0) {
    return new Response('Not found', { status: 404 });
  }

  const rate = await checkRateLimit(env.KV, `download:${clientIp(request)}`, {
    limit: 20,
    windowSeconds: 60 * 10,
  });
  if (!rate.allowed) {
    return new Response('Too many requests', { status: 429 });
  }

  try {
    const grant = await env.DB.prepare(
      `SELECT id, product_id, max_downloads, download_count, expires_at
       FROM download_grants WHERE token = ?`,
    )
      .bind(token)
      .first<GrantRow>();

    if (!grant) {
      return new Response('Not found', { status: 404 });
    }
    if (grant.expires_at <= Date.now()) {
      return new Response('Link expired', { status: 410 });
    }
    if (grant.download_count >= grant.max_downloads) {
      return new Response('Download limit reached', { status: 410 });
    }

    const file = await env.DB.prepare(
      `SELECT bucket, r2_key, filename FROM product_files
       WHERE product_id = ? AND kind = 'full'
       ORDER BY created_at ASC LIMIT 1`,
    )
      .bind(grant.product_id)
      .first<FileRow>();

    if (!file || file.bucket !== 'private') {
      return new Response('Not found', { status: 404 });
    }

    const object = await env.PRIVATE_BUCKET.get(file.r2_key);
    if (!object) {
      return new Response('Not found', { status: 404 });
    }

    await env.DB.prepare(
      `UPDATE download_grants SET download_count = download_count + 1 WHERE id = ?`,
    )
      .bind(grant.id)
      .run();

    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file.filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('download failed', error);
    return new Response('Could not process download', { status: 500 });
  }
};
