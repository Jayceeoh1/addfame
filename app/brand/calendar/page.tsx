'use client'
// @ts-nocheck
import React from 'react'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Calendar, Zap, Clock, CheckCircle, Pause, FileEdit } from 'lucide-react'
import Link from 'next/link'

const STATUS_CFG: Record<string, { label: string; dot: string; bg: string; fg: string }> = {
  ACTIVE: { label: 'Activ', dot: '#1d9e75', bg: '#dcf5ec', fg: '#14532d' },
  DRAFT: { label: 'Draft', dot: '#e0a81a', bg: '#fff1c2', fg: '#854d0e' },
  PAUSED: { label: 'Pausat', dot: '#9a97b8', bg: '#f0eff7', fg: '#4a4770' },
  COMPLETED: { label: 'Finalizat', dot: '#2f6fe0', bg: '#e6f0ff', fg: '#1d4fb8' },
}

const STATUS_ICON: Record<string, React.ReactElement> = {
  ACTIVE: <Zap className="w-3 h-3" />,
  DRAFT: <FileEdit className="w-3 h-3" />,
  PAUSED: <Pause className="w-3 h-3" />,
  COMPLETED: <CheckCircle className="w-3 h-3" />,
}

const MONTHS = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']
const DAYS = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm']

export default function CampaignCalendarPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [today] = useState(new Date())
  const [view, setView] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState<Date | null>(null)
  const [listView, setListView] = useState(false)

  const load = useCallback(async () => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { router.replace('/auth/login'); return }
    const { data: brand } = await sb.from('brands').select('id').eq('user_id', user.id).single()
    if (!brand) return
    const { data } = await sb.from('campaigns').select('id, title, status, deadline, created_at, budget').eq('brand_id', brand.id).order('created_at', { ascending: false })
    setCampaigns(data ?? [])
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  // Calendar grid
  const year = view.getFullYear()
  const month = view.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)

  function campaignsForDay(day: number) {
    const date = new Date(year, month, day)
    return campaigns.filter(c => {
      if (!c.deadline) return false
      const d = new Date(c.deadline)
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
    })
  }

  function campaignsStartedDay(day: number) {
    const date = new Date(year, month, day)
    return campaigns.filter(c => {
      if (!c.created_at) return false
      const d = new Date(c.created_at)
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
    })
  }

  const selectedCampaigns = selected
    ? campaigns.filter(c => {
      const d = selected
      const deadline = c.deadline ? new Date(c.deadline) : null
      const created = c.created_at ? new Date(c.created_at) : null
      return (deadline && deadline.getFullYear() === d.getFullYear() && deadline.getMonth() === d.getMonth() && deadline.getDate() === d.getDate()) ||
        (created && created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth() && created.getDate() === d.getDate())
    })
    : []

  const activeCampaignsThisMonth = campaigns.filter(c => c.status === 'ACTIVE')
  const deadlinesThisMonth = campaigns.filter(c => {
    if (!c.deadline) return false
    const d = new Date(c.deadline)
    return d.getFullYear() === year && d.getMonth() === month
  })

  const fmt = (n: number) => `${(n || 0).toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON`

  if (loading) return (
    <div className="bu" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#5a35e6', borderTopColor: 'transparent' }} />
    </div>
  )

  const dFmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('ro-RO', o)
  const upcoming = campaigns
    .filter(c => c.deadline && new Date(c.deadline) > new Date())
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 5)
  const urgency = (days: number) => days < 7 ? { background: '#fff1e6', color: '#9a4206' } : days < 14 ? { background: '#fff1c2', color: '#854d0e' } : { background: '#f0eff7', color: '#4a4770' }

  return (
    <div className="bu">
      <style>{`
        .ca-layout{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:18px;align-items:start}
        @media(max-width:1023px){.ca-layout{grid-template-columns:minmax(0,1fr)}}
        .ca-nav{width:44px;height:44px;border-radius:12px;border:1.5px solid #e5e3f3;background:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;color:#14123a;flex:none}
        .ca-nav:hover{background:#f7f4ff;border-color:#c9b9fb}
        .ca-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
        .ca-dow{text-align:center;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#8783a8;padding:4px 0}
        .ca-cell{min-height:92px;border:1.5px solid #eeecf7;border-radius:12px;padding:6px;cursor:pointer;background:#fff;text-align:left;font-family:inherit;color:inherit;min-width:0;display:flex;flex-direction:column;gap:3px;transition:background .15s,border-color .15s}
        .ca-cell:hover{background:#faf8ff;border-color:#c9b9fb}
        .ca-cell.today{border-color:#5a35e6}
        .ca-cell.sel{background:#efeaff;border-color:#5a35e6}
        .ca-d{font-family:var(--font-display,system-ui),system-ui,sans-serif;font-weight:800;font-size:13px;width:24px;height:24px;border-radius:8px;display:flex;align-items:center;justify-content:center}
        .ca-cell.today .ca-d{background:linear-gradient(135deg,#2f6fe0,#5a35e6);color:#fff}
        .ca-ev{font-size:10.5px;font-weight:700;padding:1px 6px;border-radius:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
        .ca-dots{display:none;gap:3px;flex-wrap:wrap}
        .ca-dot{width:7px;height:7px;border-radius:99px}
        @media(max-width:640px){.ca-cell{min-height:50px;padding:4px;align-items:center}.ca-ev{display:none}.ca-dots{display:flex;justify-content:center}.ca-grid{gap:4px}}
        .ca-item{display:flex;align-items:center;gap:12px;padding:14px 20px;text-decoration:none;color:inherit;border-bottom:1px solid #eeecf7;min-height:44px}
        .ca-item:last-child{border-bottom:0}
        .ca-item:hover{background:#faf8ff}
      `}</style>

      {/* Header */}
      <div className="bu-head">
        <div>
          <h1>Calendar campanii</h1>
          <p className="bu-muted" style={{ margin: '6px 0 0' }}>{activeCampaignsThisMonth.length} active · {deadlinesThisMonth.length} deadline-ur luna aceasta</p>
        </div>
        <div className="bu-row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setListView(p => !p)} className={`bu-pill${listView ? ' on' : ''}`} style={{ height: 44 }}>
            <Calendar className="w-4 h-4" /> {listView ? 'Calendar' : 'Listă'}
          </button>
          <Link href="/brand/campaigns/new" className="bu-btn p big">+ Campanie</Link>
        </div>
      </div>

      {listView ? (
        <div className="bu-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid #eeecf7' }}><h2>Toate campaniile</h2></div>
          {campaigns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '56px 20px' }}>
              <div className="bu-ico" style={{ margin: '0 auto 12px', background: '#f0eff7', color: '#4a4770' }}><Calendar className="w-5 h-5" /></div>
              <p className="bu-muted bu-sm" style={{ margin: 0, fontWeight: 700 }}>Nicio campanie încă</p>
            </div>
          ) : (
            <div>
              {campaigns.map(c => {
                const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.DRAFT
                const deadline = c.deadline ? new Date(c.deadline) : null
                const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / 864e5) : null
                return (
                  <Link key={c.id} href={`/brand/campaigns/${c.id}`} className="ca-item" style={{ flexWrap: 'wrap' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 99, background: cfg.dot, flex: 'none' }} />
                    <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</p>
                      <p className="bu-muted bu-xs" style={{ margin: 0 }}>
                        Început {dFmt(new Date(c.created_at), { day: 'numeric', month: 'short', year: 'numeric' })}
                        {deadline && ` · Deadline ${dFmt(deadline, { day: 'numeric', month: 'short', year: 'numeric' })}`}
                      </p>
                    </div>
                    <div className="bu-row" style={{ gap: 8, flex: 'none' }}>
                      {daysLeft !== null && c.status === 'ACTIVE' && (
                        <span className="bu-chip" style={urgency(daysLeft)}>
                          {daysLeft < 0 ? 'Întârziat' : `${daysLeft}z rămase`}
                        </span>
                      )}
                      <span className="bu-chip" style={{ background: cfg.bg, color: cfg.fg }}>
                        {STATUS_ICON[c.status]} {cfg.label}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="ca-layout">
          <div className="bu-card bu-card-pad">
            <div className="bu-row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
              <button className="ca-nav" aria-label="Luna anterioară" onClick={() => setView(new Date(year, month - 1, 1))}><ChevronLeft className="w-4 h-4" /></button>
              <h2 style={{ fontSize: 20 }}>{MONTHS[month]} {year}</h2>
              <button className="ca-nav" aria-label="Luna următoare" onClick={() => setView(new Date(year, month + 1, 1))}><ChevronRight className="w-4 h-4" /></button>
            </div>

            <div className="ca-grid" style={{ marginBottom: 6 }}>
              {DAYS.map(d => <div key={d} className="ca-dow">{d}</div>)}
            </div>

            <div className="ca-grid">
              {cells.map((day, i) => {
                if (!day) return <div key={`e-${i}`} />
                const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
                const isSel = selected?.getDate() === day && selected?.getMonth() === month && selected?.getFullYear() === year
                const deadlines = campaignsForDay(day)
                const starts = campaignsStartedDay(day)
                return (
                  <div key={day} role="button" tabIndex={0}
                    className={`ca-cell${isToday ? ' today' : ''}${isSel ? ' sel' : ''}`}
                    onClick={() => setSelected(isSel ? null : new Date(year, month, day))}>
                    <div className="ca-d">{day}</div>
                    {starts.map(c => (
                      <div key={`s-${c.id}`} className="ca-ev" style={{ background: '#e6f0ff', color: '#1d4fb8' }}>▶ {c.title}</div>
                    ))}
                    {deadlines.map(c => {
                      const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.DRAFT
                      return <div key={`d-${c.id}`} className="ca-ev" style={{ background: cfg.bg, color: cfg.fg }}>⏰ {c.title}</div>
                    })}
                    {(starts.length + deadlines.length) > 0 && (
                      <div className="ca-dots">
                        {starts.map(c => <span key={c.id} className="ca-dot" style={{ background: '#2f6fe0' }} />)}
                        {deadlines.map(c => <span key={c.id} className="ca-dot" style={{ background: (STATUS_CFG[c.status] ?? STATUS_CFG.DRAFT).dot }} />)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="bu-div bu-row" style={{ flexWrap: 'wrap', gap: 8, marginTop: 16, paddingTop: 14 }}>
              <span className="bu-chip" style={{ background: '#e6f0ff', color: '#1d4fb8' }}>Start campanie</span>
              {Object.entries(STATUS_CFG).map(([k, v]) => (
                <span key={k} className="bu-chip" style={{ background: v.bg, color: v.fg }}>Deadline · {v.label}</span>
              ))}
            </div>
          </div>

          <div className="bu-col" style={{ gap: 16 }}>
            {selected && (
              <div className="bu-card bu-card-pad">
                <h3 style={{ marginBottom: 12, textTransform: 'capitalize' }}>
                  {dFmt(selected, { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                {selectedCampaigns.length === 0
                  ? <p className="bu-muted bu-sm" style={{ margin: 0 }}>Nicio campanie în această zi</p>
                  : selectedCampaigns.map(c => {
                    const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.DRAFT
                    return (
                      <Link key={c.id} href={`/brand/campaigns/${c.id}`}
                        style={{ display: 'block', padding: 12, borderRadius: 14, marginBottom: 8, background: cfg.bg, color: cfg.fg, textDecoration: 'none' }}>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>{c.title}</p>
                        <p className="bu-xs" style={{ margin: '2px 0 0', opacity: .8 }}>{cfg.label} · {c.budget ? fmt(c.budget) : '—'}</p>
                      </Link>
                    )
                  })}
              </div>
            )}

            <div className="bu-card" style={{ overflow: 'hidden' }}>
              <div className="bu-row" style={{ gap: 8, padding: '16px 20px', borderBottom: '1px solid #eeecf7' }}>
                <Clock className="w-4 h-4" style={{ color: '#5a35e6' }} />
                <h3 style={{ fontSize: 16 }}>Deadline-uri apropiate</h3>
              </div>
              {upcoming.map(c => {
                const d = new Date(c.deadline)
                const days = Math.ceil((d.getTime() - Date.now()) / 864e5)
                const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.DRAFT
                return (
                  <Link key={c.id} href={`/brand/campaigns/${c.id}`} className="ca-item">
                    <span style={{ width: 8, height: 8, borderRadius: 99, background: cfg.dot, flex: 'none' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</p>
                      <p className="bu-muted bu-xs" style={{ margin: 0 }}>{dFmt(d, { day: 'numeric', month: 'short' })}</p>
                    </div>
                    <span className="bu-chip" style={urgency(days)}>{days}z</span>
                  </Link>
                )
              })}
              {upcoming.length === 0 && (
                <p className="bu-muted bu-sm" style={{ margin: 0, padding: 20 }}>Niciun deadline apropiat</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
