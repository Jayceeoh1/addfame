'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAllCollaborations } from '@/app/actions/admin'
import { Search, RefreshCw, Handshake, CheckCircle, Clock, XCircle, ExternalLink } from 'lucide-react'

const STATUS: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDING: { label: 'Aplicat', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  INVITED: { label: 'Invitat', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
  ACTIVE: { label: 'Activ', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  COMPLETED: { label: 'Finalizat', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  REJECTED: { label: 'Respins', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' },
}

const fmt = (n: number) => `${(n || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })

export default function AdminCollaborations() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getAllCollaborations(100)
    if (res.success) setItems(res.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = items.filter(i => {
    const inf = i.influencers?.name?.toLowerCase() ?? ''
    const brand = i.brands?.name?.toLowerCase() ?? ''
    const camp = i.campaigns?.title?.toLowerCase() ?? ''
    const q = search.toLowerCase()
    const matchSearch = !search || inf.includes(q) || brand.includes(q) || camp.includes(q)
    const matchFilter = filter === 'all' || i.status === filter
    return matchSearch && matchFilter
  })

  const counts = Object.fromEntries(
    Object.keys(STATUS).map(k => [k, items.filter(i => i.status === k).length])
  )

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>

      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Toate Colaborările</h1>
          <p className="text-sm text-gray-400 mt-0.5">{items.length} colaborări totale</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-indigo-600 px-3 py-2 rounded-xl border border-gray-200 bg-white transition">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          Toate ({items.length})
        </button>
        {Object.entries(STATUS).map(([k, v]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition ${filter === k ? `${v.bg} ${v.text} border border-current` : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {v.label} ({counts[k] ?? 0})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Caută influencer, brand, campanie..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Handshake className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="font-black text-gray-400">Nicio colaborare găsită</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1.5px solid #f5f5f5' }}>
                {['Influencer', 'Brand', 'Campanie', 'Buget', 'Plată inf.', 'Status', 'Dată'].map(h => (
                  <th key={h} className="text-left px-4 py-3.5 text-xs font-black text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const st = STATUS[item.status] ?? STATUS.PENDING
                return (
                  <tr key={item.id} className="hover:bg-gray-50/70 transition" style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f9f9f9' : 'none' }}>
                    <td className="px-4 py-3.5">
                      <p className="font-black text-sm text-gray-900">{item.influencers?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{item.influencers?.email ?? ''}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-sm text-gray-700">{item.brands?.name ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3.5 max-w-xs">
                      <p className="text-sm text-gray-600 truncate">{item.campaigns?.title ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-sm text-gray-700">
                        {item.campaigns?.budget_per_influencer
                          ? fmt(item.campaigns.budget_per_influencer)
                          : item.campaigns?.max_influencers > 0
                            ? fmt(Math.round((item.campaigns.budget || 0) / item.campaigns.max_influencers))
                            : fmt(item.campaigns?.budget || 0)}
                      </p>
                      <p className="text-[10px] text-gray-400">per influencer</p>
                    </td>
                    <td className="px-4 py-3.5">
                      {item.payment_amount
                        ? <p className="font-black text-sm text-green-600">{fmt(item.payment_amount)}</p>
                        : <p className="text-xs text-gray-300">—</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black ${st.bg} ${st.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-xs text-gray-500">{fmtDate(item.created_at)}</p>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
