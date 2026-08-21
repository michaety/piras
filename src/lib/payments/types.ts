/**
 * Payment provider seam.
 *
 * Nothing outside src/lib/payments/ may import Stripe, reference a Stripe ID,
 * or know that Stripe exists. Routes talk to PaymentProvider only. Swapping
 * StubProvider for StripeProvider is then a one-line change in index.ts.
 *
 * Money is ALWAYS integer minor units (cents). Never a float, never a string,
 * never dollars. The only place a decimal point appears is formatting for
 * display.
 */

export type Currency = 'usd' | 'aud' | 'gbp' | 'eur';

export interface LineItem {
  /** Our product id. Not the provider's. */
  productId: string;
  variantId: string;
  name: string;
  /** Integer minor units. 3400 = $34.00 */
  unitAmount: number;
  quantity: number;
}

export interface CheckoutRequest {
  items: LineItem[];
  currency: Currency;
  /** Buyer email — required, this is how the download link is delivered. */
  email: string;
  /** Our order id, generated before the provider is ever called. */
  orderId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  /** Provider's session id, or a synthetic one for the stub. */
  sessionId: string;
  /** Where to send the buyer next. */
  redirectUrl: string;
}

/**
 * Normalised webhook outcome. Providers translate their own event shapes
 * into this so order fulfilment logic never branches on provider.
 */
export interface PaymentEvent {
  type: 'payment.succeeded' | 'payment.failed' | 'payment.refunded' | 'ignored';
  /** Our order id, recovered from provider metadata. Never matched by title. */
  orderId: string | null;
  sessionId: string | null;
  amountTotal: number | null;
  currency: Currency | null;
}

export interface PaymentProvider {
  readonly name: string;

  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;

  /**
   * Verify authenticity and parse. MUST be constant-time / async-crypto based.
   * Throws on bad signature — callers return 400 and do not fulfil.
   */
  parseWebhook(rawBody: string, signature: string | null): Promise<PaymentEvent>;

  /** For reconciliation: confirm a session really was paid. */
  getSessionStatus(sessionId: string): Promise<'paid' | 'unpaid' | 'expired'>;
}

/** Format integer cents for display. The one place a decimal appears. */
export function formatMoney(minor: number, currency: Currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(minor / 100);
}
