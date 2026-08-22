/**
 * Site-wide constants. Anything that appears in more than one place and might
 * change lives here, so it's one edit rather than a grep.
 */

export const PRODUCER_NAME = 'piras';

export const SITE_DESCRIPTION =
  'Beats, stems and sample packs. Instant download, cleared for release.';

/** Shown in the footer and on the contact page. Empty entries are not rendered. */
export const SOCIALS: ReadonlyArray<{ label: string; url: string }> = [
  { label: 'Instagram', url: '' },
  { label: 'SoundCloud', url: '' },
  { label: 'YouTube', url: '' },
];

/**
 * Storefront nav. Admin nav lives in AdminHeader and is deliberately
 * separate. Label reads "Work" while commerce is off — the catalogue is
 * a portfolio, not a shop, until COMMERCE_ENABLED flips.
 */
export function nav(commerceEnabled: boolean): ReadonlyArray<{ label: string; href: string }> {
  return [
    { label: commerceEnabled ? 'Shop' : 'Work', href: '/shop' },
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ];
}

/**
 * Whether the storefront (cart, checkout, downloads, prices) is live.
 * This is the one place that does a string comparison against the raw
 * wrangler.jsonc var — everywhere else calls this and gets a boolean.
 *
 * Takes the raw value as a parameter rather than reading
 * `env.COMMERCE_ENABLED` itself: this module is also bundled into the
 * client (StoreHeader.tsx imports from it), and `cloudflare:workers` is
 * a server-only virtual module that doesn't exist in a browser bundle.
 */
export function isCommerceEnabled(value: string | undefined): boolean {
  return value === 'true';
}
