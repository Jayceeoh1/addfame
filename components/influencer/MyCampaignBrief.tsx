'use client'
// „Brieful tău” în pagina / fereastra campaniei: brieful personal dat de brand influencerului acceptat.
import { useEffect, useState } from 'react'
import { FileText, ExternalLink, Link2, Loader2 } from 'lucide-react'
import { getMyBriefForCampaign, acknowledgeMyBrief } from '@/app/actions/campaign-briefs'

type Brief = { id: string; title: string; body: string; file_url: string | null; ref_url: string | null }

export default function MyCampaignBrief({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<{ collabId: string; brief: Brief; ackAt: string | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => {
    let alive = true
    setData(null)
    getMyBriefForCampaign(campaignId).then(r => {
      if (alive && !('error' in r) && r.collabId && r.brief) setData({ collabId: r.collabId, brief: r.brief as Brief, ackAt: r.ackAt })
    }).catch(() => {})
    return () => { alive = false }
  }, [campaignId])
  if (!data) return null
  const { brief, ackAt } = data

  async function ack() {
    if (!data) return
    setBusy(true); setErr('')
    const r = await acknowledgeMyBrief(data.collabId)
    setBusy(false)
    if ('error' in r) setErr(r.error)
    else setData({ ...data, ackAt: r.ackAt })
  }

  return (
    <div className="iu-card" style={{ padding: 16, border: '2px solid #7040f0', background: '#fff', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <b style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#5b2fd0', fontSize: 15 }}><FileText size={17} /> Brieful tău</b>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#4a4770' }}>{brief.title}</span>
      </div>
      {brief.body && <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 14, color: '#1e1b4b', overflowWrap: 'anywhere' }}>{brief.body}</div>}
      {brief.file_url && (
        <a href={brief.file_url} target="_blank" rel="noopener noreferrer" className="iu-btn p" style={{ justifyContent: 'space-between' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><FileText size={16} /> Deschide fișierul briefului</span><ExternalLink size={14} />
        </a>
      )}
      {brief.ref_url && (
        <a href={brief.ref_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#5b2fd0', fontWeight: 700, overflowWrap: 'anywhere' }}>
          <Link2 size={14} style={{ flex: 'none' }} /> Exemplu / referință <ExternalLink size={12} style={{ flex: 'none' }} />
        </a>
      )}
      {ackAt ? (
        <span style={{ fontSize: 12.5, color: '#14532d', fontWeight: 700 }}>✓ Ai confirmat că ai citit și respecți brieful</span>
      ) : (
        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 12, background: '#f9f7ff', border: '1px solid #e6dcff', cursor: busy ? 'wait' : 'pointer' }}>
          {busy ? <Loader2 size={16} className="animate-spin" style={{ flex: 'none', marginTop: 2 }} /> : <input type="checkbox" checked={false} onChange={ack} style={{ marginTop: 3 }} />}
          <span style={{ fontSize: 12.5, lineHeight: 1.55, color: '#4a4770' }}>
            <b style={{ color: '#5b2fd0' }}>Am citit și respect brieful</b> — obligatoriu înainte să trimiți postarea.
            {err && <><br /><span style={{ color: '#b42318' }}>{err}</span></>}
          </span>
        </label>
      )}
    </div>
  )
}
