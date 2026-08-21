import type {
  PaymentProvider,
  CheckoutRequest,
  CheckoutSession,
  PaymentEvent,
} from './types';

/**
 * StubProvider — a fake payment processor for development.
 *
 * Lets you exercise cart → checkout → order → download-grant end to end
 * without a single Stripe credential. It records intent in KV and bounces
 * straight to a local confirmation page that fires the same webhook payload
 * shape a real provider would.
 *
 * HARD GUARD: refuses to run in production. A stub that silently marks orders
 * paid on a live site would give away every file in the catalogue.
 */
export class StubProvider implements PaymentProvider {
  readonly name = 'stub';

  constructor(
    private kv: KVNamespace,
    private env: { ENVIRONMENT?: string },
  ) {
    if (env.ENVIRONMENT === 'production') {
      throw new Error(
        'StubProvider refuses to initialise in production. Configure a real provider.',
      );
    }
  }

  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const sessionId = `stub_cs_${crypto.randomUUID()}`;
    const total = req.items.reduce(
      (sum, i) => sum + i.unitAmount * i.quantity,
      0,
    );

    await this.kv.put(
      `stub:session:${sessionId}`,
      JSON.stringify({
        orderId: req.orderId,
        email: req.email,
        currency: req.currency,
        amountTotal: total,
        status: 'unpaid',
        createdAt: Date.now(),
      }),
      { expirationTtl: 3600 },
    );

    // A real provider hosts this page. We host a local imitation of it.
    return {
      sessionId,
      redirectUrl: `/checkout/stub?session=${sessionId}`,
    };
  }

  async parseWebhook(rawBody: string, _sig: string | null): Promise<PaymentEvent> {
    const body = JSON.parse(rawBody) as {
      sessionId?: string;
      outcome?: 'paid' | 'failed';
    };
    if (!body.sessionId) {
      return { type: 'ignored', orderId: null, sessionId: null, amountTotal: null, currency: null };
    }

    const raw = await this.kv.get(`stub:session:${body.sessionId}`);
    if (!raw) {
      return { type: 'ignored', orderId: null, sessionId: body.sessionId, amountTotal: null, currency: null };
    }
    const session = JSON.parse(raw);

    return {
      type: body.outcome === 'failed' ? 'payment.failed' : 'payment.succeeded',
      orderId: session.orderId,
      sessionId: body.sessionId,
      amountTotal: session.amountTotal,
      currency: session.currency,
    };
  }

  async getSessionStatus(sessionId: string): Promise<'paid' | 'unpaid' | 'expired'> {
    const raw = await this.kv.get(`stub:session:${sessionId}`);
    if (!raw) return 'expired';
    return JSON.parse(raw).status === 'paid' ? 'paid' : 'unpaid';
  }

  /** Stub-only: the confirmation page calls this to simulate paying. */
  async markPaid(sessionId: string): Promise<void> {
    const raw = await this.kv.get(`stub:session:${sessionId}`);
    if (!raw) return;
    const session = JSON.parse(raw);
    session.status = 'paid';
    await this.kv.put(`stub:session:${sessionId}`, JSON.stringify(session), {
      expirationTtl: 3600,
    });
  }
}
