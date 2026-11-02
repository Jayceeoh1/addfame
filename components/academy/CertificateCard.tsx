'use client'

// Certificatul din Academie: poza în rama nivelului, scorul de la prima încercare,
// descărcarea certificatului (PDF / imagine), linkul de verificare și cardul de Story.
import { useRef, useState } from 'react'
import { AvatarWithBadge } from '@/components/shared/CreatorBadge'
import { TIERS, type AcademyTier } from '@/lib/academy'
import { makeAcademyStory, shareStory } from '@/lib/academy-story'
import { certificatePdf, certificatePng, downloadBlob } from '@/lib/academy-certificate'
import { getStoryAvatar } from '@/app/actions/halloween-quiz'

export default function CertificateCard({ tier, name, avatar, score, handle, fresh, correct, total, bonus, code, at }: {
  tier: AcademyTier; name: string | null; avatar: string | null; score: number; handle: string
  fresh?: boolean; correct?: number | null; total?: number | null; bonus?: number; code?: string | null; at?: string | null
}) {
  const root = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const t = TIERS[tier]
  const canCert = !!code && typeof correct === 'number' && !!total

  async function share() {
    if (busy) return
    setBusy('story'); setMsg(null)
    try {
      const cs = root.current ? getComputedStyle(root.current) : null
      const av = await getStoryAvatar().catch(() => null)
      const blob = await makeAcademyStory({ tier, handle, name, avatar: av, fontDisplay: cs?.getPropertyValue('--font-display'), fontBody: cs?.getPropertyValue('--font-body') })
      const how = await shareStory(blob, `addfame-certificat-${tier}.png`)
      if (how === 'downloaded') setMsg('Imaginea s-a descărcat. Pune-o pe Instagram Story și dă tag @addfame.ro')
    } catch { setMsg('Nu am putut crea imaginea. Încearcă din nou.') }
    setBusy(null)
  }

  async function download(kind: 'pdf' | 'png') {
    if (busy || !canCert) return
    setBusy(kind); setMsg(null)
    try {
      const av = await getStoryAvatar().catch(() => null)
      const data = { name: name || handle || 'Creator AddFame', tier, correct: correct as number, total: total as number, date: at || new Date(), code: code as string, avatar: av }
      const blob = kind === 'pdf' ? await certificatePdf(data) : await certificatePng(data)
      downloadBlob(blob, `Certificat-AddFame-${t.label}-${code}.${kind}`)
    } catch { setMsg('Nu am putut genera certificatul. Încearcă din nou.') }
    setBusy(null)
  }

  return (
    <div ref={root} className="al-cert">
      <AvatarWithBadge avatarUrl={avatar} name={name} score={score} size={128} frame={tier} />
      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#ffd166' }}>{fresh ? 'Felicitări!' : 'Academia AddFame'}</span>
      <h2>Ești creator certificat {t.label}</h2>
      {typeof correct === 'number' && total ? <p>Ai răspuns corect la {correct} din {total} întrebări din prima încercare.{bonus ? ` Bonus: +${bonus} puncte.` : ''}</p> : null}
      <p>Rama {t.label} apare pe poza ta de profil și o văd brandurile.</p>
      {canCert && (
        <div className="al-cert-btns">
          <button type="button" className="ac-btn" onClick={() => download('pdf')} disabled={!!busy}>{busy === 'pdf' ? 'Se generează…' : 'Descarcă certificatul (PDF)'}</button>
          <button type="button" className="al-cert-b2" onClick={() => download('png')} disabled={!!busy}>{busy === 'png' ? 'Se generează…' : 'Ca imagine'}</button>
        </div>
      )}
      <button type="button" className="al-cert-b2" onClick={share} disabled={!!busy}>{busy === 'story' ? 'Pregătim cardul…' : 'Postează pe Instagram Story'}</button>
      {code && <p style={{ fontSize: 13 }}>Cod certificat <b style={{ color: '#fff' }}>{code}</b> · oricine îl poate verifica pe <a href={`/certificat/${code}`} target="_blank" rel="noreferrer" style={{ color: '#ffd166', fontWeight: 800 }}>addfame.ro/certificat</a></p>}
      {msg && <p style={{ fontSize: 13.5, fontWeight: 700 }}>{msg}</p>}
    </div>
  )
}
