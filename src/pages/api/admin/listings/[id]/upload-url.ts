import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { validateCsrfToken } from '../../../../../lib/admin/csrf';
import {
  bucketNameFor,
  generateObjectKey,
  isUploadKind,
  UPLOAD_RULES,
} from '../../../../../lib/admin/uploads';
import { presignPutUrl, PRESIGN_TTL_SECONDS } from '../../../../../lib/admin/r2-presign';

export const prerender = false;

export const POST: APIRoute = async ({ request, params }) => {
  const listingId = params.id;
  if (typeof listingId !== 'string') {
    return new Response('Not found', { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return new Response('Invalid request', { status: 400 });
  }
  const b = body as Record<string, unknown>;

  if (!validateCsrfToken(request, b.csrf_token)) {
    return new Response('Invalid request', { status: 403 });
  }

  const listing = await env.DB.prepare(`SELECT id FROM products WHERE id = ?`).bind(listingId).first();
  if (!listing) {
    return new Response('Not found', { status: 404 });
  }

  const kind = b.kind;
  if (!isUploadKind(kind)) {
    return Response.json({ error: 'Unknown upload kind.' }, { status: 400 });
  }

  const contentType = b.contentType;
  const rule = UPLOAD_RULES[kind];
  if (typeof contentType !== 'string' || !(contentType in rule.contentTypes)) {
    return Response.json({ error: `${kind} must be one of: ${Object.keys(rule.contentTypes).join(', ')}.` }, { status: 400 });
  }

  const size = b.size;
  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) {
    return Response.json({ error: 'Invalid file size.' }, { status: 400 });
  }
  if (size > rule.maxBytes) {
    return Response.json(
      { error: `${kind} exceeds the ${Math.round(rule.maxBytes / (1024 * 1024))}MB limit.` },
      { status: 400 },
    );
  }

  const key = generateObjectKey(listingId, kind, contentType);
  const bucketName = bucketNameFor(kind);

  let uploadUrl: string;
  try {
    uploadUrl = await presignPutUrl(env, bucketName, key, contentType);
  } catch (error) {
    console.error('presign failed', error);
    return new Response('Could not authorise upload', { status: 500 });
  }

  const now = Date.now();
  const expiresAt = now + PRESIGN_TTL_SECONDS * 1000;

  try {
    await env.DB.prepare(
      `INSERT INTO pending_uploads (id, listing_id, kind, r2_key, expected_size, content_type, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(crypto.randomUUID(), listingId, kind, key, size, contentType, expiresAt, now)
      .run();
  } catch (error) {
    console.error('recording pending upload failed', error);
    return new Response('Could not authorise upload', { status: 500 });
  }

  // The key is never returned to the client — finalize looks it up from
  // pending_uploads by listing + kind, not from anything the caller sends.
  return Response.json({ uploadUrl, contentType }, { status: 200 });
};
