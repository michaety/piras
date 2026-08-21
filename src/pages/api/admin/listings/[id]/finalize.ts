import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { validateCsrfToken } from '../../../../../lib/admin/csrf';
import { bindingFor, type UploadKind } from '../../../../../lib/admin/uploads';

export const prerender = false;

interface PendingUploadRow {
  id: string;
  kind: UploadKind;
  r2_key: string;
  expected_size: number;
  content_type: string;
}

interface ProductRow {
  status: string;
  cover_key: string | null;
  preview_key: string | null;
  deliverable_key: string | null;
}

const COLUMN_FOR_KIND: Record<UploadKind, 'cover_key' | 'preview_key' | 'deliverable_key'> = {
  cover: 'cover_key',
  preview: 'preview_key',
  deliverable: 'deliverable_key',
};

// Kinds that also back the existing download-gated product_files table
// (see migrations/0001_init.sql and /api/download/[token]). Cover art has
// no equivalent there — product_files.kind only allows preview/full.
const PRODUCT_FILES_KIND: Partial<Record<UploadKind, 'preview' | 'full'>> = {
  preview: 'preview',
  deliverable: 'full',
};

export const POST: APIRoute = async ({ request, params }) => {
  const listingId = params.id;
  if (typeof listingId !== 'string') {
    return new Response('Not found', { status: 404 });
  }

  let body: unknown;
  try {
    body = request.headers.get('content-length') === '0' ? {} : await request.json();
  } catch {
    body = {};
  }
  const csrfToken = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).csrf_token : null;
  if (!validateCsrfToken(request, csrfToken)) {
    return new Response('Invalid request', { status: 403 });
  }

  const product = await env.DB.prepare(
    `SELECT status, cover_key, preview_key, deliverable_key FROM products WHERE id = ?`,
  )
    .bind(listingId)
    .first<ProductRow>();

  if (!product) {
    return new Response('Not found', { status: 404 });
  }

  const pending = await env.DB.prepare(
    `SELECT id, kind, r2_key, expected_size, content_type FROM pending_uploads WHERE listing_id = ?`,
  )
    .bind(listingId)
    .all<PendingUploadRow>();

  const verified: Record<string, string> = {}; // kind -> key
  const errors: Record<string, string> = {};

  for (const row of pending.results ?? []) {
    const bucket = bindingFor(env, row.kind);
    const head = await bucket.head(row.r2_key);

    if (!head) {
      errors[row.kind] = 'Upload did not complete — no object found.';
    } else if (head.size !== row.expected_size) {
      await bucket.delete(row.r2_key);
      errors[row.kind] = `Uploaded file was ${head.size} bytes, expected ${row.expected_size}.`;
    } else if ((head.httpMetadata?.contentType ?? '') !== row.content_type) {
      await bucket.delete(row.r2_key);
      errors[row.kind] = 'Uploaded file type did not match what was authorised.';
    } else {
      verified[row.kind] = row.r2_key;
    }

    await env.DB.prepare(`DELETE FROM pending_uploads WHERE id = ?`).bind(row.id).run();
  }

  // Apply verified keys. Replacing an existing asset deletes the old R2
  // object so it doesn't linger as an orphan.
  for (const [kindStr, newKey] of Object.entries(verified)) {
    const kind = kindStr as UploadKind;
    const column = COLUMN_FOR_KIND[kind];
    const oldKey = product[column];

    if (oldKey && oldKey !== newKey) {
      await bindingFor(env, kind).delete(oldKey);
    }

    await env.DB.prepare(`UPDATE products SET ${column} = ?, updated_at = ? WHERE id = ?`)
      .bind(newKey, Date.now(), listingId)
      .run();

    const filesKind = PRODUCT_FILES_KIND[kind];
    if (filesKind) {
      await env.DB.prepare(`DELETE FROM product_files WHERE product_id = ? AND kind = ?`)
        .bind(listingId, filesKind)
        .run();
      await env.DB.prepare(
        `INSERT INTO product_files (id, product_id, kind, bucket, r2_key, filename, size_bytes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          crypto.randomUUID(),
          listingId,
          filesKind,
          filesKind === 'full' ? 'private' : 'public',
          newKey,
          newKey.split('/').pop() ?? newKey,
          null,
          Date.now(),
        )
        .run();
    }
  }

  const finalRow = await env.DB.prepare(
    `SELECT status, cover_key, preview_key, deliverable_key FROM products WHERE id = ?`,
  )
    .bind(listingId)
    .first<ProductRow>();

  let published = false;
  if (
    finalRow &&
    finalRow.status === 'draft' &&
    finalRow.cover_key &&
    finalRow.preview_key &&
    finalRow.deliverable_key
  ) {
    await env.DB.prepare(`UPDATE products SET status = 'published', updated_at = ? WHERE id = ?`)
      .bind(Date.now(), listingId)
      .run();
    published = true;
  }

  const status = Object.keys(errors).length > 0 ? 207 : 200;
  return Response.json({ published, verified: Object.keys(verified), errors }, { status });
};
