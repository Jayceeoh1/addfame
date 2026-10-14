'use client'
// „Colaborări finalizate” pe profilul public al creatorului: rating, branduri, postări reale și cifrele lor.
// Datele vin din /api/public/influencer-portfolio (cifrele doar pentru branduri logate / creator / admin).
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Star, Eye, Heart, MessageCircle, Send, ChevronDown, Lock, Play, BadgeCheck } from 'lucide-react'
import { compactRo, type PortfolioBrand, type PortfolioPost, type PortfolioSummary, type PortfolioCollab } from '@/lib/portfolio'

type Data = { mode: 'public' | 'brand' | 'owner'; summary: PortfolioSummary; brands: PortfolioBrand[] }

const TINTS = [['#ede7ff', '#5b34e0'], ['#e3f6ff', '#0f6f9c'], ['#ffe9f1', '#b4235a'], ['#e8f8ef', '#17794a'], ['#fff3dc', '#9a5b05']]
const tint = (s: string) => TINTS[[...s].reduce((a, ch) => a + ch.charCodeAt(0), 0) % TINTS.length]
const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '★'
const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: new Date(iso).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' }) : ''

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="cp-stars" aria-label={`${value} din 5 stele`}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} style={{ width: size, height: size }} className={s <= Math.round(value) ? 'cp-star-on' : 'cp-star-off'} />
      ))}
    </span>
  )
}

function BrandLogo({ name, logo }: { name: string; logo: string | null }) {
  const [bad, setBad] = useState(false)
  const [bg, fg] = tint(name)
  return logo && !bad
    ? <img src={logo} alt="" className="cp-logo" onError={() => setBad(true)} />
    : <span className="cp-logo" style={{ background: bg, color: fg }}>{initials(name)}</span>
}

const PLAT: Record<PortfolioPost['platform'], string> = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', other: 'Postare' }

function PostTile({ p, locked }: { p: PortfolioPost; locked: boolean }) {
  const [bad, setBad] = useState(false)
  const has = (v: number | null) => typeof v === 'number'
  const metrics = [
    { k: 'views', icon: <Eye />, v: p.views, label: 'vizualizări' },
    { k: 'likes', icon: <Heart />, v: p.likes, label: 'aprecieri' },
    { k: 'comments', icon: <MessageCircle />, v: p.comments, label: 'comentarii' },
    { k: 'shares', icon: <Send />, v: p.shares, label: 'distribuiri' },
  ].filter(m => has(m.v))
  const media = (
    <div className={`cp-thumb cp-${p.platform}`}>
      {p.thumbnail && !bad
        ? <img src={p.thumbnail} alt="" loading="lazy" onError={() => setBad(true)} />
        : <span className="cp-thumb-ph">{PLAT[p.platform]}</span>}
      <span className="cp-play"><Play /></span>
      <span className="cp-plat">{PLAT[p.platform]}</span>
    </div>
  )
  return (
    <div className="cp-post">
      {p.url
        ? <a href={p.url} target="_blank" rel="noopener noreferrer" aria-label={`Deschide postarea pe ${PLAT[p.platform]}`}>{media}</a>
        : media}
      {metrics.length > 0 ? (
        <div className="cp-metrics">
          {metrics.map(m => (
            <span key={m.k} className="cp-metric" title={`${m.v} ${m.label}`}>{m.icon}<b>{compactRo(m.v)}</b></span>
          ))}
        </div>
      ) : locked ? (
        <div className="cp-metrics cp-metrics-locked"><Lock /> Cifre pentru branduri</div>
      ) : null}
    </div>
  )
}

function CollabBlock({ c, locked }: { c: PortfolioCollab; locked: boolean }) {
  return (
    <div className="cp-collab">
      <div className="cp-collab-head">
        {c.campaign ? <span className="cp-camp">{c.campaign}</span> : <span className="cp-camp cp-muted">Colaborare</span>}
        <span className="cp-date">{fmtDate(c.completedAt)}</span>
      </div>
      {c.rating ? (
        <div className="cp-review">
          <Stars value={c.rating} size={15} />
          {c.comment && <p>„{c.comment}”</p>}
        </div>
      ) : null}
      {c.posts.length > 0 && (
        <div className="cp-posts">{c.posts.map((p, i) => <PostTile key={i} p={p} locked={locked} />)}</div>
      )}
    </div>
  )
}

function BrandGroup({ g, locked }: { g: PortfolioBrand; locked: boolean }) {
  const [open, setOpen] = useState(false)
  const n = g.collabs.length
  const shown = open ? g.collabs : g.collabs.slice(0, 1)
  return (
    <div className="cp-brand">
      <button type="button" className="cp-brand-head" onClick={() => n > 1 && setOpen(o => !o)} aria-expanded={n > 1 ? open : undefined} disabled={n <= 1}>
        <BrandLogo name={g.name} logo={g.logo} />
        <span className="cp-brand-mid">
          <span className="cp-brand-name">{g.name}{n > 1 && <span className="cp-count">{n}</span>}</span>
          {g.rating ? <span className="cp-brand-rate"><Stars value={g.rating} size={13} /><b>{g.rating.toFixed(1).replace('.', ',')}</b></span>
            : <span className="cp-brand-sub">{n === 1 ? '1 colaborare' : `${n} colaborări`}</span>}
        </span>
        <span className="cp-brand-right">
          <span className="cp-date">{fmtDate(g.lastAt)}</span>
          {n > 1 && <ChevronDown className={`cp-chev${open ? ' cp-chev-open' : ''}`} />}
        </span>
      </button>
      <div className="cp-brand-body">
        {shown.map(c => <CollabBlock key={c.id} c={c} locked={locked} />)}
        {n > 1 && !open && (
          <button type="button" className="cp-more-in" onClick={() => setOpen(true)}>+ încă {n - 1} {n - 1 === 1 ? 'colaborare' : 'colaborări'} cu {g.name}</button>
        )}
      </div>
    </div>
  )
}

export default function CollabPortfolio({ influencerId, onLoaded }: { influencerId: string; onLoaded?: (ok: boolean) => void }) {
  const [data, setData] = useState<Data | null>(null)
  const [all, setAll] = useState(false)

  useEffect(() => {
    let alive = true
    fetch(`/api/public/influencer-portfolio?id=${influencerId}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!alive) return; const ok = !!d?.summary; if (ok) setData(d); onLoaded?.(ok) })
      .catch(() => { if (alive) onLoaded?.(false) })
    return () => { alive = false }
  }, [influencerId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!data || data.summary.completed === 0) return null
  const { summary: s, brands } = data
  const locked = data.mode === 'public'
  const shown = all ? brands : brands.slice(0, 5)
  const maxDist = Math.max(1, ...Object.values(s.distribution))

  return (
    <section className="card p-5 mt-5 fade-up cp" style={{ animationDelay: '.13s' }} aria-labelledby="cp-title">
      <style>{CSS}</style>

      <div className="cp-top">
        <div>
          <h2 id="cp-title" className="cp-title">Colaborări finalizate</h2>
          <p className="cp-lead"><BadgeCheck /> Branduri reale, postări verificate de AddFame</p>
        </div>
        <div className="cp-big"><span>{s.completed}</span><small>{s.completed === 1 ? 'colaborare' : 'colaborări'}</small></div>
      </div>

      <div className="cp-grid">
        <div className="cp-tile cp-rating">
          {s.rating ? (
            <>
              <div className="cp-rating-main">
                <b>{s.rating.toFixed(1).replace('.', ',')}</b>
                <Stars value={s.rating} size={15} />
                <span>{s.ratingCount} {s.ratingCount === 1 ? 'recenzie' : 'recenzii'}</span>
              </div>
              <div className="cp-dist">
                {([5, 4, 3, 2, 1] as const).map(k => (
                  <div key={k} className="cp-dist-row">
                    <span>{k}</span><Star className="cp-star-on" />
                    <i><em style={{ width: `${(s.distribution[k] / maxDist) * 100}%` }} /></i>
                    <span className="cp-n">{s.distribution[k]}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="cp-rating-main"><b>–</b><span>încă fără recenzii</span></div>}
        </div>

        <div className="cp-side">
          <div className="cp-tile cp-stat"><b>{s.brands}</b><span>{s.brands === 1 ? 'brand' : 'branduri'}</span></div>
          {locked ? (
            <Link href="/auth/register?type=brand" className="cp-tile cp-stat cp-lock">
              <Lock /><span>Vizualizările și aprecierile fiecărei postări sunt vizibile brandurilor. <u>Cont de brand</u></span>
            </Link>
          ) : (
            <>
              <div className="cp-tile cp-stat"><b>{compactRo(s.views)}</b><span>vizualizări totale</span></div>
              <div className="cp-tile cp-stat"><b>{compactRo(s.likes)}</b><span>aprecieri</span></div>
            </>
          )}
        </div>
      </div>

      <div className="cp-list">
        {shown.map(g => <BrandGroup key={g.key} g={g} locked={locked} />)}
      </div>
      {brands.length > 5 && (
        <button type="button" className="cp-all" onClick={() => setAll(v => !v)}>
          {all ? 'Arată mai puține' : `Vezi toate cele ${brands.length} branduri`}
        </button>
      )}
    </section>
  )
}

const CSS = `
.cp{--cp-ink:#14123a;--cp-mut:#6b6890;--cp-line:#efedf8;--cp-soft:#f7f6fd;--cp-acc:#6d3df0;--cp-star:#f5b301}
.cp-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px}
.cp-title{margin:0;font-size:18px;font-weight:900;color:var(--cp-ink);letter-spacing:-.01em}
.cp-lead{margin:4px 0 0;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--cp-mut)}
.cp-lead svg{width:14px;height:14px;color:#16a06c}
.cp-big{display:flex;flex-direction:column;align-items:flex-end;line-height:1}
.cp-big span{font-size:34px;font-weight:900;letter-spacing:-.03em;font-variant-numeric:tabular-nums;background:linear-gradient(100deg,#22c8f0,#3090f0 40%,#7040f0 75%,#9030f0);-webkit-background-clip:text;background-clip:text;color:transparent}
.cp-big small{font-size:11px;font-weight:800;color:var(--cp-mut);text-transform:uppercase;letter-spacing:.06em;margin-top:4px}
.cp-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:10px;margin-bottom:16px}
@media(max-width:560px){.cp-grid{grid-template-columns:1fr}}
.cp-tile{background:var(--cp-soft);border-radius:16px;padding:14px}
.cp-rating{display:flex;gap:16px;align-items:center}
.cp-rating-main{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:84px}
.cp-rating-main b{font-size:36px;font-weight:900;color:var(--cp-ink);line-height:1;font-variant-numeric:tabular-nums}
.cp-rating-main span{font-size:11px;font-weight:700;color:var(--cp-mut)}
.cp-dist{flex:1;display:flex;flex-direction:column;gap:5px;min-width:0}
.cp-dist-row{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:800;color:var(--cp-ink);font-variant-numeric:tabular-nums}
.cp-dist-row svg{width:12px;height:12px}
.cp-dist-row i{flex:1;height:7px;border-radius:9px;background:#e6e3f3;overflow:hidden}
.cp-dist-row em{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,#f7c948,#f5a300)}
.cp-n{width:22px;text-align:right;color:var(--cp-mut)}
.cp-side{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.cp-side .cp-lock{grid-column:span 1}
.cp-stat{display:flex;flex-direction:column;justify-content:center;gap:2px}
.cp-stat b{font-size:22px;font-weight:900;color:var(--cp-ink);font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.cp-stat span{font-size:11px;font-weight:700;color:var(--cp-mut)}
.cp-side .cp-stat:first-child:nth-last-child(3){grid-column:span 2}
.cp-lock{background:linear-gradient(135deg,#f1ebff,#e7f6ff);text-decoration:none;gap:6px}
.cp-lock svg{width:16px;height:16px;color:var(--cp-acc)}
.cp-lock span{font-size:11.5px;line-height:1.35;color:var(--cp-ink)}
.cp-lock u{color:var(--cp-acc);font-weight:800}
.cp-stars{display:inline-flex;gap:1px}
.cp-star-on{color:var(--cp-star);fill:var(--cp-star)}
.cp-star-off{color:#e2e0ee;fill:#e2e0ee}
.cp-list{display:flex;flex-direction:column;gap:10px}
.cp-brand{border:1.5px solid var(--cp-line);border-radius:18px;overflow:hidden;background:#fff}
.cp-brand-head{width:100%;display:flex;align-items:center;gap:12px;padding:12px 14px;background:none;border:0;text-align:left;cursor:pointer;font-family:inherit}
.cp-brand-head:disabled{cursor:default}
.cp-logo{width:44px;height:44px;border-radius:50%;flex:none;object-fit:cover;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;border:1.5px solid var(--cp-line);background:#fff}
.cp-brand-mid{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.cp-brand-name{display:flex;align-items:center;gap:7px;font-size:15px;font-weight:900;color:var(--cp-ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cp-count{flex:none;font-size:11px;font-weight:900;color:var(--cp-acc);background:#efe9ff;border-radius:999px;padding:2px 8px}
.cp-brand-rate{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--cp-ink)}
.cp-brand-sub{font-size:12px;font-weight:700;color:var(--cp-mut)}
.cp-brand-right{display:flex;align-items:center;gap:6px;flex:none}
.cp-date{font-size:11.5px;font-weight:700;color:#a3a0bd;white-space:nowrap}
.cp-chev{width:18px;height:18px;color:var(--cp-mut);transition:transform .2s}
.cp-chev-open{transform:rotate(180deg)}
.cp-brand-body{padding:0 14px 14px;display:flex;flex-direction:column;gap:14px}
.cp-collab{display:flex;flex-direction:column;gap:8px}
.cp-collab+.cp-collab{border-top:1px dashed var(--cp-line);padding-top:14px}
.cp-collab-head{display:flex;justify-content:space-between;gap:8px;align-items:baseline}
.cp-camp{font-size:12.5px;font-weight:800;color:var(--cp-ink);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cp-muted{color:var(--cp-mut)}
.cp-review{display:flex;flex-direction:column;gap:4px}
.cp-review p{margin:0;font-size:13.5px;line-height:1.45;color:#4a4770;font-style:italic;overflow-wrap:anywhere}
.cp-posts{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
.cp-post{flex:none;width:150px;display:flex;flex-direction:column;gap:6px;scroll-snap-align:start}
.cp-post a{display:block;text-decoration:none}
.cp-thumb{position:relative;width:150px;aspect-ratio:9/16;max-width:100%;border-radius:16px;overflow:hidden;background:linear-gradient(160deg,#2a1e6e,#7040f0 55%,#22c8f0)}
.cp-tiktok{background:linear-gradient(160deg,#111,#2b2b40 60%,#25f4ee)}
.cp-thumb img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .35s}
.cp-post a:hover .cp-thumb img{transform:scale(1.04)}
.cp-thumb-ph{position:absolute;inset:0;display:flex;align-items:flex-end;padding:12px;color:#fff;font-weight:900;font-size:13px}
.cp-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.28);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center}
.cp-play svg{width:18px;height:18px;color:#fff;fill:#fff;margin-left:2px}
.cp-plat{position:absolute;left:8px;top:8px;font-size:10px;font-weight:900;color:#fff;background:rgba(0,0,0,.42);border-radius:999px;padding:3px 8px;letter-spacing:.02em}
.cp-metrics{display:grid;grid-template-columns:1fr 1fr;gap:4px}
.cp-metric{display:flex;align-items:center;gap:5px;background:var(--cp-soft);border-radius:9px;padding:5px 7px;font-size:12px;color:var(--cp-ink)}
.cp-metric svg{width:13px;height:13px;color:var(--cp-mut);flex:none}
.cp-metric b{font-weight:900;font-variant-numeric:tabular-nums;white-space:nowrap}
.cp-metrics-locked{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:var(--cp-mut);background:var(--cp-soft);border-radius:9px;padding:6px 8px}
.cp-metrics-locked svg{width:12px;height:12px}
.cp-more-in{align-self:flex-start;background:none;border:0;padding:0;font-family:inherit;font-size:12.5px;font-weight:800;color:var(--cp-acc);cursor:pointer}
.cp-all{margin-top:12px;width:100%;height:44px;border-radius:14px;border:1.5px solid var(--cp-line);background:#fff;font-family:inherit;font-size:14px;font-weight:800;color:var(--cp-acc);cursor:pointer}
`
