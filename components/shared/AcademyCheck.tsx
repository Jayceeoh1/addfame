// Bifa verde AddFame Academy: o primesc doar creatorii cu abonament Academy Member PLĂTIT și activ.
// Nu e o verificare de identitate (vezi Termeni, secțiunea 11).

// contur „zimțat” (12 valuri), calculat o singură dată
const WAVY = (() => {
  const pts: string[] = []
  const n = 120
  for (let k = 0; k < n; k++) {
    const t = (k / n) * Math.PI * 2
    const r = 10.7 + 0.9 * Math.cos(12 * t)
    pts.push(`${(12 + r * Math.sin(t)).toFixed(2)},${(12 - r * Math.cos(t)).toFixed(2)}`)
  }
  return `M${pts.join('L')}Z`
})()

export function isPaidMember(inf: { is_verified?: boolean | null; badge_expires_at?: string | null } | null | undefined) {
  return !!inf?.is_verified && !!inf.badge_expires_at && new Date(inf.badge_expires_at) > new Date()
}

export default function AcademyCheck({ size = 18, title = 'Academy Member · abonament AddFame Academy activ', style }: { size?: number; title?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={title} style={{ flex: 'none', display: 'inline-block', verticalAlign: 'middle', ...style }}>
      <title>{title}</title>
      <path d={WAVY} fill="#00b84d" />
      <path d="M7.6 12.4l3 3 5.9-6.3" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
