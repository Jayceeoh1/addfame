// Părți comune ale paginilor publice /evenimente și /evenimente/[slug]. Componente de server (fără JavaScript în browser).
import Link from 'next/link'
import { formatEventDate, photoUrl, tileClass, type SiteEvent, type SiteEventPhoto } from '@/lib/events'

export type GalleryPhoto = SiteEventPhoto & { eventTitle: string }

export function Mosaic({ photos, label = 'Fotografie de la eveniment' }: { photos: GalleryPhoto[]; label?: string }) {
  return (
    <div className="ev-gallery">
      {photos.map((p, i) => (
        <a key={p.id} href={photoUrl(p.path)} target="_blank" rel="noopener noreferrer" className={`ev-tile ${tileClass(i)}`} aria-label={`${label}: ${p.caption || p.eventTitle}`}>
          <img src={photoUrl(p.path)} alt={p.caption || p.eventTitle} loading="lazy" decoding="async" />
          <span className="ev-cap">{p.caption || p.eventTitle}</span>
        </a>
      ))}
    </div>
  )
}

export function AlbumCard({ event, cover, count }: { event: SiteEvent; cover: SiteEventPhoto | null; count: number }) {
  return (
    <Link href={`/evenimente/${event.slug}`} className="ev-album">
      <div className="ev-album-img">
        {cover ? <img src={photoUrl(cover.path)} alt="" loading="lazy" decoding="async" /> : <span>Fără poze încă</span>}
      </div>
      <div className="ev-album-body">
        <b>{event.title}</b>
        <span>{[formatEventDate(event.starts_at, false), event.city].filter(Boolean).join(' · ')}{count ? ` · ${count} ${count === 1 ? 'fotografie' : 'fotografii'}` : ''}</span>
        <em>Vezi albumul</em>
      </div>
    </Link>
  )
}

export const EV_CSS = `
.ev-hero{display:flex;flex-wrap:wrap;align-items:center;gap:48px;padding-block:clamp(40px,7vw,88px) 56px}
.ev-hero-copy{flex:1 1 460px;min-width:0;display:flex;flex-direction:column;gap:22px}
.ev-h1{margin:0;font-weight:800;font-size:clamp(36px,5.4vw,64px);line-height:1.04;letter-spacing:-.025em;text-wrap:balance}
.ev-next{flex:1 1 380px;min-width:0;background:#fff;border:1px solid var(--line);border-radius:20px;padding:clamp(20px,3vw,28px);box-shadow:0 28px 56px -28px rgba(80,50,200,.35);display:flex;flex-direction:column;gap:16px}
.ev-next-top{display:flex;justify-content:space-between;align-items:center;gap:12px}
.ev-next-badge{font-size:12px;font-weight:700;color:#14532d;background:#dcf5ec;padding:4px 10px;border-radius:999px}
.ev-next h2{margin:0;font-weight:800;font-size:26px;line-height:1.15}
.ev-next p{margin:0;color:var(--muted);font-size:15px}
.ev-dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:15px}
.ev-dl dt{color:var(--soft);font-weight:600}.ev-dl dd{margin:0;font-weight:700}
.ev-stats{background:#fff;border-block:1px solid var(--line)}
.ev-stats-in{display:flex;flex-wrap:wrap;gap:24px 56px;padding-block:28px}
.ev-stat{display:flex;flex-direction:column;gap:2px}
.ev-stat b{font-family:var(--font-display,system-ui),system-ui,sans-serif;font-size:34px;font-weight:800;line-height:1.1}
.ev-stat span{color:var(--muted);font-size:14px}
.ev-sec{padding-block:clamp(48px,7vw,72px) 24px;display:flex;flex-direction:column;gap:28px}
.ev-sec-head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:16px}
.ev-h2{margin:0;font-weight:800;font-size:clamp(28px,3.8vw,44px);line-height:1.08;letter-spacing:-.02em;text-wrap:balance}
.ev-chips{display:flex;flex-wrap:wrap;gap:8px}
.ev-chip{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:999px;font-weight:700;font-size:14px;border:1px solid #d8d5ec;background:#fff;color:var(--ink);text-decoration:none}
.ev-chip.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.ev-gallery{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:210px;grid-auto-flow:dense;gap:14px}
.ev-tile{position:relative;border-radius:16px;overflow:hidden;display:flex;align-items:flex-end;padding:12px;background:#e9e6f7;color:var(--ink);text-decoration:none}
.ev-tile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .35s}
.ev-tile:hover img{transform:scale(1.04)}
.ev-tile:focus-visible{outline:3px solid #5a35e6;outline-offset:2px}
.ev-wide{grid-column:span 2}.ev-tall{grid-row:span 2}
.ev-cap{position:relative;font-size:13px;font-weight:700;background:rgba(255,255,255,.92);padding:6px 10px;border-radius:8px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media(max-width:900px){.ev-gallery{grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:170px}}
@media(max-width:520px){.ev-tall{grid-row:span 1}}
.ev-albums{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:20px}
.ev-album{text-decoration:none;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:18px;overflow:hidden;display:flex;flex-direction:column;transition:box-shadow .15s,transform .15s}
.ev-album:hover{box-shadow:0 18px 36px -22px rgba(80,50,200,.45);transform:translateY(-2px)}
.ev-album-img{height:170px;background:linear-gradient(140deg,#d6eefe,#ebe4ff 60%,#fde0ea);display:grid;place-items:center;color:#4423c4;font-weight:700;font-size:14px;overflow:hidden}
.ev-album-img img{width:100%;height:100%;object-fit:cover;display:block}
.ev-album-body{padding:16px 20px 20px;display:flex;flex-direction:column;gap:6px}
.ev-album-body b{font-family:var(--font-display,system-ui),system-ui,sans-serif;font-size:20px;line-height:1.2}
.ev-album-body span{font-size:14px;color:var(--muted)}
.ev-album-body em{font-style:normal;font-weight:700;font-size:14px;color:#4423c4;margin-top:4px}
.ev-empty{background:#fff;border:1px dashed #cfcbe8;border-radius:18px;padding:36px 24px;text-align:center;color:var(--muted)}
.ev-cta{background:linear-gradient(120deg,#3090f0,#7040f0 60%,#9030f0);border-radius:24px;padding:clamp(28px,5vw,56px);color:#fff;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:24px}
.ev-cta h2{margin:0;font-weight:800;font-size:clamp(26px,3.4vw,38px);line-height:1.1;text-wrap:balance;max-width:20em}
.ev-cta p{margin:10px 0 0;font-size:17px;color:#f1ecff;max-width:34em}
.ev-back{display:inline-flex;align-items:center;min-height:44px;font-weight:700;font-size:14px;color:#4423c4;text-decoration:none}
`
