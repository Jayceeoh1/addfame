'use client'
// Raportul unei colaborări: îl văd brandul și creatorul după ce îl publică echipa AddFame (adminul oricând).
// „Descarcă PDF” folosește tipărirea din browser („Salvează ca PDF”).
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, Pencil, Loader2, EyeOff } from 'lucide-react'
import { getCollabReport, type ReportViewer } from '@/app/actions/collab-report'
import { CollabReportView, ReportStoryButton, REPORT_CSS } from '@/components/report/CollabReportView'
import type { CollabReport } from '@/lib/collab-report'

const PAGE_CSS = `
.rp{min-height:100vh;background:#f6f5fb}
.rp-bar{background:#fff;border-bottom:1px solid #e6e3f2}
.rp-in{max-width:1120px;margin:0 auto;padding:12px 20px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}
.rp-main{max-width:1120px;margin:0 auto;padding:24px 20px 64px;display:flex;flex-direction:column;gap:20px}
.rp-btn{min-height:44px;padding:0 16px;border-radius:12px;border:1px solid #d9d5ea;background:#fff;color:#15123a;font-weight:700;font-size:14px;display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-family:inherit;text-decoration:none}
.rp-btn.p{background:#5b2fd0;border-color:#5b2fd0;color:#fff}
.rp-draft{display:flex;gap:10px;align-items:center;background:#fff1c2;color:#6b4700;border-radius:14px;padding:12px 16px;font-size:14px;font-weight:600}
.rp-msg{max-width:520px;margin:80px auto;background:#fff;border:1px solid #e6e3f2;border-radius:20px;padding:28px;text-align:center;display:flex;flex-direction:column;gap:14px;align-items:center}
@media print{.rp{background:#fff}.rp-bar,.rp-draft{display:none!important}.rp-main{padding:0}}
`

export default function RaportPage() {
  const { id } = useParams<{ id: string }>()
  const [state, setState] = useState<{ report?: CollabReport; viewer?: ReportViewer; error?: string } | null>(null)

  useEffect(() => { getCollabReport(String(id)).then(setState).catch(() => setState({ error: 'Nu am putut încărca raportul.' })) }, [id])

  const back = state?.viewer === 'brand' && state.report ? `/brand/campaigns/${state.report.campaign.id}/report`
    : state?.viewer === 'influencer' ? '/influencer/collaborations'
    : state?.viewer === 'admin' ? '/admin/rapoarte' : '/'

  return (
    <div className="rp">
      <style>{PAGE_CSS + REPORT_CSS}</style>
      <header className="rp-bar">
        <div className="rp-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href={back} className="rp-btn" aria-label="Înapoi"><ArrowLeft size={16} /> Înapoi</Link>
            <span style={{ fontWeight: 800, fontSize: 16 }}>AddFame</span>
          </div>
          {state?.report && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {state.viewer === 'admin' && <Link href={`/admin/rapoarte/${id}`} className="rp-btn"><Pencil size={15} /> Editează</Link>}
              <button type="button" className="rp-btn p" onClick={() => window.print()}><Download size={15} /> Descarcă PDF</button>
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

      {state?.report && (
        <main className="rp-main">
          {state.viewer === 'admin' && state.report.settings.status !== 'published' && (
            <div className="rp-draft"><EyeOff size={17} /> Ciornă: brandul și creatorul nu văd încă raportul. Publică-l din editor.</div>
          )}
          {(state.viewer === 'influencer' || state.viewer === 'admin') && <ReportStoryButton report={state.report} />}
          <CollabReportView report={state.report} viewer={state.viewer!} />
        </main>
      )}
    </div>
  )
}
