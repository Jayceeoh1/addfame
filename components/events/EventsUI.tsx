// Părți comune ale paginilor publice /evenimente și /evenimente/[slug]. Componente de server (fără JavaScript în browser).
import Link from 'next/link'
import { coverOf, formatEventDate, parseStory, photoUrl, tileClass, type SiteEvent, type SiteEventPhoto } from '@/lib/events'

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

/** Povestea unui eveniment: poza mare, fapte, text cu subtitluri, citate și poze între paragrafe. */
export function Story({ event, photos, headingLevel = 2 }: { event: SiteEvent; photos: SiteEventPhoto[]; headingLevel?: 1 | 2 }) {
  const blocks = parseStory(event.story)
  const cover = coverOf(event, photos)
  const H = (headingLevel === 1 ? 'h1' : 'h2') as 'h1' | 'h2'
  const facts: [string, string][] = [
    ['Data', formatEventDate(event.starts_at, false)],
    ['Locul', [event.location, event.city].filter(Boolean).join(', ')],
    ['Creatori prezenți', event.creators_count != null ? String(event.creators_count) : ''],
    ['Branduri prezente', event.brands_count != null ? String(event.brands_count) : ''],
  ].filter(([, v]) => v) as [string, string][]
  const pic = (n: number) => photos[n - 1]
  return (
    <article className="st">
      <div className="af-wrap st-in">
        <header className="st-head">
          <span className="st-pill">Povestea unui eveniment{event.starts_at ? ` · ${formatEventDate(event.starts_at, false)}` : ''}{event.city ? `, ${event.city}` : ''}</span>
          <H className="st-h">{event.title}</H>
          {event.summary && <p className="st-sum">{event.summary}</p>}
        </header>

        {cover && (
          <a href={photoUrl(cover.path)} target="_blank" rel="noopener noreferrer" className="st-hero" aria-label={`Poza principală: ${cover.caption || event.title}`}>
            <img src={photoUrl(cover.path)} alt={cover.caption || event.title} decoding="async" fetchPriority="high" />
            {cover.caption && <span className="ev-cap">{cover.caption}</span>}
          </a>
        )}

        <div className="st-body">
          {facts.length > 0 && (
            <dl className="st-facts" aria-label="Pe scurt">
              {facts.map(([k, v]) => <div className="st-fact" key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
          )}
          <div className="st-text">
            {blocks.map((b, i) => {
              if (b.t === 'h') return <h3 key={i} className="st-h3">{b.text}</h3>
              if (b.t === 'quote') return <blockquote key={i} className="st-quote">„{b.text}”{b.by && <footer>{b.by}</footer>}</blockquote>
              if (b.t === 'p') return <p key={i} className="st-p">{b.text}</p>
              const ps = b.nums.map(pic).filter(Boolean) as SiteEventPhoto[]
              if (!ps.length) return null
              return (
                <div key={i} className={`st-row st-row-${Math.min(ps.length, 3)}`}>
                  {ps.map(p => (
                    <a key={p.id} href={photoUrl(p.path)} target="_blank" rel="noopener noreferrer" className="st-pic" aria-label={`Poză: ${p.caption || event.title}`}>
                      <img src={photoUrl(p.path)} alt={p.caption || event.title} loading="lazy" decoding="async" />
                      {p.caption && <span className="ev-cap">{p.caption}</span>}
                    </a>
                  ))}
                </div>
              )
            })}
          </div>
        </div>

        {photos.length > 0 && (
          <div className="st-foot">
            <span>Toate cele <b>{photos.length} {photos.length === 1 ? 'fotografie' : 'fotografii'}</b> sunt în galerie.</span>
            <a href="#galerie" className="af-btn af-btn-ink">Vezi toate pozele</a>
          </div>
        )}
      </div>
    </article>
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

.st{background:#fff;border-block:1px solid var(--line)}
.st-in{padding-block:clamp(40px,7vw,88px);display:flex;flex-direction:column;gap:clamp(24px,4vw,44px)}
.st-head{display:flex;flex-direction:column;gap:16px;max-width:860px}
.st-pill{align-self:flex-start;font-size:13px;font-weight:700;color:#4423c4;background:#efeaff;padding:7px 14px;border-radius:999px}
.st-h{margin:0;font-weight:800;font-size:clamp(32px,5vw,56px);line-height:1.05;letter-spacing:-.02em;text-wrap:balance}
.st-sum{margin:0;font-size:clamp(18px,2vw,21px);color:var(--muted);max-width:38em}
.st-hero,.st-pic{position:relative;display:block;overflow:hidden;background:#e9e6f7;color:var(--ink);text-decoration:none}
.st-hero{border-radius:24px;aspect-ratio:21/9;min-height:220px}
.st-hero img,.st-pic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.st-hero .ev-cap,.st-pic .ev-cap{position:absolute;left:14px;bottom:14px;max-width:calc(100% - 28px)}
.st-body{display:grid;grid-template-columns:minmax(0,290px) minmax(0,1fr);gap:clamp(28px,5vw,64px);align-items:start}
.st-body:not(:has(.st-facts)){grid-template-columns:minmax(0,1fr)}
.st-facts{margin:0;position:sticky;top:96px;background:var(--bg);border:1px solid var(--line);border-radius:18px;overflow:hidden}
.st-fact{display:flex;flex-direction:column;gap:2px;padding:16px 20px;border-bottom:1px solid var(--line)}
.st-fact:last-child{border-bottom:0}
.st-fact dt{font-size:12px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--soft)}
.st-fact dd{margin:0;font-weight:700;font-size:17px}
.st-text{display:flex;flex-direction:column;gap:22px;min-width:0}
.st-p{margin:0;font-size:18px;line-height:1.7;color:#26234f;max-width:40em;white-space:pre-line}
.st-h3{margin:12px 0 -6px;font-weight:800;font-size:26px;line-height:1.2;max-width:24em}
.st-quote{margin:8px 0;padding:4px 0 4px 22px;border-left:4px solid #7040f0;font-family:var(--font-display,system-ui),system-ui,sans-serif;font-weight:600;font-size:clamp(22px,2.6vw,28px);line-height:1.3;max-width:28em}
.st-quote footer{margin-top:10px;font-family:var(--font-body,system-ui),system-ui,sans-serif;font-weight:600;font-size:14px;color:var(--soft)}
.st-row{display:grid;gap:14px;margin-block:6px}
.st-row-1{grid-template-columns:minmax(0,1fr)}
.st-row-1 .st-pic{aspect-ratio:16/9;border-radius:20px}
.st-row-2{grid-template-columns:repeat(2,minmax(0,1fr))}
.st-row-3{grid-template-columns:1.4fr 1fr 1fr}
.st-row-2 .st-pic,.st-row-3 .st-pic{aspect-ratio:4/3;border-radius:16px}
.st-row-3 .st-pic+.st-pic{aspect-ratio:3/4}
.st-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;border-top:1px solid var(--line);padding-top:24px;color:var(--muted)}
.st-foot b{color:var(--ink)}
@media(max-width:900px){.st-body{grid-template-columns:minmax(0,1fr)}.st-facts{position:static;display:flex;flex-wrap:wrap}.st-fact{flex:1 1 140px;border-bottom:0;border-right:1px solid var(--line)}.st-fact:last-child{border-right:0}.st-hero{aspect-ratio:4/3;border-radius:20px}}
@media(max-width:620px){
  .st-fact{flex-basis:50%}
  .st-p{font-size:17px}
  .st-row-2,.st-row-3{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;margin-inline:-16px;padding-inline:16px;scroll-padding-inline:16px;-webkit-overflow-scrolling:touch}
  .st-row-2 .st-pic,.st-row-3 .st-pic,.st-row-3 .st-pic+.st-pic{flex:0 0 78%;aspect-ratio:4/5;scroll-snap-align:start}
}
.ev-back{display:inline-flex;align-items:center;min-height:44px;font-weight:700;font-size:14px;color:#4423c4;text-decoration:none}
`
