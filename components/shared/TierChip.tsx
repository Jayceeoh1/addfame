// Chip cu nivelul creatorului (Nano / Micro / Mid / Macro / Mega).
//  - verificat (Instagram conectat): chip plin;
//  - estimat (număr scris manual): același chip, cu margine punctată și „· estimat";
//  - fără date: „Fără nivel".
// Stiluri inline: funcționează în orice pagină (brand, creator, public), fără Tailwind sau CSS propriu.
import React from 'react'
import { Tier, UNVERIFIED_STYLE, creatorTierInfo } from '@/lib/tiers'

type Creator = Parameters<typeof creatorTierInfo>[0]

export default function TierChip({ of, tier, estimated, style }: {
  /** Creatorul (rând din influencers): chip-ul își calculează singur nivelul și sursa. */
  of?: Creator
  tier?: Tier | null
  estimated?: boolean
  style?: React.CSSProperties
}) {
  let t: Tier | null = tier ?? null
  let est = !!estimated
  let noData = false
  if (of !== undefined) {
    const info = creatorTierInfo(of)
    t = info.tier
    est = info.source === 'estimated'
    noData = info.source === null
  }
  // Conectat, dar sub 1.000 de urmăritori: nicio etichetă
  if (!t && !noData && of !== undefined) return null
  if (!t && of === undefined && tier === undefined) return null

  const bg = t ? t.bg : UNVERIFIED_STYLE.bg
  const fg = t ? t.fg : UNVERIFIED_STYLE.fg
  const title = t
    ? `Nivel ${t.label}: ${t.range} urmăritori` + (est ? ' (estimat din numărul introdus de creator, neverificat)' : ' (verificat prin Instagram)')
    : 'Nu avem încă un număr de urmăritori pentru acest creator'
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', flexShrink: 0, whiteSpace: 'nowrap',
        borderRadius: 999, padding: est ? '3px 9px' : '4px 10px', fontSize: 11, fontWeight: 800, lineHeight: 1.2,
        background: bg, color: fg, border: est && t ? `1px dashed ${t.dot}` : undefined, ...style,
      }}
    >
      {t ? (est ? `${t.label} · estimat` : t.label) : 'Fără nivel'}
    </span>
  )
}
