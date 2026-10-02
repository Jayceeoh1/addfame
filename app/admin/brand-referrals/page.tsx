'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { getAllBrandReferrals, approveBrandReferralBonus1 } from '@/app/actions/brand-referrals'
import { Handshake, RefreshCw, TrendingUp, Users, DollarSign, Clock, CheckCircle, AlertTriangle } from 'lucide-react'

type BrandReferral = {
  id: string
  status: 'pending' | 'bonus1_paid' | 'bonus2_paid'
  created_at: string
  bonus1_paid_at: string | null
  bonus2_paid_at: string | null
  referral_code: string
  influencers: { id: string; name: string; email: string; wallet_balance: number } | null
  brands: { id: string; name: string; email: string; approval_status: string } | null
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Înregistrat', color: '#92400e', bg: '#fef3c7' },
  bonus1_paid: { label: 'Bonus 1 plătit', color: '#1e40af', bg: '#dbeafe' },
  bonus2_paid: { label: 'Bonus 2 plătit ✅', color: '#166534', bg: '#dcfce7' },
}

function fmt(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function BrandReferralsPage() {
  const [referrals, setReferrals] = useState<BrandReferral[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'bonus1_paid' | 'bonus2_paid'>('all')
  const [search, setSearch] = useState('')
  const [approving, setApproving] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { referrals: data } = await getAllBrandReferrals()
    setReferrals(data as BrandReferral[])
    setLoading(false)
  }, [])

  const handleApproveBonus1 = async (referralId: string, influencerName: string, brandName: string) => {
    if (!confirm(`Aprobi bonus +50 RON pentru ${influencerName} că a invitat brandul "${brandName}"?\n\nAsigură-te că brandul a fost verificat: CUI valid, email firmă, telefon, website real.`)) return
    setApproving(referralId)
    const result = await approveBrandReferralBonus1(referralId)
    if (result && 'error' in result && result.error) alert('Eroare: ' + result.error)
    else await load()
    setApproving(null)
  }

  useEffect(() => { load() }, [load])

  const filtered = referrals.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        r.influencers?.name?.toLowerCase().includes(q) ||
        r.influencers?.email?.toLowerCase().includes(q) ||
        r.brands?.name?.toLowerCase().includes(q) ||
        r.brands?.email?.toLowerCase().includes(q) ||
        r.referral_code?.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Statistici
  const total = referrals.length
  const bonus1Count = referrals.filter(r => ['bonus1_paid', 'bonus2_paid'].includes(r.status)).length
  const bonus2Count = referrals.filter(r => r.status === 'bonus2_paid').length
  const totalPaid = bonus1Count * 50 + bonus2Count * 100

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#111827', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Handshake size={22} color="#7c3aed" /> Brand Referrals
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
            Influenceri care au invitat branduri · +50 RON la înregistrare · +100 RON la prima campanie
          </p>
        </div>
        <button
          onClick={load}
          style={{ border: '1.5px solid #e5e7eb', background: 'white', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}
        >
          <RefreshCw size={14} /> Reîncarcă
        </button>
      </div>

      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { icon: <Users size={16} color="#7c3aed" />, label: 'Total referrals', value: total, bg: '#f5f3ff' },
          { icon: <Clock size={16} color="#1e40af" />, label: 'Bonus 1 plătit (50 RON)', value: bonus1Count, bg: '#eff6ff' },
          { icon: <TrendingUp size={16} color="#166534" />, label: 'Bonus 2 plătit (100 RON)', value: bonus2Count, bg: '#f0fdf4' },
          { icon: <DollarSign size={16} color="#92400e" />, label: 'Total bonusuri plătite', value: `${totalPaid} RON`, bg: '#fefce8' },
        ].map((tile, i) => (
          <div key={i} style={{ background: tile.bg, borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {tile.icon}
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 2px', fontWeight: 600 }}>{tile.label}</p>
              <p style={{ fontSize: 20, fontWeight: 900, color: '#111827', margin: 0 }}>{tile.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtre */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Caută influencer, brand, cod..."
          style={{ border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none', color: '#111827', background: 'white', flex: 1, minWidth: 200 }}
        />
        {(['all', 'pending', 'bonus1_paid', 'bonus2_paid'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              border: `1.5px solid ${filter === f ? '#7c3aed' : '#e5e7eb'}`,
              background: filter === f ? '#f5f3ff' : 'white',
              color: filter === f ? '#7c3aed' : '#374151',
              borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            {f === 'all' ? 'Toate' : f === 'pending' ? 'Înregistrat' : f === 'bonus1_paid' ? 'Bonus 1' : 'Bonus 2 ✅'}
          </button>
        ))}
      </div>

      {/* Tabel */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Se încarcă...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 16, border: '1.5px dashed #e5e7eb' }}>
          <Handshake size={32} color="#ddd6fe" style={{ marginBottom: 12 }} />
          <p style={{ color: '#9ca3af', fontSize: 14, fontWeight: 600, margin: 0 }}>Niciun referral brand încă</p>
          <p style={{ color: '#d1d5db', fontSize: 13, margin: '4px 0 0' }}>Influencerii trebuie să trimită link-ul lor de invitație brandurilor</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1.5px solid #e5e7eb' }}>
                {['Influencer', 'Brand invitat', 'Cod', 'Status', 'Bonus 1', 'Bonus 2', 'Data', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const st = STATUS_LABEL[r.status]
                return (
                  <tr key={r.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <p style={{ margin: 0, fontWeight: 700, color: '#111827' }}>{r.influencers?.name ?? '—'}</p>
                      <p style={{ margin: 0, color: '#9ca3af', fontSize: 11 }}>{r.influencers?.email}</p>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <p style={{ margin: 0, fontWeight: 700, color: '#111827' }}>{r.brands?.name ?? '—'}</p>
                      <p style={{ margin: 0, color: '#9ca3af', fontSize: 11 }}>{r.brands?.email}</p>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <code style={{ background: '#f3f4f6', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700, color: '#374151' }}>
                        {r.referral_code}
                      </code>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', background: st.bg, color: st.color, borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#374151', fontSize: 12 }}>
                      {r.bonus1_paid_at ? (
                        <span style={{ color: '#166534', fontWeight: 700 }}>+50 RON<br /><span style={{ color: '#9ca3af', fontWeight: 400 }}>{fmt(r.bonus1_paid_at)}</span></span>
                      ) : <span style={{ color: '#d1d5db' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#374151', fontSize: 12 }}>
                      {r.bonus2_paid_at ? (
                        <span style={{ color: '#166534', fontWeight: 700 }}>+100 RON<br /><span style={{ color: '#9ca3af', fontWeight: 400 }}>{fmt(r.bonus2_paid_at)}</span></span>
                      ) : <span style={{ color: '#d1d5db' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#9ca3af', fontSize: 12 }}>{fmt(r.created_at)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {!r.bonus1_paid_at && (
                        <button
                          onClick={() => handleApproveBonus1(r.id, r.influencers?.name ?? '?', r.brands?.name ?? '?')}
                          disabled={approving === r.id}
                          style={{
                            background: approving === r.id ? '#d1fae5' : '#059669',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            padding: '6px 12px',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: approving === r.id ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <CheckCircle size={13} />
                          {approving === r.id ? 'Se procesează...' : 'Aprobă +50 RON'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
