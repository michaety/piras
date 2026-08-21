export const SESSION_COOKIE = 'piras_admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export function generateSessionId(): string {
  return crypto.randomUUID();
}

export async function createSession(db: D1Database): Promise<{ id: string; expiresAt: number }> {
  const id = generateSessionId();
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_SECONDS * 1000;

  await db
    .prepare(`INSERT INTO admin_sessions (id, created_at, expires_at) VALUES (?, ?, ?)`)
    .bind(id, now, expiresAt)
    .run();

  return { id, expiresAt };
}

/**
 * The only valid check: does this id exist in the store and is it unexpired?
 * Presence of a cookie is never sufficient on its own.
 */
export async function validateSession(db: D1Database, sessionId: string): Promise<boolean> {
  if (!sessionId) return false;

  const row = await db
    .prepare(`SELECT expires_at FROM admin_sessions WHERE id = ?`)
    .bind(sessionId)
    .first<{ expires_at: number }>();

  if (!row) return false;
  return row.expires_at > Date.now();
}

export async function destroySession(db: D1Database, sessionId: string): Promise<void> {
  await db.prepare(`DELETE FROM admin_sessions WHERE id = ?`).bind(sessionId).run();
}

export function sessionCookie(sessionId: string, expiresAt: number): string {
  const expires = new Date(expiresAt).toUTCString();
  return `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Strict; Expires=${expires}`;
}

export function clearedSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}
