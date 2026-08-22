import { nav, PRODUCER_NAME } from '../lib/site';

interface Props {
  /** Path of the page currently being rendered, for the active nav state. */
  currentPath: string;
  /** Whether commerce (cart, checkout, prices) is live. Required, not
   * defaulted — every caller must be explicit about which mode it's in. */
  commerceEnabled: boolean;
  /** Number of published-listing items in the visitor's cart. Ignored
   * (and the cart indicator hidden) when commerce is off. */
  cartCount?: number;
}

/**
 * Storefront header: wordmark and primary nav. No secrets or tokens ever
 * reach this component — it renders straight to anonymous visitors.
 */
export default function StoreHeader({ currentPath, commerceEnabled, cartCount }: Props) {
  return (
    <header className="groove flex items-center justify-between px-gutter py-4">
      <a href="/" className="font-cond text-lg uppercase tracking-tight">
        {PRODUCER_NAME}
      </a>

      <nav className="flex items-center gap-2">
        {nav(commerceEnabled).map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="key"
            aria-current={currentPath === link.href ? 'page' : undefined}
          >
            {link.label}
          </a>
        ))}
        {commerceEnabled && (
          <a
            href="/cart"
            className="lcd"
            aria-current={currentPath === '/cart' ? 'page' : undefined}
          >
            <span className="seg">{cartCount ?? 0}</span>
            <span className="unit">CART</span>
          </a>
        )}
      </nav>
    </header>
  );
}
