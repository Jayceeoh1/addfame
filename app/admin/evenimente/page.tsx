'use client'
// Admin → Evenimente: evenimentele afișate pe addfame.ro/evenimente (următorul eveniment și albumele foto).
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Images, Plus, ExternalLink, RefreshCw, Trash2 } from 'lucide-react'
import { formatEventDate, isoToLocalInput, localInputToIso, slugify } from '@/lib/events'

type Row = {
  id?: string; slug: string; title: string; status: 'draft' | 'published'; starts_at: string; location: string; city: string
  description: string; signup_url: string; photos?: number
}
const EMPTY: Row = { slug: '', title: '', status: 'draft', starts_at: '', location: '', city: 'București', description: '', signup_url: '' }
const input = 'w-full h-11 px-3 rounded-xl border-2 border-gray-100 text-sm font-medium focus:border-violet-400 outline-none'

export default function AdminEventsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [edit, setEdit] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const r = await fetch('/api/admin/evenimente'); const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Eroare')
      setRows(j.events)
    } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  async function save() {
    if (!edit) return
    setSaving(true); setErr(''); setOk('')
    try {
      const body = { ...edit, slug: edit.slug || slugify(edit.title), starts_at: edit.starts_at ? localInputToIso(edit.starts_at) : null }
      const r = await fetch('/api/admin/evenimente', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Eroare')
      setOk('Salvat. Adaugă pozele din „Poze”.'); setEdit(null); load()
    } catch (e: any) { setErr(e.message) } finally { setSaving(false) }
  }

  async function remove(id: string) {
    setErr('')
    const r = await fetch(`/api/admin/evenimente?id=${id}`, { method: 'DELETE' }); const j = await r.json().catch(() => ({}))
    if (!r.ok) { setErr(j.error || 'Nu am putut șterge.'); return }
    setConfirmDel(null); setOk('Evenimentul și pozele lui au fost șterse.'); load()
  }

  const F = (k: keyof Row, label: string, props: any = {}, hint?: string) => (
    <label className="flex flex-col gap-1.5 text-xs font-bold text-gray-600">
      {label}
      <input className={input} value={(edit as any)?.[k] ?? ''} onChange={e => setEdit(p => p ? { ...p, [k]: e.target.value } : p)} {...props} />
      {hint && <span className="font-medium text-gray-400">{hint}</span>}
    </label>
  )

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div className="flex items-center gap-3 flex-wrap mb-2">
        <Images size={22} color="#5a35e6" />
        <h1 className="text-2xl font-black m-0">Evenimente</h1>
        <div className="ml-auto flex gap-2">
          <button onClick={load} className="px-3 py-2 rounded-xl text-sm font-bold border bg-white flex items-center gap-1"><RefreshCw size={14} /> Reîncarcă</button>
          <button onClick={() => { setEdit({ ...EMPTY }); setOk('') }} className="px-3 py-2 rounded-xl text-sm font-bold bg-violet-600 text-white flex items-center gap-1"><Plus size={14} /> Eveniment nou</button>
        </div>
      </div>
      <p className="text-sm text-gray-500 mt-0 mb-4">Apar pe <b>addfame.ro/evenimente</b>. Un eveniment publicat cu data în viitor devine „Următorul eveniment”; după ce trece data, devine album foto. Ciornele nu se văd public.</p>
      {err && <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm font-semibold mb-3">{err} {/relation|does not exist/.test(err) && '— rulează SQL-ul 28 din supabase/security.'}</div>}
      {ok && <div className="bg-green-50 text-green-800 rounded-xl p-3 text-sm font-semibold mb-3">{ok}</div>}

      {edit && (
        <div className="bg-white border-2 border-violet-200 rounded-2xl p-5 mb-6 flex flex-col gap-4">
          <h2 className="text-lg font-black m-0">{edit.id ? 'Editează evenimentul' : 'Eveniment nou'}</h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {F('title', 'Numele evenimentului *', { placeholder: 'Seara AddFame, toamna 2026' })}
            {F('slug', 'Adresa albumului', { placeholder: slugify(edit.title) || 'seara-addfame' }, 'Gol = se face din nume. Ex: addfame.ro/evenimente/seara-addfame')}
            {F('starts_at', 'Data și ora', { type: 'datetime-local' }, 'Ora României. Poți lăsa goală pentru evenimente vechi.')}
            {F('location', 'Locația', { placeholder: 'Numele locului, strada, numărul' })}
            {F('city', 'Orașul')}
            {F('signup_url', 'Link rezervare locuri', { placeholder: 'https://…' }, 'Gol = butonul „Rezervă-ți locul” nu apare.')}
            <label className="flex flex-col gap-1.5 text-xs font-bold text-gray-600">
              Status
              <select className={input} value={edit.status} onChange={e => setEdit(p => p ? { ...p, status: e.target.value as any } : p)}>
                <option value="draft">Ciornă (nu se vede public)</option>
                <option value="published">Publicat</option>
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-gray-600">
            Descriere scurtă
            <textarea className="w-full min-h-[80px] p-3 rounded-xl border-2 border-gray-100 text-sm font-medium focus:border-violet-400 outline-none" value={edit.description || ''} onChange={e => setEdit(p => p ? { ...p, description: e.target.value } : p)} />
          </label>
          <div className="flex gap-2 flex-wrap">
            <button onClick={save} disabled={saving} className="px-4 py-2.5 rounded-xl text-sm font-black bg-violet-600 text-white disabled:opacity-60">{saving ? 'Se salvează…' : 'Salvează'}</button>
            <button onClick={() => setEdit(null)} className="px-4 py-2.5 rounded-xl text-sm font-bold border bg-white">Renunță</button>
          </div>
        </div>
      )}

      {loading ? <p>Se încarcă…</p> : rows.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-500">Niciun eveniment încă. Apasă „Eveniment nou”.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map(e => (
            <div key={e.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={e.status === 'published' ? { background: '#dcf5ec', color: '#14532d' } : { background: '#f0eff7', color: '#4a4770' }}>{e.status === 'published' ? 'Publicat' : 'Ciornă'}</span>
                  <b className="text-base">{e.title}</b>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  /evenimente/{e.slug} · {e.starts_at ? formatEventDate(e.starts_at) : <i>fără dată</i>}{e.city ? ` · ${e.city}` : ''}
                </div>
              </div>
              <Link href={`/admin/evenimente/${e.id}`} className="px-3 py-2 rounded-xl text-sm font-black bg-gray-900 text-white flex items-center gap-1.5"><Images size={14} /> {e.photos} poze</Link>
              <button onClick={() => { setEdit({ ...EMPTY, ...e, starts_at: isoToLocalInput(e.starts_at), location: e.location || '', city: e.city || '', description: e.description || '', signup_url: e.signup_url || '' }); setOk(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="px-3 py-2 rounded-xl text-sm font-bold border bg-white">Editează</button>
              <a href={`/evenimente/${e.slug}`} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl text-sm font-bold border bg-white flex items-center gap-1"><ExternalLink size={14} /> Pagina</a>
              {confirmDel === e.id
                ? <button onClick={() => remove(e.id)} className="px-3 py-2 rounded-xl text-sm font-black bg-red-600 text-white">Sigur? Șterge tot</button>
                : <button onClick={() => setConfirmDel(e.id)} aria-label="Șterge evenimentul" className="px-3 py-2 rounded-xl text-sm font-bold border bg-white text-red-600"><Trash2 size={14} /></button>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
