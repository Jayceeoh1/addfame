'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Instagram, Download, Search, Calendar, Phone, Mail, Tag, RefreshCw } from 'lucide-react'

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" />
  </svg>
)

type Signup = {
  id: string
  created_at: string
  first_name: string
  last_name: string
  email: string
  phone: string
  instagram: string | null
  tiktok: string | null
  category: string | null
  status: string
}

export default function EventSignupsPage() {
  const [signups, setSignups] = useState<Signup[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('event_signups')
      .select('*')
      .order('created_at', { ascending: false })
    setSignups(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = signups.filter(s => {
    const q = search.toLowerCase()
    return (
      s.first_name.toLowerCase().includes(q) ||
      s.last_name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.instagram || '').toLowerCase().includes(q) ||
      (s.tiktok || '').toLowerCase().includes(q)
    )
  })

  const exportCSV = () => {
    const headers = ['Prenume', 'Nume', 'Email', 'Telefon', 'Instagram', 'TikTok', 'Categorie', 'Data']
    const rows = filtered.map(s => [
      s.first_name,
      s.last_name,
      s.email,
      s.phone,
      s.instagram || '',
      s.tiktok || '',
      s.category || '',
      new Date(s.created_at).toLocaleString('ro-RO'),
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inscrieri-eveniment-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('ro-RO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  return (
    <div className="p-6 max-w-7xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .brand-grad { background: linear-gradient(135deg, #f97316, #ec4899); }
        .stat-card { background: white; border: 1.5px solid #f0f0f0; border-radius: 16px; padding: 20px 24px; }
        .table-row { border-bottom: 1px solid #f5f5f5; transition: background .12s; }
        .table-row:hover { background: #fafafa; }
        .badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 100px; font-size: 12px; font-weight: 700; }
        .search-input { background: white; border: 1.5px solid #e5e7eb; border-radius: 12px; padding: 10px 14px 10px 40px; font-size: 14px; font-family: inherit; outline: none; width: 100%; transition: border-color .2s; }
        .search-input:focus { border-color: #6366f1; }
        .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 12px; font-size: 13px; font-weight: 700; border: none; cursor: pointer; font-family: inherit; transition: all .15s; }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 brand-grad rounded-2xl flex items-center justify-center" style={{ boxShadow: '0 4px 14px rgba(249,115,22,0.3)' }}>
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">Înscrieri Eveniment Toamnă</h1>
          </div>
          <p className="text-gray-400 text-sm ml-13">AddFame Fall Event — lista completă a influencerilor înscriși</p>
        </div>
        <div className="flex gap-3">
          <button onClick={load} className="btn" style={{ background: '#f3f4f6', color: '#374151' }}>
            <RefreshCw className="w-4 h-4" /> Reîncarcă
          </button>
          <button onClick={exportCSV} className="btn brand-grad text-white" style={{ boxShadow: '0 4px 14px rgba(249,115,22,0.25)' }}>
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total înscriși</p>
          <p className="text-3xl font-black text-gray-900">{signups.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Cu Instagram</p>
          <p className="text-3xl font-black text-orange-500">{signups.filter(s => s.instagram).length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Cu TikTok</p>
          <p className="text-3xl font-black text-pink-500">{signups.filter(s => s.tiktok).length}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Azi</p>
          <p className="text-3xl font-black text-indigo-500">
            {signups.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString()).length}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="search-input"
          placeholder="Caută după nume, email, Instagram, TikTok..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 20px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div className="text-center py-16 text-gray-400 font-semibold">Se încarcă...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-semibold">Nicio înscriere găsită</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '2px solid #f5f5f5' }}>
                <th className="text-left px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Influencer</th>
                <th className="text-left px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Contact</th>
                <th className="text-left px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Social</th>
                <th className="text-left px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Categorie</th>
                <th className="text-left px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Data</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} className="table-row">
                  {/* Influencer */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 brand-grad rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-black text-sm">
                          {s.first_name[0]}{s.last_name[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-sm">{s.first_name} {s.last_name}</p>
                        <p className="text-xs text-gray-400">#{i + 1}</p>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <a href={`mailto:${s.email}`} className="hover:text-indigo-600 transition">{s.email}</a>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <a href={`tel:${s.phone}`} className="hover:text-indigo-600 transition">{s.phone}</a>
                      </div>
                    </div>
                  </td>

                  {/* Social */}
                  <td className="px-5 py-4">
                    <div className="space-y-1.5">
                      {s.instagram && (
                        <a href={`https://instagram.com/${s.instagram}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 transition">
                          <Instagram className="w-3.5 h-3.5" />
                          @{s.instagram}
                        </a>
                      )}
                      {s.tiktok && (
                        <a href={`https://tiktok.com/@${s.tiktok}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-bold text-pink-600 hover:text-pink-700 transition">
                          <TikTokIcon />
                          @{s.tiktok}
                        </a>
                      )}
                      {!s.instagram && !s.tiktok && (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>
                  </td>

                  {/* Categorie */}
                  <td className="px-5 py-4">
                    {s.category ? (
                      <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                        <Tag className="w-3 h-3" />{s.category}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>

                  {/* Data */}
                  <td className="px-5 py-4">
                    <span className="text-xs text-gray-500 font-semibold">{formatDate(s.created_at)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center font-semibold">
        {filtered.length} din {signups.length} înscriși afișați
      </p>
    </div>
  )
}
