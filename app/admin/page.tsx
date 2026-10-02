'use client'

import { useEffect, useState } from 'react'
import { getAdminStats, getAdminChartData } from '@/app/actions/admin'
import {
  Users, Building2, Briefcase, DollarSign,
  TrendingUp, Clock, CheckCircle, Activity,
  ArrowUpRight, BarChart2
} from 'lucide-react'
import Link from 'next/link'

type Stats = {
  influencers: { total: number; approved: number; pending: number }
  brands: { total: number }
  campaigns: { total: number; active: number; completed: number }
  revenue: { total: number; pending: number }
}

type ChartData = {
  monthLabels: string[]
  influencerGrowth: number[]
  brandGrowth: number[]
  revenue: number[]
  topCampaigns: { id: string; title: string; status: string; budget: number; collabs: number; completed: number }[]
}

function StatCard({
  icon: Icon, label, value, sub, subPositive, color, href,
}: {
  icon: any; label: string; value: string | number; sub?: string
  subPositive?: boolean; color: string; href?: string
}) {
  const colorMap: Record<string, { bg: string; icon: string; ring: string }> = {
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-500', ring: 'ring-indigo-100' },
    green: { bg: 'bg-green-50', icon: 'text-green-500', ring: 'ring-green-100' },
    blue: { bg: 'bg-blue-50', icon: 'text-blue-500', ring: 'ring-blue-100' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-500', ring: 'ring-amber-100' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-500', ring: 'ring-purple-100' },
  }
  const c = colorMap[color] || colorMap.indigo
  const inner = (
    <div className={`bg-white rounded-2xl border-2 border-gray-100 p-5 flex items-start gap-4 hover:border-gray-200 transition group ${href ? 'cursor-pointer' : ''}`}>
      <div className={`w-11 h-11 rounded-xl ${c.bg} ring-4 ${c.ring} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${c.icon}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-black text-gray-900 leading-none">{value}</p>
        {sub && (
          <p className={`text-xs font-semibold mt-1.5 flex items-center gap-1 ${subPositive ? 'text-green-500' : 'text-gray-400'}`}>
            {sub}
          </p>
        )}
      </div>
      {href && <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition flex-shrink-0 mt-1" />}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

function MiniBar({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1)
  const colorClass: Record<string, string> = {
    indigo: 'bg-indigo-400', green: 'bg-green-400', amber: 'bg-amber-400',
  }
  return (
    <div className="flex items-end gap-1 h-10">
      {values.map((v, i) => (
        <div key={i} className={`flex-1 rounded-sm ${colorClass[color] || 'bg-indigo-400'} opacity-80`}
          style={{ height: `${Math.max(4, Math.round((v / max) * 40))}px` }} />
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [chart, setChart] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAdminStats(), getAdminChartData()]).then(([s, c]) => {
      if ((s as any)?.success) setStats(s as any)
      if ((c as any)?.success) setChart(c as any)
      setLoading(false)
    })
  }, [])

  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}K RON` : `${n.toLocaleString('ro-RO')} RON`

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-5 py-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Bun venit în panoul de administrare AddFame</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard icon={Users} label="Influenceri" value={stats?.influencers.total ?? '–'}
          sub={`${stats?.influencers.pending ?? 0} în așteptare`} color="indigo" href="/admin/influencers" />
        <StatCard icon={Building2} label="Branduri" value={stats?.brands.total ?? '–'}
          sub="Total înregistrate" color="blue" href="/admin/brands" />
        <StatCard icon={Briefcase} label="Campanii" value={stats?.campaigns.total ?? '–'}
          sub={`${stats?.campaigns.active ?? 0} active`} subPositive color="purple" href="/admin/campaigns" />
        <StatCard icon={CheckCircle} label="Finalizate" value={stats?.campaigns.completed ?? '–'}
          sub={`din ${stats?.campaigns.total ?? 0} totale`} color="green" href="/admin/campaigns" />
        <StatCard icon={DollarSign} label="Revenue total" value={stats ? fmt(stats.revenue.total) : '–'}
          sub={stats ? `${fmt(stats.revenue.pending)} pending` : undefined} color="green" href="/admin/payments" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {chart && (
          <>
            {[
              { label: 'Influenceri noi', values: chart.influencerGrowth, color: 'indigo', icon: Activity },
              { label: 'Branduri noi', values: chart.brandGrowth, color: 'green', icon: TrendingUp },
              { label: 'Revenue 6 luni', values: chart.revenue, color: 'amber', icon: BarChart2, isMoney: true },
            ].map(g => (
              <div key={g.label} className="bg-white rounded-2xl border-2 border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider">{g.label}</p>
                    <p className="text-lg font-black text-gray-900 mt-0.5">
                      {g.isMoney ? fmt(g.values.reduce((a, b) => a + b, 0)) : g.values.reduce((a, b) => a + b, 0)}
                    </p>
                  </div>
                  <g.icon className={`w-4 h-4 ${g.color === 'indigo' ? 'text-indigo-400' : g.color === 'green' ? 'text-green-400' : 'text-amber-400'}`} />
                </div>
                <MiniBar values={g.values} color={g.color} />
                <div className="flex justify-between mt-2">
                  {chart.monthLabels.map(m => (
                    <span key={m} className="text-[10px] text-gray-300 font-bold">{m}</span>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {chart?.topCampaigns && chart.topCampaigns.length > 0 && (
          <div className="bg-white rounded-2xl border-2 border-gray-100 p-5">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm font-black text-gray-900">Top campanii</p>
              <Link href="/admin/campaigns" className="text-xs font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                Vezi toate <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {chart.topCampaigns.map((c, i) => {
                const statusColor: Record<string, string> = {
                  ACTIVE: 'text-green-600 bg-green-50', DRAFT: 'text-amber-600 bg-amber-50',
                  COMPLETED: 'text-blue-600 bg-blue-50', PAUSED: 'text-gray-500 bg-gray-100',
                }
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-xs font-black text-gray-300 w-4 text-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">{c.title}</p>
                      <p className="text-[11px] text-gray-400">{c.collabs} colaborări · {(c.budget || 0).toLocaleString('ro-RO')} RON</p>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${statusColor[c.status] || 'text-gray-500 bg-gray-100'}`}>
                      {c.status}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border-2 border-gray-100 p-5">
          <p className="text-sm font-black text-gray-900 mb-5">Acces rapid</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Influenceri în așteptare', href: '/admin/influencers', icon: Clock, count: stats?.influencers.pending, color: 'text-amber-500 bg-amber-50' },
              { label: 'Retrageri', href: '/admin/withdrawals', icon: ArrowUpRight, color: 'text-green-500 bg-green-50' },
              { label: 'Verificări ID', href: '/admin/identity', icon: CheckCircle, color: 'text-blue-500 bg-blue-50' },
              { label: 'Campanii active', href: '/admin/campaigns', icon: Activity, count: stats?.campaigns.active, color: 'text-indigo-500 bg-indigo-50' },
              { label: 'Top-up branduri', href: '/admin/payments', icon: DollarSign, color: 'text-purple-500 bg-purple-50' },
              { label: 'Setări platformă', href: '/admin/settings', icon: BarChart2, color: 'text-gray-500 bg-gray-50' },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition group">
                <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-700 leading-tight truncate">{item.label}</p>
                  {item.count !== undefined && item.count > 0 && (
                    <p className="text-[11px] text-amber-500 font-black">{item.count} new</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
