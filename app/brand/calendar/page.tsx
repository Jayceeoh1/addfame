'use client'
// @ts-nocheck
import React from 'react'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Calendar, Zap, Clock, CheckCircle, Pause, FileEdit } from 'lucide-react'
import Link from 'next/link'

const STATUS_CFG: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
  ACTIVE: { label: 'Active', dot: 'bg-green-500', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  DRAFT: { label: 'Draft', dot: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  PAUSED: { label: 'Paused', dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' },
  COMPLETED: { label: 'Completed', dot: 'bg-blue-400', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
}

const STATUS_ICON: Record<string, React.ReactElement> = {
  ACTIVE: <Zap className="w-3 h-3" />,
  DRAFT: <FileEdit className="w-3 h-3" />,
  PAUSED: <Pause className="w-3 h-3" />,
  COMPLETED: <CheckCircle className="w-3 h-3" />,
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

  const fmt = (n: number) => `€${(n || 0).toLocaleString('en')}`

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="w-10 h-10 rounded-full border-t-orange-400 border-orange-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
    </div>
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .card { background:white;border:1.5px solid #f0f0f0;border-radius:20px; }
        .brand-grad { background:linear-gradient(135deg,#f97316,#ec4899); }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation:fadeUp .4s ease both; }
        .day-cell { min-height:80px;border:1px solid #f5f5f5;border-radius:12px;padding:6px;cursor:pointer;transition:all .15s; }
        .day-cell:hover { background:#fff9f5;border-color:#fed7aa; }
        .day-cell.today { border-color:#f97316;border-width:2px; }
        .day-cell.selected { background:#fff7ed;border-color:#f97316;border-width:2px; }
        @media (max-width: 640px) { .day-cell { min-height:52px;padding:4px; } }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 fu">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-orange-500" /> Campaign Calendar
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{activeCampaignsThisMonth.length} active · {deadlinesThisMonth.length} deadline{deadlinesThisMonth.length !== 1 ? 's' : ''} this month</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setListView(p => !p)}
            className={`text-sm font-bold px-3 py-2 rounded-xl border transition ${listView ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-white text-gray-400 border-gray-200 hover:border-orange-200'}`}>
            {listView ? 'Calendar' : 'List'}
          </button>
          <Link href="/brand/campaigns/new"
            className="flex items-center gap-1.5 text-sm font-black text-white px-4 py-2 rounded-xl brand-grad"
            style={{ boxShadow: '0 3px 10px rgba(249,115,22,.3)' }}>
            + Campaign
          </Link>
        </div>
      </div>

      {listView ? (
        /* ── List view ── */
        <div className="card overflow-hidden fu" style={{ animationDelay: '.05s' }}>
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-black text-gray-900">All Campaigns</h2>
          </div>
          {campaigns.length === 0 ? (
            <div className="text-center py-16"><Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" /><p className="text-sm font-bold text-gray-400">No campaigns yet</p></div>
          ) : (
            <div className="divide-y divide-gray-50">
              {campaigns.map(c => {
                const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.DRAFT
                const deadline = c.deadline ? new Date(c.deadline) : null
                const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / 864e5) : null
                return (
                  <Link key={c.id} href={`/brand/campaigns/${c.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 truncate">{c.title}</p>
                      <p className="text-xs text-gray-400">
                        Started {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {deadline && ` · Deadline ${deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {daysLeft !== null && c.status === 'ACTIVE' && (
                        <span className={`text-xs font-bold ${daysLeft < 7 ? 'text-red-600' : daysLeft < 14 ? 'text-amber-600' : 'text-gray-400'}`}>
                          {daysLeft < 0 ? 'Overdue' : `${daysLeft}d left`}
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${cfg.bg} ${cfg.text}`}>
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
        /* ── Calendar view ── */
        <div className="grid lg:grid-cols-4 gap-5">
          <div className="lg:col-span-3">
            <div className="card p-4 sm:p-5 fu" style={{ animationDelay: '.05s' }}>
              {/* Month nav */}
              <div className="flex items-center justify-between mb-5">
                <button onClick={() => setView(new Date(year, month - 1, 1))}
                  className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <h2 className="font-black text-gray-900 text-lg">{MONTHS[month]} {year}</h2>
                <button onClick={() => setView(new Date(year, month + 1, 1))}
                  className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* Day labels */}
              <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                {DAYS.map(d => <div key={d} className="text-center text-xs font-black text-gray-400 py-1">{d}</div>)}
              </div>

              {/* Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {cells.map((day, i) => {
                  if (!day) return <div key={`e-${i}`} />
                  const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
                  const isSel = selected?.getDate() === day && selected?.getMonth() === month && selected?.getFullYear() === year
                  const deadlines = campaignsForDay(day)
                  const starts = campaignsStartedDay(day)
                  return (
                    <div key={day}
                      className={`day-cell ${isToday ? 'today' : ''} ${isSel ? 'selected' : ''}`}
                      onClick={() => setSelected(isSel ? null : new Date(year, month, day))}>
                      <div className={`text-xs font-black mb-1 w-6 h-6 rounded-lg flex items-center justify-center ${isToday ? 'text-white brand-grad' : 'text-gray-700'}`}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {starts.map(c => (
                          <div key={`s-${c.id}`} className="hidden sm:block text-[10px] font-bold truncate px-1 rounded bg-orange-100 text-orange-700">▶ {c.title}</div>
                        ))}
                        {deadlines.map(c => {
                          const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.DRAFT
                          return <div key={`d-${c.id}`} className={`hidden sm:block text-[10px] font-bold truncate px-1 rounded ${cfg.bg} ${cfg.text}`}>⏰ {c.title}</div>
                        })}
                        {(starts.length + deadlines.length) > 0 && (
                          <div className="sm:hidden flex gap-0.5 flex-wrap">
                            {starts.map(c => <div key={c.id} className="w-2 h-2 rounded-full bg-orange-400" />)}
                            {deadlines.map(c => <div key={c.id} className={`w-2 h-2 rounded-full ${(STATUS_CFG[c.status] ?? STATUS_CFG.DRAFT).dot}`} />)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600"><div className="w-3 h-3 rounded bg-orange-100" /> Campaign start</div>
                {Object.entries(STATUS_CFG).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'inherit' }}>
                    <div className={`w-3 h-3 rounded ${v.bg}`} />
                    <span className="text-gray-400">{v.label} deadline</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Selected day */}
            {selected && (
              <div className="card p-4 fu">
                <p className="font-black text-gray-900 text-sm mb-3">
                  {selected.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                {selectedCampaigns.length === 0
                  ? <p className="text-sm text-gray-400">No campaigns on this day</p>
                  : selectedCampaigns.map(c => {
                    const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.DRAFT
                    return (
                      <Link key={c.id} href={`/brand/campaigns/${c.id}`}
                        className={`block p-3 rounded-xl border mb-2 hover:opacity-80 transition ${cfg.bg} ${cfg.border}`}>
                        <p className={`font-black text-sm ${cfg.text}`}>{c.title}</p>
                        <p className={`text-xs ${cfg.text} opacity-70 mt-0.5`}>{cfg.label} · {c.budget ? fmt(c.budget) : '—'}</p>
                      </Link>
                    )
                  })}
              </div>
            )}

            {/* Upcoming deadlines */}
            <div className="card p-4 fu" style={{ animationDelay: '.08s' }}>
              <p className="font-black text-gray-900 text-sm mb-3 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-orange-400" /> Upcoming Deadlines
              </p>
              {campaigns
                .filter(c => c.deadline && new Date(c.deadline) > new Date())
                .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
                .slice(0, 5)
                .map(c => {
                  const d = new Date(c.deadline)
                  const days = Math.ceil((d.getTime() - Date.now()) / 864e5)
                  const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.DRAFT
                  return (
                    <Link key={c.id} href={`/brand/campaigns/${c.id}`}
                      className="flex items-start gap-2.5 py-2.5 border-b border-gray-100 last:border-0 hover:opacity-70 transition">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-900 text-xs truncate">{c.title}</p>
                        <p className="text-[11px] text-gray-400">{d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                      </div>
                      <span className={`text-xs font-black flex-shrink-0 ${days < 7 ? 'text-red-500' : days < 14 ? 'text-amber-500' : 'text-gray-400'}`}>
                        {days}d
                      </span>
                    </Link>
                  )
                })}
              {!campaigns.some(c => c.deadline && new Date(c.deadline) > new Date()) && (
                <p className="text-xs text-gray-400">No upcoming deadlines</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
