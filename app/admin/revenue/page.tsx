'use client'

import { useState, useEffect, useCallback } from 'react'
import { getRevenueStats } from '@/app/actions/admin'
import { TrendingUp, DollarSign, ArrowUpRight, ArrowDownLeft, RefreshCw, BarChart2, Users, CheckCircle } from 'lucide-react'

const fmt = (n: number) => `${(n || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`

function MiniBar({ data }: { data: { label: string; commission: number }[] }) {
  const max = Math.max(...data.map(d => d.commission), 1)
  return (
    <div className="flex items-end gap-2 h-32 mt-4">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <div className="w-full rounded-t-lg transition-all"
            style={{ height: `${Math.max(4, Math.round((d.commission / max) * 112))}px`, background: d.commission > 0 ? 'linear-gradient(180deg,#6366f1,#8b5cf6)' : '#f3f4f6', opacity: d.commission === 0 ? 0.4 : 1 }} />
          <span className="text-[10px] font-black text-gray-400">{d.label}</span>
          {d.commission > 0 && <span className="text-[9px] font-bold text-indigo-400">{d.commission.toFixed(0)}</span>}
        </div>
      ))}
    </div>
  )
}

export default function AdminRevenue() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getRevenueStats()
    if ((res as any).success) setStats(res)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!stats) return <div className="p-8 text-gray-400 font-bold">Eroare la încărcarea datelor.</div>

  const STAT_CARDS = [
    {
      label: 'Comision total platformat', value: fmt(stats.totalCommission),
      sub: `din ${stats.totalCollabs} colaborări finalizate`,
      icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200',
    },
    {
      label: 'Plătit influencerilor', value: fmt(stats.totalPaidOut),
      sub: '85% din bugetele colaborărilor',
      icon: ArrowDownLeft, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200',
    },
    {
      label: 'Top-up branduri (total)', value: fmt(stats.totalBrandTopups),
      sub: `${stats.pendingTopups?.toFixed(2)} RON în așteptare`,
      icon: ArrowUpRight, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200',
    },
    {
      label: 'Retrageri în așteptare', value: fmt(stats.pendingWithdrawals),
      sub: `${stats.completedWithdrawals?.toFixed(2)} RON procesate total`,
      icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200',
    },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>

      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Revenue Platformă</h1>
          <p className="text-sm text-gray-400 mt-0.5">Comisioane și fluxuri financiare</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-indigo-600 px-3 py-2 rounded-xl border border-gray-200 bg-white transition">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map((c, i) => (
          <div key={i} className={`bg-white rounded-2xl border ${c.border} p-5`}>
            <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center mb-3`}>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-1">{c.label}</p>
            <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="font-black text-gray-900">Comision lunar</h2>
            <p className="text-sm text-gray-400">Ultimele 6 luni</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Total perioadă</p>
            <p className="font-black text-indigo-600">{fmt(stats.monthly?.reduce((s: number, m: any) => s + m.commission, 0) || 0)}</p>
          </div>
        </div>
        {stats.monthly && <MiniBar data={stats.monthly} />}
      </div>

      {/* Model info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-black text-gray-900 mb-4">Model financiar AddFame</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { label: 'Comision platformă', value: '15%', desc: 'din fiecare colaborare finalizată', color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Câștig influencer', value: '85%', desc: 'din bugetul colaborării', color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Fee retragere', value: '5%', desc: 'la retragerea din wallet', color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map((m, i) => (
            <div key={i} className={`${m.bg} rounded-xl p-4`}>
              <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-1">{m.label}</p>
              <p className={`text-3xl font-black ${m.color}`}>{m.value}</p>
              <p className="text-xs text-gray-500 mt-1">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
