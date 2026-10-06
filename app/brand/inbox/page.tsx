'use client'

import DraftMessage, { DRAFT_MSG } from '@/components/shared/DraftMessage'
import { useEffect, useState, useCallback, useRef, Suspense, Fragment } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { MessageSquare, Send, Search, AlertCircle, ArrowLeft } from 'lucide-react'

function InboxContent() {
  const searchParams = useSearchParams()
  const initCollab = searchParams.get('collab')

  const [userId, setUserId] = useState<string | null>(null)
  const [brandId, setBrandId] = useState<string | null>(null)
  const [collabs, setCollabs] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollBottom = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: brand } = await sb.from('brands').select('id, name').eq('user_id', user.id).single()
      if (!brand) return
      setBrandId(brand.id)

      const { data: camps } = await sb.from('campaigns').select('id, title').eq('brand_id', brand.id)
      const campIds = (camps || []).map((c: any) => c.id)
      const campMap = Object.fromEntries((camps || []).map((c: any) => [c.id, c]))
      if (!campIds.length) { setCollabs([]); setLoading(false); return }

      const { data: colls } = await sb
        .from('collaborations')
        .select('*')
        .in('campaign_id', campIds)
        .in('status', ['ACTIVE', 'COMPLETED'])
        .order('created_at', { ascending: false })

      if (!colls?.length) { setCollabs([]); setLoading(false); return }

      const infIds = [...new Set(colls.map((c: any) => c.influencer_id).filter(Boolean))]
      const { data: infs } = await sb.from('influencers').select('id, name, avatar').in('id', infIds as string[])
      const infMap = Object.fromEntries((infs || []).map((i: any) => [i.id, i]))
      const enriched = colls.map((c: any) => ({ ...c, influencer: infMap[c.influencer_id] || null, campaign: campMap[c.campaign_id] || null }))

      setCollabs(enriched)
      const init = initCollab ? enriched.find((c: any) => c.id === initCollab) : enriched[0]
      if (init) setSelected(init)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [initCollab])

  useEffect(() => { load() }, [load])

  const loadMessages = useCallback(async (collabId: string) => {
    const sb = createClient()
    const { data, error } = await sb
      .from('messages')
      .select('*')
      .eq('collaboration_id', collabId)
      .order('created_at', { ascending: true })
    if (error) { console.error('load messages error:', error.message, error.code); return }
    setMessages(data || [])
    scrollBottom()
  }, [])

  useEffect(() => {
    if (!selected) return
    loadMessages(selected.id)

    const sb = createClient()
    const channel = sb.channel(`inbox-brand-${selected.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `collaboration_id=eq.${selected.id}`
      }, (payload) => {
        setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
        scrollBottom()
      })
      .subscribe((status) => console.log('realtime:', status))

    return () => { sb.removeChannel(channel) }
  }, [selected?.id, loadMessages])

  async function sendMessage() {
    if (!text.trim() || !selected || !userId || sending) return
    setSending(true)
    setSendError(null)

    const content = text.trim()
    const tempId = `temp-${Date.now()}`

    // Optimistic insert
    setMessages(prev => [...prev, {
      id: tempId,
      collaboration_id: selected.id,
      sender_id: userId,
      sender_role: 'brand',
      content,
      created_at: new Date().toISOString(),
      _pending: true,
    }])
    setText('')
    scrollBottom()

    const sb = createClient()
    const { data, error } = await sb.from('messages').insert({
      collaboration_id: selected.id,
      sender_id: userId,
      sender_role: 'brand',
      content,
    }).select().single()

    if (error) {
      console.error('send error:', error.message, error.code, error.details)
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setText(content)
      setSendError(`Failed to send: ${error.message}`)
    } else {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m))
      // Notifica influencerul
      try {
        const { data: collab } = await sb.from('collaborations')
          .select('influencer_id, influencers(user_id, name), campaigns(title)')
          .eq('id', selected.id).single() as { data: any }
        if (collab?.influencers?.user_id) {
          await sb.from('notifications').insert({
            user_id: collab.influencers.user_id,
            title: '💬 Mesaj nou',
            body: `${selected.brandName || 'Brandul'} ți-a trimis un mesaj în colaborarea "${collab.campaigns?.title || selected.campaign?.title}"`,
            link: '/influencer/inbox',
            read: false,
          })
          // Email notificare
          const { data: inf } = await sb.from('influencers').select('email, name').eq('user_id', collab.influencers.user_id).single()
          if (inf?.email) {
            fetch('/api/notifications/message-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                influencer_email: inf.email,
                influencer_name: inf.name,
                brand_name: selected.brandName || 'Brandul',
                campaign_title: collab.campaigns?.title || selected.campaign?.title || '',
                message_preview: content.slice(0, 150),
              }),
            }).catch(() => {})
          }
        }
      } catch(e) { console.error('notify error', e) }
    }

    setSending(false)
  }

  const [campaignFilter, setCampaignFilter] = useState<string>('all')

  const campaignsList = (() => {
    const map = new Map<string, string>()
    collabs.forEach(c => { if (c.campaign?.id) map.set(c.campaign.id, c.campaign.title) })
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }))
  })()

  const visibleCollabs = collabs.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.influencer?.name?.toLowerCase().includes(q) || c.campaign?.title?.toLowerCase().includes(q)
    const matchCampaign = campaignFilter === 'all' || c.campaign?.id === campaignFilter
    return matchSearch && matchCampaign
  })

  // Grupare pe campanie pentru afișare cu headere
  const groupedCollabs = (() => {
    const groups: { campaignId: string; campaignTitle: string; items: any[] }[] = []
    const idx = new Map<string, number>()
    visibleCollabs.forEach(c => {
      const cid = c.campaign?.id || 'unknown'
      const ctitle = c.campaign?.title || 'Fără campanie'
      if (!idx.has(cid)) { idx.set(cid, groups.length); groups.push({ campaignId: cid, campaignTitle: ctitle, items: [] }) }
      groups[idx.get(cid)!].items.push(c)
    })
    return groups
  })()

  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
  const fmtDay = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
    if (diff === 0) return 'Astăzi'
    if (diff === 1) return 'Ieri'
    return new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })
  }

  const tints = [['#e6f0ff', '#1d4fb8'], ['#efeaff', '#4423c4'], ['#dcf5ec', '#14532d'], ['#fff1c2', '#854d0e']]
  const Face = ({ c, size }: { c: any; size: number }) => {
    const t = tints[(c.influencer?.name?.charCodeAt(0) || 0) % tints.length]
    return (
      <span className="bu-face" style={{ width: size, height: size, background: t[0], color: t[1], fontSize: Math.round(size * 0.4) }}>
        {c.influencer?.avatar
          ? <img src={c.influencer.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : (c.influencer?.name?.[0]?.toUpperCase() || '?')}
      </span>
    )
  }
  const statusChip = (c: any) => {
    if (c.status === 'COMPLETED') return { label: 'Finalizată', bg: '#f0eff7', fg: '#4a4770' }
    return { label: 'Activă', bg: '#dcf5ec', fg: '#14532d' }
  }
  const needsReview = (c: any) => c.status === 'ACTIVE' && !!c.deliverable_submitted_at && !c.deliverable_approved_at && !c.deliverable_rejected_at

  return (
    <div className="bu ib">
      <style>{`
        .ib.bu { height: calc(100dvh - 64px); max-width: 1400px; padding: 24px 28px 28px; gap: 16px; box-sizing: border-box; overflow: hidden; }
        .ib-wrap { flex: 1; min-height: 0; display: flex; overflow: hidden; }
        .ib-list { width: 340px; flex: none; display: flex; flex-direction: column; border-right: 1px solid #e5e3f3; min-height: 0; }
        .ib-lhead { padding: 16px; display: flex; flex-direction: column; gap: 12px; border-bottom: 1px solid #eeecf7; }
        .ib-scroll { flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; }
        .ib-grp { padding: 12px 16px 4px; position: sticky; top: 0; background: rgba(255,255,255,.96); z-index: 1; font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #8783a8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ib-item { position: relative; display: flex; gap: 12px; align-items: center; width: 100%; min-height: 64px; padding: 12px 16px; border: 0; background: transparent; text-align: left; cursor: pointer; font: inherit; color: #14123a; box-sizing: border-box; }
        .ib-item:hover { background: #faf9ff; }
        .ib-item.sel { background: #f3efff; }
        .ib-item.sel::before { content: ''; position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 3px; background: #5a35e6; }
        .ib-ell { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
        .ib-chat { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; background: #f6f6fc; }
        .ib-chead { display: flex; align-items: center; gap: 12px; padding: 14px 20px; background: #fff; border-bottom: 1px solid #e5e3f3; flex: none; }
        .ib-back { display: none; width: 44px; height: 44px; margin-left: -8px; flex: none; align-items: center; justify-content: center; border: 0; background: transparent; color: #14123a; cursor: pointer; border-radius: 12px; }
        .ib-msgs { flex: 1; min-height: 0; overflow-y: auto; padding: 22px 24px; display: flex; flex-direction: column; gap: 14px; -webkit-overflow-scrolling: touch; }
        .ib-day { align-self: center; padding: 3px 12px; border-radius: 99px; background: #eceaf7; font-size: 12px; font-weight: 700; color: #6a6690; }
        .ib-m { display: flex; flex-direction: column; gap: 4px; max-width: 78%; min-width: 0; }
        .ib-m.me { align-self: flex-end; align-items: flex-end; }
        .ib-b { padding: 10px 14px; border-radius: 18px 18px 18px 6px; background: #fff; border: 1px solid #e5e3f3; font-size: 15px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; }
        .ib-m.me .ib-b { background: linear-gradient(135deg,#2f6fe0,#5a35e6); color: #fff; border: 0; border-radius: 18px 18px 6px 18px; }
        .ib-m.pending { opacity: .6; }
        .ib-comp { display: flex; align-items: flex-end; gap: 10px; padding: 14px 20px; background: #fff; border-top: 1px solid #e5e3f3; flex: none; }
        .ib-ta { flex: 1; min-width: 0; min-height: 44px; max-height: 140px; border: 1.5px solid #e5e3f3; border-radius: 12px; padding: 11px 14px; font: inherit; font-size: 16px; line-height: 1.4; resize: none; outline: none; background: #fff; color: #14123a; box-sizing: border-box; }
        .ib-ta:focus { border-color: #5a35e6; box-shadow: 0 0 0 3px rgba(90,53,230,.1); }
        .ib-err { margin: 0 16px 10px; display: flex; gap: 8px; align-items: center; padding: 10px 14px; border-radius: 12px; background: #fff4f2; border: 1px solid #f3c9c4; color: #b42318; font-size: 13px; font-weight: 700; }
        .ib-side { width: 300px; flex: none; border-left: 1px solid #e5e3f3; background: #fff; padding: 20px; display: flex; flex-direction: column; gap: 18px; overflow-y: auto; }
        .ib-spin { width: 24px; height: 24px; border-radius: 50%; border: 3px solid #e5e3f3; border-top-color: #5a35e6; animation: ibspin .8s linear infinite; }
        @keyframes ibspin { to { transform: rotate(360deg); } }
        .ib-empty { text-align: center; padding: 48px 20px; }
        @media (max-width: 1099px) { .ib-side { display: none; } }
        @media (max-width: 767px) {
          .ib.bu { padding: 0; gap: 0; height: calc(100dvh - 64px); }
          .ib-title { padding: 18px 16px 12px; }
          .ib-wrap { border-radius: 0; border: 0; border-top: 1px solid #e5e3f3; }
          .ib-list { width: 100%; border-right: 0; }
          .ib-wrap.has-sel .ib-list { display: none; }
          .ib-wrap.no-sel .ib-chat { display: none; }
          .ib.is-chat .ib-title { display: none; }
          .ib.is-chat .ib-wrap { border-top: 0; }
          .ib-back { display: inline-flex; }
          .ib-collab-btn { display: none; }
          .ib-chead { padding: 8px 12px; min-height: 60px; }
          .ib-msgs { padding: 16px; gap: 12px; }
          .ib-m { max-width: 86%; }
          .ib-comp { padding: 10px 12px calc(10px + env(safe-area-inset-bottom)); }
          .ib-comp .bu-btn { width: 44px; padding: 0; }
          .ib-comp .ib-lbl { display: none; }
        }
      `}</style>

      <div className="bu-head ib-title" style={{ flex: 'none' }}>
        <div className="bu-col" style={{ gap: 4 }}>
          <h1>Mesaje</h1>
          <span className="bu-muted bu-sm">
            {loading ? 'Se încarcă…' : `${collabs.length} ${collabs.length === 1 ? 'conversație' : 'conversații'} · grupate pe campanii`}
          </span>
        </div>
      </div>

      <div className={`bu-card ib-wrap ${selected ? 'has-sel' : 'no-sel'}`}>
        {/* Lista conversații */}
        <div className="ib-list">
          <div className="ib-lhead">
            <label className="bu-search">
              <Search size={16} />
              <input placeholder="Caută o conversație…" value={search} onChange={e => setSearch(e.target.value)} />
            </label>
            {campaignsList.length > 1 && (
              <select className="bu-input" value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)}>
                <option value="all">Toate campaniile</option>
                {campaignsList.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            )}
          </div>
          <div className="ib-scroll">
            {loading ? (
              <div className="ib-empty" style={{ display: 'flex', justifyContent: 'center' }}><div className="ib-spin" /></div>
            ) : visibleCollabs.length === 0 ? (
              <div className="ib-empty">
                <MessageSquare size={32} color="#c9c5e4" style={{ margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontWeight: 700 }} className="bu-muted">Nicio conversație încă</p>
                <p className="bu-xs bu-muted" style={{ margin: '4px 0 0' }}>Aprobă aplicații ca să începi să scrii</p>
              </div>
            ) : groupedCollabs.map(group => (
              <div key={group.campaignId}>
                <div className="ib-grp">{group.campaignTitle}</div>
                {group.items.map(c => (
                  <button key={c.id} onClick={() => setSelected(c)} className={`ib-item ${selected?.id === c.id ? 'sel' : ''}`}>
                    <Face c={c} size={42} />
                    <div className="bu-col" style={{ flex: 1, minWidth: 0 }}>
                      <b className="ib-ell" style={{ fontSize: 15 }}>{c.influencer?.name || 'Influencer'}</b>
                      <span className="bu-xs ib-ell" style={{ color: '#5a35e6', fontWeight: 700 }}>{c.campaign?.title}</span>
                    </div>
                    {needsReview(c) && <span className="bu-chip" style={{ background: '#fff1c2', color: '#854d0e', height: 22, padding: '0 8px', fontSize: 11 }}>De aprobat</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Conversație */}
        {!selected ? (
          <div className="ib-chat" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="bu-ico" style={{ width: 60, height: 60, borderRadius: 18, margin: '0 auto 14px', background: 'linear-gradient(135deg,#2f6fe0,#5a35e6)', color: '#fff' }}>
                <MessageSquare size={28} />
              </div>
              <p className="bu-d" style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>Selectează o conversație</p>
              <p className="bu-sm bu-muted" style={{ margin: '4px 0 0' }}>Alege un influencer căruia să îi scrii</p>
            </div>
          </div>
        ) : (
          <div className="ib-chat">
            <div className="ib-chead">
              <button className="ib-back" onClick={() => setSelected(null)} aria-label="Înapoi la conversații">
                <ArrowLeft size={22} />
              </button>
              <Face c={selected} size={40} />
              <div className="bu-col" style={{ flex: 1, minWidth: 0 }}>
                <b className="ib-ell">{selected.influencer?.name || 'Influencer'}</b>
                <span className="bu-xs bu-muted ib-ell">{selected.campaign?.title}</span>
              </div>
              <Link href="/brand/collaborations" className="bu-btn ib-collab-btn">Vezi colaborarea</Link>
            </div>

            <div className="ib-msgs">
              {messages.length === 0 && (
                <div className="ib-empty">
                  <p className="bu-sm bu-muted" style={{ margin: 0, fontWeight: 700 }}>Niciun mesaj încă. Spune salut! 👋</p>
                </div>
              )}
              {messages.map((m, i) => {
                const isMe = m.sender_role === 'brand'
                if (DRAFT_MSG.test(m.content || '')) {
                  return (
                    <Fragment key={m.id}>
                      {(i === 0 || fmtDay(messages[i - 1].created_at) !== fmtDay(m.created_at)) && <div className="ib-day">{fmtDay(m.created_at)}</div>}
                      <DraftMessage content={m.content} collabId={selected.id} role="brand" />
                    </Fragment>
                  )
                }
                const showDay = i === 0 || fmtDay(messages[i - 1].created_at) !== fmtDay(m.created_at)
                return (
                  <Fragment key={m.id}>
                    {showDay && <div className="ib-day">{fmtDay(m.created_at)}</div>}
                    <div className={`ib-m ${isMe ? 'me' : ''} ${m._pending ? 'pending' : ''}`}>
                      <div className="ib-b">{m.content}</div>
                      <span className="bu-muted" style={{ fontSize: 11 }}>{m._pending ? 'Se trimite…' : fmtTime(m.created_at)}</span>
                    </div>
                  </Fragment>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {sendError && (
              <div className="ib-err">
                <AlertCircle size={14} style={{ flex: 'none' }} /> {sendError}
              </div>
            )}

            <div className="ib-comp">
              <textarea className="ib-ta" rows={1}
                placeholder="Scrie un mesaj…"
                value={text}
                onChange={e => { setText(e.target.value); setSendError(null) }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              />
              <button onClick={sendMessage} disabled={!text.trim() || sending} className="bu-btn p" style={{ height: 44 }} aria-label="Trimite">
                {sending
                  ? <div className="ib-spin" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,.4)', borderTopColor: '#fff' }} />
                  : <Send size={16} />}
                <span className="ib-lbl">Trimite</span>
              </button>
            </div>
          </div>
        )}

        {/* Panou info */}
        {selected && (
          <aside className="ib-side">
            <div className="bu-col" style={{ alignItems: 'center', gap: 8, textAlign: 'center' }}>
              <Face c={selected} size={64} />
              <b className="bu-d" style={{ fontSize: 18 }}>{selected.influencer?.name || 'Influencer'}</b>
            </div>
            <div className="bu-col" style={{ gap: 8, padding: 14, borderRadius: 14, background: '#f7f4ff' }}>
              <span className="bu-label">Colaborare</span>
              <b>{selected.campaign?.title || 'Fără campanie'}</b>
              <div className="bu-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <span className="bu-chip" style={{ background: statusChip(selected).bg, color: statusChip(selected).fg }}>{statusChip(selected).label}</span>
                {needsReview(selected) && <span className="bu-chip" style={{ background: '#fff1c2', color: '#854d0e' }}>Postare de aprobat</span>}
              </div>
            </div>
            <div className="bu-col" style={{ gap: 8 }}>
              {needsReview(selected) && (
                <Link href="/brand/collaborations" className="bu-btn p" style={{ width: '100%', boxSizing: 'border-box' }}>Revizuiește postarea</Link>
              )}
              <Link href="/brand/collaborations" className="bu-btn" style={{ width: '100%', boxSizing: 'border-box' }}>Vezi colaborarea</Link>
              {selected.campaign?.id && (
                <Link href={`/brand/campaigns/${selected.campaign.id}`} className="bu-btn" style={{ width: '100%', boxSizing: 'border-box' }}>Vezi campania</Link>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

export default function BrandInbox() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <InboxContent />
    </Suspense>
  )
}

function LoadingFallback() {
  return (
    <div className="bu" style={{ height: 'calc(100dvh - 64px)', alignItems: 'center', justifyContent: 'center' }}>
      <div className="bu-col" style={{ alignItems: 'center', gap: 14 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #e5e3f3', borderTopColor: '#5a35e6', animation: 'ibspin .8s linear infinite' }} />
        <style>{`@keyframes ibspin { to { transform: rotate(360deg); } }`}</style>
        <p className="bu-sm bu-muted" style={{ margin: 0, fontWeight: 600 }}>Se încarcă mesajele...</p>
      </div>
    </div>
  )
}
