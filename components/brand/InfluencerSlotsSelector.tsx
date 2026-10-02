'use client'

// Selector pentru numărul de influenceri dintr-o campanie + costul taxei AddFame.
// Prețul per influencer vine din Admin → Setări (cheia 'influencer_fee').
// Plata se face la publicare; fără sold suficient campania se salvează ca draft.

import React, { useEffect, useState } from 'react'
import { Minus, Plus, Wallet, Mail, Sparkles } from 'lucide-react'
import { getCampaignFeeInfo } from '@/app/actions/campaigns'

export type FeeInfo = { price: number; available: number; total: number; enough: boolean }

const QUICK_PICKS = [1, 5, 10, 20]
const CONTACT_EMAILS = ['ciprian@addfame.ro', 'cristiana@addfame.ro']

function ron(n: number) {
  return n.toLocaleString('ro-RO', { maximumFractionDigits: 2 }) + ' RON'
}

export function InfluencerSlotsSelector({
  value,
  onChange,
  min = 1,
  max = 500,
  label = 'Câți influenceri vrei în campanie?',
  onInfo,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  label?: string
  /** Primește prețul, soldul și totalul — util pentru textul butonului de publicare. */
  onInfo?: (info: FeeInfo) => void
}) {
  const [price, setPrice] = useState<number | null>(null)
  const [available, setAvailable] = useState(0)
  const [draft, setDraft] = useState(String(value))

  useEffect(() => {
    let alive = true
    getCampaignFeeInfo()
      .then((r: any) => {
        if (!alive) return
        setPrice(Number(r?.price) || 0)
        setAvailable(Number(r?.available) || 0)
      })
      .catch(() => { if (alive) setPrice(0) })
    return () => { alive = false }
  }, [])

  useEffect(() => { setDraft(String(value)) }, [value])

  const n = Math.max(min, Math.min(max, value || min))
  const total = (price ?? 0) * n
  const enough = available >= total
  const missing = Math.max(0, total - available)

  useEffect(() => {
    if (price !== null && onInfo) onInfo({ price, available, total, enough })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price, available, total, enough])

  const set = (v: number) => onChange(Math.max(min, Math.min(max, Math.floor(v) || min)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {label && (
        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#111827', textAlign: 'center' }}>{label}</p>
      )}

      {/* − număr + */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <button
          type="button"
          onClick={() => set(n - 1)}
          disabled={n <= min}
          aria-label="Mai puțini influenceri"
          style={{
            width: 44, height: 44, borderRadius: 999, border: '2px solid #f97316', background: 'white',
            color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: n <= min ? 'not-allowed' : 'pointer', opacity: n <= min ? 0.35 : 1,
          }}
        >
          <Minus size={18} />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={draft}
          onChange={e => {
            setDraft(e.target.value)
            const v = parseInt(e.target.value)
            if (!isNaN(v)) set(v)
          }}
          onBlur={() => setDraft(String(n))}
          aria-label="Număr de influenceri"
          style={{
            width: 96, textAlign: 'center', fontSize: 36, fontWeight: 900, color: '#f97316',
            border: 'none', outline: 'none', background: 'transparent', fontVariantNumeric: 'tabular-nums',
          }}
        />
        <button
          type="button"
          onClick={() => set(n + 1)}
          disabled={n >= max}
          aria-label="Mai mulți influenceri"
          style={{
            width: 44, height: 44, borderRadius: 999, border: 'none',
            background: 'linear-gradient(135deg,#f97316,#ec4899)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: n >= max ? 'not-allowed' : 'pointer', opacity: n >= max ? 0.35 : 1,
          }}
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Butoane rapide */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
        {QUICK_PICKS.filter(q => q >= min && q <= max).map(q => (
          <button
            key={q}
            type="button"
            onClick={() => set(q)}
            style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 800, cursor: 'pointer',
              border: `1.5px solid ${n === q ? '#f97316' : '#e5e7eb'}`,
              background: n === q ? '#fff7ed' : 'white', color: n === q ? '#c2410c' : '#6b7280',
            }}
          >
            {q} {q === 1 ? 'influencer' : 'influenceri'}
          </button>
        ))}
      </div>

      {/* Cost */}
      <div style={{ background: '#f9fafb', border: '1.5px solid #f3f4f6', borderRadius: 16, padding: '14px 16px' }}>
        {price === null ? (
          <p style={{ margin: 0, fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>Se calculează costul…</p>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>
                {n} × {ron(price)}
              </span>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                {ron(total)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Wallet size={14} /> Sold disponibil: <strong style={{ color: '#111827', fontVariantNumeric: 'tabular-nums' }}>{ron(available)}</strong>
              </span>
              {enough ? (
                <span style={{ fontSize: 12, fontWeight: 800, color: '#15803d' }}>✓ Sold suficient</span>
              ) : (
                <a href="/brand/wallet" style={{ fontSize: 12, fontWeight: 800, color: '#c2410c', textDecoration: 'underline' }}>
                  Adaugă credite →
                </a>
              )}
            </div>
            {!enough && (
              <p style={{ margin: '10px 0 0', fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
                Îți mai lipsesc <strong>{ron(missing)}</strong>. Poți continua și salva campania ca draft —
                o publici după ce adaugi credite.
              </p>
            )}
            <p style={{ margin: '10px 0 0', fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>
              Taxa se plătește la publicare. Dacă nu se ocupă toate locurile, diferența se returnează în wallet la închiderea campaniei.
            </p>
          </>
        )}
      </div>

      {/* Informare: campanii customizate */}
      <div style={{
        background: 'linear-gradient(135deg,#f5f3ff,#fdf2f8)', border: '1.5px solid #e9d5ff',
        borderRadius: 16, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10, background: 'white', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed',
        }}>
          <Sparkles size={16} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 800, color: '#4c1d95' }}>
            Campanie customizată sau un deal mai bun?
          </p>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: '#6b21a8', lineHeight: 1.5 }}>
            Pentru campanii mari sau nevoi speciale, contactează echipa AddFame.ro:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {CONTACT_EMAILS.map(email => (
              <a
                key={email}
                href={`mailto:${email}?subject=${encodeURIComponent('Campanie customizată AddFame')}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: '#7c3aed', textDecoration: 'none', wordBreak: 'break-all' }}
              >
                <Mail size={13} /> {email}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default InfluencerSlotsSelector
