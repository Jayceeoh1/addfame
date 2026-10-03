'use client'

import Link from 'next/link'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, Check, Star, Instagram, Youtube } from 'lucide-react'
import { fontVars } from '@/lib/fonts'
import HeroCampaignCard from '@/components/home/HeroCampaignCard'

// ─── Tipuri pentru datele publice ────────────────────────────────────────────
type Clip = {
  id: string
  approved_at: string | null
  display_name: string
  influencer: { name: string; avatar: string | null }
  campaign: { title: string; brand_name: string }
  platform: 'TikTok' | 'Instagram'
}
type Stats = { influencers: number; campaigns: number; brands: number; completedCampaigns: number }
type Review = { rating: number; comment: string; influencer: { name: string; avatar: string | null; niches?: string[] } | null }

const FEED_SIZE = 5
const FEED_INTERVAL_MS = 3800

// Culori pentru avatarele fără poză (inițiale)
const AVATAR_TINTS = [
  ['#ffe0cc', '#9a3d06'], ['#d6eefe', '#075985'], ['#fde0ea', '#9d174d'],
  ['#ebe4ff', '#4c1d95'], ['#dcf5ec', '#14532d'], ['#fff1c2', '#854d0e'],
]

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('') || 'AF'
}

function timeAgo(iso: string | null, now: number) {
  if (!iso) return ''
  const diff = Math.max(0, now - new Date(iso).getTime())
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'acum'
  if (min < 60) return `acum ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `acum ${h} h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'ieri'
  if (d < 30) return `acum ${d} zile`
  return new Date(iso).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })
}

function fmt(n: unknown) {
  return (Number(n) || 0).toLocaleString('ro-RO')
}

function TikTokIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.3 6.3 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.22 8.22 0 004.81 1.54V6.79a4.85 4.85 0 01-1.04-.1z" />
    </svg>
  )
}

function Avatar({ name, src, index, size = 48 }: { name: string; src: string | null; index: number; size?: number }) {
  const [bg, fg] = AVATAR_TINTS[index % AVATAR_TINTS.length]
  return (
    <span className="af-avatar" style={{ width: size, height: size }}>
      <span className="af-ring af-grad" />
      {src ? (
        <img src={src} alt="" className="af-avatar-img" />
      ) : (
        <span className="af-avatar-img" style={{ background: bg, color: fg }}>{initials(name)}</span>
      )}
    </span>
  )
}

// ─── Fluxul „Live pe AddFame” ────────────────────────────────────────────────
function LiveFeed({ clips }: { clips: Clip[] }) {
  const [tick, setTick] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (clips.length <= 1) return
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const id = setInterval(() => { setTick(t => t + 1); setNow(Date.now()) }, FEED_INTERVAL_MS)
    return () => clearInterval(id)
  }, [clips.length])

  const n = clips.length
  const visible = Math.min(FEED_SIZE, n)
  const rows = Array.from({ length: visible }, (_, i) => {
    const idx = ((tick - i) % n + n) % n
    return { clip: clips[idx], idx, pos: i }
  })

  return (
    <ol aria-live="polite" className="af-feed">
      {rows.map(({ clip, idx, pos }) => {
        const anim = tick === 0 ? '' : pos === 0 ? 'af-new' : 'af-old'
        const ago = timeAgo(clip.approved_at, now)
        return (
          <li key={`${tick}-${pos}`} className={`af-feed-row ${anim}`}>
            <Avatar name={clip.display_name} src={clip.influencer?.avatar} index={idx} />
            <div className="af-feed-text">
              <span className="af-feed-main">
                <strong>{clip.display_name}</strong> a postat pe {clip.platform}
                {clip.campaign?.brand_name ? <> pentru <strong>{clip.campaign.brand_name}</strong></> : null}
              </span>
              <span className="af-feed-sub">
                {clip.campaign?.title}
                {ago && <span className="af-meta-time"> · {ago}</span>}
              </span>
            </div>
            {ago && <span className="af-time">{ago}</span>}
          </li>
        )
      })}
    </ol>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [clips, setClips] = useState<Clip[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [reviews, setReviews] = useState<Review[]>([])

  // Date publice (prin rute API — fără RLS pentru vizitatori)
  useEffect(() => {
    fetch('/api/public/stats', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(d => { if (d && typeof d.influencers === 'number') setStats(d) }).catch(() => {})
    fetch('/api/public/clips').then(r => r.ok ? r.json() : null).then(d => setClips((Array.isArray(d?.clips) ? d.clips : []).filter((c: any) => c && c.id && c.display_name))).catch(() => {})
    fetch('/api/public/influencer-reviews').then(r => r.ok ? r.json() : null).then(d => setReviews((Array.isArray(d?.reviews) ? d.reviews : []).filter((r: any) => r && r.comment))).catch(() => {})
    createClient().from('brands').select('name').not('name', 'is', null)
      .order('created_at', { ascending: false }).limit(24)
      .then(({ data }) => {
        const names = Array.from(new Set((data || []).map((b: any) => (b.name || '').trim()).filter(Boolean)))
        setBrands(names)
      })
  }, [])

  // Utilizatorii logați merg direct în dashboard
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY') {
            subscription.unsubscribe()
            router.replace('/auth/reset-password')
          }
        })
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) { setAuthChecked(true); return }

        const user = session.user
        const role = user.user_metadata?.role
        if (role === 'influencer') { router.replace('/influencer/dashboard'); return }
        if (role === 'brand') { router.replace('/brand/dashboard'); return }
        if (role === 'admin') { router.replace('/admin'); return }
        try {
          const { data: brand } = await supabase.from('brands').select('id').eq('user_id', user.id).maybeSingle()
          if (brand) { router.replace('/brand/dashboard'); return }
        } catch {}
        try {
          const { data: influencer } = await supabase.from('influencers').select('id').eq('user_id', user.id).maybeSingle()
          if (influencer) { router.replace('/influencer/dashboard'); return }
        } catch {}
        setAuthChecked(true)
      } catch {
        setAuthChecked(true)
      }
    }
    checkAuth()
  }, [router])

  if (!authChecked) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#f6f6fc' }}>
      <div className="w-8 h-8 rounded-full animate-spin"
        style={{ borderWidth: 3, borderStyle: 'solid', borderColor: '#e2dcff', borderTopColor: '#7040f0' }} />
    </div>
  )

  const s = (v: number | undefined, suffix = '') => (stats ? `${fmt(v || 0)}${suffix}` : '—')
  const brandBand = brands.length >= 3 ? brands : []

  return (
    <div className={`af-page ${fontVars}`}>
      <style>{CSS}</style>

      {/* NAV */}
      <header className="af-header">
        <nav className="af-wrap af-nav">
          <Link href="/" className="af-logo">
            <span className="af-logo-mark"><img src="/logo.png" alt="" /></span>
            <span className="af-logo-text">Add<span className="af-grad-text">Fame</span></span>
          </Link>
          <div className="af-nav-links">
            <a href="#cum">Cum funcționează</a>
            <a href="#branduri">Pentru branduri</a>
            <a href="#influenceri">Influenceri</a>
            <a href="#faq">Întrebări</a>
          </div>
          <div className="af-nav-cta">
            <Link href="/auth/login" className="af-nav-login">Autentificare</Link>
            <Link href="/auth/register" className="af-btn af-btn-violet af-btn-sm">Creează cont</Link>
          </div>
        </nav>
      </header>

      {/* HERO */}
      <section className="af-wrap af-hero">
        <div className="af-hero-copy">
          <span className="af-pill">
            <span className="af-dot" />
            {s(stats?.influencers, '+')} influenceri · {s(stats?.brands)} branduri
          </span>
          <h1 className="af-h1">Oameni reali care îți recomandă <span className="af-grad-text">produsul.</span></h1>
          <p className="af-lead">Alegi creatorii potriviți pentru brandul tău, iar ei îți prezintă produsul în postări naturale, direct din conturile lor. Fără agenție, fără abonament.</p>
          <div className="af-row">
            <Link href="/auth/register?type=brand" className="af-btn af-btn-ink">Lansează o campanie <ArrowRight size={18} /></Link>
            <Link href="/auth/register?type=influencer" className="af-btn af-btn-ghost">Sunt influencer</Link>
          </div>
          <div className="af-checks">
            <span><Check size={16} strokeWidth={2.6} /> Înregistrare gratuită</span>
            <span><Check size={16} strokeWidth={2.6} /> Tu alegi fiecare creator</span>
          </div>
        </div>

        <HeroCampaignCard />
      </section>

      {/* BANDA CU BRANDURI */}
      {brandBand.length > 0 && (
        <section className="af-band" aria-label="Branduri care lucrează cu AddFame">
          <span className="af-eyebrow af-center">Branduri care cresc cu AddFame</span>
          <div className="af-band-mask">
            <div className="af-track">
              {[...brandBand, ...brandBand].map((b, i) => (
                <span key={i} className="af-band-item" aria-hidden={i >= brandBand.length}>{b}<span className="af-band-dot af-grad" /></span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CIFRE */}
      <section className="af-stats">
        <div className="af-wrap af-stats-grid">
          {[
            [s(stats?.influencers, '+'), 'influenceri înscriși'],
            [s(stats?.brands), 'branduri'],
            [s(stats?.campaigns), 'campanii active'],
            [s(stats?.completedCampaigns), 'campanii finalizate'],
          ].map(([v, l]) => (
            <div key={l} className="af-stat"><span className="af-stat-line af-grad" /><b>{v}</b><span>{l}</span></div>
          ))}
        </div>
      </section>

      {/* LIVE */}
      {clips.length > 0 && (
        <section className="af-wrap af-live">
          <div className="af-live-copy">
            <span className="af-live-label"><span className="af-dot" />Live pe AddFame</span>
            <h2 className="af-h2">Creatorii noștri postează <span className="af-grad-text">chiar acum.</span></h2>
            <p className="af-muted">Fiecare rând e o postare făcută de un creator AddFame pentru o campanie de pe platformă. Oameni reali, branduri reale.</p>
          </div>
          <div className="af-live-box">
            <div className="af-live-glow af-grad" aria-hidden="true" />
            <div className="af-card af-live-card">
              <div className="af-live-head">
                <span>Activitate recentă</span>
                <span className="af-tag-cyan"><span className="af-dot af-dot-sm" />live</span>
              </div>
              <LiveFeed clips={clips} />
            </div>
          </div>
        </section>
      )}

      {/* CUM FUNCȚIONEAZĂ */}
      <section id="cum" className="af-wrap af-section">
        <div className="af-section-head">
          <h2 className="af-h2" style={{ maxWidth: '14em' }}>De la idee la postări, în patru pași.</h2>
          <p className="af-muted" style={{ maxWidth: '26em' }}>Locurile pe care nu le folosești până la final se întorc automat în wallet.</p>
        </div>
        <div className="af-steps">
          {[
            ['01', 'Creezi campania', 'Descrii produsul și alegi câți influenceri vrei. Durează sub 5 minute.'],
            ['02', 'O trimiți spre aprobare', 'Echipa AddFame verifică brief-ul. Dacă nu e aprobată, banii se întorc în wallet.'],
            ['03', 'Alegi creatorii', 'Influencerii aplică, tu vezi profilurile și îi selectezi pe cei potriviți.'],
            ['04', 'Primești conținutul', 'Creatorii postează din conturile lor. Aprobi fiecare postare înainte să fie gata.'],
          ].map(([n, t, d]) => (
            <div key={n} className="af-card af-step">
              <span className="af-grad-text af-step-n">{n}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BRANDURI / INFLUENCERI */}
      <section className="af-wrap af-split">
        <div id="branduri" className="af-split-brand">
          <span className="af-eyebrow" style={{ color: '#fff' }}>Pentru branduri</span>
          <h3>Crește cu conținut autentic.</h3>
          <ul>
            <li>— Nu ai nevoie de experiență în marketing</li>
            <li>— Refolosești videoclipurile în reclame plătite</li>
            <li>— O singură factură, plăți gestionate de noi</li>
          </ul>
          <Link href="/auth/register?type=brand" className="af-btn af-btn-white">Începe ca brand</Link>
        </div>
        <div id="influenceri" className="af-card af-split-infl">
          <span className="af-eyebrow">Pentru influenceri</span>
          <h3>Câștigă din audiența ta.</h3>
          <ul>
            <li>— Aplici direct, fără verificări lungi</li>
            <li>— Lucrezi cu branduri din nișa ta</li>
            <li>— Libertate creativă, postezi din contul tău</li>
          </ul>
          <Link href="/auth/register?type=influencer" className="af-btn af-btn-ink">Intră ca influencer</Link>
        </div>
      </section>

      {/* RECENZII REALE */}
      {reviews.length > 0 && (
        <section className="af-reviews">
          <div className="af-wrap af-section">
            <h2 className="af-h2">Ce spun creatorii</h2>
            <div className="af-review-grid">
              {reviews.slice(0, 3).map((r, i) => (
                <figure key={i} className="af-review" style={{ borderTopColor: ['#3090f0', '#7040f0', '#22c8f0'][i % 3] }}>
                  <div className="af-stars" aria-label={`${r.rating} din 5 stele`}>
                    {Array.from({ length: r.rating || 5 }).map((_, j) => <Star key={j} size={14} fill="#7040f0" color="#7040f0" />)}
                  </div>
                  <blockquote>„{r.comment}”</blockquote>
                  <figcaption>
                    <Avatar name={r.influencer?.name || 'Creator'} src={r.influencer?.avatar || null} index={i} size={36} />
                    <span><b>{r.influencer?.name || 'Creator AddFame'}</b><br />Creator verificat AddFame</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section id="faq" className="af-wrap af-section af-faq">
        <h2 className="af-h2">Întrebări frecvente</h2>
        <div className="af-faq-list">
          {[
            ['Pot alege eu influencerii?', 'Da. Creatorii aplică la campanie, iar tu îi selectezi pe cei care se potrivesc brandului.'],
            ['Ce se întâmplă dacă nu folosesc toate locurile?', 'La final, locurile nefolosite se întorc automat în wallet.'],
            ['Pot folosi videoclipurile în reclame?', 'Da, conținutul primit îl poți refolosi în campaniile tale plătite.'],
            ['Influencerii plătesc ceva?', 'Nu. Înregistrarea și aplicarea la campanii sunt gratuite.'],
          ].map(([q, a]) => (
            <details key={q} className="af-faq-item">
              <summary>{q}<span className="af-faq-plus" aria-hidden="true">+</span></summary>
              <p>{a}</p>
            </details>
          ))}
          <Link href="/intrebari-frecvente" className="af-link">Toate întrebările <ArrowRight size={16} /></Link>
        </div>
      </section>

      {/* CTA */}
      <section className="af-wrap" style={{ paddingBottom: 96 }}>
        <div className="af-cta">
          <div className="af-cta-glow af-grad" aria-hidden="true" />
          <h2>Prima ta campanie e la 5 minute distanță.</h2>
          <Link href="/auth/register" className="af-btn af-btn-white af-btn-lg">Creează cont gratuit <ArrowRight size={18} /></Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="af-footer">
        <div className="af-wrap">
          <div className="af-footer-grid">
            <div>
              <Link href="/" className="af-logo">
                <span className="af-logo-mark"><img src="/logo.png" alt="" /></span>
                <span className="af-logo-text">Add<span className="af-grad-text">Fame</span></span>
              </Link>
              <p className="af-footer-about">Conectăm branduri românești cu influenceri autentici.</p>
              <div className="af-socials">
                <a href="https://www.instagram.com/addfame.ro" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={16} /></a>
                <a href="https://www.tiktok.com/@addfame" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><TikTokIcon style={{ width: 16, height: 16 }} /></a>
                <a href="https://www.youtube.com/@addfame" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><Youtube size={16} /></a>
              </div>
            </div>
            {[
              { title: 'Platformă', links: [['Pentru Branduri', '/pentru-branduri'], ['Pentru Influenceri', '/pentru-influenceri'], ['Cum Funcționează', '/cum-functioneaza'], ['Prețuri', '/preturi']] },
              { title: 'Companie', links: [['Despre noi', '/despre-noi'], ['Contact', '/contact'], ['Înregistrare', '/auth/register']] },
              { title: 'Legal', links: [['Termeni', '/termeni'], ['Confidențialitate', '/politica-de-confidentialitate'], ['Politica Cookies', '/politica-cookies']] },
            ].map(col => (
              <div key={col.title}>
                <p className="af-eyebrow">{col.title}</p>
                <ul className="af-footer-links">
                  {col.links.map(([label, href]) => <li key={label}><Link href={href}>{label}</Link></li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="af-footer-bottom">
            <div>
              <p>© 2026 AddFame. Toate drepturile rezervate.</p>
              <p className="af-small">ADD FAME DIGITAL S.R.L. · CUI: 54992560 · Reg. Com.: J2026040984009 · Argeș, România</p>
            </div>
            <div className="af-footer-legal">
              <a href="https://anpc.ro" target="_blank" rel="noopener noreferrer">ANPC</a>
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">SOL Online</a>
              <span>contact@addfame.ro</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ─── Stiluri ─────────────────────────────────────────────────────────────────
// Culori din logo: cyan #22c8f0 → albastru #3090f0 → violet #7040f0 → mov #9030f0
const CSS = `
.af-page{--ink:#14123a;--muted:#4a4770;--soft:#6a6690;--faint:#8783a8;--line:#e5e3f3;--line2:#eeecf7;--bg:#f6f6fc;--violet:#5a35e6;
  background:var(--bg);color:var(--ink);font-family:var(--font-body,system-ui),system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.55;min-height:100vh;overflow-x:hidden}
.af-page *{box-sizing:border-box}
.af-page h1,.af-page h2,.af-page h3,.af-logo-text,.af-card-title,.af-stat b,.af-mini-grid b,.af-step-n,.af-band-item{font-family:var(--font-display,system-ui),system-ui,sans-serif}
.af-wrap{max-width:1200px;margin:0 auto;padding-inline:clamp(16px,4vw,40px)}
.af-grad{background:linear-gradient(135deg,#22c8f0 0%,#3090f0 38%,#7040f0 72%,#9030f0 100%)}
.af-grad-text{background:linear-gradient(100deg,#22c8f0 0%,#3090f0 38%,#7040f0 72%,#9030f0 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}
.af-row{display:flex;flex-wrap:wrap;gap:12px}
.af-between{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.af-col-2{display:flex;flex-direction:column;gap:4px}
.af-col-10{display:flex;flex-direction:column;gap:10px}
.af-center{text-align:center}
.af-muted{margin:0;color:var(--muted)}
.af-eyebrow{display:block;font-size:12px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--faint);margin:0}
.af-card{background:#fff;border:1px solid var(--line);border-radius:16px}

/* Butoane */
.af-btn{white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:10px;font-weight:700;font-size:16px;padding:16px 26px;border-radius:12px;text-decoration:none;transition:transform .15s,box-shadow .15s,background .15s;min-height:48px}
.af-btn:hover{transform:translateY(-1px)}
.af-btn-ink{background:var(--ink);color:#fff}
.af-btn-ink:hover{box-shadow:0 10px 24px -10px rgba(20,18,58,.6);color:#fff}
.af-btn-ghost{background:#fff;color:var(--ink);border:1px solid #d8d5ec}
.af-btn-violet{background:var(--violet);color:#fff}
.af-btn-violet:hover{background:#4423c4;color:#fff}
.af-btn-white{background:#fff;color:var(--ink);align-self:flex-start}
.af-btn-sm{font-size:14px;padding:11px 18px;min-height:44px}
.af-btn-lg{font-size:17px;padding:18px 28px}

/* Nav */
.af-header{background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:50}
.af-nav{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-block:12px}
.af-logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink)}
.af-logo-mark{width:36px;height:36px;border-radius:10px;background:#fff;border:1px solid #ede9fe;box-shadow:0 2px 8px rgba(112,64,240,.15);display:flex;align-items:center;justify-content:center}
.af-logo-mark img{width:78%;height:78%;object-fit:contain}
.af-logo-text{font-weight:800;font-size:21px;letter-spacing:-.02em}
.af-nav-links{display:flex;gap:28px;font-size:14px;font-weight:600}
.af-nav-links a{color:var(--muted);text-decoration:none}
.af-nav-links a:hover{color:var(--ink)}
.af-nav-cta{display:flex;align-items:center;gap:8px}
.af-nav-login{font-size:14px;font-weight:600;color:var(--ink);text-decoration:none;padding:12px 8px}
@media(max-width:860px){.af-nav-links{display:none}}
@media(max-width:420px){.af-logo-text{font-size:17px}.af-logo-mark{width:32px;height:32px}.af-nav{gap:8px}.af-nav-login{font-size:13px;padding:12px 2px;white-space:nowrap}.af-btn-sm{font-size:13px;padding:10px 14px}}
@media(max-width:340px){.af-logo-text{display:none}}

/* Hero */
.af-hero{display:flex;flex-wrap:wrap;align-items:center;gap:56px;padding-top:clamp(40px,7vw,96px);padding-bottom:72px}
.af-hero-copy{flex:1 1 460px;min-width:0;display:flex;flex-direction:column;gap:26px}
.af-pill{display:inline-flex;align-self:flex-start;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 14px;font-size:13px;font-weight:600;color:var(--muted);font-variant-numeric:tabular-nums}
.af-dot{width:8px;height:8px;border-radius:50%;background:#22c8f0;flex:none;animation:af-pulse 2s infinite}
.af-dot-sm{width:6px;height:6px}
.af-h1{margin:0;font-weight:800;font-size:clamp(40px,6.4vw,84px);line-height:.98;letter-spacing:-.035em;text-wrap:balance}
.af-h2{margin:0;font-weight:800;font-size:clamp(30px,4vw,52px);line-height:1.04;letter-spacing:-.03em;text-wrap:balance}
.af-lead{margin:0;font-size:clamp(17px,1.6vw,19px);color:var(--muted);max-width:34em}
.af-checks{display:flex;flex-wrap:wrap;gap:20px;font-size:14px;font-weight:600;color:var(--muted)}
.af-checks span{display:flex;align-items:center;gap:8px}
.af-checks svg{color:#3090f0}
.af-hero-card-wrap{flex:1 1 380px;min-width:0}
.af-hero-card{padding:clamp(20px,3vw,28px);border-radius:20px;box-shadow:0 28px 56px -28px rgba(80,50,200,.35);display:flex;flex-direction:column;gap:20px}
.af-card-title{font-weight:700;font-size:22px;letter-spacing:-.01em}
.af-tag-cyan{display:inline-flex;align-items:center;gap:6px;background:#e3f6fd;color:#075f7d;font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px;white-space:nowrap}
.af-tag-violet{font-size:12px;font-weight:700;color:#4423c4;background:#efeaff;padding:4px 10px;border-radius:999px;white-space:nowrap}
.af-mini-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.af-mini-grid div{background:var(--bg);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column}
.af-mini-grid b{font-size:26px;font-weight:800;font-variant-numeric:tabular-nums}
.af-mini-grid span{font-size:12px;color:var(--soft);font-weight:600}
.af-person{display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--line2);border-radius:12px}
.af-person-text{flex:1;min-width:0;display:flex;flex-direction:column;font-size:14px}
.af-person-text span{font-size:12px;color:var(--soft)}
.af-progress{display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--line2);padding-top:16px;font-size:14px;font-weight:600}
.af-progress span{color:var(--muted)}
.af-bar{height:8px;border-radius:999px;background:var(--line2);overflow:hidden}
.af-bar div{height:100%;border-radius:999px}

/* Avatar */
.af-avatar{position:relative;flex:none;display:inline-block}
.af-ring{position:absolute;inset:0;border-radius:50%}
.af-avatar-img{position:absolute;inset:2px;border-radius:50%;border:2px solid #fff;object-fit:cover;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;width:calc(100% - 4px);height:calc(100% - 4px)}

/* Banda branduri */
.af-band{border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:#fff;padding:22px 0;display:flex;flex-direction:column;gap:14px;overflow:hidden}
.af-band-mask{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.af-track{display:flex;width:max-content;gap:48px;align-items:center;animation:af-marquee 42s linear infinite}
.af-band:hover .af-track{animation-play-state:paused}
.af-band-item{display:flex;align-items:center;gap:48px;font-weight:700;font-size:clamp(19px,2.4vw,26px);letter-spacing:-.02em;color:#2b2852;white-space:nowrap}
.af-band-dot{width:7px;height:7px;border-radius:50%}

/* Cifre */
.af-stats{background:var(--ink);color:#fff}
.af-stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:28px;padding-block:44px}
.af-stat{display:flex;flex-direction:column;gap:6px}
.af-stat-line{width:28px;height:3px;border-radius:3px}
.af-stat b{font-weight:800;font-size:clamp(32px,4vw,46px);letter-spacing:-.02em;line-height:1.1;font-variant-numeric:tabular-nums}
.af-stat span:last-child{font-size:14px;color:#b9b5dc}
@media(max-width:720px){.af-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}

/* Live */
.af-live{display:flex;flex-wrap:wrap;gap:48px;align-items:center;padding-block:clamp(64px,8vw,96px)}
.af-live-copy{flex:1 1 320px;min-width:0;display:flex;flex-direction:column;gap:18px}
.af-live-label{display:inline-flex;align-self:flex-start;align-items:center;gap:10px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#1b7fae}
.af-live-box{flex:1.3 1 440px;min-width:0;position:relative}
.af-live-glow{position:absolute;inset:24px -8px -16px 24px;border-radius:26px;opacity:.18;filter:blur(28px)}
.af-live-card{position:relative;border-radius:22px;box-shadow:0 28px 56px -30px rgba(80,50,200,.35);overflow:hidden}
.af-live-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid var(--line2);font-weight:700;font-size:15px}
.af-feed{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;overflow:hidden}
.af-feed-row{display:flex;align-items:center;gap:14px;padding:14px 20px;border-bottom:1px solid #f1f0f8;background:#fff}
.af-feed-row:last-child{border-bottom:0}
.af-feed-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.af-feed-main{font-size:15px;line-height:1.4}
.af-feed-sub{font-size:13px;color:var(--soft);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.af-time{flex:none;font-size:12px;color:var(--faint);font-weight:600;font-variant-numeric:tabular-nums}
.af-meta-time{display:none}
.af-new{animation:af-pop .7s cubic-bezier(.2,.9,.3,1.2) both,af-glow 2.4s ease-out both}
.af-old{animation:af-shift .55s cubic-bezier(.2,.8,.2,1) both}
.af-new .af-ring{animation:af-spin .9s cubic-bezier(.2,.8,.2,1) both}
@media(max-width:560px){
  .af-time{display:none}.af-meta-time{display:inline}
  .af-feed-row{padding:12px 14px;gap:12px}
  .af-feed-main{font-size:14px}
  .af-live-glow{inset:16px 0 -12px 16px}
}

/* Pași */
.af-section{padding-block:clamp(64px,8vw,96px);display:flex;flex-direction:column;gap:44px}
.af-section-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:20px}
.af-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px}
.af-step{padding:28px;display:flex;flex-direction:column;gap:12px;transition:transform .2s,box-shadow .2s}
.af-step:hover{transform:translateY(-3px);box-shadow:0 18px 36px -24px rgba(80,50,200,.4)}
.af-step-n{font-weight:800;font-size:28px}
.af-step h3{margin:0;font-weight:700;font-size:22px;letter-spacing:-.01em}
.af-step p{margin:0;color:var(--muted);font-size:15px}

/* Split */
.af-split{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;padding-bottom:clamp(64px,8vw,96px)}
.af-split-brand,.af-split-infl{border-radius:24px;padding:clamp(28px,4vw,48px);display:flex;flex-direction:column;gap:18px}
.af-split-brand{background:linear-gradient(135deg,#2867d4 0%,#5a35e6 55%,#7a22d0 100%);color:#fff}
.af-split-brand h3,.af-split-infl h3{margin:0;font-weight:800;font-size:clamp(28px,3vw,36px);letter-spacing:-.025em;line-height:1.05}
.af-split-brand ul,.af-split-infl ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:12px;font-size:16px}
.af-split-brand ul{font-weight:600}
.af-split-infl ul{color:var(--muted)}
.af-split-brand .af-btn,.af-split-infl .af-btn{align-self:flex-start;margin-top:8px}

/* Recenzii */
.af-reviews{background:#fff;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.af-review-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:32px}
.af-review{margin:0;display:flex;flex-direction:column;gap:16px;padding-top:20px;border-top:3px solid #3090f0}
.af-review blockquote{margin:0;font-size:18px;line-height:1.5}
.af-review figcaption{display:flex;align-items:center;gap:12px;font-size:14px;color:var(--soft)}
.af-review figcaption b{color:var(--ink)}
.af-stars{display:flex;gap:3px}

/* FAQ */
.af-faq{flex-direction:row;flex-wrap:wrap;gap:48px}
.af-faq>.af-h2{flex:1 1 260px;font-size:clamp(30px,3.5vw,44px)}
.af-faq-list{flex:2 1 460px;min-width:0;display:flex;flex-direction:column}
.af-faq-item{border-top:1px solid #d8d5ec}
.af-faq-item:last-of-type{border-bottom:1px solid #d8d5ec}
.af-faq-item summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px 0;font-size:18px;font-weight:700;min-height:44px}
.af-faq-item summary::-webkit-details-marker{display:none}
.af-faq-plus{font-size:24px;font-weight:500;color:#7040f0;transition:transform .2s;flex:none}
.af-faq-item[open] .af-faq-plus{transform:rotate(45deg)}
.af-faq-item p{margin:0 0 20px;color:var(--muted)}
.af-link{display:inline-flex;align-items:center;gap:6px;margin-top:20px;font-weight:700;color:var(--violet);text-decoration:none}

/* CTA */
.af-cta{position:relative;overflow:hidden;background:var(--ink);color:#fff;border-radius:28px;padding:clamp(32px,6vw,72px);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:28px}
.af-cta h2{position:relative;margin:0;font-weight:800;font-size:clamp(30px,4vw,52px);letter-spacing:-.03em;line-height:1.04;max-width:12em;text-wrap:balance}
.af-cta .af-btn{position:relative}
.af-cta-glow{position:absolute;width:420px;height:420px;right:-120px;top:-180px;border-radius:50%;opacity:.35;filter:blur(60px)}

/* Footer */
.af-footer{border-top:1px solid var(--line);background:#fff;padding:56px 0 32px}
.af-footer-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:32px;margin-bottom:40px}
.af-footer-about{font-size:14px;color:var(--soft);max-width:260px;margin:14px 0 16px}
.af-socials{display:flex;gap:10px}
.af-socials a{width:40px;height:40px;border:1px solid var(--line);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--muted)}
.af-socials a:hover{color:#7040f0;border-color:#cfc4ff}
.af-footer-links{list-style:none;padding:0;margin:14px 0 0;display:flex;flex-direction:column;gap:10px}
.af-footer-links a{font-size:14px;color:var(--muted);text-decoration:none}
.af-footer-links a:hover{color:var(--ink)}
.af-footer-bottom{border-top:1px solid var(--line);padding-top:24px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;font-size:13px;color:var(--soft)}
.af-footer-bottom p{margin:0 0 4px}
.af-small{font-size:12px}
.af-footer-legal{display:flex;flex-wrap:wrap;gap:16px;align-items:center}
.af-footer-legal a{color:var(--soft);text-decoration:none;border:1px solid var(--line);border-radius:8px;padding:6px 12px}

/* Animații */
@keyframes af-marquee{from{transform:translateX(-50%)}to{transform:translateX(0)}}
@keyframes af-pulse{0%{box-shadow:0 0 0 0 rgba(34,200,240,.6)}70%{box-shadow:0 0 0 11px rgba(34,200,240,0)}100%{box-shadow:0 0 0 0 rgba(34,200,240,0)}}
@keyframes af-pop{0%{opacity:0;transform:translateY(-28px) scale(.94);filter:blur(6px)}60%{opacity:1;transform:translateY(3px) scale(1.01);filter:blur(0)}100%{transform:translateY(0) scale(1)}}
@keyframes af-shift{from{transform:translateY(-100%)}to{transform:translateY(0)}}
@keyframes af-glow{0%{background:#f1ecff}100%{background:#fff}}
@keyframes af-spin{from{transform:rotate(-180deg)}to{transform:rotate(0)}}
@media(prefers-reduced-motion:reduce){
  .af-track,.af-dot,.af-new,.af-old,.af-ring,.af-btn,.af-step{animation:none!important;transition:none!important}
  .af-track{flex-wrap:wrap;width:auto;justify-content:center;padding-inline:16px;row-gap:12px}
  .af-band-item[aria-hidden="true"]{display:none}
}
`
