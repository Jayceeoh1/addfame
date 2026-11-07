'use client'
// Raportul total al unei campanii: totalurile tuturor creatorilor, clasamentul și, la rând, raportul fiecăruia.
// Brandul vede doar rapoartele publicate; adminul poate include și ciornele. „Descarcă PDF” = tipărire → Salvează ca PDF.
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, Loader2, EyeOff, ExternalLink } from 'lucide-react'
import { getCampaignReport, type CampaignReportData } from '@/app/actions/collab-report'
import { CollabReportView, REPORT_CSS } from '@/components/report/CollabReportView'
import { computeReportTotals, fmtInt, fmtLei, fmtPct, fmtDay, fmtDate } from '@/lib/collab-report'

const PAGE_CSS = `
.rp{min-height:100vh;background:#f6f5fb;color:#15123a;font-variant-numeric:tabular-nums}
.rp-bar{background:#fff;border-bottom:1px solid #e6e3f2}
.rp-in{max-width:1120px;margin:0 auto;padding:12px 20px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}
.rp-main{max-width:1120px;margin:0 auto;padding:24px 20px 64px;display:flex;flex-direction:column;gap:20px}
.rp-btn{min-height:44px;padding:0 16px;border-radius:12px;border:1px solid #d9d5ea;background:#fff;color:#15123a;font-weight:700;font-size:14px;display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-family:inherit;text-decoration:none}
.rp-btn.p{background:#5b2fd0;border-color:#5b2fd0;color:#fff}
.rp-check{display:inline-flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;min-height:44px;cursor:pointer;color:#57537a}
.rp-check input{width:18px;height:18px;accent-color:#5b2fd0}
.rp-draft{display:flex;gap:10px;align-items:center;background:#fff1c2;color:#6b4700;border-radius:14px;padding:12px 16px;font-size:14px;font-weight:600}
.rp-msg{max-width:520px;margin:80px auto;background:#fff;border:1px solid #e6e3f2;border-radius:20px;padding:28px;text-align:center;display:flex;flex-direction:column;gap:14px;align-items:center}
.rk-wrap{overflow-x:auto}
.rk{width:100%;border-collapse:collapse;font-size:14px;min-width:760px}
.rk th{text-align:left;font-size:11.5px;font-weight:800;color:#57537a;text-transform:uppercase;letter-spacing:.04em;padding:10px 10px;border-bottom:1.5px solid #e6e3f2;white-space:nowrap}
.rk td{padding:12px 10px;border-bottom:1px solid #f0eef8;vertical-align:middle;white-space:nowrap}
.rk td.n{text-align:right}.rk th.n{text-align:right}
.rk-who{display:flex;align-items:center;gap:10px;white-space:normal;min-width:180px}
.rk-av{width:34px;height:34px;border-radius:50%;background:#ece7ff;color:#3b2a9e;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex:none;overflow:hidden}
.rk-av img{width:100%;height:100%;object-fit:cover}
.rk-bar{height:6px;border-radius:99px;background:#efeaff;margin-top:5px;min-width:80px}
.rk-bar div{height:6px;border-radius:99px;background:#5b2fd0}
.rk-pos{width:26px;height:26px;border-radius:8px;background:#f1edff;color:#4a24c4;font-weight:800;font-size:12.5px;display:inline-flex;align-items:center;justify-content:center}
.rp-sep{display:flex;align-items:center;gap:12px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6a52e0;margin-top:12px}
.rp-sep::after{content:'';flex:1;height:1px;background:#e6e3f2}
@media print{.rp{background:#fff}.rp-bar,.rp-draft,.rp-noprint{display:none!important}.rp-main{padding:0}.rp-page{break-before:page}.rk{min-width:0;font-size:11.5px}.rk-wrap{overflow:visible}}
`

const initials = (s: string) => (s || '?').replace(/^@/, '').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase()

export default function RaportCampaniePage() {
  const { id } = useParams<{ id: string }>()
  const [drafts, setDrafts] = useState(false)
  const [withEach, setWithEach] = useState(true)
  const [state, setState] = useState<{ data?: CampaignReportData; error?: string } | null>(null)

  useEffect(() => {
    setState(null)
    getCampaignReport(String(id), drafts).then(setState).catch(() => setState({ error: 'Nu am putut încărca raportul.' }))
  }, [id, drafts])

  const d = state?.data
  const agg = useMemo(() => {
    if (!d) return null
    const t = computeReportTotals(d.reports.flatMap(r => r.rows))
    const costs = d.reports.map(r => r.cost.lei).filter((x): x is number => x != null)
    const cost = costs.length ? costs.reduce((a, b) => a + b, 0) : null
    const froms = d.reports.map(r => r.period.from).filter(Boolean).sort() as string[]
    const tos = d.reports.map(r => r.period.to).filter(Boolean).sort() as string[]
    const followers = d.reports.reduce((s, r) => s + (r.creator.followers || 0), 0)
    const posts = d.reports.reduce((s, r) => s + r.rows.filter(x => x.kind !== 'story').length, 0)
    const stories = d.reports.reduce((s, r) => s + r.rows.filter(x => x.kind === 'story').length, 0)
    return {
      t, cost, followers, posts, stories,
      perThousand: cost != null && t.views > 0 ? Math.round(cost / t.views * 1000 * 100) / 100 : null,
      perInteraction: cost != null && t.interactions > 0 ? Math.round(cost / t.interactions * 100) / 100 : null,
      from: froms[0] || null, to: tos[tos.length - 1] || null,
      maxViews: Math.max(1, ...d.reports.map(r => r.totals.views)),
    }
  }, [d])

  const back = d?.viewer === 'brand' ? `/brand/campaigns/${id}/report` : `/admin/rapoarte?campanie=${id}`

  return (
    <div className="rp">
      <style>{PAGE_CSS + REPORT_CSS}</style>
      <header className="rp-bar">
        <div className="rp-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href={back} className="rp-btn"><ArrowLeft size={16} /> Înapoi</Link>
            <span style={{ fontWeight: 800, fontSize: 16 }}>AddFame</span>
          </div>
          {d && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {d.viewer === 'admin' && <label className="rp-check"><input type="checkbox" checked={drafts} onChange={e => setDrafts(e.target.checked)} /> Include și ciornele</label>}
              <label className="rp-check"><input type="checkbox" checked={withEach} onChange={e => setWithEach(e.target.checked)} /> Cu raportul fiecărui creator</label>
              <button type="button" className="rp-btn p" onClick={() => window.print()} disabled={!d.reports.length}><Download size={15} /> Descarcă PDF</button>
            </div>
          )}
        </div>
      </header>

      {!state && <div className="rp-msg"><Loader2 className="animate-spin" size={22} /> Se încarcă raportul…</div>}
      {state?.error && (
        <div className="rp-msg">
          <b style={{ fontSize: 18 }}>{state.error === 'login' ? 'Intră în cont ca să vezi raportul' : state.error}</b>
          {state.error === 'login' && <Link href="/auth/login" className="rp-btn p">Intră în cont</Link>}
        </div>
      )}

      {d && agg && (
        <main className="rp-main">
          {d.viewer === 'admin' && d.drafts > 0 && (
            <div className="rp-draft"><EyeOff size={17} /> {d.drafts} {d.drafts === 1 ? 'raport e încă ciornă' : 'rapoarte sunt încă ciorne'}. {drafts ? 'Le vezi acum aici, dar brandul nu le vede.' : 'Brandul vede doar rapoartele publicate.'}</div>
          )}

          {!d.reports.length ? (
            <div className="rp-msg" style={{ margin: '20px auto' }}><b>Nu există încă rapoarte publicate pentru această campanie.</b><span style={{ color: '#57537a' }}>Apar aici pe măsură ce le publicăm.</span></div>
          ) : (
            <div className="cr">
              <section className="cr-card cr-head">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: '1 1 420px' }}>
                  <span className="cr-eyebrow">Raport de campanie</span>
                  <h1 className="cr-name">{d.campaign.name}</h1>
                  <span className="cr-sub">{d.campaign.brandName} · {d.reports.length} {d.reports.length === 1 ? 'creator' : 'creatori'}{agg.followers ? ` · ${fmtInt(agg.followers)} urmăritori în total` : ''}</span>
                </div>
                <dl className="cr-meta">
                  <div><dt>Perioadă</dt><dd>{agg.from ? `${fmtDay(agg.from)} – ${agg.to ? fmtDate(agg.to) : 'în desfășurare'}` : '—'}</dd></div>
                  <div><dt>Livrabile</dt><dd>{[agg.posts ? `${agg.posts} postări` : '', agg.stories ? `${agg.stories} story-uri` : ''].filter(Boolean).join(' + ') || '—'}</dd></div>
                </dl>
              </section>

              <section aria-labelledby="rc-tot" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h2 id="rc-tot" className="cr-h2">Totalul campaniei</h2>
                <div className="cr-kpis">
                  <div className="cr-kpi"><b>Vizualizări</b><span>{fmtInt(agg.t.views)}</span><small>{[agg.t.viewsPosts ? `postări ${fmtInt(agg.t.viewsPosts)}` : '', agg.t.viewsStories ? `story-uri ${fmtInt(agg.t.viewsStories)}` : ''].filter(Boolean).join(' · ') || 'total'}</small></div>
                  <div className="cr-kpi"><b>Conturi atinse</b><span>{fmtInt(agg.t.reach)}</span><small>suma pe creatori</small></div>
                  <div className="cr-kpi"><b>Interacțiuni</b><span>{fmtInt(agg.t.interactions)}</span><small>{fmtInt(agg.t.likes)} like · {fmtInt(agg.t.saves)} salvări · {fmtInt(agg.t.comments)} comentarii</small></div>
                  {agg.t.clicks > 0 && <div className="cr-kpi"><b>Clicuri pe link</b><span>{fmtInt(agg.t.clicks)}</span><small>din story-uri și postări</small></div>}
                  <div className="cr-kpi acc"><b>Rată de engagement</b><span>{fmtPct(agg.t.er)}</span><small>{agg.t.erBase === 'reach' ? 'interacțiuni / conturi atinse' : 'interacțiuni / vizualizări'}</small></div>
                </div>
                {agg.cost != null && (
                  <div className="cr-costs">
                    <div className="cr-cost"><span>Cost total creatori</span><b>{fmtLei(agg.cost)}</b></div>
                    <div className="cr-cost"><span>Cost / 1.000 vizualizări</span><b>{fmtLei(agg.perThousand)}</b></div>
                    <div className="cr-cost"><span>Cost / interacțiune</span><b>{fmtLei(agg.perInteraction)}</b></div>
                  </div>
                )}
              </section>

              <section className="cr-card" aria-labelledby="rc-top" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h2 id="rc-top" className="cr-h2">Creatorii, după vizualizări</h2>
                <div className="rk-wrap">
                  <table className="rk">
                    <thead><tr>
                      <th>#</th><th>Creator</th><th>Livrabile</th><th className="n">Vizualizări</th><th className="n">Conturi atinse</th>
                      <th className="n">Interacțiuni</th><th className="n">Engagement</th><th className="n">Cost</th><th className="n">Cost / 1.000</th><th className="rp-noprint"><span className="sr-only">Raport</span></th>
                    </tr></thead>
                    <tbody>
                      {d.reports.map((r, i) => {
                        const p = r.rows.filter(x => x.kind !== 'story').length, s = r.rows.filter(x => x.kind === 'story').length
                        return (
                          <tr key={r.collabId}>
                            <td><span className="rk-pos">{i + 1}</span></td>
                            <td>
                              <div className="rk-who">
                                <span className="rk-av" aria-hidden="true">{r.creator.avatar ? <img src={r.creator.avatar} alt="" /> : initials(r.creator.name)}</span>
                                <span style={{ display: 'flex', flexDirection: 'column' }}>
                                  <b>{r.creator.name}</b>
                                  <span style={{ fontSize: 12.5, color: '#57537a' }}>{r.creator.handle || ''}{d.viewer === 'admin' && r.settings.status !== 'published' ? ' · ciornă' : ''}</span>
                                </span>
                              </div>
                            </td>
                            <td>{[p ? `${p} post.` : '', s ? `${s} story` : ''].filter(Boolean).join(' + ') || '—'}</td>
                            <td className="n"><b>{fmtInt(r.totals.views)}</b><div className="rk-bar"><div style={{ width: `${Math.round(r.totals.views / agg.maxViews * 100)}%` }} /></div></td>
                            <td className="n">{fmtInt(r.totals.reach)}</td>
                            <td className="n">{fmtInt(r.totals.interactions)}</td>
                            <td className="n">{fmtPct(r.totals.er)}</td>
                            <td className="n">{fmtLei(r.cost.lei)}</td>
                            <td className="n">{fmtLei(r.cost.perThousand)}</td>
                            <td className="rp-noprint"><Link href={`/raport/${r.collabId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, fontSize: 13, color: '#4a24c4' }}>Raport <ExternalLink size={12} /></Link></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <footer className="cr-foot">
                <span>Cifre: automat din conturile conectate, verificate de echipa AddFame sau raportate de creatori cu captură de ecran.</span>
                <span>Generat de AddFame · {fmtDate(new Date().toISOString())}</span>
              </footer>
            </div>
          )}

          {withEach && d.reports.map(r => (
            <div key={r.collabId} className="rp-page" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="rp-sep">{r.creator.name}</div>
              <CollabReportView report={r} viewer={d.viewer} />
            </div>
          ))}
        </main>
      )}
    </div>
  )
}
