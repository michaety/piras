import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { verifyPassword } from '../../../lib/admin/password';
import { createSession, sessionCookie } from '../../../lib/admin/session';
import { validateCsrf } from '../../../lib/admin/csrf';
import { checkRateLimit, clientIp } from '../../../lib/rate-limit';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  const rate = await checkRateLimit(env.KV, `admin-login:${clientIp(request)}`, {
    limit: 10,
    windowSeconds: 60 * 15,
  });
  if (!rate.allowed) {
    return new Response('Too many requests', { status: 429 });
  }

  const form = await request.formData();

  if (!validateCsrf(request, form.get('csrf_token'))) {
    return new Response('Invalid request', { status: 403 });
  }

  const password = form.get('password');
  if (typeof password !== 'string' || password.length === 0) {
    return redirect('/admin/login?error=1');
  }

  const valid = await verifyPassword(password, env.ADMIN_PASSWORD_HASH);
  if (!valid) {
    return redirect('/admin/login?error=1');
  }

  const session = await createSession(env.DB);

  return new Response(null, {
    status: 303,
    headers: {
      Location: '/admin',
      'Set-Cookie': sessionCookie(session.id, session.expiresAt),
    },
  });
};
