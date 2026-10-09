'use client'
// Admin → Evenimente → Poze: încarcă pozele evenimentului, alege coperta, scrie legende, schimbă ordinea.
import { use, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, ArrowLeft as Left, Upload, Star, Trash2, ExternalLink } from 'lucide-react'
import { photoUrl } from '@/lib/events'

type Photo = { id: string; path: string; caption: string | null; position: number }

// Micșorează poza în browser (max 2000 px, JPEG): telefoanele fac poze de 5–10 MB, iar serverul primește maxim ~4 MB per cerere.
async function shrink(file: File, max = 2000, quality = 0.85): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('Doar poze JPG, PNG sau WebP.')
  const bmp = await createImageBitmap(file).catch(() => null)
  if (!bmp) throw new Error('Nu pot citi poza ' + file.name)
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k)
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Browserul nu poate micșora poza.')
  ctx.drawImage(bmp, 0, 0, w, h)
  const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality))
  if (!blob) throw new Error('Nu am putut micșora poza ' + file.name)
  return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
}

export default function EventPhotosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [event, setEvent] = useState<any>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([fetch('/api/admin/evenimente'), fetch(`/api/admin/evenimente/${id}/photos`)])
      const ja = await a.json(), jb = await b.json()
      if (!a.ok) throw new Error(ja.error || 'Eroare')
      if (!b.ok) throw new Error(jb.error || 'Eroare')
      setEvent(ja.events.find((e: any) => e.id === id) || null)
      setPhotos(jb.photos)
    } catch (e: any) { setErr(e.message) }
  }, [id])
  useEffect(() => { load() }, [load])

  async function upload(files: FileList | null) {
    if (!files?.length) return
    setErr('')
    const list = Array.from(files)
    for (let i = 0; i < list.length; i++) {
      setBusy(`Se încarcă ${i + 1} din ${list.length}…`)
      try {
        const small = await shrink(list[i])
        const fd = new FormData(); fd.append('file', small)
        const r = await fetch(`/api/admin/evenimente/${id}/photos`, { method: 'POST', body: fd })
        const j = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(j.error || 'Eroare la încărcare')
      } catch (e: any) { setErr(`${list[i].name}: ${e.message}`) }
    }
    setBusy(''); if (fileRef.current) fileRef.current.value = ''
    load()
  }

  async function patch(photoId: string, body: any) {
    const r = await fetch(`/api/admin/evenimente/${id}/photos`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photoId, ...body }) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) setErr(j.error || 'Eroare'); else load()
  }
  async function remove(photoId: string) {
    const r = await fetch(`/api/admin/evenimente/${id}/photos?photoId=${photoId}`, { method: 'DELETE' })
    const j = await r.json().catch(() => ({}))
    setConfirmDel(null)
    if (!r.ok) setErr(j.error || 'Eroare'); else load()
  }

  const cover = event?.cover_photo_id || photos[0]?.id

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <Link href="/admin/evenimente" className="text-sm font-bold text-violet-700 no-underline inline-flex items-center gap-1 mb-3"><Left size={14} /> Evenimente</Link>
      <div className="flex items-center gap-3 flex-wrap mb-2">
        <h1 className="text-2xl font-black m-0">{event?.title || 'Poze eveniment'}</h1>
        {event && <a href={`/evenimente/${event.slug}`} target="_blank" rel="noreferrer" className="ml-auto px-3 py-2 rounded-xl text-sm font-bold border bg-white flex items-center gap-1 no-underline text-gray-800"><ExternalLink size={14} /> Vezi albumul</a>}
      </div>
      <p className="text-sm text-gray-500 mt-0 mb-4">Alege mai multe poze deodată. Se micșorează automat înainte de încărcare. Coperta e poza mare a evenimentului; dacă nu alegi una, e prima. Numărul #N de pe fiecare poză îl scrii în poveste, ca [foto N], ca să apară între paragrafe.</p>
      {err && <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm font-semibold mb-3">{err}</div>}

      <div className="mb-5 flex items-center gap-3 flex-wrap">
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={e => upload(e.target.files)} />
        <button onClick={() => fileRef.current?.click()} disabled={!!busy} className="px-4 py-2.5 rounded-xl text-sm font-black bg-violet-600 text-white flex items-center gap-2 disabled:opacity-60"><Upload size={15} /> Adaugă poze</button>
        {busy && <span className="text-sm font-semibold text-gray-600">{busy}</span>}
        <span className="text-sm text-gray-400">{photos.length} {photos.length === 1 ? 'poză' : 'poze'}</span>
      </div>

      {photos.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-500">Nicio poză încă.</div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}>
          {photos.map((p, i) => (
            <div key={p.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden flex flex-col">
              <div style={{ aspectRatio: '4 / 3', background: '#f0eff7', position: 'relative' }}>
                <img src={photoUrl(p.path)} alt={p.caption || ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <span className="absolute top-2 right-2 text-xs font-black bg-white/90 text-gray-900 px-2 py-1 rounded-lg" title="Numărul pozei, pentru [foto N] în poveste">#{i + 1}</span>
                {cover === p.id && <span className="absolute top-2 left-2 text-xs font-black bg-amber-300 text-amber-900 px-2 py-1 rounded-lg flex items-center gap-1"><Star size={12} /> Copertă</span>}
              </div>
              <div className="p-3 flex flex-col gap-2">
                <input defaultValue={p.caption || ''} placeholder="Legendă (opțional)" aria-label="Legendă" className={'w-full h-10 px-3 rounded-lg border-2 border-gray-100 text-sm focus:border-violet-400 outline-none'}
                  onBlur={e => { if ((e.target.value.trim() || null) !== (p.caption || null)) patch(p.id, { caption: e.target.value }) }} />
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => patch(p.id, { move: 'up' })} disabled={i === 0} aria-label="Mută înainte" className="h-9 w-9 rounded-lg border bg-white grid place-items-center disabled:opacity-40"><ArrowLeft size={15} /></button>
                  <button onClick={() => patch(p.id, { move: 'down' })} disabled={i === photos.length - 1} aria-label="Mută după" className="h-9 w-9 rounded-lg border bg-white grid place-items-center disabled:opacity-40"><ArrowRight size={15} /></button>
                  <button onClick={() => patch(p.id, { cover: true })} disabled={cover === p.id} className="h-9 px-3 rounded-lg border bg-white text-xs font-bold flex items-center gap-1 disabled:opacity-40"><Star size={13} /> Copertă</button>
                  {confirmDel === p.id
                    ? <button onClick={() => remove(p.id)} className="h-9 px-3 rounded-lg bg-red-600 text-white text-xs font-black ml-auto">Șterge</button>
                    : <button onClick={() => setConfirmDel(p.id)} aria-label="Șterge poza" className="h-9 w-9 rounded-lg border bg-white text-red-600 grid place-items-center ml-auto"><Trash2 size={15} /></button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
