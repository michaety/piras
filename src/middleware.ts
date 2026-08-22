import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { getCookie } from './lib/admin/csrf';
import { SESSION_COOKIE, validateSession } from './lib/admin/session';
import { isCommerceEnabled } from './lib/site';

const PUBLIC_ADMIN_PATHS = new Set(['/admin/login', '/api/admin/login']);

/**
 * Every route commerce touches — cart, checkout, downloads. Checked as
 * exact matches or explicit prefixes, not a single startsWith on
 * something short enough to accidentally catch more than intended.
 */
function isCommerceRoute(pathname: string): boolean {
  return (
    pathname === '/cart' ||
    pathname === '/checkout' ||
    pathname.startsWith('/checkout/') ||
    pathname === '/success' ||
    pathname === '/api/cart' ||
    pathname.startsWith('/api/cart/') ||
    pathname === '/api/checkout' ||
    pathname.startsWith('/api/checkout/') ||
    pathname === '/api/download' ||
    pathname.startsWith('/api/download/')
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Commerce gate first: when off, these routes don't exist. 404, not a
  // redirect and not 403 — either of those would confirm the route is
  // there, just unavailable. This has to hold regardless of admin auth
  // state, so it's checked before the admin branch, not after.
  if (!isCommerceEnabled(env.COMMERCE_ENABLED) && isCommerceRoute(pathname)) {
    return new Response(null, { status: 404 });
  }

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
