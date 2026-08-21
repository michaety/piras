import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { SESSION_COOKIE, clearedSessionCookie, destroySession } from '../../../lib/admin/session';
import { getCookie, validateCsrf } from '../../../lib/admin/csrf';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();

  if (!validateCsrf(request, form.get('csrf_token'))) {
    return new Response('Invalid request', { status: 403 });
  }

  const sessionId = getCookie(request, SESSION_COOKIE);
  if (sessionId) {
    await destroySession(env.DB, sessionId);
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: '/admin/login',
      'Set-Cookie': clearedSessionCookie(),
    },
  });
};
