'use client'

// Lista celor care vor să vină la un eveniment (Open Call): brandul / AddFame aprobă sau respinge.
// Brandul vede nume, oraș, profil (urmăritori, nișe) și mesaj; AddFame vede și telefon, adresă, Instagram, email.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getEventApplications, decideEventApplication } from '@/app/actions/event-signup'
import { guestListCsv, EVENT_STATUS_LABEL, type EventStatus } from '@/lib/event-signup'
import { Check, X, Download, Search, Loader2, RefreshCw, Ticket, Users, MapPin, Phone, Home, Mail } from 'lucide-react'

type App = any

const STATUS_STYLE: Record<EventStatus, { bg: string; fg: string }> = {
  pending: { bg: '#fff1c2', fg: '#854d0e' },
  approved: { bg: '#dcf5ec', fg: '#14532d' },
  rejected: { bg: '#fde8e6', fg: '#b42318' },
  cancelled: { bg: '#f0eff7', fg: '#4a4770' },
}
const FILTERS: { k: 'all' | EventStatus; l: string }[] = [
  { k: 'pending', l: 'De răspuns' }, { k: 'approved', l: 'Aprobați' }, { k: 'rejected', l: 'Respinși' },
  { k: 'cancelled', l: 'Anulați' }, { k: 'all', l: 'Toți' },
]
const num = (n?: number | null) => !n ? null : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)

export default function EventApplicationsPanel({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | EventStatus>('pending')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const load = useCallback(async () => {
    const r = await getEventApplications(campaignId)
    if ('success' in r) { setData(r); setError(null) } else setError(r.error)
  }, [campaignId])
  useEffect(() => { load() }, [load])

  const say = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  async function decide(a: App, decision: 'approved' | 'rejected') {
    setBusy(a.id)
    const r = await decideEventApplication(a.id, decision)
    setBusy(null)
    if ('error' in r && r.error) { say(r.error, false); return }
    setData((d: any) => ({
      ...d,
      approved: (r as any).approved ?? d.approved,
      apps: d.apps.map((x: App) => x.id === a.id ? { ...x, status: (r as any).status, entry_code: (r as any).entry_code } : x),
    }))
    say(decision === 'approved' ? `✓ ${a.full_name} e pe lista de invitați. L-am anunțat.` : `${a.full_name} a fost respins. L-am anunțat.`)
  }

  function download(name: string, text: string) {
    const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = name; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function exportList() {
    if (!data) return
    const slug = String(data.event.title || 'eveniment').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').slice(0, 40)
    if (data.role === 'admin') {
      const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
      const rows = data.apps.map((a: App) => [a.full_name, a.phone, a.city, a.address, a.instagram, a.profile?.email, EVENT_STATUS_LABEL[a.status as EventStatus], a.entry_code].map(esc).join(','))
      download(`inscrieri-${slug}.csv`, ['Nume,Telefon,Oraș,Adresă,Instagram,Email,Status,Cod', ...rows].join('\n'))
    } else {
      download(`invitati-${slug}.csv`, guestListCsv(data.apps))
    }
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 }
    for (const a of data?.apps ?? []) { c.all++; c[a.status]++ }
    return c
  }, [data])

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (data?.apps ?? []).filter((a: App) =>
      (filter === 'all' || a.status === filter) &&
      (!s || `${a.full_name} ${a.city ?? ''}`.toLowerCase().includes(s)))
  }, [data, filter, q])

  if (error) return <div className="evp-box evp-err">{error} <button className="evp-btn" onClick={load}>Reîncearcă</button><style>{CSS}</style></div>
  if (!data) return <div className="evp-box" style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 className="animate-spin" size={24} color="#5a35e6" /><style>{CSS}</style></div>

  const full = data.slots !== null && data.approved >= data.slots
  const isAdmin = data.role === 'admin'

  return (
    <div className="evp">
      <style>{CSS}</style>
      {toast && <div className={`evp-toast${toast.ok ? '' : ' bad'}`} role="status">{toast.msg}</div>}

      <div className="evp-head">
        <div className="evp-stat">
          <span className="evp-ico"><Users size={18} /></span>
          <div><b>{counts.all - counts.cancelled}</b><small>vor să vină</small></div>
        </div>
        <div className="evp-stat">
          <span className="evp-ico ok"><Ticket size={18} /></span>
          <div><b>{data.approved}{data.slots !== null ? <span> / {data.slots}</span> : null}</b><small>{data.slots !== null ? 'locuri ocupate' : 'aprobați'}</small></div>
        </div>
        <div className="evp-stat">
          <span className="evp-ico warn">!</span>
          <div><b>{counts.pending}</b><small>așteaptă răspuns</small></div>
        </div>
        <div className="evp-actions">
          <button className="evp-btn" onClick={load} aria-label="Actualizează"><RefreshCw size={16} /></button>
          <button className="evp-btn" onClick={exportList} disabled={!data.apps.length}>
            <Download size={16} /> {isAdmin ? 'Export complet' : 'Lista de invitați'}
          </button>
        </div>
      </div>

      {data.slots !== null && (
        <div className="evp-bar" aria-hidden><i style={{ width: `${Math.min(100, (data.approved / Math.max(1, data.slots)) * 100)}%` }} /></div>
      )}
      {full && <p className="evp-note">Toate locurile sunt ocupate. Ca să mai aprobi pe cineva, respinge o persoană aprobată.</p>}
      {!isAdmin && <p className="evp-hint">Din motive de siguranță vezi numele, orașul și profilul. Telefonul și adresa rămân la AddFame; la intrare, invitații arată codul de pe lista de invitați.</p>}

      <div className="evp-tools">
        <div className="evp-tabs">
          {FILTERS.map(f => (
            <button key={f.k} className={`evp-tab${filter === f.k ? ' on' : ''}`} onClick={() => setFilter(f.k)}>
              {f.l} <span>{counts[f.k]}</span>
            </button>
          ))}
        </div>
        <label className="evp-search"><Search size={15} /><input placeholder="Caută nume sau oraș" value={q} onChange={e => setQ(e.target.value)} /></label>
      </div>

      {shown.length === 0 ? (
        <div className="evp-box evp-empty">
          {counts.all === 0 ? 'Încă nu s-a înscris nimeni. Influencerii văd evenimentul în tabul Evenimente.' : 'Nimeni în această listă.'}
        </div>
      ) : (
        <div className="evp-list">
          {shown.map((a: App) => {
            const st = STATUS_STYLE[a.status as EventStatus]
            const p = a.profile || {}
            return (
              <div key={a.id} className="evp-item">
                <div className="evp-person">
                  {p.avatar ? <img src={p.avatar} alt="" className="evp-av" /> : <span className="evp-av">{a.full_name?.[0] || '?'}</span>}
                  <div className="evp-main">
                    <div className="evp-name">
                      <b>{a.full_name}</b>
                      <span className="evp-chip" style={{ background: st.bg, color: st.fg }}>{EVENT_STATUS_LABEL[a.status as EventStatus]}</span>
                      {a.invited && <span className="evp-chip" style={{ background: '#efeaff', color: '#4423c4' }}>Invitat</span>}
                    </div>
                    <div className="evp-meta">
                      {a.city && <span><MapPin size={12} /> {a.city}</span>}
                      {num(p.ig_followers) && <span>IG {num(p.ig_followers)}</span>}
                      {num(p.tt_followers) && <span>TikTok {num(p.tt_followers)}</span>}
                      {(p.niches || []).map((n: string) => <span key={n} className="evp-niche">{n}</span>)}
                    </div>
                    {isAdmin && (
                      <div className="evp-meta evp-private">
                        {a.phone && <span><Phone size={12} /> {a.phone}</span>}
                        {a.address && <span><Home size={12} /> {a.address}</span>}
                        {a.instagram && <span>@{a.instagram}</span>}
                        {p.email && <span><Mail size={12} /> {p.email}</span>}
                      </div>
                    )}
                    {a.message && <p className="evp-msg">„{a.message}”</p>}
                    {a.status === 'approved' && a.entry_code && <div className="evp-code"><Ticket size={13} /> Cod intrare <b>{a.entry_code}</b></div>}
                  </div>
                </div>
                <div className="evp-do">
                  {a.status === 'pending' && <>
                    <button className="evp-btn ok" disabled={busy === a.id || full} onClick={() => decide(a, 'approved')}>
                      {busy === a.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Aprobă
                    </button>
                    <button className="evp-btn no" disabled={busy === a.id} onClick={() => decide(a, 'rejected')}><X size={15} /> Respinge</button>
                  </>}
                  {a.status === 'approved' && (
                    <button className="evp-btn no" disabled={busy === a.id} onClick={() => decide(a, 'rejected')}><X size={15} /> Scoate de pe listă</button>
                  )}
                  {a.status === 'rejected' && (
                    <button className="evp-btn" disabled={busy === a.id || full} onClick={() => decide(a, 'approved')}><Check size={15} /> Aprobă totuși</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const CSS = `
.evp { display: flex; flex-direction: column; gap: 14px; color: #14123a; position: relative; }
.evp-box { background: #fff; border: 1px solid #e5e3f3; border-radius: 18px; padding: 18px; font-size: 14px; }
.evp-err { color: #b42318; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.evp-empty { text-align: center; color: #6a6690; padding: 36px 18px; }
.evp-head { display: flex; flex-wrap: wrap; gap: 10px; align-items: stretch; }
.evp-stat { display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid #e5e3f3; border-radius: 16px; padding: 12px 14px; flex: 1 1 150px; }
.evp-stat b { display: block; font-size: 22px; font-weight: 800; line-height: 1.1; font-variant-numeric: tabular-nums; font-family: var(--font-display, system-ui), system-ui, sans-serif; }
.evp-stat b span { font-size: 15px; color: #8783a8; }
.evp-stat small { font-size: 12px; color: #6a6690; }
.evp-ico { width: 38px; height: 38px; border-radius: 12px; background: #efeaff; color: #4423c4; display: flex; align-items: center; justify-content: center; flex: none; font-weight: 800; }
.evp-ico.ok { background: #dcf5ec; color: #14804a; }
.evp-ico.warn { background: #fff1c2; color: #854d0e; }
.evp-actions { display: flex; gap: 8px; align-items: center; margin-left: auto; }
.evp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 38px; padding: 0 12px; border-radius: 10px; border: 1.5px solid #d8d5ec; background: #fff; color: #14123a; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.evp-btn:hover:not(:disabled) { background: #f7f4ff; border-color: #c9b9fb; }
.evp-btn:disabled { opacity: .5; cursor: not-allowed; }
.evp-btn.ok { background: #5a35e6; border-color: #5a35e6; color: #fff; }
.evp-btn.ok:hover:not(:disabled) { background: #4423c4; border-color: #4423c4; }
.evp-btn.no { color: #b42318; border-color: #f3c9c4; }
.evp-btn.no:hover:not(:disabled) { background: #fff4f2; border-color: #f3c9c4; }
.evp-bar { height: 6px; border-radius: 99px; background: #eeecf7; overflow: hidden; }
.evp-bar i { display: block; height: 100%; background: linear-gradient(90deg, #2f6fe0, #5a35e6); border-radius: 99px; }
.evp-note { margin: 0; padding: 10px 12px; border-radius: 12px; background: #fff1c2; color: #854d0e; font-size: 13px; font-weight: 600; }
.evp-hint { margin: 0; font-size: 12.5px; color: #6a6690; }
.evp-tools { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; }
.evp-tabs { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; max-width: 100%; }
.evp-tab { height: 34px; padding: 0 12px; border-radius: 99px; border: 1.5px solid #e5e3f3; background: #fff; color: #4a4770; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.evp-tab span { color: #8783a8; margin-left: 4px; font-variant-numeric: tabular-nums; }
.evp-tab.on { background: #14123a; border-color: #14123a; color: #fff; }
.evp-tab.on span { color: rgba(255,255,255,.7); }
.evp-search { display: flex; align-items: center; gap: 8px; height: 38px; padding: 0 12px; border: 1.5px solid #e5e3f3; border-radius: 12px; background: #fff; color: #8783a8; min-width: 0; flex: 0 1 260px; }
.evp-search input { border: 0; outline: 0; font: inherit; font-size: 14px; color: #14123a; background: transparent; min-width: 0; flex: 1; }
.evp-list { display: flex; flex-direction: column; gap: 10px; }
.evp-item { display: flex; gap: 14px; align-items: center; justify-content: space-between; background: #fff; border: 1px solid #e5e3f3; border-radius: 16px; padding: 14px; }
.evp-person { display: flex; gap: 12px; min-width: 0; flex: 1; }
.evp-av { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; flex: none; background: #efeaff; color: #4423c4; display: flex; align-items: center; justify-content: center; font-weight: 800; }
.evp-main { min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.evp-name { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.evp-name b { font-size: 15px; }
.evp-chip { display: inline-flex; align-items: center; height: 22px; padding: 0 9px; border-radius: 99px; font-size: 11.5px; font-weight: 800; white-space: nowrap; }
.evp-meta { display: flex; flex-wrap: wrap; gap: 6px 12px; font-size: 12.5px; color: #6a6690; }
.evp-meta span { display: inline-flex; align-items: center; gap: 4px; }
.evp-niche { background: #f6f6fc; border-radius: 99px; padding: 1px 8px; }
.evp-private { color: #4a4770; background: #faf9ff; border-radius: 10px; padding: 6px 8px; word-break: break-word; }
.evp-msg { margin: 2px 0 0; font-size: 13.5px; color: #2b2856; font-style: italic; overflow-wrap: anywhere; }
.evp-code { display: inline-flex; align-items: center; gap: 6px; width: fit-content; font-size: 12.5px; color: #14532d; background: #dcf5ec; border-radius: 10px; padding: 4px 10px; }
.evp-code b { letter-spacing: .06em; }
.evp-do { display: flex; gap: 8px; flex: none; }
.evp-toast { position: fixed; left: 50%; bottom: calc(24px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); z-index: 80; background: #14123a; color: #fff; padding: 12px 16px; border-radius: 14px; font-size: 13.5px; font-weight: 600; box-shadow: 0 18px 40px -16px rgba(20,18,58,.6); max-width: calc(100vw - 32px); }
.evp-toast.bad { background: #b42318; }
@media (max-width: 640px) {
  .evp-item { flex-direction: column; align-items: stretch; }
  .evp-do { width: 100%; }
  .evp-do .evp-btn { flex: 1; height: 44px; }
  .evp-actions { width: 100%; margin-left: 0; }
  .evp-actions .evp-btn:last-child { flex: 1; }
  .evp-search { flex: 1 1 100%; }
}
`
