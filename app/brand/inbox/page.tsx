'use client'

import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { MessageSquare, Send, Search, AlertCircle } from 'lucide-react'

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
    }

    setSending(false)
  }

  const visibleCollabs = collabs.filter(c => {
    const q = search.toLowerCase()
    return !q || c.influencer?.name?.toLowerCase().includes(q) || c.campaign?.title?.toLowerCase().includes(q)
  })

  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const fmtDay = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Yesterday'
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="flex h-[calc(100vh-64px)]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .brand-grad { background:linear-gradient(135deg,#f97316,#ec4899); }
        .field { padding:9px 14px 9px 40px;border:2px solid #f0f0f0;border-radius:12px;font-size:14px;font-weight:500;outline:none;background:white;transition:border-color .2s;font-family:inherit;width:100%; }
        .field:focus { border-color:#f97316; }
        .field::placeholder { color:#9ca3af;font-weight:400; }
        .msg-input { flex:1;padding:11px 16px;border:2px solid #f0f0f0;border-radius:14px;font-size:14px;font-weight:500;outline:none;background:white;font-family:inherit;resize:none;transition:border-color .2s;line-height:1.5; }
        .msg-input:focus { border-color:#f97316;box-shadow:0 0 0 3px rgba(249,115,22,.06); }
        .msg-input::placeholder { color:#9ca3af;font-weight:400; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#e5e7eb;border-radius:99px; }
        .msg-pending { opacity:0.6; }
      `}</style>

      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 bg-white flex flex-col" style={{ borderRight: '1.5px solid #f0f0f0' }}>
        <div className="p-4" style={{ borderBottom: '1.5px solid #f5f5f5' }}>
          <h1 className="font-black text-gray-900 mb-3">Inbox</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="field" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 rounded-full border-t-orange-400 border-orange-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
            </div>
          ) : visibleCollabs.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-400">No conversations yet</p>
              <p className="text-xs text-gray-300 mt-1">Approve applications to start chatting</p>
            </div>
          ) : visibleCollabs.map(c => (
            <button key={c.id} onClick={() => setSelected(c)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition"
              style={{ borderBottom: '1px solid #f9f9f9', background: selected?.id === c.id ? '#fff7ed' : 'white' }}>
              <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                {c.influencer?.avatar
                  ? <img src={c.influencer.avatar} className="w-full h-full object-cover" alt="" />
                  : <span className="font-black text-orange-500">{c.influencer?.name?.[0]?.toUpperCase() || '?'}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-gray-900 text-sm truncate">{c.influencer?.name || 'Influencer'}</p>
                <p className="text-xs text-gray-400 truncate">{c.campaign?.title}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      {!selected ? (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-16 h-16 brand-grad rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ boxShadow: '0 4px 16px rgba(249,115,22,.25)' }}>
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <p className="font-black text-gray-700">Select a conversation</p>
            <p className="text-sm text-gray-400 mt-1">Choose an influencer to message</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
          <div className="bg-white px-6 py-4 flex items-center gap-3 flex-shrink-0" style={{ borderBottom: '1.5px solid #f0f0f0' }}>
            <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              {selected.influencer?.avatar
                ? <img src={selected.influencer.avatar} className="w-full h-full object-cover" alt="" />
                : <span className="font-black text-orange-500">{selected.influencer?.name?.[0]?.toUpperCase()}</span>}
            </div>
            <div>
              <p className="font-black text-gray-900">{selected.influencer?.name || 'Influencer'}</p>
              <p className="text-xs text-gray-400">{selected.campaign?.title}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm font-bold text-gray-400">No messages yet. Say hi! 👋</p>
              </div>
            )}
            {messages.map((m, i) => {
              const isMe = m.sender_role === 'brand'
              const showDay = i === 0 || fmtDay(messages[i - 1].created_at) !== fmtDay(m.created_at)
              return (
                <div key={m.id}>
                  {showDay && (
                    <div className="text-center my-3">
                      <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{fmtDay(m.created_at)}</span>
                    </div>
                  )}
                  <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${m._pending ? 'msg-pending' : ''}`}>
                    <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm font-medium leading-relaxed ${isMe ? 'text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm'}`}
                      style={isMe ? { background: 'linear-gradient(135deg,#f97316,#ec4899)' } : { border: '1.5px solid #f0f0f0' }}>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{m.content}</p>
                      <p className={`text-[10px] mt-1 ${isMe ? 'text-white/70 text-right' : 'text-gray-400'}`}>
                        {m._pending ? 'Sending…' : fmtTime(m.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {sendError && (
            <div className="mx-4 mb-2 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {sendError}
            </div>
          )}

          <div className="bg-white px-4 py-3 flex items-end gap-3 flex-shrink-0" style={{ borderTop: '1.5px solid #f0f0f0' }}>
            <textarea className="msg-input" rows={1}
              placeholder="Type a message… (Enter to send)"
              value={text}
              onChange={e => { setText(e.target.value); setSendError(null) }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            />
            <button onClick={sendMessage} disabled={!text.trim() || sending}
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition text-white disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', boxShadow: '0 3px 10px rgba(249,115,22,.3)' }}>
              {sending
                ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
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
    <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-t-orange-400 border-orange-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
        <p className="text-sm font-medium text-gray-600">Loading inbox...</p>
      </div>
    </div>
  )
}
