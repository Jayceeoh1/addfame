'use client'

// Pe pagina campaniei: unde sunt banii brandului (campanii cu taxă de management).
import React from 'react'
import { campaignMoney } from '@/lib/fee-summary'

const ron = (n: number) => `${n.toLocaleString('ro-RO', { maximumFractionDigits: 2 })} RON`

export function CampaignMoney({ campaign, collabs }: { campaign: any; collabs: any[] }) {
  if (!campaign || campaign.fee_per_influencer === null || campaign.fee_per_influencer === undefined) return null
  const m = campaignMoney(campaign, collabs)
  const offer = campaign.payment_mode === 'OFFER'
  const tiles = [
    { l: 'Taxă de management', v: ron(m.fee), s: `${campaign.fee_slots || campaign.max_influencers || 0} locuri × ${ron(Number(campaign.fee_per_influencer) || 0)}` },
    { l: 'Blocat pentru influenceri', v: ron(m.held), s: 'se plătește după aprobarea postărilor' },
    { l: 'Plătit influencerilor', v: ron(m.paid), s: 'postări aprobate' },
    { l: 'Returnat în wallet', v: ron(m.refunded), s: 'locuri neocupate, anulări' },
  ]
  return (
    <div className="card p-5 mb-5 card-anim">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <p className="font-black text-gray-900 text-base" style={{ margin: 0 }}>Banii campaniei</p>
        <span className="text-xs text-gray-500">{offer ? 'Influencerii propun prețul — fiecare se plătește din wallet când îl selectezi' : 'Taxa și bugetul influencerilor au fost plătite la publicare'}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {tiles.map(t => (
          <div key={t.l} style={{ background: '#f7f6fd', border: '1px solid #eeecf7', borderRadius: 14, padding: '12px 14px', minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6a6690' }}>{t.l}</span>
            <b style={{ display: 'block', fontSize: 20, color: '#14123a', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{t.v}</b>
            <span style={{ display: 'block', fontSize: 11, color: '#8783a8' }}>{t.s}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CampaignMoney
