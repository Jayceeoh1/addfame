'use client'
// Mesaj de sistem despre un draft video, afișat în inbox. Conține cardul draftului (deschide fereastra de revizuire).
import DraftReview from '@/components/shared/DraftReview'

export const DRAFT_MSG = /^::draft:(uploaded|changes|approved)::\n?([\s\S]*)$/

const META = {
  uploaded: { title: 'Draft nou trimis', bg: '#efeaff', fg: '#4423c4' },
  changes: { title: 'Modificări cerute', bg: '#fff1e6', fg: '#9a4206' },
  approved: { title: 'Draft aprobat', bg: '#dcf5ec', fg: '#14532d' },
} as const

export default function DraftMessage({ content, collabId, role }: { content: string; collabId: string; role: 'brand' | 'influencer' }) {
  const m = DRAFT_MSG.exec(content)
  if (!m) return null
  const meta = META[m[1] as keyof typeof META]
  const actionable = (role === 'influencer' && m[1] === 'changes') || (role === 'brand' && m[1] === 'uploaded')
  return (
    <div style={{ alignSelf: 'center', width: '100%', maxWidth: 420, background: '#fff', border: '1px solid #e5e3f3', borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column', gap: 10, fontFamily: 'inherit' }}>
      <span style={{ alignSelf: 'flex-start', background: meta.bg, color: meta.fg, borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 800 }}>{meta.title}</span>
      <div style={{ fontSize: 14, lineHeight: 1.45, color: '#14123a', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{m[2]}</div>
      {actionable && (
        <div style={{ fontSize: 12, fontWeight: 700, color: meta.fg }}>
          {role === 'influencer' ? 'Deschide draftul, vezi comentariile și încarcă versiunea nouă.' : 'Deschide draftul ca să-l aprobi sau să ceri modificări.'}
        </div>
      )}
      <DraftReview collabId={collabId} role={role} canUpload={role === 'influencer'} />
    </div>
  )
}
