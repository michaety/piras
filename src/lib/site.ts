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

/** Storefront nav. Admin nav lives in AdminHeader and is deliberately separate. */
export const NAV: ReadonlyArray<{ label: string; href: string }> = [
  { label: 'Shop', href: '/shop' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];
