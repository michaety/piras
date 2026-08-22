import type { Currency } from '../payments';

/**
 * Every storefront (and admin) read of a product goes through this
 * module — no page writes SQL inline. status = 'published' is enforced
 * here, in the WHERE clause, not left to the template: a draft or
 * archived listing must be unreachable by direct URL, not merely
 * unlinked.
 */

export type ProductType = 'beat' | 'stems' | 'sample' | 'pack';
export type ProductStatus = 'draft' | 'published' | 'archived';

export interface Product {
  id: string;
  slug: string;
  title: string;
  type: ProductType;
  status: ProductStatus;
  /** Integer minor units. Never a float — formatMoney() only at render. */
  priceCents: number;
  currency: Currency;
  bpm: number | null;
  musicalKey: string | null;
  duration: string | null;
  formats: string;
  licence: string;
  description: string;
  featured: boolean;
  /** R2 object key in piras-public, or null if none uploaded yet. */
  coverKey: string | null;
  /** R2 object key in piras-public, or null if none uploaded yet. */
  previewKey: string | null;
  /** R2 object key in piras-private, or null if none uploaded yet. */
  deliverableKey: string | null;
}

export interface ProductTrack {
  position: number;
  title: string;
  duration: string | null;
}

export interface ProductFile {
  kind: 'preview' | 'full';
  bucket: 'public' | 'private';
  r2Key: string;
  filename: string;
}

interface ProductRow {
  id: string;
  slug: string;
  title: string;
  type: ProductType;
  status: ProductStatus;
  price_cents: number;
  currency: Currency;
  bpm: number | null;
  musical_key: string | null;
  duration: string | null;
  formats: string;
  licence: string;
  description: string;
  featured: number;
  cover_key: string | null;
  preview_key: string | null;
  deliverable_key: string | null;
}

const PRODUCT_COLUMNS = `
  id, slug, title, type, status, price_cents, currency, bpm, musical_key,
  duration, formats, licence, description, featured, cover_key,
  preview_key, deliverable_key
`;

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: row.type,
    status: row.status,
    priceCents: row.price_cents,
    currency: row.currency,
    bpm: row.bpm,
    musicalKey: row.musical_key,
    duration: row.duration,
    formats: row.formats,
    licence: row.licence,
    description: row.description,
    featured: row.featured === 1,
    coverKey: row.cover_key,
    previewKey: row.preview_key,
    deliverableKey: row.deliverable_key,
  };
}

export async function listPublished(db: D1Database, opts: { type?: ProductType } = {}): Promise<Product[]> {
  const statement = opts.type
    ? db
        .prepare(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE status = 'published' AND type = ? ORDER BY created_at DESC`)
        .bind(opts.type)
    : db.prepare(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE status = 'published' ORDER BY created_at DESC`);

  const result = await statement.all<ProductRow>();
  return (result.results ?? []).map(mapProduct);
}

export async function getPublishedBySlug(db: D1Database, slug: string): Promise<Product | null> {
  const row = await db
    .prepare(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE status = 'published' AND slug = ?`)
    .bind(slug)
    .first<ProductRow>();
  return row ? mapProduct(row) : null;
}

export async function listFeatured(db: D1Database): Promise<Product[]> {
  const result = await db
    .prepare(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE status = 'published' AND featured = 1 ORDER BY created_at DESC`)
    .all<ProductRow>();
  return (result.results ?? []).map(mapProduct);
}

export async function getTracks(db: D1Database, productId: string): Promise<ProductTrack[]> {
  const result = await db
    .prepare(`SELECT position, title, duration FROM product_tracks WHERE product_id = ? ORDER BY position ASC`)
    .bind(productId)
    .all<ProductTrack>();
  return result.results ?? [];
}

export async function getProductFiles(db: D1Database, productId: string): Promise<ProductFile[]> {
  const result = await db
    .prepare(`SELECT kind, bucket, r2_key, filename FROM product_files WHERE product_id = ?`)
    .bind(productId)
    .all<{ kind: 'preview' | 'full'; bucket: 'public' | 'private'; r2_key: string; filename: string }>();

  return (result.results ?? []).map((row) => ({
    kind: row.kind,
    bucket: row.bucket,
    r2Key: row.r2_key,
    filename: row.filename,
  }));
}

// --- Admin: every status, not just published --------------------------

export async function listAll(db: D1Database): Promise<Product[]> {
  const result = await db.prepare(`SELECT ${PRODUCT_COLUMNS} FROM products ORDER BY updated_at DESC`).all<ProductRow>();
  return (result.results ?? []).map(mapProduct);
}

export async function getById(db: D1Database, id: string): Promise<Product | null> {
  const row = await db.prepare(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = ?`).bind(id).first<ProductRow>();
  return row ? mapProduct(row) : null;
}
