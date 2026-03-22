'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NotificationsBell } from '@/components/shared/notifications-bell'
import {
  LayoutDashboard, Briefcase, Zap, MessageSquare,
  Wallet, Settings, LogOut, Menu, X, User, ChevronRight,
  Star, Award, Building2, CreditCard, AlertCircle, Check, Copy, ArrowLeft, Shield, BarChart2, FileText
} from 'lucide-react'
const BADGE_PRICE = 50 // RON

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/influencer/dashboard' },
  { icon: Briefcase, label: 'Campaigns', href: '/influencer/campaigns' },
  { icon: Zap, label: 'Collaborations', href: '/influencer/collaborations' },
  { icon: MessageSquare, label: 'Inbox', href: '/influencer/inbox' },
  { icon: Wallet, label: 'Wallet', href: '/influencer/wallet' },
  { icon: BarChart2, label: 'Calculator ER', href: '/influencer/engagement-calculator' },
  { icon: User, label: 'Profile', href: '/influencer/profile' },
  { icon: FileText, label: 'Media Kit', href: '/influencer/media-kit' },
  { icon: Shield, label: 'Verificare ID', href: '/influencer/verify' },
  { icon: Settings, label: 'Settings', href: '/influencer/settings' },
]

export default function InfluencerLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [profile, setProfile] = useState<{ name: string; avatar: string | null; is_verified: boolean; wallet_balance: number; badge_expires_at?: string | null } | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  // Badge modal state
  const [badgeModal, setBadgeModal] = useState<null | 'choose' | 'wallet_confirm' | 'bank_form' | 'bank_instructions' | 'success'>(null)
  const [badgeLoading, setBadgeLoading] = useState(false)
  const [badgeError, setBadgeError] = useState<string | null>(null)
  const [invoiceData, setInvoiceData] = useState<{ invoiceNumber: string; amount: number } | null>(null)
  const [billingName, setBillingName] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    const check = () => {
      const isMobile = window.innerWidth < 768
      setMobile(isMobile)
      if (isMobile) setOpen(false)
      else setOpen(true)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      sb.from('influencers')
        .select('name, avatar, is_verified, wallet_balance, badge_expires_at')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile({
            name: data.name || 'Creator',
            avatar: data.avatar || null,
            is_verified: data.is_verified && data.badge_expires_at && new Date(data.badge_expires_at) > new Date() || false,
            wallet_balance: data.wallet_balance || 0,
          })
        })
    })
  }, [])

  const logout = async () => {
    await createClient().auth.signOut()
    router.replace('/auth/login')
  }



  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const initial = profile?.name?.[0]?.toUpperCase() || '?'

  function closeBadgeModal() {
    setBadgeModal(null)
    setBadgeLoading(false)
    setBadgeError(null)
    setBillingName('')
    setBillingAddress('')
    setInvoiceData(null)
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleWalletPurchase() {
    setBadgeError(null)
    setBadgeLoading(true)
    try {
      const res = await fetch('/api/badge/wallet', { method: 'POST' })
      const result = await res.json()
      if (!res.ok || result.error) { setBadgeError(result.error || 'Purchase failed'); return }
      setProfile(prev => prev ? { ...prev, is_verified: true, wallet_balance: prev.wallet_balance - BADGE_PRICE } : prev)
      setBadgeModal('success')
    } catch (e: any) {
      setBadgeError(e.message || 'Purchase failed')
    } finally {
      setBadgeLoading(false)
    }
  }

  async function handleBankTransfer() {
    if (!billingName.trim()) { setBadgeError('Introdu numele pentru factură.'); return }
    setBadgeError(null)
    setBadgeLoading(true)
    try {
      const res = await fetch('/api/badge/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingName, billingAddress }),
      })
      const result = await res.json()
      if (!res.ok || result.error) { setBadgeError(result.error || 'Failed'); return }
      setInvoiceData({ invoiceNumber: result.invoiceNumber, amount: result.amount })
      setBadgeModal('bank_instructions')
    } catch (e: any) {
      setBadgeError(e.message || 'Failed')
    } finally {
      setBadgeLoading(false)
    }
  }

  const walletBalance = profile?.wallet_balance || 0

  return (
    <div className="flex h-screen bg-gray-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .infl-grad { background: linear-gradient(135deg, #8b5cf6, #06b6d4); }
        .nav-active { background: linear-gradient(135deg, rgba(139,92,246,0.12), rgba(6,182,212,0.08)); color: #7c3aed; }
        .nav-active .nav-icon { color: #8b5cf6; }
        .nav-item { display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:14px;transition:all .15s;cursor:pointer;text-decoration:none;color:#6b7280;font-weight:600;font-size:14px; }
        .nav-item:hover:not(.nav-active) { background:#f3f0ff;color:#7c3aed; }
        .nav-item:hover:not(.nav-active) .nav-icon { color:#8b5cf6; }
        .nav-icon { width:18px;height:18px;flex-shrink:0;color:#9ca3af;transition:color .15s; }
        .sidebar-shadow { box-shadow: 4px 0 24px rgba(0,0,0,0.04); }
        .collapse-btn { display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9px;background:#f3f4f6;border:none;cursor:pointer;transition:background .15s;flex-shrink:0; }
        .collapse-btn:hover { background:#ede9fe; }
        .topbar-search { flex:1;padding:9px 14px 9px 40px;border:2px solid #f0f0f0;border-radius:12px;font-size:14px;font-family:inherit;font-weight:500;outline:none;background:white;transition:border-color .2s; }
        .topbar-search:focus { border-color:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,0.08); }
        .topbar-search::placeholder { color:#9ca3af;font-weight:400; }
        .icon-btn { display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:12px;background:white;border:1.5px solid #f0f0f0;cursor:pointer;transition:all .15s;color:#6b7280; }
        .icon-btn:hover { border-color:#ddd6fe;color:#7c3aed;background:#faf5ff; }
        @keyframes slideIn { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:translateX(0)} }
        @keyframes badgePulse { 0%,100%{box-shadow:0 0 0 0 rgba(251,191,36,0.4)} 50%{box-shadow:0 0 0 6px rgba(251,191,36,0)} }
        .sidebar-anim { animation: slideIn .3s ease; }
        .mobile-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);z-index:40; }
        .badge-pulse { animation: badgePulse 2.5s ease-in-out infinite; }
      `}</style>

      {mobile && open && <div className="mobile-overlay" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={`sidebar-shadow flex flex-col bg-white transition-all duration-300 overflow-hidden flex-shrink-0
          ${mobile
            ? `fixed left-0 top-0 h-full z-50 sidebar-anim transform ${open ? 'translate-x-0 w-64' : '-translate-x-full w-64 pointer-events-none'}`
            : `${open ? 'relative w-64' : 'relative w-[72px]'}`
          }`}
        style={{ borderRight: '1.5px solid #f0f0f0' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-16 flex-shrink-0" style={{ borderBottom: '1.5px solid #f5f5f5' }}>
          <div className={`flex items-center gap-2.5 ${!open ? 'justify-center w-full' : ''}`}>
            <div className="w-8 h-8 infl-grad rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ boxShadow: '0 3px 10px rgba(139,92,246,0.35)' }}>
              <img src="/logo.png" alt="AddFame" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            {open && <span className="font-black text-base tracking-tight text-gray-900">Add<span className="text-purple-500">Fame</span></span>}
          </div>
          {open && !mobile && (
            <button className="collapse-btn" onClick={() => setOpen(false)}>
              <ChevronRight className="w-3.5 h-3.5 text-gray-500 rotate-180" />
            </button>
          )}
          {mobile && open && (
            <button className="collapse-btn" onClick={() => setOpen(false)}>
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" style={{ scrollbarWidth: 'none' }}>
          {open && <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest px-3 mb-3">Creator</p>}

          {NAV.map(item => {
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href}
                className={`nav-item ${active ? 'nav-active' : ''} ${!open ? 'justify-center px-0' : ''}`}
                title={!open ? item.label : undefined}
                onClick={() => mobile && setOpen(false)}
              >
                <item.icon className={`nav-icon ${active ? 'text-purple-500' : ''}`} />
                {open && <span>{item.label}</span>}
                {open && active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500" />}
              </Link>
            )
          })}

          {/* ── Verified Creator Banner ─────────────────────────────── */}
          {profile !== null && !profile.is_verified && (
            <div className="pt-3 mt-2" style={{ borderTop: '1.5px solid #f5f5f5' }}>
              {open ? (
                <button
                  onClick={() => { setBadgeModal('choose'); setBadgeError(null) }}
                  className="badge-pulse w-full rounded-2xl p-3.5 text-left transition hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 4px 16px rgba(251,191,36,0.35)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-white fill-white flex-shrink-0" />
                    <span className="text-white font-black text-xs uppercase tracking-wide">Verified Creator</span>
                  </div>
                  <p className="text-white/90 text-[11px] leading-relaxed font-medium mb-2.5">
                    Apari primul în lista brandurilor și îți crești șansele de colaborare.
                  </p>
                  <div className="bg-white/20 rounded-lg px-3 py-1.5 flex items-center justify-between">
                    <span className="text-white font-black text-xs">Activează acum</span>
                    <span className="text-white font-black text-sm">{BADGE_PRICE} RON/lună</span>
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => { setBadgeModal('choose'); setBadgeError(null) }}
                  className="badge-pulse relative w-full flex justify-center py-2"
                  title="Verified Creator — 50 RON/lună"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}>
                    <Star className="w-4 h-4 text-white fill-white" />
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                </button>
              )}
            </div>
          )}

          {/* Already verified — small badge in sidebar */}
          {profile?.is_verified && open && (
            <div className="pt-3 mt-2" style={{ borderTop: '1.5px solid #f5f5f5' }}>
              <div className="flex flex-col gap-1 px-3 py-2 rounded-xl bg-amber-50">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400 flex-shrink-0" />
                  <span className="text-xs font-black text-amber-700">Verified Creator</span>
                  <Check className="w-3.5 h-3.5 text-amber-500 ml-auto" />
                </div>
                {profile?.badge_expires_at && (
                  <span className="text-[10px] text-amber-500 font-semibold">
                    Expiră {new Date(profile.badge_expires_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
            </div>
          )}
        </nav>

        {/* User footer */}
        <div style={{ borderTop: '1.5px solid #f5f5f5' }} className="p-3 flex-shrink-0">
          {open ? (
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-xl infl-grad flex items-center justify-center overflow-hidden flex-shrink-0" style={{ boxShadow: '0 2px 8px rgba(139,92,246,0.3)' }}>
                {profile?.avatar
                  ? <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                  : <span className="text-white font-black text-sm">{initial}</span>
                }
                {profile?.is_verified && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center">
                    <Star className="w-2 h-2 text-white fill-white" />
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-black text-gray-900 truncate">{profile?.name || '…'}</p>
                  {profile?.is_verified && <Star className="w-3 h-3 text-amber-500 fill-amber-400 flex-shrink-0" />}
                </div>
                <p className="text-xs text-gray-400 font-medium">Creator</p>
              </div>
              <button onClick={logout} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition flex-shrink-0" title="Logout">
                <LogOut className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-9 h-9 rounded-xl infl-grad flex items-center justify-center overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(139,92,246,0.3)' }}>
                {profile?.avatar
                  ? <img src={profile.avatar} alt={profile?.name} className="w-full h-full object-cover" />
                  : <span className="text-white font-black text-sm">{initial}</span>
                }
                {profile?.is_verified && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center">
                    <Star className="w-2 h-2 text-white fill-white" />
                  </span>
                )}
              </div>
              <button onClick={logout} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50 flex items-center justify-center transition" title="Logout">
                <LogOut className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 bg-white flex-shrink-0 flex items-center justify-between px-5 gap-4" style={{ borderBottom: '1.5px solid #f0f0f0' }}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {(!open || mobile) && (
              <button className="icon-btn flex-shrink-0" onClick={() => setOpen(true)}>
                <Menu className="w-4 h-4" />
              </button>
            )}
            <div className="relative flex-1 max-w-sm hidden sm:block">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input className="topbar-search" placeholder="Search campaigns…" />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Badge CTA in topbar for mobile */}
            {profile !== null && !profile.is_verified && (
              <button
                onClick={() => { setBadgeModal('choose'); setBadgeError(null) }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black text-white badge-pulse"
                style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 2px 8px rgba(251,191,36,0.4)' }}
              >
                <Star className="w-3.5 h-3.5 fill-white" /> Verified — {BADGE_PRICE} RON/lună
              </button>
            )}
            <NotificationsBell accentColor="#8b5cf6" />
            <Link href="/influencer/profile">
              <div className="w-9 h-9 rounded-xl infl-grad flex items-center justify-center overflow-hidden cursor-pointer" style={{ boxShadow: '0 2px 8px rgba(139,92,246,0.25)' }}>
                {profile?.avatar
                  ? <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                  : <span className="text-white font-black text-sm">{initial}</span>
                }
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>

      {/* ── Badge Purchase Modal ─────────────────────────────────────────────── */}
      {badgeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {(badgeModal === 'bank_form' || badgeModal === 'wallet_confirm') && (
                  <button onClick={() => { setBadgeModal('choose'); setBadgeError(null) }} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 mr-1">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}>
                  <Star className="w-4 h-4 text-white fill-white" />
                </div>
                <h2 className="font-black text-base text-gray-900">
                  {badgeModal === 'choose' && 'Verified Creator — ' + BADGE_PRICE + ' RON/lună'}
                  {badgeModal === 'wallet_confirm' && 'Plată din wallet'}
                  {badgeModal === 'bank_form' && 'Transfer bancar'}
                  {badgeModal === 'bank_instructions' && 'Instrucțiuni transfer'}
                  {badgeModal === 'success' && 'Felicitări! 🎉'}
                </h2>
              </div>
              <button onClick={closeBadgeModal} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">

              {/* STEP 1: Alege metoda */}
              {badgeModal === 'choose' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 mb-4">
                    Plătești <strong className="text-gray-900">{BADGE_PRICE} RON/lună</strong>. Profilul tău apare primul la branduri cât timp abonamentul e activ.
                  </p>

                  <button
                    onClick={() => { setBadgeError(null); setBadgeModal('wallet_confirm') }}
                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition text-left group"
                  >
                    <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-gray-900">Din wallet</p>
                      <p className="text-xs text-gray-500">
                        {walletBalance >= BADGE_PRICE
                          ? <span className="text-green-600 font-semibold">Disponibil: {walletBalance.toLocaleString('ro-RO')} RON ✓</span>
                          : <span className="text-red-500">Insuficient — ai {walletBalance.toLocaleString('ro-RO')} RON</span>
                        }
                      </p>
                    </div>
                    {walletBalance >= BADGE_PRICE && (
                      <span className="text-xs font-black text-green-700 bg-green-100 px-2 py-1 rounded-lg">Instant</span>
                    )}
                  </button>

                  <button
                    onClick={() => { setBadgeError(null); setBadgeModal('bank_form') }}
                    className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition text-left group"
                  >
                    <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-gray-900">Transfer bancar</p>
                      <p className="text-xs text-gray-500">SEPA / SWIFT — confirmare în 1-3 zile</p>
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">Manual</span>
                  </button>

                  <div className="w-full flex items-center gap-4 p-4 border-2 border-dashed border-gray-200 rounded-xl opacity-50 cursor-not-allowed">
                    <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-gray-900">Card online (Stripe)</p>
                      <p className="text-xs text-gray-500">Visa, Mastercard — instant</p>
                    </div>
                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">În curând</span>
                  </div>
                </div>
              )}

              {/* STEP 2a: Wallet confirm */}
              {badgeModal === 'wallet_confirm' && (
                <div className="space-y-4">
                  <div className="rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>
                    <Star className="w-10 h-10 mx-auto mb-2 text-amber-500 fill-amber-400" />
                    <p className="font-black text-lg text-amber-800">Verified Creator</p>
                    <p className="text-sm text-amber-600">Abonament lunar · anulezi oricând</p>
                  </div>

                  <div className="space-y-2 bg-gray-50 rounded-xl p-4">
                    {[
                      { label: 'Preț badge', value: `\${BADGE_PRICE} RON` },
                      { label: 'Wallet înainte', value: `${walletBalance.toLocaleString('ro-RO')} RON` },
                      { label: 'Wallet după', value: `${(walletBalance - BADGE_PRICE).toLocaleString('ro-RO')} RON`, bold: true },
                    ].map(r => (
                      <div key={r.label} className="flex justify-between text-sm py-1 border-b border-gray-200 last:border-0">
                        <span className="text-gray-500">{r.label}</span>
                        <span className={r.bold ? 'font-black text-purple-600' : 'font-semibold text-gray-900'}>{r.value}</span>
                      </div>
                    ))}
                  </div>

                  {badgeError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" /> {badgeError}
                    </div>
                  )}

                  <button
                    onClick={handleWalletPurchase}
                    disabled={badgeLoading || walletBalance < BADGE_PRICE}
                    className="w-full py-3.5 rounded-xl font-black text-sm text-white disabled:opacity-50 transition flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 4px 16px rgba(251,191,36,0.4)' }}
                  >
                    {badgeLoading
                      ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Processing…</>
                      : <><Star className="w-4 h-4 fill-white" /> Confirmă — {BADGE_PRICE} RON din wallet</>
                    }
                  </button>
                </div>
              )}

              {/* STEP 2b: Bank form */}
              {badgeModal === 'bank_form' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">Generăm o factură. Transferi {BADGE_PRICE} RON în contul AddFame și badge-ul se activează după confirmare.</p>

                  <div>
                    <label className="block text-xs font-black text-gray-500 mb-1.5 uppercase tracking-wide">Nume complet / Firmă *</label>
                    <input
                      type="text"
                      placeholder="Ex: Ionescu Maria"
                      value={billingName}
                      onChange={e => setBillingName(e.target.value)}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 mb-1.5 uppercase tracking-wide">Adresă (opțional)</label>
                    <input
                      type="text"
                      placeholder="Str. Exemplu 1, București"
                      value={billingAddress}
                      onChange={e => setBillingAddress(e.target.value)}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
                    />
                  </div>

                  {badgeError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" /> {badgeError}
                    </div>
                  )}

                  <button
                    onClick={handleBankTransfer}
                    disabled={badgeLoading || !billingName.trim()}
                    className="w-full py-3.5 rounded-xl font-black text-sm text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    {badgeLoading
                      ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Generez factura…</>
                      : <><Building2 className="w-4 h-4" /> Generează factura</>
                    }
                  </button>
                </div>
              )}

              {/* STEP 3: Bank instructions */}
              {badgeModal === 'bank_instructions' && invoiceData && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-black text-green-700">Factură generată!</p>
                      <p className="text-xs text-green-600">Badge-ul se activează după confirmarea transferului.</p>
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <p className="text-xs text-purple-500 font-bold mb-1">Număr factură (referință plată)</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-black text-purple-700">{invoiceData.invoiceNumber}</p>
                      <button onClick={() => copyText(invoiceData.invoiceNumber, 'inv')} className="text-purple-400 hover:text-purple-600 transition">
                        {copied === 'inv' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-blue-50 border-b border-blue-100 px-4 py-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <p className="font-black text-sm text-blue-700">Detalii cont bancar AddFame</p>
                    </div>
                    <div className="p-4 space-y-2.5">
                      {[
                        { label: 'Beneficiar', value: 'AddFame SRL' },
                        { label: 'IBAN', value: 'RO49 AAAA 1B31 0075 9384 0000' },
                        { label: 'BIC / SWIFT', value: 'RNCBROBU' },
                        { label: 'Sumă', value: `\${invoiceData.amount} RON` },
                        { label: 'Referință', value: invoiceData.invoiceNumber },
                      ].map(row => (
                        <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                          <span className="text-xs text-gray-400">{row.label}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-gray-900">{row.value}</span>
                            <button onClick={() => copyText(row.value, row.label)} className="text-gray-300 hover:text-purple-500 transition">
                              {copied === row.label ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 pb-4">
                      <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-600">Badge-ul se activează în 1-3 zile lucrătoare după confirmarea transferului de echipa AddFame.</p>
                      </div>
                    </div>
                  </div>

                  <button onClick={closeBadgeModal} className="w-full py-3 rounded-xl font-bold text-sm border-2 border-gray-200 hover:bg-gray-50 transition text-gray-700">
                    Am înțeles, voi face transferul
                  </button>
                </div>
              )}

              {/* SUCCESS */}
              {badgeModal === 'success' && (
                <div className="text-center py-6">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 8px 24px rgba(251,191,36,0.4)' }}>
                    <Star className="w-10 h-10 text-white fill-white" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Ești Verified Creator!</h3>
                  <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                    Profilul tău apare acum <strong>primul</strong> în lista brandurilor.<br />Abonamentul se reînnoiește lunar. Succes!
                  </p>
                  <button
                    onClick={closeBadgeModal}
                    className="w-full py-3.5 rounded-xl font-black text-sm text-white"
                    style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 4px 16px rgba(251,191,36,0.4)' }}
                  >
                    Super, mulțumesc!
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
