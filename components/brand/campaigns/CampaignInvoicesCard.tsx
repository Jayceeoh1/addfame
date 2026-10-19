'use client'

// Pagina campaniei (brand): facturile emise de AddFame pentru această campanie. Nu apare dacă nu există nicio factură.
import { useEffect, useState } from 'react'
import { getBrandCampaignInvoices } from '@/app/actions/campaign-invoices'

export default function CampaignInvoicesCard({ campaignId }: { campaignId: string }) {
  const [list, setList] = useState<any[]>([])
  useEffect(() => {
    let alive = true
    getBrandCampaignInvoices(campaignId).then((r: any) => { if (alive && r?.success) setList(r.invoices) }).catch(() => {})
    return () => { alive = false }
  }, [campaignId])
  if (list.length === 0) return null
  return (
    <div className="card p-4 mb-5" style={{ border: '1px solid #e5e3f3' }}>
      <p className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: '#5b2fd0' }}>🧾 Facturi</p>
      <div className="flex flex-col gap-1.5">
        {list.map(i => (
          <div key={i.id} className="flex items-center gap-3 flex-wrap rounded-xl px-3 py-2" style={{ background: '#faf9ff', border: '1px solid #ece9fb' }}>
            <b className="text-sm">{i.smartbill_number}</b>
            <span className="text-sm font-bold">{Number(i.amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</span>
            <span className="text-xs" style={{ color: '#6a6690' }}>{new Date(i.created_at).toLocaleDateString('ro-RO')}</span>
            <a href={`/api/smartbill/campaign-invoice-pdf?id=${i.id}`} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs font-black" style={{ color: '#5b2fd0' }}>Descarcă PDF</a>
          </div>
        ))}
      </div>
    </div>
  )
}
