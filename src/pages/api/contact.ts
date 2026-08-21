import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { checkRateLimit, clientIp } from '../../lib/rate-limit';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const rate = await checkRateLimit(env.KV, `contact:${clientIp(request)}`, {
    limit: 5,
    windowSeconds: 60 * 10,
  });
  if (!rate.allowed) {
    return new Response('Too many requests', { status: 429 });
  }

  const form = await request.formData();
  const name = form.get('name');
  const email = form.get('email');
  const message = form.get('message');

  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof message !== 'string' ||
    name.length === 0 ||
    email.length === 0 ||
    message.length === 0 ||
    name.length > 200 ||
    email.length > 320 ||
    message.length > 4000
  ) {
    return new Response('Bad request', { status: 400 });
  }

  try {
    await env.DB.prepare(
      `INSERT INTO contact_submissions (id, name, email, message, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(crypto.randomUUID(), name, email, message, Date.now())
      .run();
  } catch (error) {
    console.error('contact submission failed', error);
    return new Response('Could not submit message', { status: 500 });
  }

  return Response.redirect(new URL('/contact?sent=1', request.url).toString(), 303);
};
