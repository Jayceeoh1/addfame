'use client'

// Pagina principală de admin (doar afișare). Datele vin din getAdminOverview.

import Link from 'next/link'
import type { AdminOverview, AdminQueue } from '@/app/actions/admin-overview'
import {
  Wallet, ArrowUpRight, Users, ShieldCheck, Building2, CheckSquare, Package, ShieldAlert, Scale,
  CheckCircle2, RefreshCw, FileText, Briefcase,
} from 'lucide-react'

const ron = (n: number) => `${n.toLocaleString('ro-RO', { maximumFractionDigits: 0 })} RON`
const short = (n: number) => n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}k` : String(Math.round(n))

// Coada de lucru: ce înseamnă fiecare număr și unde se rezolvă
export const QUEUE: { key: keyof AdminQueue; label: string; href: string; icon: any; bg: string; fg: string }[] = [
  { key: 'topups', label: 'încărcări de confirmat', href: '/admin/payments', icon: Wallet, bg: '#efeaff', fg: '#4423c4' },
  { key: 'withdrawals', label: 'retrageri de plătit', href: '/admin/withdrawals', icon: ArrowUpRight, bg: '#dcf5ec', fg: '#14804a' },
  { key: 'proofs', label: 'postări de aprobat', href: '/admin/reviews', icon: CheckSquare, bg: '#e6f0ff', fg: '#1d4fb8' },
  { key: 'shipments', label: 'colete de trimis', href: '/admin/deliveries', icon: Package, bg: '#fff1c2', fg: '#854d0e' },
  { key: 'influencers', label: 'influenceri de aprobat', href: '/admin/influencers', icon: Users, bg: '#efeaff', fg: '#4423c4' },
  { key: 'identity', label: 'acte de verificat', href: '/admin/identity', icon: ShieldCheck, bg: '#e6f0ff', fg: '#1d4fb8' },
  { key: 'brands', label: 'branduri de verificat', href: '/admin/brands', icon: Building2, bg: '#f0eff7', fg: '#4a4770' },
  { key: 'flags', label: 'mesaje semnalate', href: '/admin/mesaje-semnalate', icon: ShieldAlert, bg: '#fde8e6', fg: '#b42318' },
  { key: 'disputes', label: 'litigii deschise', href: '/admin/disputes', icon: Scale, bg: '#fde8e6', fg: '#b42318' },
]

const CAMP_STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  ACTIVE: { label: 'Activă', bg: '#e6f0ff', fg: '#1d4fb8' },
  COMPLETED: { label: 'Încheiată', bg: '#dcf5ec', fg: '#14804a' },
  PAUSED: { label: 'Pe pauză', bg: '#fff1c2', fg: '#854d0e' },
  PENDING_REVIEW: { label: 'De aprobat', bg: '#fff1c2', fg: '#854d0e' },
  CANCELLED: { label: 'Anulată', bg: '#f0eff7', fg: '#4a4770' },
}
const TX_STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  completed: { label: 'Confirmată', bg: '#dcf5ec', fg: '#14804a' },
  pending: { label: 'De confirmat', bg: '#fff1c2', fg: '#854d0e' },
  failed: { label: 'Respinsă', bg: '#fde8e6', fg: '#b42318' },
}

export function greeting(d = new Date()) {
  const h = d.getHours()
  return h < 5 ? 'Noapte bună' : h < 12 ? 'Bună dimineața' : h < 18 ? 'Bună ziua' : 'Bună seara'
}

/** Bare grupate pe luni: o bară pe serie, valoarea deasupra. */
function MonthBars({ months, series, grow = false }: { months: { label: string }[]; series: { name: string; color: string; values: number[] }[]; grow?: boolean }) {
  const max = Math.max(1, ...series.flatMap(s => s.values))
  return (
    <>
      <div className={`ad-chart${grow ? ' grow' : ''}`} style={{ ['--cols' as any]: months.length }} role="img"
        aria-label={series.map(s => `${s.name}: ${s.values.map((v, i) => `${months[i].label} ${v}`).join(', ')}`).join('; ')}>
        {months.map((m, i) => (
          <div key={i} className="ad-col">
            <div className="ad-bars">
              {series.map(s => (
                <div key={s.name} className="ad-bar" style={{ height: `${(s.values[i] / max) * 100}%`, background: s.color }}>
                  {s.values[i] > 0 && <em>{short(s.values[i])}</em>}
                </div>
              ))}
            </div>
            <span className="m">{m.label}</span>
          </div>
        ))}
      </div>
      <div className="ad-legend" style={{ marginTop: 10 }}>
        {series.map(s => <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>)}
      </div>
    </>
  )
}

export function AdminDashboardView({ data, loading = false, onRefresh }: { data: AdminOverview; loading?: boolean; onRefresh?: () => void }) {
  const today = new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })
  const q = data.queue
  const open = QUEUE.filter(x => q[x.key] > 0)
  const totalOpen = open.reduce((s, x) => s + q[x.key], 0)
  const m = data.money
  const lastFee = data.series.fees[data.series.fees.length - 1] || 0

  return (
    <div className="ad-page">
      <div className="ad-hello">
        <div>
          <h1>{greeting()}</h1>
          <p style={{ textTransform: 'none' }}>
            <span style={{ textTransform: 'capitalize' }}>{today}</span> · {totalOpen === 0 ? 'nimic nu te așteaptă' : `${totalOpen} ${totalOpen === 1 ? 'lucru te așteaptă' : 'lucruri te așteaptă'}`}
          </p>
        </div>
        <button className="ad-btn" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={`w-4 h-4${loading ? ' animate-spin' : ''}`} /> Actualizează
        </button>
      </div>

      {/* De rezolvat */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="ad-row" style={{ justifyContent: 'space-between' }}>
          <h2>De rezolvat</h2>
        </div>
        {totalOpen === 0 ? (
          <div className="ad-allclear"><CheckCircle2 className="w-5 h-5" /> Totul e la zi: nicio plată, verificare sau postare nu așteaptă.</div>
        ) : (
          <div className="ad-queue">
            {[...open, ...QUEUE.filter(x => q[x.key] === 0)].map(x => (
              <Link key={x.key} href={x.href} className={`ad-q${q[x.key] > 0 ? ' hot' : ' done'}`}>
                <div className="ic" style={{ background: x.bg, color: x.fg }}><x.icon className="w-5 h-5" /></div>
                <div style={{ minWidth: 0 }}>
                  <div className="n">{q[x.key]}</div>
                  <div className="l">{x.label}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Bani */}
      <section className="ad-money">
        <div className="ad-hero">
          <span className="lbl">Venit AddFame · taxe de management</span>
          <span className="big">{ron(m.feesNet)}</span>
          <span className="sub">Taxe încasate la publicarea campaniilor, minus locurile neocupate returnate. Luna aceasta: <b>{ron(lastFee)}</b> brut.</span>
          <div className="split">
            <div><span className="lbl">Încasat de la branduri</span><b>{ron(m.topupsConfirmed)}</b></div>
            <div><span className="lbl">Campanii active</span><b>{data.campaigns.active}</b></div>
          </div>
        </div>
        <div className="ad-tiles">
          <Link href="/admin/payments" className="ad-card ad-tile" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="ad-label">De confirmat</span>
            <span className="v" style={{ color: m.topupsPending > 0 ? '#854d0e' : undefined }}>{ron(m.topupsPending)}</span>
            <span className="h">transferuri anunțate, neverificate</span>
          </Link>
          <div className="ad-card ad-tile">
            <span className="ad-label">Credite în conturi</span>
            <span className="v">{ron(m.walletBalances)}</span>
            <span className="h">soldul tuturor brandurilor</span>
          </div>
          <div className="ad-card ad-tile">
            <span className="ad-label">Blocați pentru influenceri</span>
            <span className="v">{ron(m.heldForInfluencers)}</span>
            <span className="h">se plătesc la aprobarea postărilor</span>
          </div>
          <Link href="/admin/withdrawals" className="ad-card ad-tile" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="ad-label">Retrageri de plătit</span>
            <span className="v" style={{ color: m.payoutsPending > 0 ? '#14804a' : undefined }}>{ron(m.payoutsPending)}</span>
            <span className="h">cerute de influenceri</span>
          </Link>
        </div>
      </section>

      {/* Evoluție */}
      <section className="ad-two">
        <div className="ad-card ad-pad">
          <div className="ad-row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
            <h2>Bani pe ultimele 6 luni</h2>
            <span className="ad-label">RON</span>
          </div>
          <MonthBars grow months={data.months} series={[
            { name: 'Încărcări confirmate', color: '#c9b9fb', values: data.series.topups },
            { name: 'Taxe AddFame', color: '#5a35e6', values: data.series.fees },
          ]} />
        </div>
        <div className="ad-card ad-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2>Comunitate</h2>
          <div className="ad-tiles" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div><span className="ad-label">Influenceri</span><div className="ad-num" style={{ fontWeight: 800, fontSize: 22 }}>{data.people.influencers.toLocaleString('ro-RO')}</div><span className="ad-muted" style={{ fontSize: 12 }}>{data.people.approved.toLocaleString('ro-RO')} aprobați</span></div>
            <div><span className="ad-label">Branduri</span><div className="ad-num" style={{ fontWeight: 800, fontSize: 22 }}>{data.people.brands.toLocaleString('ro-RO')}</div><span className="ad-muted" style={{ fontSize: 12 }}>{data.people.verifiedBrands} verificate</span></div>
          </div>
          <MonthBars months={data.months} series={[
            { name: 'Influenceri noi', color: '#2f6fe0', values: data.series.influencers },
            { name: 'Branduri noi', color: '#22c8f0', values: data.series.brands },
          ]} />
        </div>
      </section>

      {/* Campanii + încărcări */}
      <section className="ad-two">
        <div className="ad-card ad-pad">
          <div className="ad-row" style={{ justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap' }}>
            <h2>Campanii</h2>
            <span className="ad-muted" style={{ fontSize: 13 }}>
              <b style={{ color: '#1d4fb8' }}>{data.campaigns.active}</b> active · {data.campaigns.draft} ciorne · {data.campaigns.completed} încheiate
            </span>
          </div>
          {data.topCampaigns.length === 0 ? (
            <p className="ad-muted" style={{ margin: '12px 0 0', fontSize: 14 }}>Nicio campanie publicată încă.</p>
          ) : (
            <div className="ad-list">
              {data.topCampaigns.map(c => {
                const st = CAMP_STATUS[c.status] ?? { label: c.status, bg: '#f0eff7', fg: '#4a4770' }
                const pct = c.collabs ? Math.round((c.completed / c.collabs) * 100) : 0
                return (
                  <Link key={c.id} href={`/admin/campaigns/${c.id}/performance`} className="ad-li" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="ic" style={{ width: 36, height: 36, borderRadius: 10, background: '#efeaff', color: '#4423c4', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Briefcase className="w-4 h-4" /></div>
                    <div className="main">
                      <b>{c.title}</b>
                      <small>{c.collabs} colaborări · {c.completed} cu postarea aprobată</small>
                      <div className="ad-prog"><i style={{ width: `${pct}%` }} /></div>
                    </div>
                    <span className="ad-chip" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        <div className="ad-card ad-pad">
          <div className="ad-row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <h2>Ultimele încărcări</h2>
            <Link href="/admin/payments" className="ad-btn" style={{ height: 32 }}>Toate</Link>
          </div>
          {data.recentTopups.length === 0 ? (
            <p className="ad-muted" style={{ margin: '12px 0 0', fontSize: 14 }}>Nicio încărcare încă.</p>
          ) : (
            <div className="ad-list">
              {data.recentTopups.map(t => {
                const st = TX_STATUS[t.status] ?? TX_STATUS.pending
                return (
                  <div key={t.id} className="ad-li">
                    <div className="main">
                      <b>{t.brand}</b>
                      <small>
                        {new Date(t.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
                        {t.invoice && <> · <a href={`/api/smartbill/invoice-pdf?transaction_id=${t.id}`} target="_blank" rel="noopener" style={{ color: '#4423c4', fontWeight: 700 }}><FileText className="w-3 h-3" style={{ display: 'inline', verticalAlign: -2 }} /> {t.invoice}</a></>}
                      </small>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <b className="ad-num" style={{ fontSize: 14 }}>{ron(t.amount)}</b>
                      <span className="ad-chip" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
