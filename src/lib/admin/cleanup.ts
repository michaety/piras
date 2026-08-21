import { bindingFor, type UploadKind } from './uploads';

interface PendingUploadRow {
  id: string;
  kind: UploadKind;
  r2_key: string;
}

/**
 * Deletes pending_uploads rows past expires_at, and the R2 object each one
 * points at (if the upload happened but finalize never ran). Abandoned
 * uploads otherwise accumulate storage cost silently forever — this is
 * the only thing that ever reclaims that.
 */
export async function cleanupPendingUploads(
  env: Cloudflare.Env,
): Promise<{ rowsDeleted: number; objectsDeleted: number }> {
  const now = Date.now();

  const expired = await env.DB.prepare(
    `SELECT id, kind, r2_key FROM pending_uploads WHERE expires_at < ?`,
  )
    .bind(now)
    .all<PendingUploadRow>();

  const rows = expired.results ?? [];
  let objectsDeleted = 0;

  for (const row of rows) {
    try {
      // Deleting a key that was never actually uploaded is a no-op, not
      // an error — most expired rows never got a matching PUT.
      await bindingFor(env, row.kind).delete(row.r2_key);
      objectsDeleted += 1;
    } catch (error) {
      console.error('cleanup: failed to delete R2 object', row.r2_key, error);
    }
  }

  if (rows.length > 0) {
    await env.DB.prepare(`DELETE FROM pending_uploads WHERE expires_at < ?`).bind(now).run();
  }

  return { rowsDeleted: rows.length, objectsDeleted };
}
