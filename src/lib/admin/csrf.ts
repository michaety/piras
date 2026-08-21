import { getCookie } from '../cookies';

export { getCookie };

export const CSRF_COOKIE = 'piras_csrf';

export function generateCsrfToken(): string {
  return crypto.randomUUID();
}

export function csrfCookie(token: string): string {
  // Readable by the page (not HttpOnly) so it can be echoed into a hidden
  // form field; validity is enforced server-side by comparing to this
  // cookie, not by trusting the field alone.
  return `${CSRF_COOKIE}=${token}; Path=/; Secure; SameSite=Strict`;
}

/**
 * Same check for JSON request bodies (the admin listing/upload endpoints
 * are called via fetch, not a form submission) — compares a plain string
 * token to the CSRF cookie.
 */
export function validateCsrfToken(request: Request, submittedToken: unknown): boolean {
  const cookieToken = getCookie(request, CSRF_COOKIE);
  if (!cookieToken || typeof submittedToken !== 'string') return false;
  return cookieToken === submittedToken;
}

export function validateCsrf(request: Request, submittedToken: FormDataEntryValue | null): boolean {
  return validateCsrfToken(request, submittedToken);
}
