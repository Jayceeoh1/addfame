'use client'
import { useState, useCallback } from 'react'
import { ImagePlus, X, Loader2, CheckCircle } from 'lucide-react'

interface ThumbnailUploadProps {
  collabId: string
  currentUrl?: string
  isAdmin?: boolean
  onUploaded?: (url: string) => void
}

/** Micșorează imaginea (max. 1600px, JPG) dacă e mare; dacă browserul nu o poate citi, o lasă cum e. */
async function shrinkImage(file: File): Promise<File> {
  if (file.size < 1.5 * 1024 * 1024 && /^image\/(jpe?g|webp)$/.test(file.type)) return file
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const blob: Blob | null = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.85))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

export function ThumbnailUpload({ collabId, currentUrl, isAdmin = false, onUploaded }: ThumbnailUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl || null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleFile = useCallback(async (picked: File) => {
    const isImg = picked.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(picked.name)
    if (!isImg) { setError('Selectează o imagine (JPG, PNG, WEBP)'); return }
    // Screenshot-urile de pe telefon trec ușor de 4–5 MB (limita serverului) → le micșorăm în JPG înainte de upload
    const file = await shrinkImage(picked)
    if (file.size > 4.5 * 1024 * 1024) { setError('Imaginea e prea mare. Fă un screenshot nou sau trimite doar linkul postării.'); return }

    setError(null)
    setSuccess(false)

    // Preview instant
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    // Upload
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('collab_id', collabId)
      fd.append('is_admin', isAdmin ? 'true' : 'false')

      const res = await fetch('/api/collaborations/thumbnail', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) throw new Error(data.error || (res.status === 413 ? 'Imaginea e prea mare.' : 'Upload eșuat. Poți trimite dovada și doar cu linkul postării.'))

      setSuccess(true)
      onUploaded?.(data.thumbnail_url)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e: any) {
      setError(e.message)
      setPreview(currentUrl || null)
    } finally {
      setUploading(false)
    }
  }, [collabId, isAdmin, currentUrl, onUploaded])

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div>
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => !uploading && document.getElementById(`thumb-input-${collabId}`)?.click()}
        className={`relative rounded-xl overflow-hidden border-2 transition cursor-pointer ${
          preview ? 'border-purple-200' : 'border-dashed border-gray-200 hover:border-purple-300'
        }`}
        style={{ minHeight: preview ? 'auto' : 80 }}
      >
        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Thumbnail"
              className="w-full object-cover rounded-xl"
              style={{ maxHeight: 200 }}
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition rounded-xl flex items-center justify-center">
              <p className="opacity-0 hover:opacity-100 text-white text-xs font-bold transition">
                Click pentru a schimba
              </p>
            </div>
            {/* Status badges */}
            {uploading && (
              <div className="absolute top-2 right-2 bg-black/60 text-white rounded-lg px-2 py-1 flex items-center gap-1 text-xs font-bold">
                <Loader2 className="w-3 h-3 animate-spin" /> Se încarcă...
              </div>
            )}
            {success && (
              <div className="absolute top-2 right-2 bg-green-500 text-white rounded-lg px-2 py-1 flex items-center gap-1 text-xs font-bold">
                <CheckCircle className="w-3 h-3" /> Salvat!
              </div>
            )}
            {/* Remove button */}
            {!uploading && (
              <button
                onClick={e => { e.stopPropagation(); setPreview(null) }}
                className="absolute top-2 left-2 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-5 px-4">
            {uploading ? (
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            ) : (
              <ImagePlus className="w-5 h-5 text-gray-400" />
            )}
            <p className="text-xs text-gray-500 text-center">
              {uploading ? 'Se încarcă...' : 'Adaugă screenshot din postare'}
            </p>
            {!uploading && <p className="text-[10px] text-gray-400">JPG, PNG, WEBP · max 5MB</p>}
          </div>
        )}
      </div>

      <input
        id={`thumb-input-${collabId}`}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onInputChange}
      />

      {error && (
        <p className="text-xs text-red-500 font-bold mt-1.5 flex items-center gap-1">
          <X className="w-3 h-3" /> {error}
        </p>
      )}

      {!preview && (
        <p className="text-[10px] text-purple-600 mt-1.5 leading-relaxed">
          ✨ Postările cu screenshot apar în <strong>galeria platformei</strong> — mai multă vizibilitate pentru tine!
        </p>
      )}
    </div>
  )
}
