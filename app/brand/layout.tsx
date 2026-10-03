'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NotificationsBell } from '@/components/shared/notifications-bell'
import { fontVars } from '@/lib/fonts'
import AdminFloatingButton from '@/components/AdminFloatingButton'
import {
  LayoutDashboard, Briefcase, Users, MessageSquare,
  Wallet, Settings, LogOut, Menu, X, Zap, ChevronRight, Shield, Calendar, BarChart2
} from 'lucide-react'

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/brand/dashboard' },
  { icon: Briefcase, label: 'Campanii', href: '/brand/campaigns' },
  { icon: Zap, label: 'Colaborări', href: '/brand/collaborations' },
  { icon: Users, label: 'Influenceri', href: '/brand/influencers' },
  { icon: BarChart2, label: 'Analize', href: '/brand/analytics' },
  { icon: Shield, label: 'Verificare Brand', href: '/brand/verify' },
  { icon: Calendar, label: 'Calendar', href: '/brand/calendar' },
  { icon: MessageSquare, label: 'Mesaje', href: '/brand/inbox' },
  { icon: Wallet, label: 'Portofel', href: '/brand/wallet' },
  { icon: Settings, label: 'Setări', href: '/brand/settings' },
]

export default function BrandLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [profile, setProfile] = useState<{ name: string; industry: string; logo: string | null; credits_balance: number } | null>(null)
  const pathname = usePathname()
  const router = useRouter()

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
      sb.from('brands').select('name, industry, logo, credits_balance, onboarding_done').eq('user_id', user.id).single()
        .then(({ data }) => {
          if (data) setProfile({
            name: data.name || 'Brand',
            industry: data.industry || '',
            logo: data.logo || null,
            credits_balance: data.credits_balance ?? 0,
          })
          if (data && data.onboarding_done === false && !window.location.pathname.startsWith('/brand/onboarding')) {
            router.replace('/brand/onboarding')
          }
        })
    })
  }, [])

  const logout = async () => {
    await createClient().auth.signOut()
    router.replace('/auth/login')
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const initial = profile?.name?.[0]?.toUpperCase() || 'B'

  const Avatar = ({ size = 36 }: { size?: number }) => (
    <div
      className="brand-grad rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, boxShadow: '0 2px 8px rgba(90,53,230,0.3)' }}
    >
      {profile?.logo
        ? <img src={profile.logo} alt={profile.name} className="w-full h-full object-cover" />
        : <span className="text-white font-black" style={{ fontSize: size * 0.38 }}>{initial}</span>
      }
    </div>
  )

  return (
    <div className={`flex h-screen ${fontVars}`} style={{ '--primary': 'oklch(0.51 0.24 282)', '--ring': 'oklch(0.51 0.24 282)', '--accent': 'oklch(0.55 0.25 300)', '--sidebar-primary': 'oklch(0.51 0.24 282)', height: '100dvh', background: '#f6f6fc', color: '#14123a', fontFamily: "var(--font-body, system-ui), system-ui, sans-serif" } as React.CSSProperties}>
      <style>{`
        
        .brand-grad { background: linear-gradient(135deg, #2f6fe0, #5a35e6); }
        .nav-active { background: linear-gradient(135deg, rgba(90,53,230,0.1), rgba(144,48,240,0.06)); color: #4423c4; }
        .nav-active .nav-icon { color: #5a35e6; }
        .nav-item { display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:14px;transition:all .15s;cursor:pointer;text-decoration:none;color:#6b7280;font-weight:600;font-size:14px; }
        .nav-item:hover:not(.nav-active) { background:#f5f3ff;color:#4423c4; }
        .nav-item:hover:not(.nav-active) .nav-icon { color:#5a35e6; }
        .nav-icon { width:18px;height:18px;flex-shrink:0;color:#9ca3af;transition:color .15s; }
        .sidebar-shadow { box-shadow: 4px 0 24px rgba(0,0,0,0.04); }
        .collapse-btn { display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9px;background:#f3f4f6;border:none;cursor:pointer;transition:background .15s;flex-shrink:0; }
        .collapse-btn:hover { background:#ede9fe; }
        .topbar-search { flex:1;padding:9px 14px 9px 40px;border:2px solid #f0f0f0;border-radius:12px;font-size:14px;font-family:inherit;font-weight:500;outline:none;background:white;transition:border-color .2s; }
        .topbar-search:focus { border-color:#5a35e6;box-shadow:0 0 0 3px rgba(90,53,230,0.08); }
        .topbar-search::placeholder { color:#9ca3af;font-weight:400; }
        .icon-btn { display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:12px;background:white;border:1.5px solid #f0f0f0;cursor:pointer;transition:all .15s;color:#6b7280; }
        .icon-btn:hover { border-color:#ddd6fe;color:#4423c4;background:#f5f3ff; }
        @keyframes slideIn { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:translateX(0)} }
        .sidebar-anim { animation: slideIn .3s ease; }
        .mobile-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);z-index:40; }
        .credits-pill { background:linear-gradient(135deg,rgba(90,53,230,0.1),rgba(144,48,240,0.06));border:1.5px solid rgba(90,53,230,0.2);border-radius:12px;padding:6px 14px;text-align:right; }
      `}</style>

      {mobile && open && (
        <div className="mobile-overlay" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`sidebar-shadow flex flex-col bg-white transition-all duration-300 overflow-hidden flex-shrink-0
          ${mobile
            ? `fixed left-0 top-0 h-full z-50 sidebar-anim transform ${open ? 'translate-x-0 w-64' : '-translate-x-full w-64 pointer-events-none'}`
            : `${open ? 'relative w-64' : 'relative w-[72px]'}`
          }`}
        style={{ borderRight: '1.5px solid #f0f0f0' }}
      >
        <div className="flex items-center justify-between px-4 h-16 flex-shrink-0" style={{ borderBottom: '1.5px solid #f5f5f5' }}>
          <div className={`flex items-center gap-2.5 ${!open ? 'justify-center w-full' : ''}`}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: '#fff', border: '1px solid #ede9fe', boxShadow: '0 2px 8px rgba(112,64,240,0.15)' }}>
              <img src="/logo.png" alt="AddFame" style={{ width: '78%', height: '78%', objectFit: 'contain' }} />
            </div>
            {open && <span className="font-black text-base tracking-tight text-gray-900">Add<span style={{ background: 'linear-gradient(100deg,#22c8f0 0%,#3090f0 38%,#7040f0 72%,#9030f0 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent' }}>Fame</span></span>}
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

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" style={{ scrollbarWidth: 'none' }}>
          {open && <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest px-3 mb-3">Brand</p>}
          {NAV.map(item => {
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href}
                className={`nav-item ${active ? 'nav-active' : ''} ${!open ? 'justify-center px-0' : ''}`}
                title={!open ? item.label : undefined}
                onClick={() => mobile && setOpen(false)}
              >
                <item.icon className={`nav-icon ${active ? 'text-violet-600' : ''}`} />
                {open && <span>{item.label}</span>}
                {open && active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-600" />}
              </Link>
            )
          })}
        </nav>

        <div style={{ borderTop: '1.5px solid #f5f5f5' }} className="p-3 flex-shrink-0">
          {open ? (
            <div className="flex items-center gap-3">
              <Avatar size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-gray-900 truncate">{profile?.name || '…'}</p>
                <p className="text-xs text-gray-400 font-medium truncate">{profile?.industry || 'Brand'}</p>
              </div>
              <button onClick={logout} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50 flex items-center justify-center transition flex-shrink-0" title="Logout">
                <LogOut className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Avatar size={36} />
              <button onClick={logout} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50 flex items-center justify-center transition" title="Logout">
                <LogOut className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          )}
        </div>
      </aside>

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
              <input className="topbar-search" placeholder="Caută…" />
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {profile !== null && (
              <div className="credits-pill hidden md:block">
                <p className="text-sm font-black text-violet-700 leading-tight">{(profile.credits_balance ?? 0).toLocaleString('ro-RO')} RON</p>
                <p className="text-[10px] text-violet-400 font-bold">Credite</p>
              </div>
            )}
            <NotificationsBell accentColor="#5a35e6" />
            <Link href="/brand/settings">
              <Avatar size={36} />
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto" style={{ background: '#f6f6fc' }}>
          {children}
        </main>
        <AdminFloatingButton />
      </div>
    </div>
  )
}
