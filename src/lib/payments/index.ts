import type { PaymentProvider } from './types';
import { StubProvider } from './stub';

export * from './types';
export { StubProvider } from './stub';

interface PaymentEnv {
  NAMESPACE: KVNamespace;
  ENVIRONMENT?: string;
  PAYMENT_PROVIDER?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
}

/**
 * The seam. Every route calls this and nothing else.
 *
 * Today it returns StubProvider. When Stripe is ready:
 *   1. add src/lib/payments/stripe.ts implementing PaymentProvider
 *   2. uncomment the branch below
 *   3. set PAYMENT_PROVIDER=stripe
 * No route file changes.
 */
export function getPaymentProvider(env: PaymentEnv): PaymentProvider {
  const choice = env.PAYMENT_PROVIDER ?? 'stub';

  switch (choice) {
    // case 'stripe': {
    //   if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    //     throw new Error('Stripe selected but STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET are unset.');
    //   }
    //   return new StripeProvider(env.STRIPE_SECRET_KEY, env.STRIPE_WEBHOOK_SECRET);
    // }
    case 'stub':
      return new StubProvider(env.NAMESPACE, env);
    default:
      throw new Error(`Unknown PAYMENT_PROVIDER: ${choice}`);
  }
}
