'use client'
// Admin → Înscrieri creatori: paginile publice de înscriere și setările fiecăreia (dealer, adresă, perioadă, termen, prag, status).
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Megaphone, Plus, ExternalLink, Users, RefreshCw } from 'lucide-react'

type SignupFormConfig = {
  id?: string; slug: string; status: 'draft' | 'open' | 'closed'; eyebrow: string; title: string; intro: string
  brand_name: string; location: string; shoot_period: string; deliverable: string; min_followers: number | string
  deadline: string; zone_label: string; applications?: number
}

const EMPTY: SignupFormConfig = {
  slug: '', status: 'draft', eyebrow: 'Creatori AddFame', title: '', intro: '', brand_name: '', location: '',
  shoot_period: '', deliverable: '1 video (TikTok / Reel / Short)', min_followers: 0, deadline: '', zone_label: 'București și Ilfov',
}
const STATUS: Record<string, { t: string; bg: string; fg: string }> = {
  draft: { t: 'Ciornă', bg: '#f0eff7', fg: '#4a4770' },
  open: { t: 'Deschis', bg: '#dcf5ec', fg: '#14532d' },
  closed: { t: 'Închis', bg: '#fff1e6', fg: '#9a4206' },
}
const input = 'w-full h-11 px-3 rounded-xl border-2 border-gray-100 text-sm font-medium focus:border-violet-400 outline-none'

export default function AdminSignupFormsPage() {
  const [rows, setRows] = useState<SignupFormConfig[]>([])
  const [edit, setEdit] = useState<SignupFormConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setErr('')
    try {
      const r = await fetch('/api/admin/inscrieri'); const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Eroare')
      setRows(j.forms)
    } catch (e: any) { setErr(e.message) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  async function save() {
    if (!edit) return
    setSaving(true); setErr(''); setOk('')
    try {
      const r = await fetch('/api/admin/inscrieri', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(edit) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Eroare')
      setOk('Salvat.'); setEdit(null); load()
    } catch (e: any) { setErr(e.message) } finally { setSaving(false) }
  }

  const F = (k: keyof SignupFormConfig, label: string, props: any = {}, hint?: string) => (
    <label className="flex flex-col gap-1.5 text-xs font-bold text-gray-600">
      {label}
      <input className={input} value={(edit as any)?.[k] ?? ''} onChange={e => setEdit(p => p ? { ...p, [k]: e.target.value } : p)} {...props} />
      {hint && <span className="font-medium text-gray-400">{hint}</span>}
    </label>
  )

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div className="flex items-center gap-3 flex-wrap mb-2">
        <Megaphone size={22} color="#5a35e6" />
        <h1 className="text-2xl font-black m-0">Înscrieri creatori</h1>
        <div className="ml-auto flex gap-2">
          <button onClick={load} className="px-3 py-2 rounded-xl text-sm font-bold border bg-white flex items-center gap-1"><RefreshCw size={14} /> Reîncarcă</button>
          <button onClick={() => { setEdit({ ...EMPTY }); setOk('') }} className="px-3 py-2 rounded-xl text-sm font-bold bg-violet-600 text-white flex items-center gap-1"><Plus size={14} /> Pagină nouă</button>
        </div>
      </div>
      <p className="text-sm text-gray-500 mt-0 mb-4">Pagini publice prin care strângeți creatori dintr-o nișă, la <b>addfame.ro/inscriere/&lt;adresă&gt;</b>. Creatorii nu au nevoie de cont; contul AddFame e opțional, după trimitere. Câmpurile goale nu apar pe pagină.</p>
      {err && <div className="bg-red-50 text-red-700 rounded-xl p-3 text-sm font-semibold mb-3">{err} {/relation|does not exist/.test(err) && '— rulează SQL-ul 27 din supabase/security.'}</div>}
      {ok && <div className="bg-green-50 text-green-800 rounded-xl p-3 text-sm font-semibold mb-3">{ok}</div>}

      {edit && (
        <div className="bg-white border-2 border-violet-200 rounded-2xl p-5 mb-6 flex flex-col gap-4">
          <h2 className="text-lg font-black m-0">{edit.id ? 'Editează pagina' : 'Pagină nouă'}</h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {F('title', 'Titlu *', { placeholder: 'Prezintă un showroom auto comunității tale' })}
            {F('slug', 'Adresa paginii *', { placeholder: 'auto' }, 'Litere mici, cifre, cratime')}
            {F('brand_name', 'Numele dealerului / brandului', { placeholder: 'gol = „un dealer auto partener”' })}
            {F('location', 'Unde se filmează', { placeholder: 'Showroom X, Bd. Y nr. Z, Sector 1' })}
            {F('shoot_period', 'Perioada filmării', { placeholder: '20–31 octombrie' })}
            {F('deliverable', 'Ce filmează creatorul')}
            {F('deadline', 'Ultima zi de înscriere', { type: 'date' })}
            {F('min_followers', 'Prag minim de urmăritori', { type: 'number', min: 0 })}
            {F('zone_label', 'Zona căutată')}
            {F('eyebrow', 'Text mic deasupra titlului')}
            <label className="flex flex-col gap-1.5 text-xs font-bold text-gray-600">
              Status
              <select className={input} value={edit.status} onChange={e => setEdit(p => p ? { ...p, status: e.target.value as any } : p)}>
                <option value="draft">Ciornă (doar adminii o văd)</option>
                <option value="open">Deschis (public, primește înscrieri)</option>
                <option value="closed">Închis (pagina arată „înscrieri închise”)</option>
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-xs font-bold text-gray-600">
            Descriere scurtă
            <textarea className="w-full min-h-[80px] p-3 rounded-xl border-2 border-gray-100 text-sm font-medium focus:border-violet-400 outline-none" value={edit.intro || ''} onChange={e => setEdit(p => p ? { ...p, intro: e.target.value } : p)} />
          </label>
          <div className="flex gap-2 flex-wrap">
            <button onClick={save} disabled={saving} className="px-4 py-2.5 rounded-xl text-sm font-black bg-violet-600 text-white disabled:opacity-60">{saving ? 'Se salvează…' : 'Salvează'}</button>
            <button onClick={() => setEdit(null)} className="px-4 py-2.5 rounded-xl text-sm font-bold border bg-white">Renunță</button>
            {edit.slug && <a href={`/inscriere/${edit.slug}`} target="_blank" rel="noreferrer" className="px-4 py-2.5 rounded-xl text-sm font-bold border bg-white flex items-center gap-1"><ExternalLink size={14} /> Previzualizează</a>}
          </div>
        </div>
      )}

      {loading ? <p>Se încarcă…</p> : rows.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-500">Nicio pagină încă. Apasă „Pagină nouă”.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map(c => (
            <div key={c.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: STATUS[c.status].bg, color: STATUS[c.status].fg }}>{STATUS[c.status].t}</span>
                  <b className="text-base">{c.title}</b>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  /inscriere/{c.slug} · {c.brand_name || <i>dealer necompletat</i>}{c.deadline ? ` · până pe ${new Date(c.deadline + 'T12:00:00Z').toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })}` : ''}
                </div>
              </div>
              <Link href={`/admin/inscrieri/${c.id}`} className="px-3 py-2 rounded-xl text-sm font-black bg-gray-900 text-white flex items-center gap-1.5"><Users size={14} /> {c.applications} înscrieri</Link>
              <button onClick={() => { setEdit({ ...EMPTY, ...c, deadline: c.deadline || '', intro: c.intro || '', brand_name: c.brand_name || '', location: c.location || '', shoot_period: c.shoot_period || '', eyebrow: c.eyebrow || '' }); setOk(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="px-3 py-2 rounded-xl text-sm font-bold border bg-white">Editează</button>
              <a href={`/inscriere/${c.slug}`} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl text-sm font-bold border bg-white flex items-center gap-1"><ExternalLink size={14} /> Pagina</a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
