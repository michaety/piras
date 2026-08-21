/**
 * Shared between server routes and the admin upload form. Pure data — no
 * R2/D1 types — so it's safe to import from a client:* component without
 * dragging Worker-only bindings into the browser bundle.
 */
export const UPLOAD_KINDS = ['cover', 'preview', 'deliverable'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

export function isUploadKind(value: unknown): value is UploadKind {
  return typeof value === 'string' && (UPLOAD_KINDS as readonly string[]).includes(value);
}

interface UploadRule {
  bucket: 'public' | 'private';
  contentTypes: Record<string, string>; // content type -> file extension
  maxBytes: number;
}

export const UPLOAD_RULES: Record<UploadKind, UploadRule> = {
  cover: {
    bucket: 'public',
    contentTypes: {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    },
    maxBytes: 5 * 1024 * 1024,
  },
  preview: {
    bucket: 'public',
    contentTypes: {
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/wav': 'wav',
    },
    maxBytes: 20 * 1024 * 1024,
  },
  deliverable: {
    bucket: 'private',
    contentTypes: {
      'application/zip': 'zip',
    },
    maxBytes: 2 * 1024 * 1024 * 1024,
  },
};
