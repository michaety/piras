import type { ProductType } from '../fixtures/listings';

const PRODUCT_TYPES: readonly ProductType[] = ['beat', 'stems', 'sample', 'pack'];

export interface ListingInput {
  title: string;
  type: ProductType;
  description: string;
  price_cents: number;
  bpm: number | null;
  musical_key: string | null;
  duration: string | null;
  formats: string;
  licence: string;
  featured: boolean;
}

export type ListingInputErrors = Partial<Record<keyof ListingInput, string>>;

/**
 * The producer types a dollar amount ("34.00"); this is the one place it
 * gets converted to integer cents. Nothing downstream ever sees a float.
 */
export function dollarsToCents(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'listing'
  );
}

/**
 * Validates a JSON body against the listing shape. Returns either the
 * normalised input or a field-keyed error map — never throws on bad input,
 * since this runs on data an authenticated-but-fallible admin typed by hand.
 */
export function parseListingInput(body: unknown): { data: ListingInput } | { errors: ListingInputErrors } {
  if (typeof body !== 'object' || body === null) {
    return { errors: { title: 'Invalid request body' } };
  }

  const b = body as Record<string, unknown>;
  const errors: ListingInputErrors = {};

  const title = typeof b.title === 'string' ? b.title.trim() : '';
  if (!title || title.length > 200) errors.title = 'Title is required (max 200 characters).';

  const type = typeof b.type === 'string' ? (b.type as ProductType) : undefined;
  if (!type || !PRODUCT_TYPES.includes(type)) errors.type = 'Choose a valid type.';

  const description = typeof b.description === 'string' ? b.description.trim() : '';
  if (description.length > 4000) errors.description = 'Description is too long.';

  const price_cents = dollarsToCents(b.price);
  if (price_cents === null || price_cents <= 0) errors.price_cents = 'Enter a price greater than $0.00.';

  let bpm: number | null = null;
  if (b.bpm !== null && b.bpm !== undefined && b.bpm !== '') {
    const parsedBpm = Number(b.bpm);
    if (!Number.isFinite(parsedBpm) || parsedBpm <= 0 || parsedBpm > 400) {
      errors.bpm = 'BPM must be a number between 1 and 400.';
    } else {
      bpm = Math.round(parsedBpm);
    }
  }

  const musical_key =
    typeof b.musical_key === 'string' && b.musical_key.trim().length > 0 ? b.musical_key.trim() : null;
  if (musical_key && musical_key.length > 20) errors.musical_key = 'Key is too long.';

  const duration =
    typeof b.duration === 'string' && b.duration.trim().length > 0 ? b.duration.trim() : null;
  if (duration && !/^\d{1,2}:\d{2}$/.test(duration)) errors.duration = 'Duration must be mm:ss.';

  const formats = typeof b.formats === 'string' ? b.formats.trim() : '';
  if (!formats || formats.length > 200) errors.formats = 'Formats is required.';

  const licence = typeof b.licence === 'string' ? b.licence.trim() : '';
  if (!licence || licence.length > 200) errors.licence = 'Licence is required.';

  const featured = b.featured === true;

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    data: {
      title,
      type: type as ProductType,
      description,
      price_cents: price_cents as number,
      bpm,
      musical_key,
      duration,
      formats,
      licence,
      featured,
    },
  };
}
