'use client'
// Card în panoul creatorului: contractele trimise la semnat și încă nesemnate.
import { useEffect, useState } from 'react'
import { PenLine, ChevronRight } from 'lucide-react'

type Pending = { token: string; campaign_title: string | null; brand_name: string | null; product_name: string | null }

export default function PendingContracts() {
  const [list, setList] = useState<Pending[]>([])
  useEffect(() => {
    let alive = true
    fetch('/api/influencer/pending-contracts').then(r => r.json()).then(d => { if (alive) setList(d.contracts || []) }).catch(() => {})
    return () => { alive = false }
  }, [])
  if (!list.length) return null
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
      {list.map(c => (
        <a key={c.token} href={`/contract-cesiune/${c.token}`}
          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, background: '#f3efff', border: '1px solid #ddd3fb', color: '#14123a', textDecoration: 'none' }}>
          <span style={{ width: 38, height: 38, borderRadius: 12, background: '#6a2fe0', color: '#fff', display: 'grid', placeItems: 'center', flex: 'none' }}>
            <PenLine size={18} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <b style={{ display: 'block', fontSize: 14.5 }}>Ai un contract de semnat</b>
            <span style={{ fontSize: 13, color: '#4a4770', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {[c.campaign_title, c.brand_name, c.product_name].filter(Boolean).join(' · ') || 'Cesiune drepturi de autor'} · durează un minut
            </span>
          </span>
          <ChevronRight size={18} style={{ color: '#6a2fe0', flex: 'none' }} />
        </a>
      ))}
    </section>
  )
}
