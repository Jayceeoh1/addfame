'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fontVars } from '@/lib/fonts'
import RoleSwitcher from '@/components/shared/role-switcher'
import { getAdminQueue, type AdminQueue } from '@/app/actions/admin-overview'
import './admin-ui.css'
import {
  Users, LayoutDashboard, LogOut, ShieldCheck, Briefcase, Building2, Menu, X, Handshake, ArrowUpRight,
  TrendingUp, Crown, Mail, Send, Bell, Package, Settings, CheckSquare, FileSignature, MessageCircle,
  PartyPopper, Gift, AlertTriangle, Scale, Megaphone, Images, ShieldAlert, Wallet, BarChart3, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'

type Item = { icon: any; label: string; href: string; superAdminOnly?: boolean; badge?: keyof AdminQueue }
type Group = { title: string; items: Item[] }

// Meniul, grupat după ce faci zilnic. `badge` = câte lucruri așteaptă acolo.
const GROUPS: Group[] = [
  { title: 'Azi', items: [
    { icon: LayoutDashboard, label: 'Panou', href: '/admin' },
  ] },
  { title: 'Oameni', items: [
    { icon: Users, label: 'Influenceri', href: '/admin/influencers', badge: 'influencers' },
    { icon: Building2, label: 'Branduri', href: '/admin/brands', badge: 'brands' },
    { icon: ShieldCheck, label: 'Verificări ID', href: '/admin/identity', badge: 'identity' },
    { icon: Megaphone, label: 'Înscrieri creatori', href: '/admin/inscrieri' },
  ] },
  { title: 'Campanii', items: [
    { icon: Briefcase, label: 'Campanii', href: '/admin/campaigns' },
    { icon: Handshake, label: 'Colaborări', href: '/admin/collaborations' },
    { icon: Package, label: 'Livrări', href: '/admin/deliveries', badge: 'shipments' },
    { icon: CheckSquare, label: 'Dovezi postări', href: '/admin/reviews', badge: 'proofs' },
    { icon: FileSignature, label: 'Contracte', href: '/admin/contracts' },
    { icon: Scale, label: 'Litigii', href: '/admin/disputes', badge: 'disputes' },
    { icon: ShieldAlert, label: 'Mesaje semnalate', href: '/admin/mesaje-semnalate', badge: 'flags' },
  ] },
  { title: 'Bani', items: [
    { icon: Wallet, label: 'Încărcări branduri', href: '/admin/payments', badge: 'topups' },
    { icon: ArrowUpRight, label: 'Retrageri', href: '/admin/withdrawals', badge: 'withdrawals' },
    { icon: TrendingUp, label: 'Venituri', href: '/admin/revenue' },
    { icon: Handshake, label: 'Recomandări branduri', href: '/admin/brand-referrals' },
  ] },
  { title: 'Comunicare', items: [
    { icon: Bell, label: 'Anunțuri', href: '/admin/announcements' },
    { icon: Mail, label: 'Outreach', href: '/admin/outreach' },
    { icon: Send, label: 'Email în masă', href: '/admin/email-blast' },
    { icon: Send, label: 'Invitații', href: '/admin/invite' },
    { icon: BarChart3, label: 'Statistici email', href: '/admin/email-stats' },
    { icon: MessageCircle, label: 'WhatsApp', href: '/admin/whatsapp-logs' },
  ] },
  { title: 'Evenimente', items: [
    { icon: Images, label: 'Galerie evenimente', href: '/admin/evenimente' },
    { icon: PartyPopper, label: 'Eveniment toamnă', href: '/admin/event-signups' },
    { icon: Gift, label: 'Puncte', href: '/admin/point-events' },
  ] },
  { title: 'Sistem', items: [
    { icon: Crown, label: 'Admini', href: '/admin/admins', superAdminOnly: true },
    { icon: AlertTriangle, label: 'Erori aplicație', href: '/admin/errors' },
    { icon: Settings, label: 'Setări platformă', href: '/admin/settings' },
  ] },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [rail, setRail] = useState(false)       // desktop: meniu îngust (doar iconițe)
  const [drawer, setDrawer] = useState(false)   // telefon: meniu deschis
  const [queue, setQueue] = useState<AdminQueue | null>(null)

  // preferința de meniu îngust, ținută în browser
  useEffect(() => { try { setRail(localStorage.getItem('acp-rail') === '1') } catch { /* fără stocare */ } }, [])
  const toggleRail = () => setRail(r => { try { localStorage.setItem('acp-rail', r ? '0' : '1') } catch { /* */ } return !r })

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (user?.email) setEmail(user.email)
      try {
        const d = await (await fetch('/api/admin/me')).json()
        if (d.role === 'super_admin') setIsSuperAdmin(true)
      } catch { /* */ }
    })
  }, [])

  // numărătorile din meniu: la fiecare schimbare de pagină și la 2 minute
  useEffect(() => {
    let alive = true
    const load = () => getAdminQueue().then(r => { if (alive && 'queue' in r) setQueue(r.queue) }).catch(() => {})
    load()
    const t = setInterval(load, 120_000)
    return () => { alive = false; clearInterval(t) }
  }, [pathname])

  useEffect(() => { setDrawer(false) }, [pathname])

  const logout = async () => { await createClient().auth.signOut(); router.replace('/auth/login') }
  const isActive = (href: string) => href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(href + '/')
  const groups = GROUPS.map(g => ({ ...g, items: g.items.filter(i => !i.superAdminOnly || isSuperAdmin) })).filter(g => g.items.length)
  const current = groups.flatMap(g => g.items.map(i => ({ ...i, group: g.title }))).find(i => isActive(i.href))
  const todo = queue ? Object.values(queue).reduce((a, b) => a + b, 0) : null

  // Rapoartele de campanie sunt pagini de sine stătătoare (se trimit brandului)
  if (pathname.includes('/report')) return <>{children}</>

  return (
    <div className={`acp-shell ${fontVars}`}>
      {drawer && <div className="acp-ov" onClick={() => setDrawer(false)} />}

      <aside className={`acp-side${rail && !drawer ? ' rail' : ''}${drawer ? ' open' : ''}`} aria-label="Meniu admin">
        <div className="acp-brand">
          <div className="acp-logo"><img src="/logo.png" alt="" /></div>
          {(!rail || drawer) && <>
            <div><b>AddFame</b><small>Admin</small></div>
            <button className="acp-tog" onClick={() => (drawer ? setDrawer(false) : toggleRail())}
              aria-label={drawer ? 'Închide meniul' : 'Îngustează meniul'}>
              {drawer ? <X className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </>}
        </div>

        <nav className="acp-nav">
          {rail && !drawer && (
            <button className="acp-link" onClick={toggleRail} style={{ width: '100%', border: 0, background: 'transparent', cursor: 'pointer', marginBottom: 4 }} title="Lărgește meniul">
              <PanelLeftOpen /><span className="t">Lărgește</span>
            </button>
          )}
          {groups.map(g => (
            <div key={g.title}>
              <div className="acp-grp">{g.title}</div>
              {g.items.map(item => {
                const n = item.badge && queue ? queue[item.badge] : 0
                return (
                  <Link key={item.href} href={item.href} className={`acp-link${isActive(item.href) ? ' on' : ''}`}
                    title={rail ? item.label : undefined} aria-current={isActive(item.href) ? 'page' : undefined}>
                    <item.icon />
                    <span className="t">{item.label}</span>
                    {n > 0 && <span className="acp-badge" aria-label={`${n} de rezolvat`}>{n > 99 ? '99+' : n}</span>}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="acp-me">
          <div className="av">{(email[0] || 'A').toUpperCase()}</div>
          <p><b>{email || '…'}</b><small>{isSuperAdmin ? 'Super admin' : 'Admin'}</small></p>
          <button className="acp-tog" style={{ marginLeft: 0 }} onClick={logout} title="Ieșire" aria-label="Ieșire"><LogOut className="w-4 h-4" /></button>
        </div>
      </aside>

      <div className="acp-main">
        <header className="acp-top">
          <button className="acp-ib acp-menu-btn" onClick={() => setDrawer(true)} aria-label="Deschide meniul"><Menu className="w-4 h-4" /></button>
          <div style={{ minWidth: 0, flex: 1 }}>
            {current && current.href !== '/admin' && <div className="crumb">{current.group}</div>}
            <h1>{current?.label ?? 'Admin'}</h1>
          </div>
          {todo !== null && (
            <Link href="/admin" className={`acp-todo${todo === 0 ? ' zero' : ''}`}>
              {todo === 0 ? 'Totul rezolvat' : `${todo} de rezolvat`}
            </Link>
          )}
          <div className="hide-m">
            <RoleSwitcher roles={[
              { label: 'Admin', href: '/admin' },
              { label: 'Influencer', href: '/influencer/dashboard' },
              { label: 'Brand', href: '/brand/dashboard' },
            ]} />
          </div>
        </header>
        <main className="acp-content">{children}</main>
      </div>
    </div>
  )
}
