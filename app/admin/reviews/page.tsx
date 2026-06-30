'use client'
// @ts-nocheck
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, X, Clock, ExternalLink, Search, RefreshCw } from 'lucide-react'
import { AIProofAnalyzer } from '@/components/shared/AIProofAnalyzer'

const PLATFORM_ICON = {
  instagram: '📸', tiktok: '🎵', youtube: '▶️', facebook: '👤'
}

export default function AdminReviewsPage() {
  const [collabs, setCollabs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'urgent' | 'instagram' | 'tiktok' | 'youtube'>('all')
  const [search, setSearch] = useState('')
  const [rejectModal, setRejectModal] = useState<any | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [working, setWorking] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped')
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set())

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const sb = createClient()
      const { data } = await sb
        .from('collaborations')
        .select(`
          id, status, deliverable_url, deliverable_submitted_at,
          deliverable_approved_at, deliverable_rejected_at,
          deliverable_rejection_reason, post_deadline_days,
          package_received_at, reserved_amount, payment_amount,
          influencers(id, name, email, avatar, slug),
          campaigns(id, title, brand_name, platforms, campaign_type, budget_per_influencer)
        `)
        .not('deliverable_submitted_at', 'is', null)
        .is('deliverable_approved_at', null)
        .is('deliverable_rejected_at', null)
        .neq('status', 'COMPLETED')
        .order('deliverable_submitted_at', { ascending: true })

      setCollabs(data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function approve(collabId: string) {
    setWorking(collabId)
    try {
      const sb = createClient()
      const now = new Date().toISOString()
      const collab = collabs.find(c => c.id === collabId)

      // Calculeaza plata
      const totalBudget = collab?.reserved_amount > 0
        ? collab.reserved_amount
        : collab?.campaigns?.budget_per_influencer || 0
      const platformFee = Math.round(totalBudget * 0.2 * 100) / 100
      const influencerAmount = Math.round((totalBudget - platformFee) * 100) / 100

      await sb.from('collaborations').update({
        status: 'COMPLETED',
        deliverable_approved_at: now,
        completed_at: now,
        payment_amount: influencerAmount,
        platform_fee: platformFee,
      }).eq('id', collabId)

      // Notifica influencerul
      if (collab?.influencers?.user_id) {
        await sb.from('notifications').insert({
          user_id: collab.influencers.user_id,
          title: '✅ Postarea ta a fost aprobată!',
          body: `Colaborarea pentru "${collab.campaigns?.title}" a fost finalizată. ${influencerAmount > 0 ? `${influencerAmount} RON au fost adăugați în wallet.` : ''}`,
          link: '/influencer/collaborations',
          read: false,
        })
      }

      setCollabs(p => p.filter(c => c.id !== collabId))
      notify('✅ Postare aprobată!')
    } catch (e: any) { notify(e.message || 'Eroare', false) }
    finally { setWorking(null) }
  }

  async function reject(collabId: string, reason: string) {
    setWorking(collabId)
    try {
      const sb = createClient()
      const now = new Date().toISOString()
      const collab = collabs.find(c => c.id === collabId)

      await sb.from('collaborations').update({
        deliverable_rejected_at: now,
        deliverable_rejection_reason: reason,
        deliverable_submitted_at: null,
        deliverable_url: null,
      }).eq('id', collabId)

      if (collab?.influencers?.user_id) {
        await sb.from('notifications').insert({
          user_id: collab.influencers.user_id,
          title: '❌ Postarea ta a fost respinsă',
          body: `Motiv: ${reason}. Te rugăm să repostezi conform briefului.`,
          link: '/influencer/collaborations',
          read: false,
        })
      }

      setCollabs(p => p.filter(c => c.id !== collabId))
      setRejectModal(null)
      setRejectReason('')
      notify('Postare respinsă — influencerul a fost notificat.')
    } catch (e: any) { notify(e.message || 'Eroare', false) }
    finally { setWorking(null) }
  }

  function isUrgent(c: any) {
    if (!c.deliverable_submitted_at || !c.post_deadline_days || !c.package_received_at) return false
    const deadline = new Date(c.package_received_at).getTime() + c.post_deadline_days * 86400000
    return (deadline - Date.now()) < 24 * 3600000
  }

  function daysWaiting(c: any) {
    const diff = Date.now() - new Date(c.deliverable_submitted_at).getTime()
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor(diff / 3600000)
    if (days === 0) return `acum ${hours}h`
    return `acum ${days} ${days === 1 ? 'zi' : 'zile'}`
  }

  const filtered = collabs.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      c.influencers?.name?.toLowerCase().includes(q) ||
      c.campaigns?.title?.toLowerCase().includes(q) ||
      c.campaigns?.brand_name?.toLowerCase().includes(q)
    if (!matchSearch) return false
    if (filter === 'urgent') return isUrgent(c)
    if (filter === 'instagram') return c.campaigns?.platforms?.some((p: string) => p.toLowerCase().includes('instagram'))
    if (filter === 'tiktok') return c.campaigns?.platforms?.some((p: string) => p.toLowerCase().includes('tiktok'))
    if (filter === 'youtube') return c.campaigns?.platforms?.some((p: string) => p.toLowerCase().includes('youtube'))
    return true
  })

  const urgentCount = collabs.filter(isUrgent).length

  // Parse deliverable URLs (poate fi JSON array sau string simplu)
  function getUrls(c: any): string[] {
    if (!c.deliverable_url) return []
    try {
      const parsed = JSON.parse(c.deliverable_url)
      if (Array.isArray(parsed)) return parsed.filter(Boolean)
    } catch {}
    return [c.deliverable_url]
  }

  function getPlatformLabel(c: any) {
    const platforms = c.campaigns?.platforms || []
    if (platforms.length === 0) return 'Social Media'
    return platforms.map((p: string) => {
      const key = p.toLowerCase()
      return `${PLATFORM_ICON[key] || '📱'} ${p}`
    }).join(' · ')
  }

  // Grupare pe campanie
  const grouped: Record<string, {campaign: any; items: any[]}> = filtered.reduce((acc: Record<string, {campaign: any; items: any[]}>, c) => {
    const cid = c.campaigns?.id || 'unknown'
    if (!acc[cid]) acc[cid] = { campaign: c.campaigns, items: [] }
    acc[cid].items.push(c)
    return acc
  }, {})
  const groupedList = Object.entries(grouped).sort(([, a], [, b]) => {
    const aUrgent = a.items.filter(isUrgent).length
    const bUrgent = b.items.filter(isUrgent).length
    return bUrgent - aUrgent
  })

  const toggleCampaign = (cid: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev)
      next.has(cid) ? next.delete(cid) : next.add(cid)
      return next
    })
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl text-sm font-black shadow-xl ${toast.ok ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">📝 Dovezi de revizuit</h1>
          <p className="text-sm text-gray-400 mt-1">
            {loading ? 'Se încarcă...' : `${collabs.length} postări așteaptă aprobare`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <button onClick={() => setViewMode('grouped')}
              className={`text-xs font-black px-3 py-1.5 rounded-lg transition ${viewMode === 'grouped' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}>
              📁 Pe campanie
            </button>
            <button onClick={() => setViewMode('list')}
              className={`text-xs font-black px-3 py-1.5 rounded-lg transition ${viewMode === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400'}`}>
              ☰ Listă
            </button>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition text-sm font-bold text-gray-600">
            <RefreshCw className="w-4 h-4" /> Reîmprospătează
          </button>
        </div>
      </div>

      {/* Filtre + search */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Caută influencer sau campanie..."
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 transition w-56" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {([
            { f: 'all', label: `Toate ${collabs.length}` },
            { f: 'urgent', label: `⏰ Urgente ${urgentCount}`, danger: true },
            { f: 'instagram', label: '📸 Instagram' },
            { f: 'tiktok', label: '🎵 TikTok' },
            { f: 'youtube', label: '▶️ YouTube' },
          ] as const).map(({ f, label, danger }: { f: string; label: string; danger?: boolean }) => (
            <button key={f} onClick={() => setFilter(f as any)}
              className={`px-3 py-2 rounded-xl text-xs font-black transition ${
                filter === f
                  ? danger ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white'
                  : danger ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
          <p className="text-4xl mb-3">🎉</p>
          <p className="font-black text-gray-900 text-lg mb-1">Totul e la zi!</p>
          <p className="text-sm text-gray-400">Nu există dovezi de revizuit momentan.</p>
        </div>
      )}

      {/* Grouped view */}
      {viewMode === 'grouped' && !loading && (
        <div className="space-y-3">
          {groupedList.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
              <p className="text-4xl mb-3">🎉</p>
              <p className="font-black text-gray-900 text-lg mb-1">Totul e la zi!</p>
              <p className="text-sm text-gray-400">Nu există dovezi de revizuit momentan.</p>
            </div>
          ) : groupedList.map(([campaignId, group]) => {
            const urgentCount = group.items.filter(isUrgent).length
            const isOpen = expandedCampaigns.has(campaignId)
            return (
              <div key={campaignId} className={`bg-white rounded-3xl border-2 overflow-hidden ${urgentCount > 0 ? 'border-red-200' : 'border-gray-100'}`}>
                <div onClick={() => toggleCampaign(campaignId)}
                  className={`flex items-center gap-3 px-5 py-4 cursor-pointer transition ${urgentCount > 0 ? 'bg-red-50 hover:bg-red-100/70' : 'bg-gray-50 hover:bg-gray-100/70'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-gray-900 truncate">{group.campaign?.title?.replace(/^\[Barter\]\s*/i, '') || 'Campanie'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{group.campaign?.brand_name} · {group.items.length} dovezi</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {urgentCount > 0
                      ? <span className="text-[11px] font-black text-red-600 bg-red-100 border border-red-200 px-2.5 py-1 rounded-full">⏰ {urgentCount} urgente</span>
                      : <span className="text-[11px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">📝 {group.items.length} de revizuit</span>
                    }
                    <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>
                {isOpen && (
                  <div className="divide-y divide-gray-50 px-5 pb-4 pt-2 space-y-3">
                    {group.items.map(c => {
                      const urls = getUrls(c)
                      return (
                        <div key={c.id} className="pt-3">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                              {c.influencers?.avatar
                                ? <img src={c.influencers.avatar} className="w-full h-full object-cover" alt="" />
                                : <span className="w-full h-full flex items-center justify-center text-xs font-black text-gray-400">{c.influencers?.name?.[0] || '?'}</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-sm text-gray-900">{c.influencers?.name}</p>
                              <p className="text-xs text-gray-400">{daysWaiting(c)} · {getPlatformLabel(c)}</p>
                            </div>
                            {isUrgent(c) && <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">⏰ Urgent</span>}
                          </div>
                          <div className="space-y-2 mb-3">
                            {urls.map((url, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                                <p className="text-xs text-gray-600 truncate flex-1">{url}</p>
                                <a href={url} target="_blank" rel="noreferrer"
                                  className="text-xs text-indigo-600 font-bold px-2 py-1 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition whitespace-nowrap">
                                  <ExternalLink className="w-3 h-3 inline mr-1" />Deschide
                                </a>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => approve(c.id)} disabled={!!working}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black text-sm text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition">
                              <CheckCircle className="w-4 h-4" /> Aprobă
                            </button>
                            <button onClick={() => { setRejectModal(c); setRejectReason('') }} disabled={!!working}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black text-sm text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition">
                              <X className="w-4 h-4" /> Respinge
                            </button>
                          </div>
                          <AIProofAnalyzer collaboration={{
                            proof_link: urls[0],
                            proof_caption: c.proof_caption,
                            required_hashtags: c.campaigns?.required_hashtags,
                            required_caption: c.campaigns?.required_caption,
                            story_instructions: c.campaigns?.story_instructions,
                            campaigns: { title: c.campaigns?.title, brand_name: c.campaigns?.brand_name }
                          }} />
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

      {/* Lista dovezi */}
      <div className={`space-y-4 ${viewMode !== 'list' ? 'hidden' : ''}`}>
        {filtered.map(c => {
          const urgent = isUrgent(c)
          const wasRejectedBefore = !!c.deliverable_rejection_reason
          const urls = getUrls(c)

          return (
            <div key={c.id} className={`bg-white rounded-3xl border-2 overflow-hidden shadow-sm ${urgent ? 'border-red-200' : wasRejectedBefore ? 'border-amber-200' : 'border-gray-100'}`}>

              {/* Banner urgent / repostare */}
              {urgent && (
                <div className="flex items-center gap-2 px-5 py-2.5 bg-red-50">
                  <span className="text-sm">⏰</span>
                  <p className="text-xs font-black text-red-600">Expiră în curând — aprobă urgent</p>
                </div>
              )}
              {!urgent && wasRejectedBefore && (
                <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-50">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                  <p className="text-xs font-black text-amber-600">Repostare — dovada anterioară a fost respinsă</p>
                </div>
              )}

              <div className="p-5">
                {/* Info influencer + campanie */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-2xl bg-gray-100 overflow-hidden flex-shrink-0">
                    {c.influencers?.avatar
                      ? <img src={c.influencers.avatar} alt={c.influencers.name} className="w-full h-full object-cover" />
                      : <span className="w-full h-full flex items-center justify-center font-black text-gray-400 text-sm">{c.influencers?.name?.[0] || '?'}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 text-sm">{c.influencers?.name || '—'}</p>
                    <p className="text-xs text-gray-400 truncate">{c.campaigns?.title} · {c.campaigns?.brand_name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                      {getPlatformLabel(c)}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                      {daysWaiting(c)}
                    </span>
                  </div>
                </div>

                {/* Link-uri dovezi */}
                <div className="space-y-2 mb-4">
                  {urls.map((url, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-500 mb-0.5">
                          {urls.length > 1 ? `Link ${idx + 1}` : 'Link postare'}
                        </p>
                        <p className="text-sm text-gray-800 truncate">{url}</p>
                      </div>
                      <a href={url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black hover:bg-indigo-100 transition flex-shrink-0">
                        <ExternalLink className="w-3.5 h-3.5" /> Deschide
                      </a>
                    </div>
                  ))}
                  {urls.length === 0 && (
                    <div className="bg-red-50 rounded-2xl px-4 py-3">
                      <p className="text-xs text-red-500 font-bold">⚠️ Niciun link dovadă — influencerul nu a adăugat link</p>
                    </div>
                  )}
                </div>

                {/* AI Analyzer */}
                <AIProofAnalyzer collaboration={{
                  proof_link: urls[0],
                  proof_caption: c.proof_caption,
                  required_hashtags: c.campaigns?.required_hashtags,
                  required_caption: c.campaigns?.required_caption,
                  story_instructions: c.campaigns?.story_instructions,
                  campaigns: { title: c.campaigns?.title, brand_name: c.campaigns?.brand_name }
                }} />

                {/* Actiuni */}
                <div className="flex gap-3">
                  <button onClick={() => approve(c.id)} disabled={!!working}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 transition">
                    {working === c.id ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Aprobă
                  </button>
                  <button onClick={() => { setRejectModal(c); setRejectReason('') }} disabled={!!working}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition">
                    <X className="w-4 h-4" /> Respinge
                  </button>
                  <a href={`/admin/campaigns?campaign=${c.campaigns?.id}`}
                    className="flex items-center justify-center px-4 py-3 rounded-2xl text-gray-400 bg-gray-50 hover:bg-gray-100 transition"
                    title="Vezi în campanie">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <AIProofAnalyzer collaboration={{
                  proof_link: urls[0],
                  proof_caption: c.proof_caption,
                  required_hashtags: c.campaigns?.required_hashtags,
                  required_caption: c.campaigns?.required_caption,
                  story_instructions: c.campaigns?.story_instructions,
                  campaigns: { title: c.campaigns?.title, brand_name: c.campaigns?.brand_name }
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal respingere */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <h2 className="font-black text-gray-900 text-lg mb-1">Respinge postarea</h2>
            <p className="text-sm text-gray-400 mb-4">{rejectModal.influencers?.name} · {rejectModal.campaigns?.title}</p>

            <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Motiv respingere *</label>
            <div className="space-y-2 mb-4">
              {[
                'Hashtag-urile lipsesc',
                'Tag-ul brandului lipsește',
                'Conținut nepotrivit cu brieful',
                'Calitate slabă a conținutului',
                'Postarea a fost ștearsă',
                'Link invalid sau expirat',
              ].map(reason => (
                <button key={reason} onClick={() => setRejectReason(reason)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition ${rejectReason === reason ? 'bg-red-50 text-red-700 border border-red-300 font-bold' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                  {reason}
                </button>
              ))}
              <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="Sau scrie un motiv personalizat..."
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-red-300 transition" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)}
                className="flex-1 py-3 rounded-2xl font-black text-sm text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition">
                Anulează
              </button>
              <button onClick={() => reject(rejectModal.id, rejectReason)} disabled={!rejectReason || !!working}
                className="flex-1 py-3 rounded-2xl font-black text-sm text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 transition">
                Respinge
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
