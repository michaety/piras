import { AwsClient } from 'aws4fetch';

const PRESIGN_TTL_SECONDS = 300;

/**
 * Signs a PUT URL against R2's S3-compatible API so the browser can upload
 * directly, bypassing the Worker entirely. This is not optional: Cloudflare
 * caps request bodies at 100MB on Free/Pro regardless of Workers plan, and
 * that limit is enforced before the Worker runs — a deliverable ZIP of
 * stems exceeds it routinely.
 *
 * Content-Type is NOT a signed header here — aws4fetch's query-string
 * signing only signs `host` by default, so a client could PUT with any
 * Content-Type and the signature would still validate. That's normal for
 * presigned uploads; it's why finalize.ts independently re-checks the
 * stored object's content type (and size) via head() before trusting it.
 * Don't rely on this function alone for content-type enforcement.
 */
export async function presignPutUrl(
  env: Cloudflare.Env,
  bucketName: string,
  key: string,
  contentType: string,
): Promise<string> {
  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: 's3',
    region: 'auto',
  });

  const endpoint = new URL(
    `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${bucketName}/${key}`,
  );
  endpoint.searchParams.set('X-Amz-Expires', String(PRESIGN_TTL_SECONDS));

  const signed = await client.sign(
    new Request(endpoint, {
      method: 'PUT',
      headers: { 'content-type': contentType },
    }),
    { aws: { signQuery: true } },
  );

  return signed.url;
}

export { PRESIGN_TTL_SECONDS };
