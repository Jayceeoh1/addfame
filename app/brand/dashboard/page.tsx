'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus, ChevronRight, X, Lock, Eye, UserPlus, Clock, FileText, ShieldCheck,
  Wallet as WalletIcon, XCircle, CheckCircle2, Rocket, Gift, Banknote,
  Send, Bot, Minimize2
} from 'lucide-react'

// ── AI Assistant Widget ──────────────────────────────────────────────────────
const QUICK_QUESTIONS = [
  'Cum lansez prima campanie?',
  'Cât costă o campanie?',
  'Ce se întâmplă cu locurile neocupate?',
  'Ce este Creator Score?',
]

function AIAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Salut! Sunt asistentul AddFame. Cu ce te pot ajuta azi?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    const userMsg = text.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'chat', data: { message: userMsg } }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'ai',
        text: data.message || 'Îmi pare rău, nu am putut genera un răspuns.'
      }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Eroare de conexiune. Încearcă din nou.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="AddFame Chat"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 50,
            background: 'linear-gradient(135deg,#2f6fe0, #5a35e6)',
            color: 'white',
            border: 'none',
            borderRadius: 100,
            padding: '12px 20px',
            fontSize: 14,
            fontWeight: 800,
            fontFamily: "var(--font-body, system-ui), system-ui, sans-serif",
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(90,53,230,0.4)',
            whiteSpace: 'nowrap',
          }}
        >
          <Bot className="w-4 h-4" />
          AddFame Chat
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div
          className="fixed z-50 overflow-hidden shadow-2xl flex flex-col"
          style={{ bottom: 88, right: 24, width: 'min(320px, calc(100vw - 48px))', height: 'min(440px, calc(100vh - 120px))', borderRadius: 24, border: '1.5px solid #f0f0f0', background: 'white' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#2f6fe0, #5a35e6)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-black text-sm">AddFame Chat</p>
                <p className="text-white/70 text-[10px]">Ask me anything</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition">
              <Minimize2 className="w-3.5 h-3.5 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'none' }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm font-medium leading-relaxed ${
                    m.role === 'user'
                      ? 'text-white rounded-br-sm'
                      : 'bg-gray-50 text-gray-800 rounded-bl-sm border border-gray-100'
                  }`}
                  style={m.role === 'user' ? { background: 'linear-gradient(135deg,#2f6fe0, #5a35e6)' } : {}}
                >
                  <span dangerouslySetInnerHTML={{ __html: m.text
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br/>') 
                  }} />
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-50 border border-gray-100 px-3 py-2 rounded-2xl rounded-bl-sm flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick questions */}
          {messages.length === 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
              {QUICK_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 flex-shrink-0" style={{ borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
            <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-3 py-2 border border-gray-200 focus-within:border-violet-300 transition">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                placeholder="Scrie o întrebare..."
                className="flex-1 bg-transparent text-sm outline-none font-medium text-gray-700 placeholder:text-gray-400"
                disabled={loading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white transition disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#2f6fe0, #5a35e6)' }}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


// ── Ajutătoare ───────────────────────────────────────────────────────────────
const DAY = 86400000
const num = (n: number) => (n || 0).toLocaleString('ro-RO')
const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${many}`)

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'acum'
  if (min < 60) return `acum ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `acum ${h} h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'ieri'
  if (d < 7) return `acum ${d} zile`
  return new Date(iso).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })
}

function daysLeft(deadline?: string | null) {
  if (!deadline) return null
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / DAY)
}

const FACE_COLORS = [
  ['#ffe0cc', '#9a3d06'], ['#d6eefe', '#075985'], ['#fde0ea', '#9d174d'], ['#ebe4ff', '#4c1d95'],
  ['#dcf5ec', '#14532d'], ['#fff1c2', '#854d0e'], ['#dff4fd', '#0c4a6e'],
]
function faceColor(key: string) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return FACE_COLORS[h % FACE_COLORS.length]
}
function initials(name?: string | null) {
  const parts = (name || '?').trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}

function Face({ inf, size = 30, ring = false }: { inf: any; size?: number; ring?: boolean }) {
  const [bg, fg] = faceColor(inf?.id || inf?.name || '?')
  const inner = (
    <span className="bd-face" style={{ width: ring ? '100%' : size, height: ring ? '100%' : size, background: bg, color: fg, fontSize: Math.round(size * 0.34), border: ring ? '2px solid #fff' : '2px solid #fff' }}>
      {inf?.avatar ? <img src={inf.avatar} alt="" /> : initials(inf?.name)}
    </span>
  )
  if (!ring) return inner
  return <span className="bd-ring" style={{ width: size, height: size }}>{inner}</span>
}

const isSelected = (c: any) => c.status === 'ACTIVE' || c.status === 'COMPLETED'
const hasPosted = (c: any) => !!c.deliverable_submitted_at || !!c.deliverable_approved_at || c.status === 'COMPLETED'
const isApproved = (c: any) => !!c.deliverable_approved_at || c.status === 'COMPLETED'
const awaitsReview = (c: any) => c.status === 'ACTIVE' && !!c.deliverable_submitted_at && !c.deliverable_approved_at && !c.deliverable_rejected_at

type Todo = { key: string; title: string; sub: string; href?: string; onClick?: () => void; cta: string; tone: 'primary' | 'blue' | 'warn' | 'danger' | 'neutral'; icon: any }

const TONES: Record<Todo['tone'], { bg: string; fg: string }> = {
  primary: { bg: '#5a35e6', fg: '#ffffff' },
  blue: { bg: '#e6f0ff', fg: '#1d4fb8' },
  warn: { bg: '#fff1e6', fg: '#b4530b' },
  danger: { bg: '#fdecec', fg: '#b42318' },
  neutral: { bg: '#eef0f6', fg: '#4a4770' },
}

const PLATFORM: Record<string, string> = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', facebook: 'Facebook', twitch: 'Twitch', x: 'X', twitter: 'X', linkedin: 'LinkedIn', pinterest: 'Pinterest', snapchat: 'Snapchat' }

const TYPE_LABEL: Record<string, { label: string; short: string; bg: string; fg: string }> = {
  PAID: { label: 'Plătită', short: 'P', bg: '#e6f0ff', fg: '#1d4fb8' },
  BARTER: { label: 'Barter', short: 'B', bg: '#efeaff', fg: '#4423c4' },
  OPEN_CALL: { label: 'Open call', short: 'O', bg: '#e3f6fd', fg: '#075f7d' },
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export default function BrandDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [collabs, setCollabs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showSheet, setShowSheet] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }

      const { data: brand } = await sb.from('brands').select('*').eq('user_id', user.id).single()
      if (!brand) { router.replace('/auth/login'); return }
      setProfile(brand)

      const { data: camps } = await sb.from('campaigns').select('*').eq('brand_id', brand.id).order('created_at', { ascending: false })
      setCampaigns(camps || [])

      const campIds = (camps || []).map((c: any) => c.id)
      if (campIds.length > 0) {
        const { data: colls } = await sb.from('collaborations').select('*').in('campaign_id', campIds).order('created_at', { ascending: false }).limit(1000)
        if (colls && colls.length > 0) {
          const infIds = [...new Set(colls.map((c: any) => c.influencer_id).filter(Boolean))]
          const { data: infs } = await sb.from('influencers').select('id, name, avatar').in('id', infIds as string[])
          const infMap = Object.fromEntries((infs || []).map((i: any) => [i.id, i]))
          setCollabs(colls.map((c: any) => ({ ...c, influencer: infMap[c.influencer_id] || null })))
        } else setCollabs([])
      } else setCollabs([])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [router])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 rounded-full border-t-violet-500 border-violet-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
    </div>
  )

  // ── Date derivate ──
  const campById = Object.fromEntries(campaigns.map(c => [c.id, c]))
  const activeCampaigns = campaigns.filter(c => ['ACTIVE', 'LIVE', 'PAUSED'].includes(c.status))
  const draftCampaigns = campaigns.filter(c => c.status === 'DRAFT')
  const completedCampaigns = campaigns.filter(c => c.status === 'COMPLETED')
  const creditsBalance = profile?.credits_balance || 0
  const creditsReserved = Math.max(0, profile?.credits_reserved || 0)
  const available = Math.max(0, creditsBalance - creditsReserved)
  const totalSpent = profile?.total_spent || 0
  const canCreateCampaign = creditsBalance >= 250 || profile?.influencers_access === true
  const verification: string = profile?.verification_status || 'unverified'

  const reviewQueue = collabs.filter(awaitsReview)
  const newApplications = collabs.filter(c => c.status === 'PENDING')
  const closingSoon = activeCampaigns
    .filter(c => c.status !== 'PAUSED')
    .map(c => ({ c, d: daysLeft(c.deadline) }))
    .filter(x => x.d !== null && x.d >= 0 && x.d <= 3)
    .sort((a, b) => (a.d as number) - (b.d as number))

  const campaignNames = (list: any[]) => {
    const ids = [...new Set(list.map(c => c.campaign_id))]
    if (ids.length === 1) return campById[ids[0] as string]?.title || ''
    return `în ${ids.length} campanii`
  }

  const openNewCampaign = () => (canCreateCampaign ? setShowSheet(true) : router.push('/brand/wallet'))

  // ── De făcut acum (în ordinea urgenței) ──
  const todos: Todo[] = []
  if (verification === 'rejected') todos.push({ key: 'verify-rej', title: 'Verificarea brandului a fost respinsă', sub: profile?.verification_rejection_reason ? `Motiv: ${profile.verification_rejection_reason}` : 'Actualizează detaliile și retrimite', href: '/brand/verify', cta: 'Retrimite', tone: 'danger', icon: XCircle })
  if (reviewQueue.length > 0) todos.push({ key: 'review', title: `${plural(reviewQueue.length, 'postare', 'postări')} de aprobat`, sub: campaignNames(reviewQueue), href: '/brand/collaborations?tab=review', cta: 'Revizuiește', tone: 'primary', icon: Eye })
  if (newApplications.length > 0) todos.push({ key: 'apps', title: `${plural(newApplications.length, 'aplicare nouă', 'aplicări noi')}`, sub: campaignNames(newApplications), href: '/brand/collaborations?tab=applied', cta: 'Alege creatori', tone: 'blue', icon: UserPlus })
  closingSoon.slice(0, 2).forEach(({ c, d }) => {
    const taken = collabs.filter(x => x.campaign_id === c.id && isSelected(x)).length
    todos.push({ key: 'close-' + c.id, title: `${c.title} se închide ${d === 0 ? 'azi' : d === 1 ? 'mâine' : `în ${d} zile`}`, sub: c.max_influencers ? `${taken} din ${c.max_influencers} locuri ocupate` : `${plural(taken, 'creator selectat', 'creatori selectați')}`, href: `/brand/campaigns/${c.id}`, cta: 'Vezi campania', tone: 'warn', icon: Clock })
  })
  if (draftCampaigns.length > 0) todos.push({ key: 'drafts', title: `${plural(draftCampaigns.length, 'campanie', 'campanii')} în draft`, sub: 'Nu sunt vizibile pentru influenceri până le publici', href: '/brand/campaigns', cta: 'Publică', tone: 'warn', icon: FileText })
  if (verification === 'unverified') todos.push({ key: 'verify', title: 'Verifică-ți brandul', sub: 'Ai nevoie de verificare ca influencerii să vadă campaniile', href: '/brand/verify', cta: 'Începe', tone: 'neutral', icon: ShieldCheck })
  if (campaigns.length === 0) todos.push({ key: 'first', title: 'Creează prima campanie', sub: canCreateCampaign ? 'Gata în 5 minute, cu ghidul pas cu pas' : 'Adaugă minimum 250 RON în portofel pentru acces', onClick: openNewCampaign, cta: canCreateCampaign ? 'Începe' : 'Adaugă credite', tone: 'neutral', icon: Plus })
  if (creditsBalance + totalSpent <= 0) todos.push({ key: 'wallet', title: 'Adaugă credite în portofel', sub: 'Din ele plătești colaborările cu creatorii', href: '/brand/wallet', cta: 'Adaugă', tone: 'neutral', icon: WalletIcon })
  if (!(profile?.logo || profile?.description)) todos.push({ key: 'profile', title: 'Completează profilul brandului', sub: 'Logo și descriere — creatorii aplică mai ușor la branduri complete', href: '/brand/settings', cta: 'Completează', tone: 'neutral', icon: ShieldCheck })
  if (verification === 'pending') todos.push({ key: 'verify-pending', title: 'Verificarea brandului e în analiză', sub: 'De obicei durează până la 24 de ore', href: '/brand/verify', cta: 'Vezi statusul', tone: 'blue', icon: Clock })
  const actionCount = todos.filter(t => t.key !== 'verify-pending').length

  // ── Campanii cu traseu ──
  const pipelineCampaigns = activeCampaigns.slice(0, 4).map(c => {
    const list = collabs.filter(x => x.campaign_id === c.id)
    const applied = list.filter(x => x.status !== 'INVITED').length
    const selected = list.filter(isSelected)
    const posted = list.filter(hasPosted).length
    const approved = list.filter(isApproved).length
    const review = list.filter(awaitsReview).length
    const pending = list.filter(x => x.status === 'PENDING').length
    const slots = c.max_influencers || 0
    return { c, applied, selected, posted, approved, review, pending, slots }
  })
  const otherCampaigns = [...draftCampaigns, ...completedCampaigns].slice(0, 3)

  // ── Activitate recentă ──
  const events: { at: string; inf: any; what: string; camp: string }[] = []
  collabs.forEach(c => {
    const camp = campById[c.campaign_id]?.title || ''
    if (c.deliverable_approved_at) events.push({ at: c.deliverable_approved_at, inf: c.influencer, what: 'are postarea aprobată', camp })
    if (c.deliverable_submitted_at && !c.deliverable_approved_at) events.push({ at: c.deliverable_submitted_at, inf: c.influencer, what: 'a trimis postarea pentru aprobare', camp })
    if (c.package_received_at) events.push({ at: c.package_received_at, inf: c.influencer, what: 'a primit produsul', camp })
    if (c.created_at) events.push({ at: c.created_at, inf: c.influencer, what: c.status === 'INVITED' ? 'a primit invitația ta' : 'a aplicat', camp })
  })
  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
  const activity = events.slice(0, 6)

  // ── Rezultate ──
  const approvedPosts = collabs.filter(isApproved).length
  const creators = new Set(collabs.filter(isSelected).map(c => c.influencer_id)).size
  const launched = campaigns.filter(c => c.status !== 'DRAFT').length

  const today = new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })
  const todayLabel = today.charAt(0).toUpperCase() + today.slice(1)
  const reservedPct = creditsBalance > 0 ? Math.min(100, Math.round((creditsReserved / creditsBalance) * 100)) : 0

  return (
    <div className="bd">
      <style>{`
        .bd { padding: 28px; max-width: 1240px; margin: 0 auto; display: flex; flex-direction: column; gap: 22px; color: #14123a; font-family: var(--font-body, system-ui), system-ui, sans-serif; font-size: 15px; line-height: 1.5; }
        .bd h1, .bd h2, .bd .bd-num { font-family: var(--font-display, system-ui), system-ui, sans-serif; }
        .bd h1 { margin: 0; font-weight: 800; font-size: 34px; letter-spacing: -0.03em; line-height: 1.1; }
        .bd h2 { margin: 0; font-weight: 700; font-size: 19px; letter-spacing: -0.01em; }
        .bd-muted { color: #6a6690; }
        .bd-card { background: #fff; border: 1px solid #e5e3f3; border-radius: 20px; min-width: 0; }
        .bd-hello { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 16px; }
        .bd-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 46px; padding: 0 18px; border-radius: 12px; font-weight: 700; font-size: 15px; text-decoration: none; cursor: pointer; border: 1.5px solid #d8d5ec; background: #fff; color: #14123a; transition: border-color .15s, background .15s, transform .15s; white-space: nowrap; font-family: inherit; }
        .bd-btn:hover { border-color: #b9aef0; background: #faf9ff; }
        .bd-btn-main { border: 0; background: #5a35e6; color: #fff; font-weight: 800; box-shadow: 0 10px 22px -10px rgba(90,53,230,.7); }
        .bd-btn-main:hover { background: #4a27d4; }
        .bd-btn-sm { height: 40px; padding: 0 16px; border-radius: 10px; font-size: 14px; }
        .bd-top { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 18px; align-items: start; }
        .bd-bottom { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 18px; align-items: start; }
        .bd-todo { list-style: none; margin: 0; padding: 0 10px 10px; display: flex; flex-direction: column; gap: 4px; }
        .bd-todo li { display: flex; align-items: center; gap: 14px; padding: 12px; border-radius: 14px; }
        .bd-todo li.hot { background: #f7f4ff; }
        .bd-ico { width: 42px; height: 42px; flex: none; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .bd-todo-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .bd-todo-txt span { font-size: 13px; color: #6a6690; overflow-wrap: anywhere; }
        .bd-wallet { position: relative; overflow: hidden; background: #14123a; color: #fff; border-radius: 20px; padding: 22px; display: flex; flex-direction: column; gap: 16px; }
        .bd-wallet-glow { position: absolute; right: -70px; top: -90px; width: 240px; height: 240px; border-radius: 50%; background: linear-gradient(135deg, #22c8f0, #7040f0); opacity: .35; filter: blur(40px); pointer-events: none; }
        .bd-wallet > *:not(.bd-wallet-glow) { position: relative; }
        .bd-camp { padding: 20px 22px; display: flex; flex-direction: column; gap: 18px; }
        .bd-camp-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
        .bd-pill { font-size: 12px; font-weight: 800; padding: 5px 10px; border-radius: 999px; white-space: nowrap; }
        .bd-pipe { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .bd-stage { display: flex; flex-direction: column; gap: 10px; padding-right: 12px; }
        .bd-stage-top { display: flex; align-items: center; gap: 8px; }
        .bd-dot { width: 28px; height: 28px; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; }
        .bd-line { flex: 1; height: 3px; border-radius: 3px; }
        .bd-stage .bd-num { font-weight: 800; font-size: 26px; line-height: 1.1; font-variant-numeric: tabular-nums; }
        .bd-stage-lbl { font-size: 13px; font-weight: 600; color: #6a6690; }
        .bd-bar { height: 8px; border-radius: 999px; background: #eeecf7; overflow: hidden; }
        .bd-bar span { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #22c8f0, #3090f0, #7040f0); }
        .bd-faces { display: flex; align-items: center; padding-left: 8px; }
        .bd-faces .bd-face { margin-left: -8px; }
        .bd-face { border-radius: 50%; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; overflow: hidden; flex: none; }
        .bd-face img { width: 100%; height: 100%; object-fit: cover; }
        .bd-ring { flex: none; border-radius: 50%; padding: 2px; box-sizing: border-box; background: linear-gradient(135deg, #22c8f0, #7040f0); display: inline-flex; }
        .bd-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 12px; padding: 14px 22px; border-radius: 16px; border: 1px dashed #d8d5ec; color: #4a4770; text-decoration: none; }
        .bd-row:hover { border-color: #b9aef0; background: #fff; }
        .bd-feed { list-style: none; margin: 0; padding: 0; }
        .bd-feed li { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-bottom: 1px solid #f1f0f8; }
        .bd-feed li:last-child { border-bottom: 0; }
        .bd-tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .bd-tile { background: #f6f6fc; border-radius: 14px; padding: 14px; }
        .bd-tile .bd-num { display: block; font-weight: 800; font-size: 26px; font-variant-numeric: tabular-nums; line-height: 1.2; }
        .bd-tile span:last-child { font-size: 13px; color: #6a6690; font-weight: 600; }
        .bd-link { font-weight: 700; font-size: 14px; color: #5a35e6; text-decoration: none; }
        .bd-link:hover { color: #4423c4; text-decoration: underline; }
        .bd-empty { padding: 28px 22px; text-align: center; color: #6a6690; }
        @keyframes bdUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
        .bd > section { animation: bdUp .35s ease both; }
        .bd > section:nth-of-type(2) { animation-delay: .04s } .bd > section:nth-of-type(3) { animation-delay: .08s } .bd > section:nth-of-type(4) { animation-delay: .12s }
        @media (prefers-reduced-motion: reduce) { .bd > section { animation: none } }
        @media (max-width: 1023px) {
          .bd-top, .bd-bottom { grid-template-columns: minmax(0, 1fr); }
        }
        @media (max-width: 640px) {
          .bd { padding: 20px 16px 96px; gap: 18px; }
          .bd h1 { font-size: 28px; }
          .bd h2 { font-size: 18px; }
          .bd-hello-btns { width: 100%; }
          .bd-hello-btns .bd-btn { flex: 1; }
          .bd-hello-btns .bd-btn-sec { display: none; }
          .bd-todo { padding: 0 8px 8px; gap: 2px; }
          .bd-todo li { flex-wrap: wrap; gap: 12px; }
          .bd-todo li .bd-ico { width: 40px; height: 40px; }
          .bd-todo li .bd-btn { width: 100%; height: 44px; }
          .bd-todo li:not(.hot) .bd-btn { display: none; }
          .bd-todo li:not(.hot) { position: relative; }
          .bd-todo li:not(.hot) .bd-todo-chev { display: block; }
          .bd-wallet { padding: 18px; }
          .bd-camp { padding: 16px; gap: 14px; }
          .bd-pipe { background: #f6f6fc; border-radius: 14px; padding: 12px 6px; }
          .bd-stage { padding-right: 0; align-items: center; text-align: center; gap: 6px; }
          .bd-stage-top .bd-dot { width: 24px; height: 6px; border-radius: 999px; font-size: 0; }
          .bd-stage-top .bd-line { display: none; }
          .bd-stage .bd-num { font-size: 22px; line-height: 1; }
          .bd-stage-lbl { font-size: 12px; line-height: 1.2; }
          .bd-row { padding: 14px 16px; }
          .bd-tile .bd-num { font-size: 24px; }
        }
        .bd-todo-chev { display: none; }
        .bd a.bd-link, .bd a.bd-tlink, .bd a.bd-pill { min-height: 0; }
        .bd-meta { font-size: 13px; color: #6a6690; }
        .bd-ago-m { display: none; }
        @media (max-width: 640px) { .bd-ago { display: none; } .bd-ago-m { display: inline; } .bd-feed li { align-items: flex-start; } }
        .bd-todo-stretch { position: absolute; inset: 0; border-radius: 14px; min-height: 0 !important; }
      `}</style>

      {/* SALUT */}
      <section className="bd-hello">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="bd-muted" style={{ fontSize: 13, fontWeight: 600 }}>{todayLabel}</span>
          <h1>Bună, {profile?.name || 'brand'}.</h1>
          <p style={{ margin: 0, color: '#4a4770' }}>
            {actionCount > 0
              ? <>Ai <b style={{ color: '#5a35e6' }}>{actionCount === 1 ? 'un lucru' : `${actionCount} lucruri`}</b> care așteaptă după tine azi.</>
              : 'Totul e la zi. Campaniile tale merg mai departe.'}
          </p>
        </div>
        <div className="bd-hello-btns" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Link href="/brand/wallet" className="bd-btn bd-btn-sec"><Plus className="w-4 h-4" /> Adaugă credite</Link>
          <button type="button" onClick={openNewCampaign} className="bd-btn bd-btn-main" title={canCreateCampaign ? undefined : 'Ai nevoie de minimum 250 RON pentru a crea campanii'}>
            {canCreateCampaign ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4" />} Campanie nouă
          </button>
        </div>
      </section>

      {/* DE FĂCUT + PORTOFEL */}
      <section className="bd-top">
        <div className="bd-card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '18px 22px 12px' }}>
            <h2>De făcut acum</h2>
            {todos.length > 0
              ? <span className="bd-muted" style={{ fontSize: 13, fontWeight: 600 }}>în ordinea urgenței</span>
              : null}
          </div>
          {todos.length === 0 ? (
            <div className="bd-empty" style={{ paddingTop: 8 }}>
              <div className="bd-ico" style={{ margin: '0 auto 10px', background: '#e3f6ec', color: '#166534' }}><CheckCircle2 className="w-5 h-5" /></div>
              <b style={{ color: '#14123a' }}>Nimic de rezolvat acum.</b>
              <p style={{ margin: '2px 0 0', fontSize: 14 }}>Te anunțăm aici când un creator aplică sau trimite o postare.</p>
            </div>
          ) : (
            <ol className="bd-todo">
              {todos.slice(0, 5).map((t, i) => {
                const hot = t.tone === 'primary' || t.tone === 'danger'
                const tone = TONES[t.tone]
                const Icon = t.icon
                const btnClass = `bd-btn bd-btn-sm ${hot ? 'bd-btn-main' : ''}`
                return (
                  <li key={t.key} className={hot ? 'hot' : ''} style={hot && t.tone === 'danger' ? { background: '#fff6f5' } : undefined}>
                    <span className="bd-ico" style={{ background: tone.bg, color: tone.fg }}><Icon className="w-5 h-5" /></span>
                    <span className="bd-todo-txt"><b>{t.title}</b>{t.sub && <span>{t.sub}</span>}</span>
                    {t.href
                      ? <Link href={t.href} className={btnClass} style={hot && t.tone === 'danger' ? { background: '#b42318', boxShadow: 'none' } : undefined}>{t.cta}</Link>
                      : <button type="button" onClick={t.onClick} className={btnClass}>{t.cta}</button>}
                    {!hot && (t.href
                      ? <Link href={t.href} className="bd-todo-stretch bd-todo-chev" aria-label={t.cta} />
                      : <button type="button" onClick={t.onClick} className="bd-todo-stretch bd-todo-chev" aria-label={t.cta} style={{ background: 'transparent', border: 0 }} />)}
                    {!hot && <ChevronRight className="bd-todo-chev w-[18px] h-[18px] flex-none" style={{ color: '#a3a0bf' }} />}
                  </li>
                )
              })}
            </ol>
          )}
        </div>

        <div className="bd-wallet">
          <span className="bd-wallet-glow" aria-hidden="true" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#b9b5dc' }}>Portofel</span>
            <Link href="/brand/wallet" className="bd-tlink" style={{ fontSize: 13, fontWeight: 700, color: '#c9bdff', textDecoration: 'none' }}>Istoric</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 13, color: '#b9b5dc' }}>Disponibil pentru campanii</span>
            <span className="bd-num" style={{ fontFamily: 'var(--font-display, system-ui), system-ui, sans-serif', fontWeight: 800, fontSize: 40, letterSpacing: '-0.02em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
              {num(available)} <span style={{ fontSize: 20, color: '#b9b5dc' }}>RON</span>
            </span>
          </div>
          {creditsBalance > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.12)', overflow: 'hidden', display: 'flex' }}>
                <span style={{ width: `${100 - reservedPct}%`, background: 'linear-gradient(90deg, #22c8f0, #7040f0)' }} />
                <span style={{ width: `${reservedPct}%`, background: '#f0a35a' }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 4, fontSize: 13, color: '#c9c5e8', fontVariantNumeric: 'tabular-nums' }}>
                <span>Total {num(creditsBalance)} RON</span>
                {creditsReserved > 0 && <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f0a35a', marginRight: 6 }} />{num(creditsReserved)} RON rezervat</span>}
              </div>
            </div>
          )}
          {creditsBalance <= 0 && <p style={{ margin: 0, fontSize: 13, color: '#c9c5e8' }}>Adaugă credite ca să poți lansa campanii și plăti creatorii.</p>}
          <Link href="/brand/wallet" style={{ height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, background: '#fff', color: '#14123a', fontWeight: 800, textDecoration: 'none' }}>
            <Plus className="w-4 h-4" /> Adaugă credite
          </Link>
        </div>
      </section>

      {/* CAMPANIILE TALE */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <h2 style={{ fontSize: 21 }}>Campaniile tale</h2>
          {campaigns.length > 0 && <Link href="/brand/campaigns" className="bd-link">Toate campaniile</Link>}
        </div>

        {campaigns.length === 0 && (
          <div className="bd-card bd-empty" style={{ padding: '36px 22px' }}>
            <div className="bd-ico" style={{ margin: '0 auto 12px', background: '#efeaff', color: '#5a35e6' }}><Rocket className="w-5 h-5" /></div>
            <b style={{ color: '#14123a', fontSize: 17 }}>Lansează prima ta campanie</b>
            <p style={{ margin: '4px auto 16px', fontSize: 14, maxWidth: 420 }}>Conectează-te cu creatori reali. Setezi campania în sub 5 minute.</p>
            <button type="button" onClick={openNewCampaign} className="bd-btn bd-btn-main">
              {canCreateCampaign ? <><Plus className="w-4 h-4" /> Creează campanie</> : <><Lock className="w-4 h-4" /> Adaugă 250 RON pentru acces</>}
            </button>
          </div>
        )}

        {pipelineCampaigns.map(({ c, applied, selected, posted, approved, review, pending, slots }) => {
          const type = TYPE_LABEL[c.campaign_type] || { label: 'Campanie', short: (c.title?.[0] || 'C').toUpperCase(), bg: '#efeaff', fg: '#4423c4' }
          const d = daysLeft(c.deadline)
          const paused = c.status === 'PAUSED'
          const deadline = d === null ? null : d < 0 ? { t: 'Termen depășit', bg: '#f0eff7', fg: '#4a4770' } : d <= 3 ? { t: d === 0 ? 'Se închide azi' : d === 1 ? 'Se închide mâine' : `Se închide în ${d} zile`, bg: '#fff1e6', fg: '#9a4206' } : { t: `${d} zile rămase`, bg: '#f0eff7', fg: '#4a4770' }
          const stages = [
            { v: applied, l: 'aplicări', hint: pending > 0 },
            { v: selected.length, l: 'selectați', hint: false },
            { v: posted, l: 'au postat', hint: review > 0 },
            { v: approved, l: 'aprobate', hint: false },
          ]
          const pct = slots > 0 ? Math.min(100, Math.round((selected.length / slots) * 100)) : 0
          const faces = selected.slice(0, 4).map(x => x.influencer || { id: x.influencer_id, name: '?' })
          return (
            <article key={c.id} className="bd-card bd-camp">
              <div className="bd-camp-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: '1 1 260px' }}>
                  <span className="bd-ico" style={{ width: 44, height: 44, background: type.bg, color: type.fg, fontWeight: 800, fontSize: 13 }}>{type.short}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <Link href={`/brand/campaigns/${c.id}`} className="bd-tlink" style={{ fontSize: 17, fontWeight: 700, color: '#14123a', textDecoration: 'none', lineHeight: 1.3, overflowWrap: 'anywhere' }}>{c.title}</Link>
                    <span className="bd-muted" style={{ fontSize: 13 }}>{type.label}{Array.isArray(c.platforms) && c.platforms.length > 0 ? ` · ${c.platforms.map((p: string) => PLATFORM[String(p).toLowerCase()] || p).join(', ')}` : ''}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                  <span className="bd-pill" style={paused ? { background: '#f0eff7', color: '#4a4770' } : { background: '#e3f6ec', color: '#166534' }}>{paused ? 'Pe pauză' : 'Activă'}</span>
                  {deadline && <span className="bd-pill" style={{ background: deadline.bg, color: deadline.fg }}>{deadline.t}</span>}
                  <Link href={`/brand/campaigns/${c.id}`} className="bd-btn bd-btn-sm" style={{ height: 38 }}>Deschide</Link>
                </div>
              </div>

              <div className="bd-pipe">
                {stages.map((s, i) => {
                  const on = s.v > 0
                  return (
                    <div key={s.l} className="bd-stage">
                      <div className="bd-stage-top">
                        <span className="bd-dot" style={s.hint ? { background: '#efeaff', color: '#4423c4', boxShadow: 'inset 0 0 0 2px #5a35e6' } : on ? { background: '#5a35e6', color: '#fff' } : { background: '#f0eff7', color: '#8783a8' }}>{i + 1}</span>
                        {i < 3 && <span className="bd-line" style={{ background: stages[i + 1].v > 0 ? '#5a35e6' : '#e5e3f3' }} />}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="bd-num">{s.v}</span>
                        <span className="bd-stage-lbl">{s.l}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {(review > 0 || pending > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {review > 0 && <Link href="/brand/collaborations?tab=review" className="bd-pill" style={{ background: '#efeaff', color: '#4423c4', textDecoration: 'none', minHeight: 0 }}>{plural(review, 'postare așteaptă', 'postări așteaptă')} aprobarea</Link>}
                  {pending > 0 && <Link href="/brand/collaborations?tab=applied" className="bd-pill" style={{ background: '#e6f0ff', color: '#1d4fb8', textDecoration: 'none', minHeight: 0 }}>{plural(pending, 'aplicare nouă', 'aplicări noi')}</Link>}
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
                {slots > 0 && (
                  <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, color: '#4a4770' }}>
                      <span>Locuri ocupate</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{selected.length} din {slots}</span>
                    </div>
                    <div className="bd-bar"><span style={{ width: `${pct}%` }} /></div>
                  </div>
                )}
                {faces.length > 0 && (
                  <div className="bd-faces">
                    {faces.map((f: any, i: number) => <Face key={(f.id || '') + i} inf={f} size={30} />)}
                    {selected.length > faces.length && <span className="bd-muted" style={{ marginLeft: 8, fontSize: 13, fontWeight: 600 }}>+{selected.length - faces.length}</span>}
                  </div>
                )}
                {faces.length === 0 && slots === 0 && <span className="bd-muted" style={{ fontSize: 13 }}>Încă niciun creator selectat.</span>}
              </div>
            </article>
          )
        })}

        {activeCampaigns.length > 4 && (
          <Link href="/brand/campaigns" className="bd-link" style={{ alignSelf: 'flex-start' }}>Încă {activeCampaigns.length - 4} campanii active</Link>
        )}

        {otherCampaigns.map(c => {
          const draft = c.status === 'DRAFT'
          const list = collabs.filter(x => x.campaign_id === c.id)
          return (
            <Link key={c.id} href={draft ? `/brand/campaigns/${c.id}` : `/brand/campaigns/${c.id}/report`} className="bd-row">
              <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                <b style={{ color: '#14123a' }}>{c.title}</b>
                {draft ? ' · draft, nepublicată' : ` · finalizată · ${plural(new Set(list.filter(isSelected).map(x => x.influencer_id)).size, 'creator', 'creatori')} · ${plural(list.filter(isApproved).length, 'postare aprobată', 'postări aprobate')}`}
              </span>
              <span style={{ fontWeight: 700, color: '#5a35e6' }}>{draft ? 'Continuă' : 'Vezi raportul'}</span>
            </Link>
          )
        })}
      </section>

      {/* ACTIVITATE + REZULTATE */}
      <section className="bd-bottom">
        <div className="bd-card" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <h2>Activitate recentă</h2>
            <Link href="/brand/collaborations" className="bd-link" style={{ fontSize: 13 }}>Colaborări</Link>
          </div>
          {activity.length === 0 ? (
            <p className="bd-muted" style={{ margin: '8px 0 4px', fontSize: 14 }}>Aici vezi ce fac creatorii în campaniile tale: aplicări, produse primite, postări trimise.</p>
          ) : (
            <ul className="bd-feed">
              {activity.map((a, i) => (
                <li key={i}>
                  <Face inf={a.inf || { name: '?' }} size={38} ring />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.4, display: 'flex', flexDirection: 'column', overflowWrap: 'anywhere' }}>
                    <span><b>{a.inf?.name || 'Un creator'}</b> {a.what}</span>
                    <span className="bd-meta">{a.camp}<span className="bd-ago-m">{a.camp ? ' · ' : ''}{timeAgo(a.at)}</span></span>
                  </span>
                  <span className="bd-ago" style={{ flex: 'none', fontSize: 12, color: '#8783a8', fontVariantNumeric: 'tabular-nums' }}>{timeAgo(a.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bd-card" style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2>Rezultate până acum</h2>
          <div className="bd-tiles">
            <div className="bd-tile"><span className="bd-num">{num(approvedPosts)}</span><span>postări aprobate</span></div>
            <div className="bd-tile"><span className="bd-num">{num(creators)}</span><span>creatori</span></div>
            <div className="bd-tile"><span className="bd-num">{num(launched)}</span><span>campanii</span></div>
            <div className="bd-tile"><span className="bd-num">{num(totalSpent)}</span><span>RON investiți</span></div>
          </div>
          <Link href="/brand/analytics" className="bd-link">Vezi analizele complete</Link>
        </div>
      </section>

      {/* Alegerea tipului de campanie */}
      {showSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center" onClick={() => setShowSheet(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md px-4 pt-4 pb-10 sm:pb-5" onClick={e => e.stopPropagation()} role="dialog" aria-label="Campanie nouă">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />
            <div className="flex items-center justify-between mb-4 px-1">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6a6690' }}>Cum vrei să creezi campania?</p>
              <button onClick={() => setShowSheet(false)} aria-label="Închide" className="w-8 h-8 rounded-full flex items-center justify-center transition" style={{ background: '#f0eff7', minHeight: 0 }}>
                <X className="w-4 h-4" style={{ color: '#4a4770' }} />
              </button>
            </div>
            <button onClick={() => { setShowSheet(false); router.push('/brand/campaigns/new/wizard') }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl transition mb-3 text-left group" style={{ border: '2px solid #cfc4fb', background: '#f7f4ff' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-white" style={{ background: 'linear-gradient(135deg,#2f6fe0,#5a35e6)' }}><Rocket className="w-6 h-6" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <p className="font-black text-base" style={{ color: '#14123a' }}>Rapid — ghid pas cu pas</p>
                  <span className="text-[10px] font-black text-white px-2 py-0.5 rounded-full" style={{ background: '#5a35e6' }}>RECOMANDAT</span>
                </div>
                <p className="text-sm mt-0.5" style={{ color: '#6a6690' }}>Gata în 5 minute</p>
              </div>
              <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: '#a3a0bf' }} />
            </button>
            <p className="text-xs text-center mb-3 font-medium" style={{ color: '#8783a8' }}>sau alege tipul manual</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowSheet(false); router.push('/brand/campaigns/new/barter') }}
                className="flex-1 flex items-center gap-3 p-3.5 rounded-2xl transition text-left hover:bg-violet-50" style={{ border: '2px solid #eeecf7' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#efeaff', color: '#4423c4' }}><Gift className="w-5 h-5" /></div>
                <div className="min-w-0"><p className="font-black text-sm" style={{ color: '#14123a' }}>Barter</p><p className="text-xs" style={{ color: '#6a6690' }}>Produs gratuit</p></div>
              </button>
              <button onClick={() => { setShowSheet(false); router.push('/brand/campaigns/new') }}
                className="flex-1 flex items-center gap-3 p-3.5 rounded-2xl transition text-left hover:bg-violet-50" style={{ border: '2px solid #eeecf7' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#e6f0ff', color: '#1d4fb8' }}><Banknote className="w-5 h-5" /></div>
                <div className="min-w-0"><p className="font-black text-sm" style={{ color: '#14123a' }}>Plătită</p><p className="text-xs" style={{ color: '#6a6690' }}>Plată per postare</p></div>
              </button>
            </div>
          </div>
        </div>
      )}

      <AIAssistant />
    </div>
  )
}
