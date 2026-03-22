'use client'

import { useEffect, useState } from 'react'
import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Users, LayoutDashboard, LogOut, ShieldCheck, Briefcase, ChevronRight, DollarSign, Building2, Menu, X, Handshake, ArrowUpRight, TrendingUp, Crown } from 'lucide-react'
import RoleSwitcher from '@/components/shared/role-switcher'

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Users, label: 'Influencers', href: '/admin/influencers' },
  { icon: Building2, label: 'Brands', href: '/admin/brands' },
  { icon: Briefcase, label: 'Campanii', href: '/admin/campaigns' },
  { icon: Handshake, label: 'Colaborări', href: '/admin/collaborations' },
  { icon: DollarSign, label: 'Top-up Branduri', href: '/admin/payments' },
  { icon: ArrowUpRight, label: 'Retrageri', href: '/admin/withdrawals' },
  { icon: TrendingUp, label: 'Revenue', href: '/admin/revenue' },
  { icon: ShieldCheck, label: 'Verificări ID', href: '/admin/identity' },
  { icon: Crown, label: 'Admini', href: '/admin/admins', superAdminOnly: true },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [open, setOpen] = useState(false)
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const check = () => {
      const m = window.innerWidth < 768
      setMobile(m)
      if (m) setOpen(false)
      else setOpen(true)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (user?.email) setEmail(user.email)
      // Check if super_admin
      try {
        const res = await fetch('/api/admin/me')
        const d = await res.json()
        if (d.role === 'super_admin') setIsSuperAdmin(true)
      } catch (_) { }
    })
  }, [])

  const logout = async () => { await createClient().auth.signOut(); router.replace('/auth/login') }
  const isActive = (href: string) => href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
  const pageLabel = (NAV.filter(n => !n.superAdminOnly || isSuperAdmin)).find(n => isActive(n.href) && n.href !== '/admin')?.label ?? (pathname === '/admin' ? 'Dashboard' : '')

  return (
    <div className="flex h-screen bg-gray-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .admin-grad { background: linear-gradient(135deg, #6366f1, #8b5cf6); }
        .nav-active { background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08)); color: #4f46e5; }
        .nav-active .nav-icon { color: #6366f1; }
        .nav-item { display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:14px;transition:all .15s;cursor:pointer;text-decoration:none;color:#6b7280;font-weight:600;font-size:14px; }
        .nav-item:hover:not(.nav-active) { background:#eef2ff;color:#4f46e5; }
        .nav-item:hover:not(.nav-active) .nav-icon { color:#6366f1; }
        .nav-icon { width:18px;height:18px;flex-shrink:0;color:#9ca3af;transition:color .15s; }
        .collapse-btn { display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9px;background:#f3f4f6;border:none;cursor:pointer;transition:background .15s;flex-shrink:0; }
        .collapse-btn:hover { background:#e0e7ff; }
        .icon-btn { display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:11px;background:white;border:1.5px solid #f0f0f0;cursor:pointer;transition:all .15s;color:#6b7280; }
        .icon-btn:hover { border-color:#c7d2fe;color:#4f46e5; }
        @keyframes slideIn { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:translateX(0)} }
        .sidebar-anim { animation: slideIn .3s ease; }
        .mobile-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);z-index:40; }
      `}</style>

      {mobile && open && <div className="mobile-overlay" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-white transition-all duration-300 overflow-hidden flex-shrink-0
          ${mobile
            ? `fixed left-0 top-0 h-full z-50 sidebar-anim transform ${open ? 'translate-x-0 w-64' : '-translate-x-full w-64 pointer-events-none'}`
            : `${open ? 'relative w-64' : 'relative w-[72px]'}`
          }`}
        style={{ borderRight: '1.5px solid #f0f0f0', boxShadow: '4px 0 24px rgba(0,0,0,0.04)' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 h-16 flex-shrink-0" style={{ borderBottom: '1.5px solid #f5f5f5' }}>
          <div className={`flex items-center gap-2.5 ${!open ? 'justify-center w-full' : ''}`}>
            <div className="w-8 h-8 admin-grad rounded-xl flex items-center justify-center flex-shrink-0" style={{ boxShadow: '0 3px 10px rgba(99,102,241,0.35)' }}>
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            {open && (
              <div>
                <p className="font-black text-sm text-gray-900 leading-tight">AddFame</p>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider leading-tight">Admin Panel</p>
              </div>
            )}
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
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {open && <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest px-3 mb-3">Management</p>}
          {NAV.filter(n => !n.superAdminOnly || isSuperAdmin).map(item => {
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href}
                className={`nav-item ${active ? 'nav-active' : ''} ${!open ? 'justify-center px-0' : ''}`}
                title={!open ? item.label : undefined}
                onClick={() => mobile && setOpen(false)}
              >
                <item.icon className={`nav-icon ${active ? 'text-indigo-500' : ''}`} />
                {open && <span>{item.label}</span>}
                {open && active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 flex-shrink-0" style={{ borderTop: '1.5px solid #f5f5f5' }}>
          {open ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 admin-grad rounded-xl flex items-center justify-center flex-shrink-0" style={{ boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}>
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-gray-900 truncate">{email || '…'}</p>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wide">Admin</p>
              </div>
              <button onClick={logout} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50 flex items-center justify-center transition" title="Logout">
                <LogOut className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-9 h-9 admin-grad rounded-xl flex items-center justify-center" style={{ boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}>
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <button onClick={logout} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50 flex items-center justify-center transition" title="Logout">
                <LogOut className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 bg-white flex items-center justify-between px-5" style={{ borderBottom: '1.5px solid #f0f0f0' }}>
          <div className="flex items-center gap-3">
            {(!open || mobile) && (
              <button className="icon-btn" onClick={() => setOpen(true)}>
                <Menu className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-400">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Admin</span>
              {pageLabel && (
                <>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className="text-gray-700 font-black">{pageLabel}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <RoleSwitcher
              roles={[
                { label: 'Admin Panel', href: '/admin' },
                { label: 'Influencer Dashboard', href: '/influencer/dashboard' },
                { label: 'Brand Dashboard', href: '/brand/dashboard' },
              ]}
            />
            <div className="text-xs font-bold text-indigo-400 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-200">
              🛡 Admin Mode
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
      </div>
    </div>
  )
}
