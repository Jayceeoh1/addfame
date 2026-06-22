'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getCampaignPerformance, savePerformance, addPost, updatePost, deletePost, updateInfluencerFollowers } from '@/app/actions/performance'
import {
  ArrowLeft, Download, Eye, Plus, Trash2, X, ChevronDown, ChevronRight,
  CloudCheck, Image as ImageIcon, Smile, Meh, Frown, Tag, MapPin, FileText
} from 'lucide-react'

const POST_TYPES = [
  { value: 'feed', label: 'Feed', icon: '📸' },
  { value: 'reel', label: 'Reel', icon: '🎬' },
  { value: 'story', label: 'Story', icon: '⭕' },
  { value: 'carousel', label: 'Carousel', icon: '🎞️' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'youtube_short', label: 'YT Short', icon: '▶️' },
  { value: 'youtube_video', label: 'YT Video', icon: '📺' },
]

const fmtNum = (n: number) => (n || 0).toLocaleString('ro-RO')

export default function CampaignPerformancePage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params?.id as string

  const [campaign, setCampaign] = useState<any>(null)
  const [collabs, setCollabs] = useState<any[]>([])
  const [performance, setPerformance] = useState<Record<string, any>>({})
  const [posts, setPosts] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('posts')
  const [saving, setSaving] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [filter, setFilter] = useState<'all' | 'with_data' | 'no_data' | 'complete'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sb = createClient()
      const { data: c } = await sb.from('campaigns').select('*').eq('id', campaignId).single()
      setCampaign(c)

      const result = await getCampaignPerformance(campaignId) as any
      if (result.error) {
        console.error(result.error)
        return
      }

      setCollabs(result.collabs)

      const perfMap: Record<string, any> = {}
      result.performance.forEach((p: any) => { perfMap[p.collaboration_id] = p })
      setPerformance(perfMap)

      const postsMap: Record<string, any[]> = {}
      result.posts.forEach((p: any) => {
        if (!postsMap[p.collaboration_id]) postsMap[p.collaboration_id] = []
        postsMap[p.collaboration_id].push(p)
      })
      setPosts(postsMap)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [campaignId])

  useEffect(() => { load() }, [load])

  const updateField = async (collabId: string, influencerId: string, field: string, value: any) => {
    setSaving(collabId)
    setPerformance(prev => ({
      ...prev,
      [collabId]: { ...(prev[collabId] || {}), [field]: value, collaboration_id: collabId, campaign_id: campaignId, influencer_id: influencerId }
    }))

    const current = performance[collabId] || {}
    const result = await savePerformance({
      ...current,
      collaboration_id: collabId,
      campaign_id: campaignId,
      influencer_id: influencerId,
      [field]: value
    } as any)

    if (!('error' in result && result.error)) setLastSaved(new Date())
    setSaving(null)
  }

  const handleAddPost = async (collabId: string, influencerId: string) => {
    setSaving(collabId)
    const result = await addPost({
      collaboration_id: collabId,
      campaign_id: campaignId,
      influencer_id: influencerId,
      post_type: 'feed',
      views: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0
    }) as any

    if (result.success && result.post) {
      setPosts(prev => ({
        ...prev,
        [collabId]: [...(prev[collabId] || []), result.post]
      }))
      setLastSaved(new Date())
    }
    setSaving(null)
  }

  const handleUpdatePost = async (postId: string, collabId: string, field: string, value: any) => {
    setSaving(collabId)
    setPosts(prev => ({
      ...prev,
      [collabId]: (prev[collabId] || []).map(p => p.id === postId ? { ...p, [field]: value } : p)
    }))

    const result = await updatePost(postId, { [field]: value } as any)
    if (result.success && 'engagement_rate' in result) {
      setPosts(prev => ({
        ...prev,
        [collabId]: (prev[collabId] || []).map(p => p.id === postId ? { ...p, engagement_rate: result.engagement_rate } : p)
      }))
    }
    if (!('error' in result && result.error)) setLastSaved(new Date())
    setSaving(null)
  }

  const handleDeletePost = async (postId: string, collabId: string) => {
    if (!confirm('Ștergi această postare?')) return
    const result = await deletePost(postId)
    if (result.success) {
      setPosts(prev => ({ ...prev, [collabId]: (prev[collabId] || []).filter(p => p.id !== postId) }))
      setLastSaved(new Date())
    }
  }

  // ─── Aggregated stats (top cards) ─────────────────────────────
  const allPosts = Object.values(posts).flat()
  const totalReach = allPosts.reduce((s, p) => s + (p.reach || 0), 0)
  const totalEngagement = allPosts.reduce((s, p) => s + (p.likes || 0) + (p.comments || 0) + (p.shares || 0) + (p.saves || 0), 0)
  const avgER = allPosts.length > 0 ? allPosts.reduce((s, p) => s + (p.engagement_rate || 0), 0) / allPosts.length : 0
  const postTypes = allPosts.reduce((acc: Record<string, number>, p) => { acc[p.post_type] = (acc[p.post_type] || 0) + 1; return acc }, {})
  const postTypesStr = Object.entries(postTypes).map(([k, v]) => `${v} ${k}`).join(' · ')

  const totalAudience = collabs.reduce((s: number, c: any) => {
    const ig = c.influencers?.ig_followers || 0
    const tt = c.influencers?.tt_followers || 0
    const yt = c.influencers?.yt_subscribers || 0
    return s + Math.max(ig, tt, yt)
  }, 0)

  const filteredCollabs = collabs.filter(c => {
    const hasPosts = (posts[c.id] || []).length > 0
    const hasPerf = !!performance[c.id]
    if (filter === 'with_data') return hasPosts || hasPerf
    if (filter === 'no_data') return !hasPosts && !hasPerf
    if (filter === 'complete') return hasPosts && hasPerf && performance[c.id]?.sentiment
    return true
  })

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 rounded-full border-t-orange-400 border-orange-100 animate-spin" style={{ borderWidth: '3px' }} />
    </div>
  )

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        .card { background: white; border: 1px solid #f1f5f9; border-radius: 12px; }
        .input-sm { padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 7px; font-size: 12px; outline: none; width: 100%; }
        .input-sm:focus { border-color: #f97316; }
        .pill { padding: 5px 12px; font-size: 11px; font-weight: 500; border-radius: 100px; background: #f1f5f9; color: #475569; cursor: pointer; border: none; }
        .pill.active { background: #0f172a; color: white; }
      `}</style>

      {/* Header */}
      <div className="card p-5 mb-3">
        <p className="text-xs text-gray-400 mb-1">
          <Link href="/admin/campaigns" className="text-orange-500 hover:underline">← Admin</Link> · Campanii · Performance
        </p>
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-gray-900 leading-tight mb-1">{campaign?.title}</h1>
            <div className="flex gap-3 items-center flex-wrap text-xs text-gray-500">
              <span>{campaign?.brand_name || 'Brand'}</span>
              <span>·</span>
              <span>{collabs.length} influenceri</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> {campaign?.status || 'Activă'}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/admin/campaigns/${campaignId}/report`} target="_blank" className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Preview raport
            </Link>
            <Link href={`/admin/campaigns/${campaignId}/report?print=1`} target="_blank" className="px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Generează PDF
            </Link>
          </div>
        </div>
      </div>

      {/* Audience headline */}
      {totalAudience > 0 && (
        <div className="card p-5 mb-3" style={{ borderLeft: '4px solid #7c3aed', background: 'linear-gradient(135deg, #faf5ff 0%, #ffffff 100%)' }}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Impactul campaniei</p>
              <p className="text-2xl font-black" style={{ color: '#7c3aed' }}>
                Te-ai adresat unei audiențe de {fmtNum(totalAudience)} urmăritori
              </p>
              <p className="text-sm text-gray-500 mt-1">
                prin {collabs.length} influencer{collabs.length !== 1 ? 'i' : ''} · reach real {totalReach > 0 ? `${Math.round(totalReach / totalAudience * 100)}% din audiență` : 'în așteptare'}
              </p>
            </div>
            {totalReach > 0 && (
              <div style={{ textAlign: 'right' }}>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Penetrare audiență</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span className="text-3xl font-black" style={{ color: '#7c3aed' }}>{Math.round(totalReach / totalAudience * 100)}%</span>
                  <span className="text-sm text-gray-400">din audiența totală</span>
                </div>
              </div>
            )}
          </div>
          {totalAudience > 0 && totalReach > 0 && (
            <div className="mt-4">
              <div style={{ background: '#ede9fe', borderRadius: 100, height: 8, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, Math.round(totalReach / totalAudience * 100))}%`, height: '100%', background: '#7c3aed', borderRadius: 100 }} />
              </div>
              <div className="flex justify-between mt-1.5" style={{ fontSize: 11, color: '#9ca3af' }}>
                <span>0</span>
                <span style={{ color: '#7c3aed', fontWeight: 700 }}>{fmtNum(totalReach)} reach din {fmtNum(totalAudience)} posibili</span>
                <span>{fmtNum(totalAudience)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
        {[
          { label: 'Audiență totală', value: fmtNum(totalAudience), sub: `${collabs.length} influenceri`, accent: true },
          { label: 'Reach total', value: fmtNum(totalReach), sub: `${allPosts.length} posts` },
          { label: 'Engagement', value: fmtNum(totalEngagement), sub: 'like + comm + share' },
          { label: 'ER mediu', value: `${avgER.toFixed(1)}%`, sub: avgER > 1.8 ? `↑ ${(avgER/1.8).toFixed(1)}× față de medie` : 'în normă', green: avgER > 3 },
          { label: 'Posts livrate', value: allPosts.length, sub: postTypesStr || 'încă fără date' },
        ].map((s: any) => (
          <div key={s.label} className="card p-4" style={s.accent ? { borderColor: '#c4b5fd', background: '#faf5ff' } : {}}>
            <p className="text-[10px] uppercase tracking-wider font-bold mb-1.5" style={{ color: s.accent ? '#7c3aed' : '#9ca3af' }}>{s.label}</p>
            <p className="text-xl font-black mb-0.5" style={{ color: s.accent ? '#7c3aed' : s.green ? '#16a34a' : '#111827' }}>{s.value}</p>
            <p className="text-[11px] mt-0.5" style={{ color: s.accent ? '#a78bfa' : '#6b7280' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="card p-3 mb-3 flex justify-between items-center gap-2 flex-wrap">
        <div className="flex gap-1.5 items-center flex-wrap">
          <span className="text-[11px] text-gray-400 mr-1">Filtru:</span>
          {[
            { v: 'all', l: `Toți (${collabs.length})` },
            { v: 'with_data', l: `Cu date (${collabs.filter(c => (posts[c.id] || []).length > 0).length})` },
            { v: 'no_data', l: `Fără date (${collabs.filter(c => !(posts[c.id] || []).length).length})` },
            { v: 'complete', l: `Finalizați (${collabs.filter(c => (posts[c.id] || []).length > 0 && performance[c.id]?.sentiment).length})` },
          ].map(f => (
            <button key={f.v} onClick={() => setFilter(f.v as any)} className={`pill ${filter === f.v ? 'active' : ''}`}>{f.l}</button>
          ))}
        </div>
        {lastSaved && (
          <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <CloudCheck className="w-3.5 h-3.5 text-green-500" /> Salvat {lastSaved.toLocaleTimeString('ro-RO')}
          </p>
        )}
      </div>

      {/* Influencers list */}
      <div className="space-y-2">
        {filteredCollabs.map(c => {
          const inf = c.influencers
          const infPosts = posts[c.id] || []
          const perf = performance[c.id] || {}
          const isExpanded = expandedId === c.id
          const reach = infPosts.reduce((s, p) => s + (p.reach || 0), 0)
          const avgERInf = infPosts.length > 0 ? infPosts.reduce((s, p) => s + (p.engagement_rate || 0), 0) / infPosts.length : 0
          const isComplete = infPosts.length > 0 && perf.sentiment
          const isPartial = infPosts.length > 0
          const status = isComplete ? 'complete' : isPartial ? 'partial' : 'pending'

          return (
            <div key={c.id} className={`card ${isExpanded ? 'border-orange-400 border-2' : ''}`}>
              <div className="p-3 flex items-center gap-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                {/* Avatar + name */}
                <div className="flex items-center gap-2 flex-1 min-w-0" style={{ minWidth: 180 }}>
                  <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-xs font-black">
                    {inf?.avatar ? <img src={inf.avatar} className="w-full h-full object-cover" alt="" /> : (inf?.name?.[0] || '?')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-900 truncate">{inf?.name || 'Unknown'}</p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {Array.isArray(inf?.platforms) && inf.platforms.find((p: any) => p.platform === 'instagram')?.url
                        ? `@${inf.platforms.find((p: any) => p.platform === 'instagram').url.split('/').pop()}`
                        : '—'}
                    </p>
                    {((c as any).influencers?.ig_followers || (c as any).influencers?.tt_followers) ? (
                      <p className="text-[10px] font-bold" style={{ color: '#7c3aed' }}>
                        {fmtNum(Math.max((c as any).influencers?.ig_followers || 0, (c as any).influencers?.tt_followers || 0))} urmăritori
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Stats inline */}
                <div className="hidden md:flex gap-5 text-xs">
                  <div className="text-right">
                    <p className="font-black text-gray-900">{fmtNum(reach)}</p>
                    <p className="text-[10px] text-gray-400">Reach</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-black ${avgERInf > 1.8 ? 'text-green-600' : 'text-gray-900'}`}>{avgERInf.toFixed(1)}%</p>
                    <p className="text-[10px] text-gray-400">ER</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-gray-900">{infPosts.length}</p>
                    <p className="text-[10px] text-gray-400">Posts</p>
                  </div>
                </div>

                {/* Status pill */}
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black flex-shrink-0
                  ${status === 'complete' ? 'bg-green-50 text-green-700' : status === 'partial' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                  {status === 'complete' ? '✓ Complete' : status === 'partial' ? '● Parțial' : '○ Lipsă'}
                </span>

                {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </div>

              {/* Expanded form */}
              {isExpanded && (
                <div className="border-t border-gray-100 p-4 bg-orange-50/30">
                  {/* Tabs */}
                  <div className="flex gap-1 mb-4 border-b border-gray-100 -mx-4 px-4 overflow-x-auto">
                    {[
                      { v: 'posts', l: 'Postări', i: <FileText className="w-3.5 h-3.5" /> },
                      { v: 'audience', l: 'Audiență', i: <MapPin className="w-3.5 h-3.5" /> },
                      { v: 'sentiment', l: 'Sentiment', i: <Smile className="w-3.5 h-3.5" /> },
                      { v: 'extras', l: 'UGC & Promo', i: <Tag className="w-3.5 h-3.5" /> },
                      { v: 'screenshot', l: 'Best post', i: <ImageIcon className="w-3.5 h-3.5" /> },
                    ].map(t => (
                      <button key={t.v} onClick={() => setActiveTab(t.v)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold whitespace-nowrap transition border-b-2 ${activeTab === t.v ? 'text-orange-600 border-orange-500' : 'text-gray-400 border-transparent hover:text-gray-700'}`}>
                        {t.i} {t.l}
                      </button>
                    ))}
                  </div>

                  {/* TAB: Posts */}
                  {activeTab === 'posts' && (
                    <div className="space-y-2">
                      {infPosts.map(post => (
                        <div key={post.id} className="card p-3 bg-white">
                          <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <select value={post.post_type} onChange={e => handleUpdatePost(post.id, c.id, 'post_type', e.target.value)}
                                className="input-sm" style={{ width: 110 }}>
                                {POST_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                              </select>
                              <input type="url" placeholder="Link postare" value={post.post_url || ''}
                                onChange={e => handleUpdatePost(post.id, c.id, 'post_url', e.target.value)}
                                className="input-sm" style={{ width: 220 }} />
                              <input type="date" value={post.post_date || ''}
                                onChange={e => handleUpdatePost(post.id, c.id, 'post_date', e.target.value)}
                                className="input-sm" style={{ width: 130 }} />
                            </div>
                            <button onClick={() => handleDeletePost(post.id, c.id)} className="text-red-400 hover:text-red-600 p-1">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { k: 'views', l: 'Views' },
                              { k: 'reach', l: 'Reach unic' },
                              { k: 'likes', l: 'Likes' },
                              { k: 'comments', l: 'Comments' },
                              { k: 'shares', l: 'Shares' },
                              { k: 'saves', l: 'Saves' },
                            ].map(f => (
                              <div key={f.k}>
                                <p className="text-[10px] text-gray-500 font-bold mb-1">{f.l}</p>
                                <input type="number" min="0" value={post[f.k] || 0}
                                  onChange={e => handleUpdatePost(post.id, c.id, f.k, parseInt(e.target.value) || 0)}
                                  className="input-sm" />
                              </div>
                            ))}
                            <div>
                              <p className="text-[10px] text-gray-500 font-bold mb-1">ER calculat</p>
                              <div className="input-sm bg-green-50 text-green-700 font-black flex items-center">{post.engagement_rate?.toFixed(2) || 0}%</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <button onClick={() => handleAddPost(c.id, inf.id)}
                        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-xs font-bold text-gray-500 hover:border-orange-400 hover:text-orange-500 flex items-center justify-center gap-1.5">
                        <Plus className="w-4 h-4" /> Adaugă postare
                      </button>
                    </div>
                  )}

                  {/* TAB: Audience */}
                  {activeTab === 'audience' && (
                    <div className="space-y-4">
                      {/* Followeri */}
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Urmăritori per platformă</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[10px] text-gray-500 mb-1">Instagram followers</p>
                            <input type="number" min="0" placeholder="ex: 34900"
                              defaultValue={inf?.ig_followers || ''}
                              onBlur={async e => {
                                const igVal = parseInt(e.target.value) || 0
                                const ttVal = (c as any).influencers?.tt_followers || 0
                                const result = await updateInfluencerFollowers(inf.id, igVal, ttVal)
                                if (!result.error) setCollabs((prev: any[]) => prev.map(col => col.id === c.id ? { ...col, influencers: { ...col.influencers, ig_followers: igVal } } : col))
                              }}
                              className="input-sm" />
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 mb-1">TikTok followers</p>
                            <input type="number" min="0" placeholder="ex: 53000"
                              defaultValue={inf?.tt_followers || ''}
                              onBlur={async e => {
                                const ttVal = parseInt(e.target.value) || 0
                                const igVal = (c as any).influencers?.ig_followers || 0
                                const result = await updateInfluencerFollowers(inf.id, igVal, ttVal)
                                if (!result.error) setCollabs((prev: any[]) => prev.map(col => col.id === c.id ? { ...col, influencers: { ...col.influencers, tt_followers: ttVal } } : col))
                              }}
                              className="input-sm" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Distribuție gen</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[10px] text-gray-500 mb-1">Femei %</p>
                            <input type="number" min="0" max="100" placeholder="68"
                              value={perf.audience_female_pct ?? ''}
                              onChange={e => updateField(c.id, inf.id, 'audience_female_pct', parseInt(e.target.value) || 0)}
                              className="input-sm" />
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 mb-1">Bărbați %</p>
                            <input type="number" min="0" max="100" placeholder="32"
                              value={perf.audience_male_pct ?? ''}
                              onChange={e => updateField(c.id, inf.id, 'audience_male_pct', parseInt(e.target.value) || 0)}
                              className="input-sm" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Distribuție vârstă (%)</p>
                        <div className="grid grid-cols-5 gap-2">
                          {[
                            { k: 'audience_age_18_24', l: '18-24' },
                            { k: 'audience_age_25_34', l: '25-34' },
                            { k: 'audience_age_35_44', l: '35-44' },
                            { k: 'audience_age_45_54', l: '45-54' },
                            { k: 'audience_age_55_plus', l: '55+' },
                          ].map(f => (
                            <div key={f.k}>
                              <p className="text-[10px] text-gray-500 mb-1">{f.l}</p>
                              <input type="number" min="0" max="100" placeholder="0"
                                value={perf[f.k] ?? ''}
                                onChange={e => updateField(c.id, inf.id, f.k, parseInt(e.target.value) || 0)}
                                className="input-sm" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: Sentiment */}
                  {activeTab === 'sentiment' && (
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Sentiment comentarii</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { v: 'positive', l: 'Pozitiv', I: Smile, c: 'green' },
                          { v: 'neutral', l: 'Neutru', I: Meh, c: 'gray' },
                          { v: 'negative', l: 'Negativ', I: Frown, c: 'red' },
                        ].map(s => (
                          <button key={s.v} onClick={() => updateField(c.id, inf.id, 'sentiment', s.v)}
                            className={`p-3 rounded-lg border-2 flex items-center justify-center gap-1.5 text-sm font-bold transition
                              ${perf.sentiment === s.v
                                ? s.c === 'green' ? 'border-green-500 bg-green-50 text-green-700'
                                : s.c === 'red' ? 'border-red-500 bg-red-50 text-red-700'
                                : 'border-gray-500 bg-gray-50 text-gray-700'
                                : 'border-gray-200 hover:border-gray-300'}`}>
                            <s.I className="w-4 h-4" /> {s.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB: UGC & Promo */}
                  {activeTab === 'extras' && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Conținut reutilizabil (UGC)</p>
                        <div className="flex items-center gap-3">
                          <input type="number" min="0" placeholder="0"
                            value={perf.ugc_reusable_count ?? ''}
                            onChange={e => updateField(c.id, inf.id, 'ugc_reusable_count', parseInt(e.target.value) || 0)}
                            className="input-sm" style={{ width: 80, textAlign: 'center' }} />
                          <span className="text-xs text-gray-500">din {infPosts.length} posts pot fi reutilizate pentru ads</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Cod promo & conversii (opțional)</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-[10px] text-gray-500 mb-1">Cod folosit</p>
                            <input type="text" placeholder="MARIA20"
                              value={perf.promo_code ?? ''}
                              onChange={e => updateField(c.id, inf.id, 'promo_code', e.target.value)}
                              className="input-sm" />
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 mb-1">Utilizări</p>
                            <input type="number" min="0" placeholder="0"
                              value={perf.promo_uses ?? ''}
                              onChange={e => updateField(c.id, inf.id, 'promo_uses', parseInt(e.target.value) || 0)}
                              className="input-sm" />
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 mb-1">Vânzări (RON)</p>
                            <input type="number" min="0" step="0.01" placeholder="0"
                              value={perf.promo_sales_ron ?? ''}
                              onChange={e => updateField(c.id, inf.id, 'promo_sales_ron', parseFloat(e.target.value) || 0)}
                              className="input-sm" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Note admin</p>
                        <textarea placeholder="Note interne despre acest influencer..."
                          value={perf.admin_notes ?? ''}
                          onChange={e => updateField(c.id, inf.id, 'admin_notes', e.target.value)}
                          className="input-sm" rows={2} />
                      </div>
                    </div>
                  )}

                  {/* TAB: Screenshot */}
                  {activeTab === 'screenshot' && (
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Screenshot best post (URL imagine)</p>
                      <input type="url" placeholder="https://... (link spre imagine uploadată)"
                        value={perf.best_post_screenshot_url ?? ''}
                        onChange={e => updateField(c.id, inf.id, 'best_post_screenshot_url', e.target.value)}
                        className="input-sm" />
                      {perf.best_post_screenshot_url && (
                        <img src={perf.best_post_screenshot_url} alt="Best post preview" className="mt-3 max-h-48 rounded-lg border border-gray-200" />
                      )}
                      <p className="text-[10px] text-gray-400 mt-2">💡 Uploadează imaginea în Supabase Storage și pune aici link-ul public.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {filteredCollabs.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-sm font-bold text-gray-400">Niciun influencer pentru filtrul ales.</p>
          </div>
        )}
      </div>
    </div>
  )
}
