'use client'

import DraftMessage, { DRAFT_MSG } from '@/components/shared/DraftMessage'
import { useEffect, useState, useCallback, useRef, Suspense, Fragment } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { MessageSquare, Send, Search, AlertCircle, ArrowLeft, Sparkles, Loader2 } from 'lucide-react'

// Generează o culoare consistentă per brand bazată pe numele lui
function brandColor(name: string): string {
  const colors = [
    'linear-gradient(135deg,#2f6fe0, #5a35e6)',
    'linear-gradient(135deg,#7040f0, #9030f0)',
    'linear-gradient(135deg,#10b981,#3b82f6)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
    'linear-gradient(135deg,#6366f1,#8b5cf6)',
    'linear-gradient(135deg,#9030f0,#5a35e6)',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function BrandAvatar({ brand, size = 10 }: { brand: any; size?: number }) {
  const name = brand?.name || 'B'
  const initial = name[0]?.toUpperCase() || '?'
  const gradient = brandColor(name)
  const cls = `w-${size} h-${size} rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0`

  if (brand?.logo) {
    return (
      <div className={cls}>
        <img src={brand.logo} className="w-full h-full object-cover" alt={name}
          onError={e => {
            const el = e.target as HTMLImageElement
            el.style.display = 'none'
            const parent = el.parentElement
            if (parent) {
              parent.style.background = gradient
              parent.innerHTML = `<span style="color:white;font-weight:900;font-size:${size * 1.6}px">${initial}</span>`
            }
          }}
        />
      </div>
    )
  }

  return (
    <div className={cls} style={{ background: gradient }}>
      <span style={{ color: 'white', fontWeight: 900, fontSize: size * 1.6 }}>{initial}</span>
    </div>
  )
}

function InboxContent() {
  const searchParams = useSearchParams()
  const initCollab = searchParams.get('collab')

  const [userId, setUserId] = useState<string | null>(null)
  const [collabs, setCollabs] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiLoading, setAiLoading] = useState(false)
  const [showAiSuggestions, setShowAiSuggestions] = useState(false)
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

      const { data: inf } = await sb.from('influencers').select('id').eq('user_id', user.id).single()
      if (!inf) return

      const { data: colls } = await sb
        .from('collaborations')
        .select('*, campaigns(id, title, brand_name, brand_id, story_instructions, required_hashtags, required_caption, key_messages, forbidden_content, content_tone, deadline)')
        .eq('influencer_id', inf.id)
        .in('status', ['ACTIVE', 'COMPLETED', 'INVITED'])
        .order('created_at', { ascending: false })

      if (!colls?.length) { setCollabs([]); setLoading(false); return }

      // Colectează brand_id din colaborare SAU din campanie (fallback pentru managed)
      const allBrandIds = [...new Set(
        colls.map((c: any) => c.brand_id || c.campaigns?.brand_id).filter(Boolean)
      )]
      let { data: brands, error: bErr } = await sb.from('brands_public').select('id, name, logo, industry, website').in('id', allBrandIds as string[])
      if (bErr) ({ data: brands } = await sb.from('brands').select('id, name, logo, industry, website').in('id', allBrandIds as string[]))
      const brandMap = Object.fromEntries((brands || []).map((b: any) => [b.id, b]))

      const enriched = colls.map((c: any) => {
        const brandId = c.brand_id || c.campaigns?.brand_id
        const brand = brandMap[brandId] || null
        // Fallback: ia brand_name din campanie dacă nu găsim în brands table
        const resolvedBrand = brand || (c.campaigns?.brand_name
          ? { name: c.campaigns.brand_name, logo: null, id: brandId }
          : null)
        return { ...c, brand: resolvedBrand }
      })

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
    const channel = sb.channel(`inbox-inf-${selected.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `collaboration_id=eq.${selected.id}`
      }, (payload) => {
        setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
        scrollBottom()
      })
      .subscribe((status) => console.log('realtime status:', status))

    return () => { sb.removeChannel(channel) }
  }, [selected?.id, loadMessages])

  async function askAI(question: string) {
    if (!selected || aiLoading) return
    setAiLoading(true)
    setShowAiSuggestions(false)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'campaign_qa',
          data: {
            campaign_title: selected.campaigns?.title || selected.title,
            brand_name: selected.brand?.name || selected.campaigns?.brand_name || 'brand',
            campaign_type: selected.campaign_type || selected.campaigns?.campaign_type || 'BARTER',
            story_instructions: selected.campaigns?.story_instructions || selected.story_instructions,
            required_hashtags: selected.campaigns?.required_hashtags || selected.required_hashtags,
            required_caption: selected.campaigns?.required_caption || selected.required_caption,
            key_messages: selected.campaigns?.key_messages || selected.key_messages,
            forbidden_content: selected.campaigns?.forbidden_content || selected.forbidden_content,
            content_tone: selected.campaigns?.content_tone || selected.content_tone,
            deadline: selected.campaigns?.deadline || selected.deadline,
            question,
          }
        })
      })
      const data = await res.json()
      if (data.message) {
        const aiMsg = {
          id: `ai-${Date.now()}`,
          collaboration_id: selected.id,
          sender_id: 'ai',
          sender_role: 'system',
          content: `🤖 ${data.message}`,
          created_at: new Date().toISOString(),
          _local: true,
        }
        setMessages(prev => [...prev, aiMsg])
        scrollBottom()
      }
    } catch (e) {
      console.error('AI QA error', e)
    } finally {
      setAiLoading(false)
    }
  }

  async function sendMessage() {
    if (!text.trim() || !selected || !userId || sending) return
    setSending(true)
    setSendError(null)

    const content = text.trim()
    const tempId = `temp-${Date.now()}`

    const optimistic = {
      id: tempId,
      collaboration_id: selected.id,
      sender_id: userId,
      sender_role: 'influencer',
      content,
      created_at: new Date().toISOString(),
      _pending: true,
    }
    setMessages(prev => [...prev, optimistic])
    setText('')
    scrollBottom()

    const sb = createClient()
    const { data, error } = await sb.from('messages').insert({
      collaboration_id: selected.id,
      sender_id: userId,
      sender_role: 'influencer',
      content,
    }).select().single()

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setText(content)
      setSendError(`Trimiterea a eșuat: ${error.message}`)
    } else {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m))
      // Notifica brandul
      try {
        const { data: collab } = await sb.from('collaborations')
          .select('brand_id, brands(user_id), campaigns(title), influencer_id, influencers(name)')
          .eq('id', selected.id).single() as { data: any }
        if (collab?.brands?.user_id) {
          await sb.from('notifications').insert({
            user_id: collab.brands.user_id,
            title: '💬 Mesaj nou',
            body: `${collab.influencers?.name || 'Influencerul'} ți-a trimis un mesaj în colaborarea "${collab.campaigns?.title || ''}"`,
            link: '/brand/inbox',
            read: false,
          })
        }
      } catch(e) { console.error('notify error', e) }
    }

    setSending(false)
  }

  const visibleCollabs = collabs.filter(c => {
    const q = search.toLowerCase()
    return !q || c.brand?.name?.toLowerCase().includes(q) || c.campaigns?.title?.toLowerCase().includes(q)
  })

  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
  const fmtDay = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
    if (diff === 0) return 'Astăzi'
    if (diff === 1) return 'Ieri'
    return new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })
  }

  const tints = [['#e6f0ff', '#1d4fb8'], ['#efeaff', '#4423c4'], ['#dcf5ec', '#14532d'], ['#fff1c2', '#854d0e']]
  const brandName = (c: any) => c.brand?.name || c.campaigns?.brand_name || 'Brand'
  const campTitle = (c: any) => c.campaigns?.title?.replace('[Managed] ', '').replace('[Barter] ', '') || ''
  const Face = ({ c, size }: { c: any; size: number }) => {
    const nm = brandName(c)
    const t = tints[(nm.charCodeAt(0) || 0) % tints.length]
    return (
      <span className="iu-face" style={{ width: size, height: size, borderRadius: size > 50 ? 18 : 12, background: t[0], color: t[1], fontSize: Math.round(size * 0.4) }}>
        {c.brand?.logo
          ? <img src={c.brand.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : (nm[0]?.toUpperCase() || '?')}
      </span>
    )
  }
  const statusChip = (c: any) => {
    if (c.status === 'COMPLETED') return { label: 'Finalizată', bg: '#f0eff7', fg: '#4a4770' }
    if (c.status === 'INVITED') return { label: 'Invitație', bg: '#e6f0ff', fg: '#1d4fb8' }
    return { label: 'Activă', bg: '#dcf5ec', fg: '#14532d' }
  }

  return (
    <div className="iu ib">
      <style>{`
        .ib.iu { height: calc(100dvh - 64px); max-width: 1400px; padding: 24px 28px 28px; gap: 16px; box-sizing: border-box; overflow: hidden; }
        .ib-wrap { flex: 1; min-height: 0; display: flex; overflow: hidden; }
        .ib-list { width: 340px; flex: none; display: flex; flex-direction: column; border-right: 1px solid #e5e3f3; min-height: 0; }
        .ib-lhead { padding: 16px; display: flex; flex-direction: column; gap: 12px; border-bottom: 1px solid #eeecf7; }
        .ib-scroll { flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; }
        .ib-item { position: relative; display: flex; gap: 12px; align-items: center; width: 100%; min-height: 64px; padding: 12px 16px; border: 0; background: transparent; text-align: left; cursor: pointer; font: inherit; color: #14123a; box-sizing: border-box; }
        .ib-item:hover { background: #faf9ff; }
        .ib-item.sel { background: #f3efff; }
        .ib-item.sel::before { content: ''; position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 3px; background: #7040f0; }
        .ib-ell { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
        .ib-chat { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; background: #f6f6fc; }
        .ib-chead { display: flex; align-items: center; gap: 12px; padding: 14px 20px; background: #fff; border-bottom: 1px solid #e5e3f3; flex: none; }
        .ib-back { display: none; width: 44px; height: 44px; margin-left: -8px; flex: none; align-items: center; justify-content: center; border: 0; background: transparent; color: #14123a; cursor: pointer; border-radius: 12px; }
        .ib-msgs { flex: 1; min-height: 0; overflow-y: auto; padding: 22px 24px; display: flex; flex-direction: column; gap: 14px; -webkit-overflow-scrolling: touch; }
        .ib-day { align-self: center; padding: 3px 12px; border-radius: 99px; background: #eceaf7; font-size: 12px; font-weight: 700; color: #6a6690; }
        .ib-m { display: flex; flex-direction: column; gap: 4px; max-width: 78%; min-width: 0; }
        .ib-m.me { align-self: flex-end; align-items: flex-end; }
        .ib-b { padding: 10px 14px; border-radius: 18px 18px 18px 6px; background: #fff; border: 1px solid #e5e3f3; font-size: 15px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; }
        .ib-m.me .ib-b { background: linear-gradient(135deg,#7040f0,#9030f0); color: #fff; border: 0; border-radius: 18px 18px 6px 18px; }
        .ib-m.pending { opacity: .6; }
        .ib-ai { align-self: center; max-width: 88%; padding: 12px 16px; border-radius: 16px; background: #f3efff; border: 1px solid #ddd2ff; color: #4423c4; font-size: 14px; line-height: 1.5; }
        .ib-ai p { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
        .ib-qa { flex: none; padding: 12px 16px; background: #faf8ff; border-top: 1px solid #e5e3f3; display: flex; flex-direction: column; gap: 8px; }
        .ib-qa-b { min-height: 36px; padding: 6px 12px; border-radius: 999px; border: 1.5px solid #ddd2ff; background: #fff; color: #5b2fd0; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
        .ib-qa-b:hover { background: #efeaff; }
        .ib-comp { display: flex; align-items: flex-end; gap: 10px; padding: 14px 20px; background: #fff; border-top: 1px solid #e5e3f3; flex: none; }
        .ib-ta { flex: 1; min-width: 0; min-height: 44px; max-height: 140px; border: 1.5px solid #e5e3f3; border-radius: 12px; padding: 11px 14px; font: inherit; font-size: 16px; line-height: 1.4; resize: none; outline: none; background: #fff; color: #14123a; box-sizing: border-box; }
        .ib-ta:focus { border-color: #7040f0; box-shadow: 0 0 0 3px rgba(112,64,240,.1); }
        .ib-err { margin: 0 16px 10px; display: flex; gap: 8px; align-items: center; padding: 10px 14px; border-radius: 12px; background: #fff4f2; border: 1px solid #f3c9c4; color: #b42318; font-size: 13px; font-weight: 700; }
        .ib-spin { width: 24px; height: 24px; border-radius: 50%; border: 3px solid #e5e3f3; border-top-color: #7040f0; animation: ibspin .8s linear infinite; }
        @keyframes ibspin { to { transform: rotate(360deg); } }
        .ib-empty { text-align: center; padding: 48px 20px; }
        @media (max-width: 767px) {
          .ib.iu { padding: 0; gap: 0; height: calc(100dvh - 64px); }
          .ib-title { padding: 18px 16px 12px; }
          .ib-wrap { border-radius: 0; border: 0; border-top: 1px solid #e5e3f3; }
          .ib-list { width: 100%; border-right: 0; }
          .ib-wrap.has-sel .ib-list { display: none; }
          .ib-wrap.no-sel .ib-chat { display: none; }
          .ib.is-chat .ib-title { display: none; }
          .ib.is-chat .ib-wrap { border-top: 0; }
          .ib-back { display: inline-flex; }
          .ib-chead { padding: 8px 12px; min-height: 60px; }
          .ib-msgs { padding: 16px; gap: 12px; }
          .ib-m { max-width: 86%; }
          .ib-comp { padding: 10px 12px calc(10px + env(safe-area-inset-bottom)); gap: 8px; }
          .ib-comp .iu-btn { width: 44px; padding: 0; }
        }
      `}</style>

      <div className="iu-head ib-title" style={{ flex: 'none' }}>
        <div className="iu-col" style={{ gap: 4 }}>
          <h1>Mesaje</h1>
          <span className="iu-muted iu-sm">
            {loading ? 'Se încarcă…' : `${collabs.length} ${collabs.length === 1 ? 'conversație' : 'conversații'} cu branduri`}
          </span>
        </div>
      </div>

      <div className={`iu-card ib-wrap ${selected ? 'has-sel' : 'no-sel'}`}>
        {/* Lista conversații */}
        <div className="ib-list">
          <div className="ib-lhead">
            <label className="iu-search">
              <Search size={16} />
              <input placeholder="Caută o conversație…" value={search} onChange={e => setSearch(e.target.value)} />
            </label>
          </div>
          <div className="ib-scroll">
            {loading ? (
              <div className="ib-empty" style={{ display: 'flex', justifyContent: 'center' }}><div className="ib-spin" /></div>
            ) : visibleCollabs.length === 0 ? (
              <div className="ib-empty">
                <MessageSquare size={32} color="#c9c5e4" style={{ margin: '0 auto 8px' }} />
                <p style={{ margin: 0, fontWeight: 700 }} className="iu-muted">Nicio conversație încă</p>
                <p className="iu-xs iu-muted" style={{ margin: '4px 0 0' }}>Obține aprobarea pentru a vorbi cu brandurile</p>
              </div>
            ) : visibleCollabs.map(c => (
              <button key={c.id} onClick={() => setSelected(c)} className={`ib-item ${selected?.id === c.id ? 'sel' : ''}`}>
                <Face c={c} size={42} />
                <div className="iu-col" style={{ flex: 1, minWidth: 0 }}>
                  <b className="ib-ell" style={{ fontSize: 15 }}>{brandName(c)}</b>
                  <span className="iu-xs ib-ell" style={{ color: '#7040f0', fontWeight: 700 }}>{campTitle(c)}</span>
                </div>
                {c.status === 'INVITED' && <span className="iu-chip" style={{ background: '#e6f0ff', color: '#1d4fb8', height: 22, padding: '0 8px', fontSize: 11 }}>Invitație</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Conversație */}
        {!selected ? (
          <div className="ib-chat" style={{ alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="iu-ico" style={{ width: 60, height: 60, borderRadius: 18, margin: '0 auto 14px', background: 'linear-gradient(135deg,#7040f0,#9030f0)', color: '#fff' }}>
                <MessageSquare size={28} />
              </div>
              <p className="iu-d" style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>Selectează o conversație</p>
              <p className="iu-sm iu-muted" style={{ margin: '4px 0 0' }}>Alege un brand pentru a trimite mesaje</p>
            </div>
          </div>
        ) : (
          <div className="ib-chat">
            <div className="ib-chead">
              <button className="ib-back" onClick={() => setSelected(null)} aria-label="Înapoi la conversații">
                <ArrowLeft size={22} />
              </button>
              <Face c={selected} size={40} />
              <div className="iu-col" style={{ flex: 1, minWidth: 0 }}>
                <b className="ib-ell">{brandName(selected)}</b>
                <span className="iu-xs iu-muted ib-ell">{campTitle(selected)}</span>
              </div>
              <span className="iu-chip" style={{ background: statusChip(selected).bg, color: statusChip(selected).fg }}>{statusChip(selected).label}</span>
            </div>

            <div className="ib-msgs">
              {messages.length === 0 && (
                <div className="ib-empty">
                  <p className="iu-sm iu-muted" style={{ margin: 0, fontWeight: 700 }}>Niciun mesaj încă. Spune salut! 👋</p>
                </div>
              )}
              {messages.map((m, i) => {
                const isMe = m.sender_role === 'influencer'
                const isAI = m.sender_role === 'system' && !DRAFT_MSG.test(m.content || '')
                // (isDraft de mai jos: recunoscut după conținut, indiferent de sender_role)
                const isDraft = DRAFT_MSG.test(m.content || '')
                const showDay = i === 0 || fmtDay(messages[i - 1].created_at) !== fmtDay(m.created_at)
                return (
                  <Fragment key={m.id}>
                    {showDay && <div className="ib-day">{fmtDay(m.created_at)}</div>}
                    {isDraft ? (
                      <DraftMessage content={m.content} collabId={selected.id} role="influencer" />
                    ) : isAI ? (
                      <div className="ib-ai">
                        <p>{m.content}</p>
                        <span className="iu-muted" style={{ fontSize: 11, display: 'block', textAlign: 'right', marginTop: 4 }}>{fmtTime(m.created_at)}</span>
                      </div>
                    ) : (
                      <div className={`ib-m ${isMe ? 'me' : ''} ${m._pending ? 'pending' : ''}`}>
                        <div className="ib-b">{m.content}</div>
                        <span className="iu-muted" style={{ fontSize: 11 }}>{m._pending ? 'Se trimite…' : fmtTime(m.created_at)}</span>
                      </div>
                    )}
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

            {/* Întrebări rapide AI */}
            {showAiSuggestions && (
              <div className="ib-qa">
                <span className="iu-label">Întrebări frecvente despre campanie</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    'Ce hashtag-uri trebuie să folosesc?',
                    'Cum trebuie să arate postarea?',
                    'Ce să evit în postare?',
                    'Care e deadline-ul?',
                    'Ce mesaje cheie să transmit?',
                  ].map(q => (
                    <button key={q} onClick={() => askAI(q)} className="ib-qa-b">{q}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="ib-comp">
              <textarea className="ib-ta" rows={1}
                placeholder="Scrie un mesaj…"
                value={text}
                onChange={e => { setText(e.target.value); setSendError(null) }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              />
              <button onClick={() => setShowAiSuggestions(v => !v)} className="iu-btn"
                style={{ width: 44, height: 44, padding: 0, ...(showAiSuggestions ? { background: '#efeaff', borderColor: '#cdb8ff', color: '#5b2fd0' } : { color: '#7040f0' }) }}
                title="Întreabă AI despre campanie" aria-label="Întreabă AI despre campanie">
                {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              </button>
              <button onClick={sendMessage} disabled={!text.trim() || sending} className="iu-btn p" style={{ height: 44, width: 44, padding: 0 }} aria-label="Trimite">
                {sending
                  ? <div className="ib-spin" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,.4)', borderTopColor: '#fff' }} />
                  : <Send size={16} />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function InfluencerInbox() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <InboxContent />
    </Suspense>
  )
}

function LoadingFallback() {
  return (
    <div className="iu" style={{ height: 'calc(100dvh - 64px)', alignItems: 'center', justifyContent: 'center' }}>
      <div className="iu-col" style={{ alignItems: 'center', gap: 14 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #e5e3f3', borderTopColor: '#7040f0', animation: 'ibspin .8s linear infinite' }} />
        <style>{`@keyframes ibspin { to { transform: rotate(360deg); } }`}</style>
        <p className="iu-sm iu-muted" style={{ margin: 0, fontWeight: 600 }}>Se încarcă mesajele...</p>
      </div>
    </div>
  )
}
