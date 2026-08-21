import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { StubProvider } from '../../../lib/payments';
import { applyPaymentEvent } from '../../../lib/orders/fulfillment';
import { validateCsrf } from '../../../lib/admin/csrf';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  // This route must not exist in production. 404, not 403 — a 403 would
  // still confirm the route is there.
  //
  // ENVIRONMENT is typed as the literal "development" because that's the
  // only value in this repo's wrangler.jsonc `vars`; the deployed value
  // legitimately varies by target, so the check is cast to a plain string
  // rather than left as a comparison TS considers unreachable.
  if ((env.ENVIRONMENT as string) === 'production') {
    return new Response('Not found', { status: 404 });
  }

  const form = await request.formData();

  if (!validateCsrf(request, form.get('csrf_token'))) {
    return new Response('Invalid request', { status: 403 });
  }

  const sessionId = form.get('sessionId');
  const outcome = form.get('outcome');

  if (typeof sessionId !== 'string' || (outcome !== 'paid' && outcome !== 'failed')) {
    return new Response('Bad request', { status: 400 });
  }

  const provider = new StubProvider(env.KV, env);

  if (outcome === 'paid') {
    await provider.markPaid(sessionId);
  }

  // Same payload shape a real provider webhook would send, run through the
  // identical parseWebhook -> fulfilment path a real webhook route would
  // use. No stub-specific fulfilment logic lives here.
  const event = await provider.parseWebhook(JSON.stringify({ sessionId, outcome }), null);
  await applyPaymentEvent(env.DB, event);

  if (outcome === 'paid') {
    return redirect(`/success?order=${encodeURIComponent(event.orderId ?? '')}`);
  }

  return redirect(`/checkout/stub?session=${encodeURIComponent(sessionId)}&failed=1`);
};
