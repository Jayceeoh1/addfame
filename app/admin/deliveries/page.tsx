'use client'
// @ts-nocheck
import { useEffect, useState } from 'react'
import { Package, Search, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Adrese expeditor predefinite
const SENDER_ADDRESSES = [
  {
    id: 'stancu',
    label: 'Stancu Marius Ciprian',
    contact: 'Stancu Marius Ciprian',
    phone: '0765389576',
    email: 'ciprian@aivreasasti.ro',
    city: 'Morteni',
    county: 'Dambovita',
    street: 'Strada Principala',
    street_number: '858',
    postal_code: '',
    billing_address_id: 332111,
  },
  {
    id: 'ghita',
    label: 'Ghita Maria (Bucuresti)',
    contact: 'Ghita Maria',
    phone: '0769494662',
    email: 'nita.maria@yahoo.com',
    city: 'Dobroesti',
    county: 'Ilfov',
    street: 'Stejarilor',
    street_number: '109A',
    street_extra: 'Bloc 3 Scara 2 Ap 15',
    postal_code: '',
    billing_address_id: 332111,
  },
]

export default function AdminDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'sent' | 'received' | 'pending'>('all')
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped')
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())

  // AWB modal state
  const [awbModal, setAwbModal] = useState<any | null>(null)
  const [awbWeight, setAwbWeight] = useState('0.5')
  const [awbCarrierId, setAwbCarrierId] = useState<number | null>(null)
  const [awbServiceId, setAwbServiceId] = useState<number | null>(null)
  const [awbPrices, setAwbPrices] = useState<any[]>([])
  const [awbPriceLoading, setAwbPriceLoading] = useState(false)
  const [awbCreating, setAwbCreating] = useState(false)
  const [awbResult, setAwbResult] = useState<any>(null)
  const [awbError, setAwbError] = useState('')
  const [senderAddresses, setSenderAddresses] = useState<any[]>(SENDER_ADDRESSES)
  const [selectedSenderId, setSelectedSenderId] = useState<string>('stancu')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/deliveries')
        if (res.ok) { const data = await res.json(); setDeliveries(data || []) }
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    // Încarc adresele expeditor din settings
    async function loadSenders() {
      try {
        const sb = createClient()
        const { data } = await sb.from('platform_settings').select('value').eq('key', 'eawb_sender_addresses').single()
        if (data?.value && Array.isArray(data.value)) setSenderAddresses(data.value)
      } catch {}
    }
    load()
    loadSenders()
  }, [])

  async function fetchPrices(d: any, weight: string) {
    if (!d.delivery_postal_code) { setAwbError('Codul poștal lipsește.'); return }
    setAwbPriceLoading(true); setAwbError(''); setAwbPrices([]); setAwbCarrierId(null); setAwbServiceId(null)
    try {
      const res = await fetch(`/api/eawb?action=price&to_postal=${d.delivery_postal_code}&weight=${weight || '0.5'}`)
      const data = await res.json()
      if (!res.ok || data.error) { setAwbError(data.error || 'Eroare prețuri'); return }
      setAwbPrices(data.data || data || [])
    } catch { setAwbError('Eroare conexiune') }
    finally { setAwbPriceLoading(false) }
  }

  async function cancelAwb(d: any) {
    const hasOrderId = !!d.eawb_order_id
    const msg = hasOrderId
      ? `Anulezi AWB-ul ${d.package_tracking} pentru ${d.delivery_name}?\n\nAcest lucru va anula și comanda la curier.`
      : `Marchezi ca neexpediat AWB-ul ${d.package_tracking} pentru ${d.delivery_name}?\n\nNota: AWB-ul vechi nu poate fi anulat automat la curier - va trebui să îl anulezi manual pe eawb.ro.`
    if (!confirm(msg)) return
    try {
      // Dacă avem order_id, anulăm la curier
      if (hasOrderId) {
        const res = await fetch('/api/eawb', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cancel', order_id: d.eawb_order_id })
        })
        const data = await res.json()
        if (!res.ok || data.error) { alert(data.error || 'Eroare la anulare la curier'); return }
      }
      // Resetăm tracking-ul din DB oricum
      const sb = createClient()
      await sb.from('collaborations').update({
        package_sent_at: null,
        package_tracking: null,
        package_courier: null,
        eawb_order_id: null,
      }).eq('id', d.id)
      setDeliveries(prev => prev.map(x => x.id === d.id ? {
        ...x, package_sent_at: null, package_tracking: null, package_courier: null, eawb_order_id: null
      } : x))
      alert(hasOrderId ? 'AWB anulat cu succes! ✅' : 'Marcat ca neexpediat. Anulează manual pe eawb.ro ✅')
    } catch (e: any) { alert(e.message || 'Eroare') }
  }

  async function createAwb(d: any) {
    if (!awbCarrierId || !awbServiceId) return
    const sb = createClient()
    setAwbCreating(true); setAwbError('')
    const selectedSender = senderAddresses.find(s => s.id === selectedSenderId) || senderAddresses[0]
    try {
      const res = await fetch('/api/eawb', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create', carrier_id: awbCarrierId, service_id: awbServiceId,
          to_contact: d.delivery_name, to_phone: d.delivery_phone,
          to_street: d.delivery_address, to_street_number: '0',
          to_postal_code: d.delivery_postal_code || '',
          to_locality_name: d.delivery_city, to_county_name: d.delivery_county,
          weight: awbWeight, parcel_content: 'Produs barter AddFame',
          internal_identifier: d.id, sms_recipient: true,
          sender_override: selectedSender,
        })
      })
      const data = await res.json()
      if (!res.ok || data.error) { setAwbError(data.error || 'Eroare AWB'); return }
      setAwbResult(data.data || data)
      const awbNum = data.data?.awb_number || data.awb_number
      const carrier = data.data?.carrier || ''
      const orderId = data.data?.id || data.id || null
      await sb.from('collaborations').update({
        package_sent_at: new Date().toISOString(),
        package_tracking: awbNum,
        package_courier: carrier,
        eawb_order_id: orderId,
      }).eq('id', d.id)
      setDeliveries(prev => prev.map(x => x.id === d.id ? {
        ...x,
        package_sent_at: new Date().toISOString(),
        package_tracking: awbNum,
        package_courier: carrier,
        eawb_order_id: orderId,
      } : x))
      if (d.influencer_user_id) {
        await sb.from('notifications').insert({
          user_id: d.influencer_user_id, title: '📦 Coletul tău a fost expediat!',
          body: `${carrier} · AWB: ${awbNum}`, link: '/influencer/collaborations', read: false,
        })
      }
    } catch (e: any) { setAwbError(e.message || 'Eroare') }
    finally { setAwbCreating(false) }
  }

  const [markingId, setMarkingId] = useState<string | null>(null)

  async function markAsSentManually(d: any) {
    if (!confirm(`Confirmi că ai trimis manual coletul către ${d.delivery_name}?`)) return
    setMarkingId(d.id)
    try {
      const sb = createClient()
      await sb.from('collaborations').update({
        package_sent_at: new Date().toISOString(),
        package_courier: 'Manual',
      }).eq('id', d.id)
      setDeliveries(prev => prev.map(x => x.id === d.id ? { ...x, package_sent_at: new Date().toISOString(), package_courier: 'Manual' } : x))
      if (d.influencer_user_id) {
        await sb.from('notifications').insert({
          user_id: d.influencer_user_id, title: '📦 Coletul tău a fost expediat!',
          body: `Coletul tău este pe drum.`, link: '/influencer/collaborations', read: false,
        })
      }
    } catch (e) {
      console.error(e)
      alert('Eroare la marcarea coletului.')
    } finally {
      setMarkingId(null)
    }
  }

  const toggleCampaign = (cid: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev)
      next.has(cid) ? next.delete(cid) : next.add(cid)
      return next
    })
  }

  const filtered = deliveries.filter(d => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      d.delivery_name?.toLowerCase().includes(q) ||
      d.influencers?.name?.toLowerCase().includes(q) ||
      d.campaigns?.title?.toLowerCase().includes(q) ||
      d.package_tracking?.toLowerCase().includes(q) ||
      d.delivery_city?.toLowerCase().includes(q)
    if (!matchSearch) return false
    if (filter === 'sent') return !!d.package_sent_at && !d.package_received_at
    if (filter === 'received') return !!d.package_received_at
    if (filter === 'pending') return !d.package_sent_at
    return true
  })

  const counts = {
    all: deliveries.length,
    pending: deliveries.filter(d => !d.package_sent_at).length,
    sent: deliveries.filter(d => d.package_sent_at && !d.package_received_at).length,
    received: deliveries.filter(d => d.package_received_at).length,
  }

  // Grupare pe campanie
  const grouped: Record<string, { campaign: any; items: any[] }> = filtered.reduce((acc: Record<string, { campaign: any; items: any[] }>, d) => {
    const cid = d.campaign_id || 'unknown'
    if (!acc[cid]) acc[cid] = { campaign: d.campaigns, items: [] }
    acc[cid].items.push(d)
    return acc
  }, {})

  const groupedList = Object.entries(grouped).sort(([, a], [, b]) => {
    const aUnsent = a.items.filter(d => !d.package_sent_at).length
    const bUnsent = b.items.filter(d => !d.package_sent_at).length
    return bUnsent - aUnsent
  })

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">📦 Livrări colete</h1>
            <p className="text-sm text-gray-400 mt-1">Toate coletele trimise influencerilor</p>
          </div>
          <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
            <button onClick={() => setViewMode('grouped')}
              className={`text-xs font-black px-3 py-1.5 rounded-lg transition ${viewMode === 'grouped' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}>
              📁 Pe campanie
            </button>
            <button onClick={() => setViewMode('list')}
              className={`text-xs font-black px-3 py-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-600'}`}>
              ☰ Listă
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total adrese', value: counts.all, color: 'text-gray-700', bg: 'bg-white' },
            { label: 'Neexpediate', value: counts.pending, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Expediate', value: counts.sent, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Primite', value: counts.received, color: 'text-green-600', bg: 'bg-green-50' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl border border-gray-100 p-4`}>
              <p className="text-xs font-bold text-gray-400 mb-1">{label}</p>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filters + Search */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Caută după nume, AWB, oraș, campanie..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 transition" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {([
              { f: 'all', label: 'Toate', count: counts.all },
              { f: 'pending', label: 'Neexpediate', count: counts.pending },
              { f: 'sent', label: 'Expediate', count: counts.sent },
              { f: 'received', label: 'Primite', count: counts.received },
            ] as const).map(({ f, label, count }) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-xl text-xs font-black transition ${filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {label} <span className={`ml-1 ${filter === f ? 'text-white/70' : 'text-gray-400'}`}>{count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── GROUPED VIEW ── */}
        {viewMode === 'grouped' && (
          <div className="space-y-3">
            {groupedList.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 text-center py-16">
                <p className="font-bold text-gray-400">Niciun rezultat</p>
              </div>
            ) : groupedList.map(([campaignId, group]) => {
              const unsent = group.items.filter(d => !d.package_sent_at).length
              const sent = group.items.filter(d => d.package_sent_at && !d.package_received_at).length
              const received = group.items.filter(d => d.package_received_at).length
              const isOpen = expandedCampaigns.has(campaignId)
              const urgency = unsent > 0 ? 'red' : 'green'

              return (
                <div key={campaignId} className={`bg-white rounded-2xl border overflow-hidden ${unsent > 0 ? 'border-red-200' : 'border-gray-100'}`}>
                  {/* Campaign header */}
                  <div onClick={() => toggleCampaign(campaignId)}
                    className={`flex items-center gap-3 px-5 py-4 cursor-pointer transition ${unsent > 0 ? 'bg-red-50 hover:bg-red-100/70' : 'bg-gray-50 hover:bg-gray-100/70'}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${unsent > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                      {unsent > 0 ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-gray-900 truncate">
                        {group.campaign?.title?.replace(/^\[Barter\]\s*/i, '') || 'Campanie'}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {unsent > 0 && <span className="text-xs font-bold text-red-500">{unsent} neexpediate</span>}
                        {sent > 0 && <span className="text-xs text-blue-500 font-semibold">{sent} în drum</span>}
                        {received > 0 && <span className="text-xs text-green-500 font-semibold">{received} primite</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {unsent > 0 ? (
                        <span className="text-[11px] font-black text-red-600 bg-red-100 border border-red-200 px-2.5 py-1 rounded-full">
                          📦 {unsent} neexpediate
                        </span>
                      ) : (
                        <span className="text-[11px] font-black text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                          ✓ Toate expediate
                        </span>
                      )}
                      {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  {/* Influencers list */}
                  {isOpen && (
                    <div className="divide-y divide-gray-50">
                      {group.items.map(d => {
                        const isPending = !d.package_sent_at
                        const isSent = d.package_sent_at && !d.package_received_at
                        const isReceived = !!d.package_received_at
                        return (
                          <div key={d.id} className={`flex items-center gap-3 px-5 py-3 ${isPending ? 'bg-white' : isReceived ? 'bg-green-50/40' : 'bg-blue-50/30'}`}>
                            {/* Avatar */}
                            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {d.influencers?.avatar
                                ? <img src={d.influencers.avatar} className="w-full h-full object-cover" alt="" />
                                : <span className="text-xs font-black text-gray-500">{d.delivery_name?.[0] || '?'}</span>}
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black text-gray-900 truncate">{d.delivery_name}</p>
                              <p className="text-xs text-gray-400 truncate">{d.delivery_city}{d.delivery_county ? `, ${d.delivery_county}` : ''} · {d.delivery_phone}</p>
                              {d.delivery_address && <p className="text-xs text-gray-300 truncate">{d.delivery_address}</p>}
                              {isSent && d.package_tracking && (
                                <p className="text-xs text-blue-500 font-bold">AWB: {d.package_tracking} · {d.package_courier}</p>
                              )}
                              {isReceived && (
                                <p className="text-xs text-green-500 font-bold">
                                  Primit {new Date(d.package_received_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
                                </p>
                              )}
                            </div>
                            {/* Status badge */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isPending && (
                                <span className="text-[10px] font-black text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Neexpediat</span>
                              )}
                              {isSent && (
                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">🚚 Expediat</span>
                              )}
                              {isReceived && (
                                <span className="text-[10px] font-black text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">✅ Primit</span>
                              )}
                              {/* Actions */}
                              {isPending && (
                                <>
                                  <button onClick={() => markAsSentManually(d)} disabled={markingId === d.id}
                                    className="text-[11px] font-black text-gray-600 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap disabled:opacity-50">
                                    {markingId === d.id ? '...' : '✓ Marchează manual'}
                                  </button>
                                  <button onClick={() => { setAwbModal(d); setAwbResult(null); setAwbPrices([]); setAwbError(''); setAwbCarrierId(null); setAwbServiceId(null) }}
                                    className="text-[11px] font-black text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                                    📦 Generează AWB
                                  </button>
                                </>
                              )}
                              {isSent && d.package_tracking && (
                                <>
                                  <a href={`/api/eawb?action=label&order_id=${d.eawb_order_id || ''}`} target="_blank"
                                    className="text-[11px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                                    🖨️ PDF
                                  </a>
                                  {d.package_tracking && (
                                    <button onClick={() => cancelAwb(d)}
                                      className="text-[11px] font-black text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                                      ✕ Anulează AWB
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {viewMode === 'list' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="font-bold text-gray-400">Niciun rezultat</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Influencer', 'Campanie', 'Adresă livrare', 'Status', 'AWB / Curier', 'Data trimitere', ''].map(h => (
                      <th key={h} className="text-left text-xs font-black text-gray-400 uppercase tracking-wider px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(d => {
                    const status = !d.package_sent_at ? 'pending' : !d.package_received_at ? 'sent' : 'received'
                    const statusCfg = {
                      pending: { label: 'Neexpediat', className: 'text-red-600 bg-red-50 border-red-200' },
                      sent: { label: 'Expediat', className: 'text-blue-600 bg-blue-50 border-blue-200' },
                      received: { label: 'Primit', className: 'text-green-600 bg-green-50 border-green-200' },
                    }[status]
                    return (
                      <tr key={d.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                              {d.influencers?.avatar
                                ? <img src={d.influencers.avatar} className="w-full h-full object-cover" alt="" />
                                : <span className="w-full h-full flex items-center justify-center text-xs font-black text-gray-400">{d.delivery_name?.[0] || '?'}</span>}
                            </div>
                            <div>
                              <p className="text-sm font-black text-gray-900">{d.delivery_name}</p>
                              <p className="text-xs text-gray-400">{d.influencers?.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold text-gray-600 max-w-32 truncate">{d.campaigns?.title?.replace(/^\[Barter\]\s*/i, '') || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-gray-700">{d.delivery_address}</p>
                          <p className="text-xs text-gray-400">{d.delivery_city}, {d.delivery_county} {d.delivery_postal_code}</p>
                          <p className="text-xs text-gray-400">{d.delivery_phone}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${statusCfg.className}`}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {d.package_tracking ? (
                            <div>
                              <p className="text-sm font-black text-blue-600">{d.package_tracking}</p>
                              {d.package_courier && <p className="text-xs text-gray-400">{d.package_courier}</p>}
                            </div>
                          ) : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {d.package_sent_at
                            ? <p className="text-sm text-gray-600">{new Date(d.package_sent_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            : <span className="text-xs text-gray-300">Netrimis</span>}
                        </td>
                        <td className="px-4 py-3">
                          {!d.package_sent_at ? (
                            <button onClick={() => { setAwbModal(d); setAwbResult(null); setAwbPrices([]); setAwbError(''); setAwbCarrierId(null); setAwbServiceId(null) }}
                              className="text-[11px] font-black text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition whitespace-nowrap">
                              📦 Generează AWB
                            </button>
                          ) : d.package_tracking ? (
                            <div className="flex flex-col gap-1">
                              <a href={`/api/eawb?action=label&order_id=${d.eawb_order_id || ''}`} target="_blank"
                                className="text-[11px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition whitespace-nowrap text-center">
                                🖨️ PDF
                              </a>
                              {d.package_tracking && (
                                <button onClick={() => cancelAwb(d)}
                                  className="text-[11px] font-black text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition whitespace-nowrap">
                                  ✕ Anulează
                                </button>
                              )}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── AWB Modal ── */}
      {awbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-black text-gray-900">📦 Generează AWB</h2>
                <p className="text-xs text-gray-400 mt-0.5">{awbModal.delivery_name} · {awbModal.delivery_city}</p>
              </div>
              <button onClick={() => setAwbModal(null)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {!awbResult && (
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">📦 Expeditor</label>
                  <div className="flex gap-2 flex-wrap">
                    {senderAddresses.map(s => (
                      <button key={s.id} onClick={() => setSelectedSenderId(s.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-black transition ${selectedSenderId === s.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {awbResult ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="font-black text-gray-900 mb-3">AWB generat!</h3>
                  <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-2 mb-4">
                    <p className="text-sm"><span className="text-gray-400">AWB:</span> <strong className="text-indigo-700 text-lg tracking-wider font-black">{awbResult.awb_number}</strong></p>
                    <p className="text-sm"><span className="text-gray-400">Curier:</span> <strong>{awbResult.carrier}</strong></p>
                    <p className="text-sm"><span className="text-gray-400">Preț:</span> <strong>{awbResult.price?.total} {awbResult.price?.currency}</strong></p>
                    <p className="text-sm"><span className="text-gray-400">Livrare est.:</span> <strong>{awbResult.estimated_delivery_date}</strong></p>
                  </div>
                  <div className="flex gap-3">
                    <a href={`/api/eawb?action=label&order_id=${awbResult.order_id}`} target="_blank"
                      className="flex-1 py-3 rounded-2xl font-black text-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition text-center">
                      🖨️ Descarcă PDF
                    </a>
                    <button onClick={() => setAwbModal(null)}
                      className="flex-1 py-3 rounded-2xl font-black text-sm text-white bg-green-600 transition">
                      Gata ✓
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Greutate (kg)</label>
                    <div className="flex gap-2">
                      {['0.5', '1', '2', '5'].map(w => (
                        <button key={w} onClick={() => setAwbWeight(w)}
                          className={`flex-1 py-2 rounded-xl text-sm font-black transition ${awbWeight === w ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {w}kg
                        </button>
                      ))}
                      <input type="number" step="0.1" min="0.1" value={awbWeight}
                        onChange={e => setAwbWeight(e.target.value)}
                        className="w-20 px-3 py-2 border-2 border-gray-200 rounded-xl text-sm font-bold text-center outline-none focus:border-indigo-400" />
                    </div>
                  </div>
                  {awbPrices.length === 0 && !awbPriceLoading && (
                    <button onClick={() => fetchPrices(awbModal, awbWeight)}
                      className="w-full py-3 rounded-2xl font-black text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition">
                      🔍 Vezi prețuri curieri
                    </button>
                  )}
                  {awbPriceLoading && (
                    <div className="flex items-center justify-center gap-2 py-4 text-sm text-gray-400">
                      <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
                      Se obțin prețurile...
                    </div>
                  )}
                  {awbPrices.length > 0 && (
                    <div>
                      <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Alege curierul</p>
                      <div className="space-y-2 max-h-52 overflow-y-auto">
                        {awbPrices.map((p: any) => (
                          <button key={`${p.carrier_id}-${p.service_id}`}
                            onClick={() => { setAwbCarrierId(p.carrier_id); setAwbServiceId(p.service_id) }}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition ${awbCarrierId === p.carrier_id && awbServiceId === p.service_id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:border-indigo-200'}`}>
                            <div className="text-left">
                              <p className="font-black text-sm text-gray-900">{p.carrier}</p>
                              <p className="text-xs text-gray-400">{p.service_name} · est. {p.estimated_delivery_date}</p>
                            </div>
                            <p className="font-black text-indigo-700">{p.price?.total} RON</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {awbError && (
                    <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 font-bold">
                      ⚠ {awbError}
                    </div>
                  )}
                  {awbCarrierId && awbServiceId && (
                    <button onClick={() => createAwb(awbModal)} disabled={awbCreating}
                      className="w-full py-3.5 rounded-2xl font-black text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
                      {awbCreating
                        ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Se generează...</>
                        : '📦 Generează AWB'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
