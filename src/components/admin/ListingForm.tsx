import { useState, type SyntheticEvent } from 'react';
import type { ProductType } from '../../lib/products/queries';
import { UPLOAD_RULES, type UploadKind } from '../../lib/admin/upload-rules';

interface UploadUrlResponse {
  uploadUrl: string;
  error?: string;
}

interface ListingMetaResponse {
  id: string;
  errors?: Record<string, string>;
}

interface FinalizeResponse {
  published: boolean;
  verified: string[];
  errors: Record<string, string>;
}

interface ExistingFile {
  filename: string;
}

export interface ListingFormValues {
  title: string;
  type: ProductType;
  description: string;
  price: string; // dollars, e.g. "34.00" — never cents in the UI
  bpm: string;
  musical_key: string;
  duration: string;
  formats: string;
  licence: string;
  featured: boolean;
}

interface Props {
  csrfToken: string;
  mode: 'create' | 'edit';
  listingId?: string;
  initial?: ListingFormValues;
  existingFiles?: Partial<Record<UploadKind, ExistingFile>>;
}

const EMPTY: ListingFormValues = {
  title: '',
  type: 'beat',
  description: '',
  price: '',
  bpm: '',
  musical_key: '',
  duration: '',
  formats: '',
  licence: '',
  featured: false,
};

const KIND_LABEL: Record<UploadKind, string> = {
  cover: 'Cover art',
  preview: 'Preview audio',
  deliverable: 'Deliverable (ZIP)',
};

function acceptFor(kind: UploadKind): string {
  return Object.keys(UPLOAD_RULES[kind].contentTypes).join(',');
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

/** fetch gives no upload progress; XHR does. A 2GB upload with no
 * feedback looks like a hang. */
function putWithProgress(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error('Upload failed.'));
    xhr.send(file);
  });
}

export default function ListingForm({ csrfToken, mode, listingId, initial, existingFiles }: Props) {
  const [values, setValues] = useState<ListingFormValues>(initial ?? EMPTY);
  const [files, setFiles] = useState<Partial<Record<UploadKind, File>>>({});
  const [progress, setProgress] = useState<Partial<Record<UploadKind, number>>>({});
  const [fileErrors, setFileErrors] = useState<Partial<Record<UploadKind, string>>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField<K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleFileSelect(kind: UploadKind, file: File | null) {
    setFileErrors((prev) => ({ ...prev, [kind]: undefined }));
    if (!file) {
      setFiles((prev) => ({ ...prev, [kind]: undefined }));
      return;
    }
    const rule = UPLOAD_RULES[kind];
    if (!(file.type in rule.contentTypes)) {
      setFileErrors((prev) => ({ ...prev, [kind]: `Must be one of: ${Object.keys(rule.contentTypes).join(', ')}.` }));
      return;
    }
    if (file.size > rule.maxBytes) {
      setFileErrors((prev) => ({ ...prev, [kind]: `Exceeds the ${formatBytes(rule.maxBytes)} limit.` }));
      return;
    }
    setFiles((prev) => ({ ...prev, [kind]: file }));
  }

  async function uploadOne(id: string, kind: UploadKind, file: File): Promise<string | null> {
    const authRes = await fetch(`/api/admin/listings/${id}/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, contentType: file.type, size: file.size, csrf_token: csrfToken }),
    });
    if (!authRes.ok) {
      const body = (await authRes.json().catch(() => ({}))) as Partial<UploadUrlResponse>;
      return body.error ?? `Could not authorise ${kind} upload.`;
    }
    const { uploadUrl } = (await authRes.json()) as UploadUrlResponse;

    try {
      await putWithProgress(uploadUrl, file, (pct) => setProgress((prev) => ({ ...prev, [kind]: pct })));
    } catch {
      return `Upload of ${kind} failed. Try again.`;
    }
    setProgress((prev) => ({ ...prev, [kind]: 100 }));
    return null;
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setServerError(null);
    setFieldErrors({});

    try {
      const payload = { ...values, csrf_token: csrfToken };
      const metaRes = await fetch(
        mode === 'create' ? '/api/admin/listings' : `/api/admin/listings/${listingId}/update`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      if (!metaRes.ok) {
        const body = (await metaRes.json().catch(() => ({}))) as Partial<ListingMetaResponse>;
        if (body.errors) {
          setFieldErrors(body.errors);
        } else {
          setServerError('Could not save this listing.');
        }
        setSubmitting(false);
        return;
      }

      const meta = (await metaRes.json()) as ListingMetaResponse;
      const id: string = mode === 'create' ? meta.id : (listingId as string);

      const selectedKinds = (Object.keys(files) as UploadKind[]).filter((kind) => files[kind]);
      for (const kind of selectedKinds) {
        const file = files[kind] as File;
        const error = await uploadOne(id, kind, file);
        if (error) {
          setFileErrors((prev) => ({ ...prev, [kind]: error }));
          setSubmitting(false);
          return;
        }
      }

      if (selectedKinds.length > 0) {
        const finalizeRes = await fetch(`/api/admin/listings/${id}/finalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csrf_token: csrfToken }),
        });
        const finalizeBody = (await finalizeRes.json().catch(() => ({ published: false, verified: [], errors: {} }))) as FinalizeResponse;
        if (finalizeBody.errors && Object.keys(finalizeBody.errors).length > 0) {
          setFileErrors((prev) => ({ ...prev, ...finalizeBody.errors }));
          setSubmitting(false);
          return;
        }
      }

      window.location.href = '/admin/listings';
    } catch {
      setServerError('Something went wrong. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex max-w-xl flex-col gap-4">
      {serverError && <p className="label text-destructive">{serverError}</p>}

      <label className="flex flex-col gap-1">
        <span className="label">Title</span>
        <input
          type="text"
          className="well"
          value={values.title}
          maxLength={200}
          required
          onChange={(e) => updateField('title', e.target.value)}
        />
        {fieldErrors.title && <span className="label text-destructive">{fieldErrors.title}</span>}
      </label>

      <label className="flex flex-col gap-1">
        <span className="label">Type</span>
        <select
          className="well"
          value={values.type}
          onChange={(e) => updateField('type', e.target.value as ProductType)}
        >
          <option value="beat">Beat</option>
          <option value="stems">Stems</option>
          <option value="sample">Sample</option>
          <option value="pack">Pack</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="label">Description</span>
        <textarea
          className="well"
          rows={4}
          maxLength={4000}
          value={values.description}
          onChange={(e) => updateField('description', e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="label">Price (USD)</span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="34.00"
          className="well"
          value={values.price}
          onChange={(e) => updateField('price', e.target.value)}
        />
        {fieldErrors.price_cents && <span className="label text-destructive">{fieldErrors.price_cents}</span>}
      </label>

      <div className="flex gap-4">
        <label className="flex flex-1 flex-col gap-1">
          <span className="label">BPM (optional)</span>
          <input
            type="number"
            className="well"
            value={values.bpm}
            onChange={(e) => updateField('bpm', e.target.value)}
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="label">Key (optional)</span>
          <input
            type="text"
            className="well"
            maxLength={20}
            value={values.musical_key}
            onChange={(e) => updateField('musical_key', e.target.value)}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="label">Duration (mm:ss, optional)</span>
        <input
          type="text"
          className="well"
          placeholder="3:22"
          value={values.duration}
          onChange={(e) => updateField('duration', e.target.value)}
        />
        {fieldErrors.duration && <span className="label text-destructive">{fieldErrors.duration}</span>}
      </label>

      <label className="flex flex-col gap-1">
        <span className="label">Formats</span>
        <input
          type="text"
          className="well"
          placeholder="WAV + MP3"
          value={values.formats}
          onChange={(e) => updateField('formats', e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="label">Licence</span>
        <input
          type="text"
          className="well"
          placeholder="Unlimited"
          value={values.licence}
          onChange={(e) => updateField('licence', e.target.value)}
        />
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={values.featured}
          onChange={(e) => updateField('featured', e.target.checked)}
        />
        <span className="label">Featured</span>
      </label>

      <div className="groove mt-4 flex flex-col gap-4 py-4">
        {(['cover', 'preview', 'deliverable'] as UploadKind[]).map((kind) => (
          <div key={kind} className="flex flex-col gap-1">
            <span className="label">{KIND_LABEL[kind]}</span>
            {existingFiles?.[kind] && !files[kind] && (
              <span className="text-ink-dim">Current: {existingFiles[kind]?.filename}</span>
            )}
            <input
              type="file"
              accept={acceptFor(kind)}
              onChange={(e) => handleFileSelect(kind, e.target.files?.[0] ?? null)}
            />
            {fileErrors[kind] && <span className="label text-destructive">{fileErrors[kind]}</span>}
            {progress[kind] !== undefined && progress[kind]! < 100 && (
              <span className="label">Uploading… {progress[kind]}%</span>
            )}
            {progress[kind] === 100 && <span className="label">Uploaded.</span>}
          </div>
        ))}
      </div>

      <button type="submit" className="key self-start" disabled={submitting}>
        {submitting ? 'Saving…' : mode === 'create' ? 'Create listing' : 'Save changes'}
      </button>
    </form>
  );
}
