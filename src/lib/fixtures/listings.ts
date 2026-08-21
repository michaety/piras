/**
 * Development fixtures.
 *
 * These are the specification for the schema, not just placeholder content.
 * The storefront renders from this until D1 is wired up, which means the pages
 * are built against the data shape we *want* rather than one inherited from a
 * previous build.
 *
 * Rules this file encodes, all of which correct defects in the old codebase:
 *   - price_cents is an INTEGER in minor units. 3400 = $34.00. Never a float.
 *   - bpm and musical_key are nullable — packs and sample libraries have no
 *     single tempo or key. The UI must handle holes (.seg.is-off).
 *   - tracklist is optional; only packs and stems carry one.
 *   - No provider identifiers. Nothing named stripe_* belongs on a product.
 */

export type ProductType = 'beat' | 'stems' | 'sample' | 'pack';

export interface Track {
  position: number;
  title: string;
  /** mm:ss */
  duration: string;
}

export interface Listing {
  id: string;
  slug: string;
  title: string;
  type: ProductType;
  /** Integer minor units. */
  price_cents: number;
  currency: 'usd';
  /** Null for multi-item products with no single tempo. */
  bpm: number | null;
  /** Null for multi-item products with no single key. */
  musical_key: string | null;
  /** mm:ss, or null where a duration is meaningless. */
  duration: string | null;
  formats: string;
  licence: string;
  description: string;
  featured: boolean;
  tracklist?: Track[];
}

export const listings: Listing[] = [
  {
    id: '1',
    slug: 'midnight-loading',
    title: 'Midnight Loading',
    type: 'beat',
    price_cents: 3400,
    currency: 'usd',
    bpm: 140,
    musical_key: 'Am',
    duration: '2:41',
    formats: 'WAV + MP3',
    licence: 'Unlimited',
    description:
      'Late, patient, and slightly detuned. Built around a decaying Rhodes loop with the low end left deliberately open for vocals.',
    featured: true,
  },
  {
    id: '2',
    slug: 'slow-burn',
    title: 'Slow Burn',
    type: 'pack',
    price_cents: 4900,
    currency: 'usd',
    bpm: null,
    musical_key: null,
    duration: null,
    formats: 'WAV',
    licence: 'Royalty-free',
    description:
      'Twelve loops pulled from a week of tape experiments. Drums, keys, and texture beds, all tempo-labelled and key-tagged.',
    featured: true,
    tracklist: [
      { position: 1, title: 'Ash Keys', duration: '0:32' },
      { position: 2, title: 'Kettle Drums', duration: '0:16' },
      { position: 3, title: 'Room Tone A', duration: '1:04' },
      { position: 4, title: 'Bowed Bass', duration: '0:24' },
    ],
  },
  {
    id: '3',
    slug: 'ceiling-fan',
    title: 'Ceiling Fan',
    type: 'beat',
    price_cents: 3400,
    currency: 'usd',
    bpm: 128,
    musical_key: 'Dm',
    duration: '3:07',
    formats: 'WAV + MP3',
    licence: 'Unlimited',
    description:
      'Hypnotic and repetitive by design. Four bars that barely change, which is the point.',
    featured: false,
  },
  {
    id: '4',
    slug: 'rust-belt',
    title: 'Rust Belt',
    type: 'stems',
    price_cents: 7500,
    currency: 'usd',
    bpm: 86,
    musical_key: 'Gm',
    duration: '4:12',
    formats: 'WAV stems',
    licence: 'Exclusive',
    description:
      'Full session stems, unprocessed and dry. Eight tracks, no bus compression, mix it yourself.',
    featured: true,
    tracklist: [
      { position: 1, title: 'Kick', duration: '4:12' },
      { position: 2, title: 'Snare + Claps', duration: '4:12' },
      { position: 3, title: 'Bass', duration: '4:12' },
      { position: 4, title: 'Keys', duration: '4:12' },
      { position: 5, title: 'Pads', duration: '4:12' },
      { position: 6, title: 'Texture', duration: '4:12' },
    ],
  },
  {
    id: '5',
    slug: 'coastal-access',
    title: 'Coastal Access',
    type: 'sample',
    price_cents: 2200,
    currency: 'usd',
    bpm: 174,
    musical_key: 'C',
    duration: null,
    formats: 'WAV',
    licence: 'Royalty-free',
    description:
      'A single long field recording chopped into twenty usable one-shots. Water, gravel, wind on a microphone that should have had a windshield.',
    featured: false,
  },
  {
    id: '6',
    slug: 'nothing-doing',
    title: 'Nothing Doing',
    type: 'beat',
    price_cents: 3400,
    currency: 'usd',
    bpm: 150,
    musical_key: 'Bbm',
    duration: '2:58',
    formats: 'WAV + MP3',
    licence: 'Unlimited',
    description:
      'Sparse and impatient. Mostly space, with the drums doing all the work.',
    featured: false,
  },
  {
    id: '7',
    slug: 'transit-lounge',
    title: 'Transit Lounge',
    type: 'beat',
    price_cents: 3400,
    currency: 'usd',
    bpm: 96,
    musical_key: 'F#m',
    duration: '3:22',
    formats: 'WAV + MP3',
    licence: 'Unlimited',
    description:
      'Muzak turned inside out. Warm, slightly wrong, and long enough to sit in.',
    featured: false,
  },
  {
    id: '8',
    slug: 'dry-signal',
    title: 'Dry Signal',
    type: 'pack',
    price_cents: 4900,
    currency: 'usd',
    bpm: null,
    musical_key: null,
    duration: null,
    formats: 'WAV',
    licence: 'Royalty-free',
    description:
      'Drum one-shots recorded flat with no processing whatsoever. Kicks, snares, hats, and a handful of things that fell over.',
    featured: false,
  },
];

export const getListing = (slug: string): Listing | undefined =>
  listings.find((l) => l.slug === slug);

export const getFeatured = (): Listing[] => listings.filter((l) => l.featured);
