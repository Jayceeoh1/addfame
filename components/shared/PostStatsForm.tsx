'use client'
// Creatorul completează statisticile postărilor dintr-o colaborare (le vede brandul în raport).
// Cifrele citite automat (Instagram: like-uri/comentarii; YouTube) apar blocate, cu eticheta „automat”.
import { useEffect, useState } from 'react'
import { BarChart3, ChevronDown, Check, Loader2 } from 'lucide-react'

type Row = {
  id: string; url: string; platform: string; source: string; locked: string[]
  views: number | null; likes: number | null; comments: number | null; shares: number | null; saves: number | null; reach: number | null
  reported_at: string | null
}

const FIELDS: { key: keyof Row; label: string }[] = [
  { key: 'views', label: 'Vizualizări' },
  { key: 'reach', label: 'Conturi atinse' },
  { key: 'likes', label: 'Like-uri' },
  { key: 'comments', label: 'Comentarii' },
  { key: 'shares', label: 'Distribuiri' },
  { key: 'saves', label: 'Salvări' },
]

const PLATFORM_NAME: Record<string, string> = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', facebook: 'Facebook', other: 'Postare' }

export function PostStatsForm({ collabId }: { collabId: string }) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [msg, setMsg] = useState<Record<string, { ok: boolean; text: string }>>({})

  useEffect(() => {
    if (!open || rows) return
    fetch(`/api/post-metrics/report?collaboration_id=${collabId}`)
      .then(r => r.json())
      .then(j => {
        const list: Row[] = j.rows || []
        setRows(list)
        setDraft(Object.fromEntries(list.map(r => [r.id, Object.fromEntries(FIELDS.map(f => [f.key, r[f.key] == null ? '' : String(r[f.key])]))])))
      })
      .catch(() => setRows([]))
  }, [open, rows, collabId])

  async function save(r: Row) {
    setSaving(r.id); setMsg(m => ({ ...m, [r.id]: undefined as any }))
    const values: Record<string, string> = {}
    for (const f of FIELDS) if (!r.locked.includes(f.key as string)) values[f.key as string] = draft[r.id]?.[f.key as string] ?? ''
    try {
      const res = await fetch('/api/post-metrics/report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaboration_id: collabId, url: r.url, ...values }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Eroare')
      setRows(list => (list || []).map(x => x.id === r.id ? { ...x, ...j.row } : x))
      setMsg(m => ({ ...m, [r.id]: { ok: true, text: 'Salvat. Brandul vede cifrele în raport.' } }))
    } catch (e: any) {
      setMsg(m => ({ ...m, [r.id]: { ok: false, text: e.message || 'Nu am putut salva.' } }))
    } finally { setSaving(null) }
  }

  return (
    <div style={{ border: '1.5px solid #ebe8f7', borderRadius: 16, background: '#fff', overflow: 'hidden' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
        <BarChart3 size={16} color="#7040f0" style={{ flex: 'none' }} />
        <span style={{ flex: 1 }}>
          <b style={{ fontSize: 14, color: '#14123a' }}>Statisticile postării</b>
          <span style={{ display: 'block', fontSize: 12, color: '#6a6690' }}>Completează cifrele din aplicație (Insights). Brandurile aleg din nou creatorii cu rezultate vizibile.</span>
        </span>
        <ChevronDown size={16} color="#6a6690" style={{ flex: 'none', transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} />
      </button>

      {open && (
        <div style={{ padding: '0 14px 14px', display: 'grid', gap: 14 }}>
          {rows === null && <span style={{ fontSize: 13, color: '#6a6690' }}>Se încarcă…</span>}
          {rows?.length === 0 && <span style={{ fontSize: 13, color: '#6a6690' }}>Trimite mai întâi linkul postării, apoi poți completa statisticile.</span>}
          {rows?.map(r => (
            <div key={r.id} style={{ borderTop: '1px solid #f0eef8', paddingTop: 12 }}>
              <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, fontWeight: 700, color: '#5a35e6', wordBreak: 'break-all' }}>
                {PLATFORM_NAME[r.platform] || 'Postare'} · {r.url.replace(/^https:\/\//, '')}
              </a>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 8, marginTop: 10 }}>
                {FIELDS.map(f => {
                  const locked = r.locked.includes(f.key as string)
                  return (
                    <label key={f.key as string} style={{ display: 'grid', gap: 4, fontSize: 11.5, fontWeight: 700, color: '#4a4770' }}>
                      <span>{f.label}{locked && <span style={{ color: '#14532d', fontWeight: 600 }}> · automat</span>}</span>
                      <input
                        inputMode="numeric" placeholder="ex. 12400"
                        disabled={locked}
                        value={locked ? (r[f.key] == null ? '' : Number(r[f.key]).toLocaleString('ro-RO')) : (draft[r.id]?.[f.key as string] ?? '')}
                        onChange={e => setDraft(d => ({ ...d, [r.id]: { ...(d[r.id] || {}), [f.key as string]: e.target.value } }))}
                        style={{ height: 38, borderRadius: 10, border: '1.5px solid #e5e3f3', padding: '0 10px', fontSize: 14, fontFamily: 'inherit', background: locked ? '#f6f6fc' : '#fff', fontVariantNumeric: 'tabular-nums', minWidth: 0 }}
                      />
                    </label>
                  )
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => save(r)} disabled={saving === r.id}
                  style={{ height: 38, padding: '0 14px', borderRadius: 10, border: 'none', background: '#7040f0', color: '#fff', fontWeight: 800, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {saving === r.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvează
                </button>
                {msg[r.id] && <span style={{ fontSize: 12, color: msg[r.id].ok ? '#14532d' : '#b42318' }}>{msg[r.id].text}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PostStatsForm
