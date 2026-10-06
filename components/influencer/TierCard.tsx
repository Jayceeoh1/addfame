'use client'
// Cardul „Nivelul tău" din profilul creatorului: categoria (Nano … Mega) și progresul spre următoarea.
// Fără Instagram conectat: invită la conectare (nivelul se calculează doar din contul verificat prin API).
import React from 'react'
import { TIERS, tierProgress, formatCount } from '@/lib/tiers'
import TierChip from '@/components/shared/TierChip'

export default function TierCard({ connected, followers, manual = 0, onConnect }: {
  connected: boolean
  followers: number      // din Instagram (verificat)
  manual?: number        // numărul scris manual, dacă Instagram nu e conectat
  onConnect: () => void
}) {
  const box: React.CSSProperties = { background: '#fff', border: '1px solid #e5e3f3', borderRadius: 20, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }

  // Fără Instagram, dar cu număr scris manual → nivel ESTIMAT
  if (!connected && manual >= 1000) {
    const e = tierProgress(manual)
    const et = e.tier!
    return (
      <div style={box}>
        <div style={{ background: et.bg, borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, border: `1px dashed ${et.dot}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: et.fg }}>Nivelul tău · estimat</span>
            <span style={{ background: et.dot, color: '#fff', borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 800 }}>{et.label}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 30, fontWeight: 800, color: '#14123a', fontVariantNumeric: 'tabular-nums' }}>{manual.toLocaleString('ro-RO')}</span>
            <span style={{ fontSize: 13, color: et.fg, fontWeight: 700 }}>urmăritori (introduși de tine)</span>
          </div>
          {e.next && <div style={{ fontSize: 13, lineHeight: 1.45, color: '#14123a' }}>Mai ai {e.remaining.toLocaleString('ro-RO')} de urmăritori până la nivelul {e.next.label}.</div>}
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.45, color: '#6a6690' }}>
          Brandurile văd nivelul marcat „estimat”, pentru că numărul nu e verificat. Conectează Instagram ca să devină verificat.
        </div>
        <button type="button" onClick={onConnect}
          style={{ height: 44, borderRadius: 12, border: 0, background: '#5a35e6', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
          Conectează Instagram
        </button>
      </div>
    )
  }

  if (!connected) {
    return (
      <div style={box}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#14123a' }}>Nivel indisponibil</div>
          <TierChip tier={null} />
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.45, color: '#6a6690' }}>
          Adaugă numărul de urmăritori sau conectează Instagram ca să primești nivelul (Nano, Micro, Mid, Macro, Mega) și să apari în filtrele brandurilor.
        </div>
        <button type="button" onClick={onConnect}
          style={{ height: 44, borderRadius: 12, border: 0, background: '#5a35e6', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
          Conectează Instagram
        </button>
      </div>
    )
  }

  const p = tierProgress(followers)
  const t = p.tier
  const bg = t ? t.bg : '#f1f0f8'
  const fg = t ? t.fg : '#6a6690'
  const bar = t ? t.dot : '#cfcce6'

  return (
    <div style={box}>
      <div style={{ background: bg, borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: fg }}>Nivelul tău</span>
          <span style={{ background: bar, color: '#fff', borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 800 }}>{t ? t.label : 'Sub Nano'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 30, fontWeight: 800, color: '#14123a', fontVariantNumeric: 'tabular-nums' }}>{followers.toLocaleString('ro-RO')}</span>
          <span style={{ fontSize: 13, color: fg, fontWeight: 700 }}>urmăritori</span>
        </div>
        {p.next && (
          <>
            <div style={{ height: 10, borderRadius: 5, background: '#fff', overflow: 'hidden' }}>
              <div style={{ width: `${p.percent}%`, height: '100%', borderRadius: 5, background: bar }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: fg, fontWeight: 700 }}>
              <span>{(t ? t.min : 0).toLocaleString('ro-RO')}</span>
              <span>{p.next.min.toLocaleString('ro-RO')} · {p.next.label}</span>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.45, color: '#14123a' }}>
              Mai ai {p.remaining.toLocaleString('ro-RO')} de urmăritori până la nivelul {p.next.label}.
            </div>
          </>
        )}
        {!p.next && <div style={{ fontSize: 13, color: '#14123a' }}>Ești în cel mai înalt nivel.</div>}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, color: '#6a6690' }}>
        Nivelul se calculează automat din contul de Instagram conectat ({formatCount(followers)} urmăritori) și se actualizează la fiecare sincronizare. Brandurile îl văd pe profilul tău.
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {TIERS.map(x => (
          <span key={x.key} title={`${x.range} urmăritori`} style={{ fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 999, background: x.bg, color: x.fg, opacity: t && t.key === x.key ? 1 : .55, outline: t && t.key === x.key ? `2px solid ${x.dot}` : 'none' }}>{x.label}</span>
        ))}
      </div>
    </div>
  )
}
