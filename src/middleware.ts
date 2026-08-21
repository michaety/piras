import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { getCookie } from './lib/admin/csrf';
import { SESSION_COOKIE, validateSession } from './lib/admin/session';

const PUBLIC_ADMIN_PATHS = new Set(['/admin/login', '/api/admin/login']);

/**
 * Guards every /admin/* and /api/admin/* route. Both prefixes are checked
 * explicitly — the previous build's matcher only covered /admin and left
 * every /api/admin/* write route unauthenticated.
 *
 * Presence of the session cookie is never treated as authentication: the
 * id is looked up in admin_sessions and its expiry checked on every request.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');

  if (!isAdminRoute || PUBLIC_ADMIN_PATHS.has(pathname)) {
    return next();
  }

  const sessionId = getCookie(context.request, SESSION_COOKIE);

  const authenticated = sessionId ? await validateSession(env.DB, sessionId) : false;

  if (!authenticated) {
    if (pathname.startsWith('/api/')) {
      return new Response('Unauthorized', { status: 401 });
    }
    return context.redirect('/admin/login');
  }

  return next();
});
