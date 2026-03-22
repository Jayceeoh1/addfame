'use client'

import { useEffect, useState, useCallback } from 'react'
import { getAdminStats, getAdminChartData } from '@/app/actions/admin'
import { Users, Briefcase, Building2, TrendingUp, Clock, CheckCircle, AlertCircle, DollarSign, RefreshCw, BarChart2, Star } from 'lucide-react'
import Link from 'next/link'

function MiniChart({ data, color, height = 48 }: { data: number[]; color: string; height?: number }) {
  if (!data?.length) return null
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100
    const y = height - (v / max) * (height - 4)
    return `${x},${y}`
  }).join(' ')
  const area = `0,${height} ${pts} 100,${height}`
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`g-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#g-${color})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BarChart({ data, labels, color }: { data: number[]; labels: string[]; color: string }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-1.5 h-28">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full rounded-t-lg transition-all duration-500"
            style={{ height: `${Math.max(4, Math.round((v / max) * 96))}px`, background: color, opacity: v === 0 ? 0.2 : 1 }} />
          <span className="text-[10px] font-bold text-gray-400">{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [charts, setCharts] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [s, c] = await Promise.all([getAdminStats(), getAdminChartData()])
    if (s.success) setStats(s)
    if ((c as any).success) setCharts(c)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) => `${(n || 0).toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON`
  const totalRevenue = charts?.revenue?.reduce((s: number, v: number) => s + v, 0) || 0

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .card { background:white;border:1.5px solid #f0f0f0;border-radius:20px; }
        .stat-card { background:white;border:1.5px solid #f0f0f0;border-radius:20px;padding:20px;transition:all .2s; }
        .stat-card:hover { box-shadow:0 8px 24px rgba(0,0,0,0.07);transform:translateY(-2px); }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation:fadeUp .4s ease both; }
      `}</style>

      <div className="flex items-center justify-between mb-7 fu">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Platform overview</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-indigo-600 transition px-3 py-2 rounded-xl border border-gray-200 bg-white">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-10 h-10 rounded-full border-t-indigo-500 border-indigo-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
        </div>
      ) : (
        <>
          {/* KPI Row 1 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Total Influencers', value: stats?.influencers?.total ?? 0, color: 'text-purple-600', bg: 'bg-purple-50', accent: '#8b5cf6', icon: Users, href: '/admin/influencers', data: charts?.influencerGrowth },
              { label: 'Total Brands', value: stats?.brands?.total ?? 0, color: 'text-blue-600', bg: 'bg-blue-50', accent: '#3b82f6', icon: Building2, href: '/admin/brands', data: charts?.brandGrowth },
              { label: 'Active Campaigns', value: stats?.campaigns?.active ?? 0, color: 'text-green-600', bg: 'bg-green-50', accent: '#22c55e', icon: Briefcase, href: '/admin/campaigns', data: null },
              { label: 'Revenue (6mo)', value: fmt(totalRevenue), color: 'text-indigo-600', bg: 'bg-indigo-50', accent: '#6366f1', icon: DollarSign, href: '/admin/payments', data: charts?.revenue },
            ].map((s, i) => (
              <Link key={s.label} href={s.href} className="stat-card fu flex flex-col" style={{ animationDelay: `${i * 0.07}s` }}>
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                </div>
                <p className={`text-2xl font-black ${s.color} mt-1`}>{s.value}</p>
                <p className="text-xs font-bold text-gray-400 mt-0.5 mb-2">{s.label}</p>
                {s.data && <MiniChart data={s.data} color={s.accent} height={36} />}
              </Link>
            ))}
          </div>

          {/* KPI Row 2 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Approved Influencers', value: stats?.influencers?.approved ?? 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Pending Approval', value: stats?.influencers?.pending ?? 0, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Total Campaigns', value: stats?.campaigns?.total ?? 0, icon: TrendingUp, color: 'text-gray-700', bg: 'bg-gray-100' },
              { label: 'Pending Payments', value: fmt(stats?.revenue?.pending ?? 0), icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
            ].map((s, i) => (
              <div key={s.label} className="stat-card fu" style={{ animationDelay: `${(i + 4) * 0.07}s` }}>
                <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs font-bold text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid lg:grid-cols-3 gap-5 mb-5">

            {/* Revenue chart */}
            <div className="card p-5 lg:col-span-2 fu" style={{ animationDelay: '.3s' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-black text-gray-900 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-indigo-400" /> Revenue</h2>
                  <p className="text-xs text-gray-400">Last 6 months</p>
                </div>
                <span className="text-xl font-black text-indigo-600">{fmt(totalRevenue)}</span>
              </div>
              {charts?.revenue && <BarChart data={charts.revenue} labels={charts.monthLabels ?? []} color="linear-gradient(180deg,#6366f1,#8b5cf6)" />}
            </div>

            {/* User growth */}
            <div className="card p-5 fu" style={{ animationDelay: '.34s' }}>
              <h2 className="font-black text-gray-900 mb-1 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-400" /> User Growth</h2>
              <p className="text-xs text-gray-400 mb-4">New signups per month</p>
              {charts?.monthLabels && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-purple-600">Influencers</span>
                      <span className="text-xs font-black text-gray-600">+{charts.influencerGrowth?.reduce((s: number, v: number) => s + v, 0)}</span>
                    </div>
                    <div className="flex items-end gap-1 h-14">
                      {(charts.influencerGrowth ?? []).map((v: number, i: number) => {
                        const max = Math.max(...charts.influencerGrowth, 1)
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                            <div className="w-full rounded-t" style={{ height: `${Math.max(3, Math.round((v / max) * 48))}px`, background: '#8b5cf6', opacity: v === 0 ? 0.2 : 1 }} />
                            <span className="text-[9px] text-gray-400">{charts.monthLabels[i]}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-blue-600">Brands</span>
                      <span className="text-xs font-black text-gray-600">+{charts.brandGrowth?.reduce((s: number, v: number) => s + v, 0)}</span>
                    </div>
                    <div className="flex items-end gap-1 h-14">
                      {(charts.brandGrowth ?? []).map((v: number, i: number) => {
                        const max = Math.max(...charts.brandGrowth, 1)
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                            <div className="w-full rounded-t" style={{ height: `${Math.max(3, Math.round((v / max) * 48))}px`, background: '#3b82f6', opacity: v === 0 ? 0.2 : 1 }} />
                            <span className="text-[9px] text-gray-400">{charts.monthLabels[i]}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Top campaigns + Quick actions */}
          <div className="grid lg:grid-cols-2 gap-5">

            {/* Top campaigns */}
            <div className="card p-5 fu" style={{ animationDelay: '.38s' }}>
              <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-amber-400" /> Top Campaigns</h2>
              {!charts?.topCampaigns?.length ? (
                <p className="text-sm text-gray-400">No campaign data yet</p>
              ) : (
                <div className="space-y-3">
                  {charts.topCampaigns.map((c: any, i: number) => (
                    <Link key={c.id} href={`/brand/campaigns/${c.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition">
                      <div className="w-7 h-7 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-black text-indigo-600">#{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-900 text-sm truncate">{c.title}</p>
                        <p className="text-xs text-gray-400">{c.collabs} applications · {c.completed} completed</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-black text-green-600">{c.budget ? `${c.budget.toLocaleString('ro-RO')} RON` : '—'}</p>
                        <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${c.status === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>{c.status}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="card p-5 fu" style={{ animationDelay: '.42s' }}>
              <h2 className="font-black text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Manage Influencers', href: '/admin/influencers', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100', icon: Users, badge: stats?.influencers?.pending > 0 ? stats.influencers.pending : null },
                  { label: 'Manage Brands', href: '/admin/brands', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100', icon: Building2, badge: null },
                  { label: 'View Campaigns', href: '/admin/campaigns', color: 'bg-green-50 text-green-700 hover:bg-green-100', icon: Briefcase, badge: null },
                  { label: 'Confirm Payments', href: '/admin/payments', color: 'bg-orange-50 text-orange-700 hover:bg-orange-100', icon: DollarSign, badge: stats?.revenue?.pending > 0 ? '!' : null },
                ].map(a => (
                  <Link key={a.href} href={a.href}
                    className={`relative flex items-center gap-2.5 px-4 py-3.5 rounded-2xl font-bold text-sm transition ${a.color}`}>
                    <a.icon className="w-4 h-4 flex-shrink-0" /> {a.label}
                    {a.badge && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">{a.badge}</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
