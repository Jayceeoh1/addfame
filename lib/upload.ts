/**
 * Unified image upload utility.
 * Tries Supabase Storage first, falls back to base64 if bucket doesn't exist.
 * Create buckets in Supabase Dashboard → Storage → New bucket:
 *   - influencer-avatars (public)
 *   - brand-logos (public)
 */
import { createClient } from '@/lib/supabase/client'

type UploadOptions = {
  bucket: 'influencer-avatars' | 'brand-logos'
  path: string          // e.g. `${userId}/avatar.jpg`
  file: File
  maxSizeMB?: number        // default 3
}

type UploadResult =
  | { url: string; method: 'storage' | 'base64'; error?: never }
  | { url?: never; error: string; method?: never }

export async function uploadImage(opts: UploadOptions): Promise<UploadResult> {
  const maxSizeMB = opts.maxSizeMB ?? 3
  const maxBytes = maxSizeMB * 1024 * 1024

  if (opts.file.size > maxBytes) {
    return { error: `Image must be under ${maxSizeMB}MB` }
  }

  if (!opts.file.type.startsWith('image/')) {
    return { error: 'File must be an image' }
  }

  const sb = createClient()

  // Try Supabase Storage
  try {
    const { error: uploadErr } = await sb.storage
      .from(opts.bucket)
      .upload(opts.path, opts.file, { upsert: true, contentType: opts.file.type })

    if (!uploadErr) {
      const { data: { publicUrl } } = sb.storage.from(opts.bucket).getPublicUrl(opts.path)
      return { url: `${publicUrl}?t=${Date.now()}`, method: 'storage' }
    }

    // If bucket doesn't exist or policy issue → fallback to base64
    const isBucketMissing = uploadErr.message.includes('Bucket not found') ||
      uploadErr.message.includes('row-level security') ||
      uploadErr.message.includes('policy') ||
      uploadErr.message.includes('not found')

    if (!isBucketMissing) {
      return { error: uploadErr.message }
    }
  } catch { }

  // Fallback: base64
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve({ url: reader.result as string, method: 'base64' })
    reader.onerror = () => resolve({ error: 'Failed to read file' })
    reader.readAsDataURL(opts.file)
  })
}

export function validateImageFile(file: File, maxSizeMB = 3): string | null {
  if (!file.type.startsWith('image/')) return 'Please select an image file'
  if (file.size > maxSizeMB * 1024 * 1024) return `Image must be under ${maxSizeMB}MB`
  return null
}
