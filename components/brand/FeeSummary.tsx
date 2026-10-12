'use client'

// „Cost campanie” — aceeași defalcare în toate formularele de creare:
// plata influencerilor (dacă există) + taxa de management AddFame (locuri × preț) + ce se plătește acum.
// Prețul per influencer vine din Admin → Setări → „Taxă per influencer”.

import React from 'react'
import { feeBreakdown } from '@/lib/fee-summary'

const ron = (n: number) => `${n.toLocaleString('ro-RO', { maximumFractionDigits: 2 })} RON`

export function FeeSummary({
  slots,
  price,
  available,
  payPerInfluencer,
  payLabel = 'Plată influenceri',
  payNegotiable = false,
  compact = false,
}: {
  slots: number
  /** null = încă se încarcă prețul */
  price: number | null
  available?: number | null
  /** suma per influencer (campanie plătită / managed); undefined = nu se aplică (ex. barter) */
  payPerInfluencer?: number | null
  payLabel?: string
  payNegotiable?: boolean
  compact?: boolean
}) {
  const b = feeBreakdown({ slots, price, payPerInfluencer, payNegotiable })
  const showPay = payPerInfluencer !== undefined || payNegotiable
  const enough = available === null || available === undefined || b.payNow === null ? null : available >= b.payNow

  const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }
  const sub: React.CSSProperties = { display: 'block', fontSize: 11, color: '#8783a8', fontWeight: 500 }
  const num: React.CSSProperties = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 8 : 10, fontSize: 13, color: '#14123a' }}>
      {showPay && (
        <div style={row}>
          <span>{payLabel}<span style={sub}>{payNegotiable ? 'se stabilește cu fiecare influencer' : b.payTotal !== null ? `${b.slots} × ${ron(payPerInfluencer || 0)}` : 'completează suma'}</span></span>
          <b style={num}>{payNegotiable ? 'De discutat' : b.payTotal !== null ? ron(b.payTotal) : '—'}</b>
        </div>
      )}
      <div style={row}>
        <span>Taxă de management AddFame<span style={sub}>{price === null ? 'se încarcă…' : `${b.slots} × ${ron(price)}`}</span></span>
        <b style={{ ...num, color: '#4423c4' }}>{b.feeTotal !== null ? ron(b.feeTotal) : '…'}</b>
      </div>
      {showPay && b.grandTotal !== null && (
        <div style={{ ...row, borderTop: '1px solid #eeecf7', paddingTop: 8 }}>
          <span style={{ fontWeight: 700 }}>Total campanie</span>
          <b style={{ ...num, fontSize: 15 }}>{ron(b.grandTotal)}</b>
        </div>
      )}
      <div style={{ ...row, background: '#f7f4ff', border: '1px solid #e0d6ff', borderRadius: 12, padding: '10px 12px' }}>
        <span style={{ fontWeight: 700, color: '#4423c4' }}>Plătești acum, la publicare</span>
        <b style={{ ...num, fontSize: 17, color: '#4423c4' }}>{b.payNow !== null ? ron(b.payNow) : '…'}</b>
      </div>
      {showPay && (
        <p style={{ margin: 0, fontSize: 11, color: '#8783a8', lineHeight: 1.5 }}>
          {b.payTotal !== null
            ? 'Bugetul influencerilor stă în siguranță la AddFame și se virează fiecărui influencer doar după ce postarea lui e aprobată. Locurile neocupate și influencerii care nu postează → banii se întorc în wallet.'
            : 'Plata se stabilește cu fiecare influencer; la publicare se încasează doar taxa de management.'}
        </p>
      )}
      {enough === false && (
        <p style={{ margin: 0, fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
          Sold insuficient ({ron(available || 0)} disponibili). Campania se salvează ca draft până adaugi credite.
        </p>
      )}
    </div>
  )
}

/** Bandă scurtă la începutul formularului: brandul vede taxa înainte să completeze ceva. */
export function FeeNotice({ price }: { price: number | null }) {
  if (price === null) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', background: '#f7f4ff', border: '1px solid #e0d6ff', borderRadius: 14, padding: '10px 14px', fontSize: 13, color: '#14123a' }}>
      <span><b style={{ color: '#4423c4' }}>Taxă de management AddFame:</b> {ron(price)} / influencer</span>
      <span style={{ fontSize: 12, color: '#6a6690' }}>se plătește la publicare · locurile neocupate se returnează</span>
    </div>
  )
}

export default FeeSummary
