'use client'
// Raportul unei colaborări (designul „Clar”): cifre, cost, postări și story-uri, parcurs, brand și brief.
// Folosit pe /raport/[id] (brand, creator, admin) și în previzualizarea din admin. Se tipărește ca PDF.
import { useState } from 'react'
import { Check, ExternalLink, Image as ImageIcon, Loader2, Download, Share2, X } from 'lucide-react'
import type { CollabReport } from '@/lib/collab-report'
import { fmtInt, fmtLei, fmtPct, fmtDay, fmtDate, KIND_LABEL, PLATFORM_LABEL } from '@/lib/collab-report'

export const REPORT_CSS = `
.cr{--ink:#15123a;--muted:#57537a;--line:#e6e3f2;--soft:#f6f5fb;--acc:#5b2fd0;--good:#0f6b3a;--goodbg:#e3f6ec;--warm:#6b4700;--warmbg:#fff1c2;
  color:var(--ink);font-variant-numeric:tabular-nums;display:flex;flex-direction:column;gap:20px}
.cr *{box-sizing:border-box}
.cr h1,.cr h2{margin:0;text-wrap:balance}
.cr-card{background:#fff;border:1px solid var(--line);border-radius:20px;padding:24px}
.cr-head{display:flex;flex-wrap:wrap;gap:24px;align-items:center;justify-content:space-between}
.cr-who{display:flex;gap:16px;align-items:center;min-width:0;flex:1 1 380px}
.cr-av{width:80px;height:80px;border-radius:50%;background:#ece7ff;color:#3b2a9e;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:26px;flex:none;overflow:hidden}
.cr-av img{width:100%;height:100%;object-fit:cover}
.cr-eyebrow{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6a52e0}
.cr-name{font-size:30px;line-height:1.1;font-weight:800;letter-spacing:-.02em}
.cr-sub{font-size:14.5px;color:var(--muted)}
.cr-meta{margin:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 28px;flex:1 1 340px}
.cr-meta dt{font-size:12px;color:#8a86a8;font-weight:600}
.cr-meta dd{margin:2px 0 0;font-weight:700;font-size:14px}
.cr-chips{display:flex;flex-wrap:wrap;gap:8px}
.cr-chip{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:999px;font-weight:700;font-size:13.5px}
.cr-chip.good{background:var(--goodbg);color:var(--good)}.cr-chip.warm{background:var(--warmbg);color:var(--warm)}.cr-chip.neutral{background:#efedf7;color:var(--muted)}
.cr-h2{font-size:19px;font-weight:800}
.cr-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.cr-kpi{background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:4px}
.cr-kpi b{font-size:13px;color:var(--muted)}
.cr-kpi span{font-size:34px;font-weight:800;letter-spacing:-.02em;line-height:1.1}
.cr-kpi small{font-size:12.5px;color:var(--muted)}
.cr-kpi.acc{background:var(--acc);border-color:var(--acc);color:#fff}.cr-kpi.acc b,.cr-kpi.acc small{color:#e4ddff}
.cr-costs{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.cr-cost{background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px 18px;display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.cr-cost span{font-size:13.5px;color:var(--muted);font-weight:600}.cr-cost b{font-size:19px;font-weight:800}
.cr-posts{display:flex;flex-direction:column;gap:18px}
.cr-post{display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start;border-top:1px solid #eeebf6;padding-top:18px}
.cr-post:first-child{border-top:0;padding-top:0}
.cr-thumb{width:96px;aspect-ratio:9/16;border-radius:14px;background:#2a1673;color:#d9d2ff;display:flex;flex-direction:column;justify-content:space-between;padding:10px;flex:none;overflow:hidden;position:relative;font-size:11.5px;font-weight:700}
.cr-thumb.story{background:#ece7ff;color:#3b2a9e}
.cr-thumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cr-thumb .cr-tag{position:relative;align-self:flex-start;background:rgba(17,12,43,.55);color:#fff;padding:3px 7px;border-radius:7px;font-size:11px;font-weight:800}
.cr-pbody{flex:1 1 200px;min-width:0;display:flex;flex-direction:column;gap:10px}
.cr-ptitle{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-weight:800;font-size:15.5px}
.cr-src{font-size:11.5px;font-weight:700;padding:3px 9px;border-radius:999px}
.cr-src.auto,.cr-src.admin{background:var(--goodbg);color:var(--good)}.cr-src.creator{background:var(--warmbg);color:var(--warm)}.cr-src.pending{background:#efedf7;color:var(--muted)}
.cr-plink{font-size:13.5px;font-weight:600;color:#4a24c4;overflow-wrap:anywhere;display:inline-flex;gap:4px;align-items:center}
.cr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px}
.cr-m{background:var(--soft);border-radius:12px;padding:10px 12px}
.cr-m div:first-child{font-size:11.5px;color:var(--muted);font-weight:600}.cr-m div:last-child{font-size:18px;font-weight:800}
.cr-shot{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:#4a24c4;background:none;border:0;padding:0;cursor:pointer;font-family:inherit;min-height:32px}
.cr-tl{margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:12px}
.cr-tl li{display:flex;flex-direction:column;gap:5px;border-top:3px solid var(--acc);padding-top:10px}
.cr-tl li.done{border-top-color:#0f9d58}
.cr-tl span{font-size:12px;color:var(--muted);font-weight:600}.cr-tl b{font-size:14px}
.cr-two{display:flex;flex-wrap:wrap;gap:20px}.cr-two>*{flex:1 1 380px;min-width:0}
.cr-stars{font-size:22px;font-weight:800;color:#b07800;letter-spacing:2px}
.cr-quote{margin:0;font-size:16px;line-height:1.55;color:#2c2950}
.cr-list{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px;font-size:15px;line-height:1.45}
.cr-list li{display:flex;gap:10px;align-items:flex-start}
.cr-num{flex:none;width:26px;height:26px;border-radius:8px;background:#efeaff;color:var(--acc);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px}
.cr-empty{font-size:14px;color:var(--muted);background:var(--soft);border-radius:14px;padding:14px 16px}
.cr-foot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;font-size:12.5px;color:var(--muted);border-top:1px solid var(--line);padding-top:14px}
.cr-lb{position:fixed;inset:0;background:rgba(17,12,43,.8);display:flex;align-items:center;justify-content:center;padding:24px;z-index:80}
.cr-lb img{max-width:100%;max-height:100%;border-radius:12px;background:#fff}
.cr-lb button{position:absolute;top:16px;right:16px;width:44px;height:44px;border-radius:50%;border:0;background:#fff;color:var(--ink);display:flex;align-items:center;justify-content:center;cursor:pointer}
@media (max-width:560px){.cr-thumb{width:64px;padding:6px}.cr-thumb>span:last-child{display:none}.cr-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.cr-kpi span{font-size:26px}.cr-meta{grid-template-columns:1fr 1fr}.cr-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cr-post{flex-wrap:nowrap;gap:12px}}
@media print{
  .cr-noprint{display:none!important}
  .cr-card,.cr-kpi,.cr-cost{break-inside:avoid}
  .cr-post{break-inside:avoid}
  .cr-kpi.acc{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
`

function initials(s: string) {
  return (s || '?').replace(/^@/, '').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '?'
}

const SRC: Record<string, { cls: string; text: string }> = {
  instagram: { cls: 'auto', text: 'Automat din Instagram' },
  youtube: { cls: 'auto', text: 'Automat din YouTube' },
  admin: { cls: 'admin', text: 'Verificat de AddFame' },
  creator: { cls: 'creator', text: 'Raportat de creator' },
  pending: { cls: 'pending', text: 'Necompletat' },
}

export function CollabReportView({ report: r, viewer }: { report: CollabReport; viewer: 'admin' | 'brand' | 'influencer' }) {
  const [shot, setShot] = useState<string | null>(null)
  const hidden = new Set(r.settings.hidden)
  const t = r.totals
  const posts = r.rows.filter(x => x.kind !== 'story'), stories = r.rows.filter(x => x.kind === 'story')
  const viewsSub = [t.viewsPosts ? `postări ${fmtInt(t.viewsPosts)}` : '', t.viewsStories ? `story-uri ${fmtInt(t.viewsStories)}` : ''].filter(Boolean).join(' · ')
  const reachSub = r.creator.followers && t.reach ? `${(t.reach / r.creator.followers).toLocaleString('ro-RO', { maximumFractionDigits: 1 })}× numărul de urmăritori` : 'oameni unici care au văzut postarea'
  const showCost = !hidden.has('cost') && r.cost.lei != null
  const deliverables = [posts.length ? `${posts.length} ${posts.length === 1 ? 'postare' : 'postări'}` : '', stories.length ? `${stories.length} ${stories.length === 1 ? 'story' : 'story-uri'}` : ''].filter(Boolean).join(' + ') || '—'

  const metric = (label: string, v: number | null) => (
    <div className="cr-m" key={label}><div>{label}</div><div>{fmtInt(v)}</div></div>
  )

  return (
    <div className="cr">
      <section className="cr-card cr-head">
        <div className="cr-who">
          <div className="cr-av" aria-hidden="true">{r.creator.avatar ? <img src={r.creator.avatar} alt="" /> : initials(r.creator.name)}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
            <span className="cr-eyebrow">Raport de colaborare{r.settings.code ? ` · ${r.settings.code}` : ''}</span>
            <h1 className="cr-name">{r.creator.name}</h1>
            <span className="cr-sub">
              {[r.creator.handle, r.creator.followers ? `${fmtInt(r.creator.followers)} urmăritori` : '', r.creator.niches.join(', ')].filter(Boolean).join(' · ')}
            </span>
          </div>
        </div>
        <dl className="cr-meta">
          <div><dt>Campanie</dt><dd>{r.campaign.name}</dd></div>
          <div><dt>Brand</dt><dd>{r.campaign.brandName}</dd></div>
          <div><dt>Perioadă</dt><dd>{r.period.from ? `${fmtDay(r.period.from)} – ${r.period.to ? fmtDate(r.period.to) : 'în desfășurare'}` : '—'}</dd></div>
          <div><dt>Livrabile</dt><dd>{deliverables}</dd></div>
        </dl>
      </section>

      {r.chips.length > 0 && (
        <div className="cr-chips">
          {r.chips.map(c => (
            <span key={c.text} className={`cr-chip ${c.tone}`}>{c.tone === 'good' && <Check size={15} strokeWidth={2.6} aria-hidden="true" />}{c.text}</span>
          ))}
        </div>
      )}

      <section aria-labelledby="cr-rez" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 id="cr-rez" className="cr-h2">Rezultate</h2>
        {t.withData === 0 ? (
          <p className="cr-empty">Cifrele nu au fost completate încă. Apar aici imediat ce creatorul le trimite sau le verificăm noi.</p>
        ) : (
          <div className="cr-kpis">
            <div className="cr-kpi"><b>Vizualizări</b><span>{fmtInt(t.views)}</span><small>{viewsSub || 'total'}</small></div>
            <div className="cr-kpi"><b>Conturi atinse</b><span>{fmtInt(t.reach)}</span><small>{reachSub}</small></div>
            <div className="cr-kpi"><b>Interacțiuni</b><span>{fmtInt(t.interactions)}</span><small>like, comentarii, distribuiri, salvări</small></div>
            {t.clicks > 0 && <div className="cr-kpi"><b>Clicuri pe link</b><span>{fmtInt(t.clicks)}</span><small>din story-uri și postări</small></div>}
            <div className="cr-kpi acc"><b>Rată de engagement</b><span>{fmtPct(t.er)}</span><small>{t.erBase === 'reach' ? 'interacțiuni / conturi atinse' : t.erBase === 'views' ? 'interacțiuni / vizualizări' : 'fără date suficiente'}</small></div>
          </div>
        )}
        {showCost && (
          <div className="cr-costs">
            <div className="cr-cost"><span>Cost colaborare</span><b>{fmtLei(r.cost.lei)}</b></div>
            <div className="cr-cost"><span>Cost / 1.000 vizualizări</span><b>{fmtLei(r.cost.perThousand)}</b></div>
            <div className="cr-cost"><span>Cost / interacțiune</span><b>{fmtLei(r.cost.perInteraction)}</b></div>
          </div>
        )}
      </section>

      {r.rows.length > 0 && (
        <section className="cr-card" aria-labelledby="cr-post" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 id="cr-post" className="cr-h2">Postări și story-uri</h2>
          <div className="cr-posts">
            {r.rows.map(p => {
              const src = SRC[p.source] || SRC.pending
              const isStory = p.kind === 'story'
              const img = p.thumbnail_url || (isStory ? p.screenshot_url : null)
              return (
                <article key={p.id} className="cr-post">
                  <div className={`cr-thumb${isStory ? ' story' : ''}`}>
                    {img && <img src={img} alt="" />}
                    <span className="cr-tag">{(KIND_LABEL[p.kind] || 'Postare').toUpperCase()}</span>
                    {!img && <span style={{ position: 'relative' }}>{PLATFORM_LABEL[p.platform] || ''}</span>}
                  </div>
                  <div className="cr-pbody">
                    <div className="cr-ptitle"><span>{p.label}</span><span className={`cr-src ${src.cls}`}>{src.text}{p.screenshot_url && p.source === 'creator' ? ' · cu captură' : ''}</span></div>
                    {p.linkable && <a className="cr-plink" href={p.url} target="_blank" rel="noopener noreferrer">{p.url.replace(/^https:\/\//, '').slice(0, 60)}<ExternalLink size={13} aria-hidden="true" /></a>}
                    <div className="cr-grid">
                      {metric('Vizualizări', p.views)}
                      {metric('Conturi atinse', p.reach)}
                      {metric(isStory ? 'Reacții' : 'Like-uri', p.likes)}
                      {metric(isStory ? 'Răspunsuri' : 'Comentarii', p.comments)}
                      {metric('Distribuiri', p.shares)}
                      {!isStory && metric('Salvări', p.saves)}
                      {(isStory || p.link_clicks != null) && metric('Clicuri pe link', p.link_clicks)}
                    </div>
                    {p.screenshot_url && (
                      <button type="button" className="cr-shot cr-noprint" onClick={() => setShot(p.screenshot_url)}>
                        <ImageIcon size={15} aria-hidden="true" /> Vezi captura cu statisticile
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {!hidden.has('timeline') && r.timeline.length > 0 && (
        <section className="cr-card" aria-labelledby="cr-tl" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 id="cr-tl" className="cr-h2">Parcursul colaborării</h2>
          <ol className="cr-tl">
            {r.timeline.map(s => (
              <li key={s.key} className={s.key === 'done' ? 'done' : ''}><span>{fmtDay(s.at)}</span><b>{s.label}</b></li>
            ))}
          </ol>
        </section>
      )}

      {(() => {
        const quote = !hidden.has('quote') && (r.quote.text || r.review.rating)
        const brief = !hidden.has('brief') && r.settings.brief_checks.length > 0
        if (!quote && !brief) return null
        return (
          <div className="cr-two">
            {quote && (
              <section className="cr-card" aria-labelledby="cr-q" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h2 id="cr-q" className="cr-h2">Ce spune brandul</h2>
                {r.review.rating ? <div className="cr-stars" aria-label={`${r.review.rating} din 5 stele`}>{'★'.repeat(Math.round(r.review.rating))}<span style={{ color: '#ddd6c0' }}>{'★'.repeat(5 - Math.round(r.review.rating))}</span></div> : null}
                {r.quote.text && <blockquote className="cr-quote">„{r.quote.text}”</blockquote>}
                {r.quote.author && <span className="cr-sub" style={{ fontSize: 13 }}>{r.quote.author}</span>}
              </section>
            )}
            {brief && (
              <section className="cr-card" aria-labelledby="cr-b" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h2 id="cr-b" className="cr-h2">Respectarea briefului</h2>
                <ul className="cr-list">
                  {r.settings.brief_checks.map((b, i) => (
                    <li key={i}>
                      {b.ok ? <Check size={19} color="#0f9d58" strokeWidth={2.6} style={{ flex: 'none', marginTop: 1 }} aria-label="Respectat" />
                        : <X size={19} color="#b42318" strokeWidth={2.6} style={{ flex: 'none', marginTop: 1 }} aria-label="Nerespectat" />}
                      <span>{b.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )
      })()}

      {!hidden.has('highlights') && r.settings.highlights.length > 0 && (
        <section className="cr-card" aria-labelledby="cr-h" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 id="cr-h" className="cr-h2">De ce a mers</h2>
          <ul className="cr-list">
            {r.settings.highlights.map((h, i) => <li key={i}><span className="cr-num">{i + 1}</span><span>{h}</span></li>)}
          </ul>
        </section>
      )}

      <footer className="cr-foot">
        <span><b style={{ color: '#0f6b3a' }}>Automat</b> = citit din contul conectat · <b style={{ color: '#0f6b3a' }}>Verificat</b> = confirmat de echipa AddFame · <b style={{ color: '#6b4700' }}>Raportat de creator</b> = completat de creator, cu captură</span>
        <span>Generat de AddFame{r.settings.published_at ? ` · ${fmtDate(r.settings.published_at)}` : ''}{r.settings.code ? ` · ${r.settings.code}` : ''}</span>
      </footer>

      {shot && (
        <div className="cr-lb cr-noprint" role="dialog" aria-label="Captura cu statisticile" onClick={() => setShot(null)}>
          <img src={shot} alt="Captura cu statisticile" onClick={e => e.stopPropagation()} />
          <button type="button" aria-label="Închide" onClick={() => setShot(null)}><X size={20} /></button>
        </div>
      )}
    </div>
  )
}

/** Butonul „Imagine pentru Story” (creator și admin). */
export function ReportStoryButton({ report: r }: { report: CollabReport }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const name = `Rezultate-${r.campaign.brandName.replace(/[^\w-]+/g, '-')}.png`

  async function make() {
    setBusy(true); setMsg(null)
    try {
      const { makeReportStory } = await import('@/lib/report-story')
      const font = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif'
      const b = await makeReportStory({
        brand: r.campaign.brandName, campaign: r.campaign.name, handle: r.creator.handle, name: r.creator.name, avatar: r.creator.avatar,
        views: r.totals.views, er: r.totals.er, reach: r.totals.reach, clicks: r.totals.clicks,
      }, font)
      setBlob(b); setPreview(URL.createObjectURL(b))
    } catch { setMsg('Nu am putut crea imaginea. Încearcă din nou.') }
    setBusy(false)
  }

  async function share() {
    if (!blob) return
    const { shareStory } = await import('@/lib/academy-story')
    const res = await shareStory(blob, name)
    if (res === 'downloaded') setMsg('Imaginea a fost descărcată. O poți posta pe Story.')
  }

  if (!r.totals.views) return null
  return (
    <div className="cr-card cr-noprint" style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
      <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 className="cr-h2">Imagine pentru Story</h2>
        <p className="cr-sub" style={{ margin: 0, lineHeight: 1.5 }}>Rezultatele tale cu {r.campaign.brandName}, gata de postat. Etichetează brandul și @addfame.ro.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {!preview ? (
            <button type="button" onClick={make} disabled={busy} style={btn(true)}>{busy ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />} Creează imaginea</button>
          ) : (
            <>
              <button type="button" onClick={share} style={btn(true)}><Share2 size={15} /> Postează pe Story</button>
              <a href={preview} download={name} style={{ ...btn(false), textDecoration: 'none' }}><Download size={15} /> Descarcă</a>
            </>
          )}
        </div>
        {msg && <span className="cr-sub" style={{ fontSize: 13 }}>{msg}</span>}
      </div>
      {preview && <img src={preview} alt="Previzualizare imagine Story" style={{ width: 160, aspectRatio: '9/16', borderRadius: 16, border: '1px solid #e6e3f2', flex: 'none' }} />}
    </div>
  )
}

function btn(primary: boolean): React.CSSProperties {
  return {
    minHeight: 44, padding: '0 16px', borderRadius: 12, border: primary ? 0 : '1px solid #d9d5ea', background: primary ? '#5b2fd0' : '#fff',
    color: primary ? '#fff' : '#15123a', fontWeight: 800, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'inherit',
  }
}
