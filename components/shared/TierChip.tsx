// Chip cu nivelul creatorului (Nano / Micro / Mid / Macro / Mega) sau „Neverificat".
// Stiluri inline: funcționează în orice pagină (brand, creator, public), fără Tailwind sau CSS propriu.
import React from 'react'
import { Tier, UNVERIFIED_STYLE } from '@/lib/tiers'

export default function TierChip({ tier, unverified, style }: {
  tier: Tier | null
  /** true = creator fără Instagram conectat → „Neverificat". Dacă tier e null și unverified e false, nu afișează nimic. */
  unverified?: boolean
  style?: React.CSSProperties
}) {
  if (!tier && !unverified) return null
  const bg = tier ? tier.bg : UNVERIFIED_STYLE.bg
  const fg = tier ? tier.fg : UNVERIFIED_STYLE.fg
  return (
    <span
      title={tier ? `Nivel ${tier.label}: ${tier.range} urmăritori` : 'Instagram neconectat: nivelul nu poate fi calculat'}
      style={{
        display: 'inline-flex', alignItems: 'center', flexShrink: 0, whiteSpace: 'nowrap',
        borderRadius: 999, padding: '4px 10px', fontSize: 11, fontWeight: 800, lineHeight: 1.2,
        background: bg, color: fg, ...style,
      }}
    >
      {tier ? tier.label : 'Neverificat'}
    </span>
  )
}
