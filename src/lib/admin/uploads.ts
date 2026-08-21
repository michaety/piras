import { UPLOAD_RULES, type UploadKind } from './upload-rules';

export { UPLOAD_KINDS, UPLOAD_RULES, isUploadKind } from './upload-rules';
export type { UploadKind } from './upload-rules';

/**
 * The R2 key is always generated here, never taken from the client. The
 * previous build interpolated the client's filename straight into the key.
 */
export function generateObjectKey(listingId: string, kind: UploadKind, contentType: string): string {
  const ext = UPLOAD_RULES[kind].contentTypes[contentType];
  return `products/${listingId}/${kind}-${crypto.randomUUID()}.${ext}`;
}

export function bucketNameFor(kind: UploadKind): 'piras-public' | 'piras-private' {
  return UPLOAD_RULES[kind].bucket === 'public' ? 'piras-public' : 'piras-private';
}

export function bindingFor(env: Cloudflare.Env, kind: UploadKind): R2Bucket {
  return UPLOAD_RULES[kind].bucket === 'public' ? env.PUBLIC_BUCKET : env.PRIVATE_BUCKET;
}
