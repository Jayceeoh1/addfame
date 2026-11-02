'use client'

// Certificatul din Academie: poza în rama nivelului, scorul de la prima încercare și butonul de Story.
import { useRef, useState } from 'react'
import { AvatarWithBadge } from '@/components/shared/CreatorBadge'
import { TIERS, type AcademyTier } from '@/lib/academy'
import { makeAcademyStory, shareStory } from '@/lib/academy-story'
import { getStoryAvatar } from '@/app/actions/halloween-quiz'

export default function CertificateCard({ tier, name, avatar, score, handle, lessons, fresh, firstCorrect, firstTotal, bonus }: {
  tier: AcademyTier; name: string | null; avatar: string | null; score: number; handle: string; lessons: number
  fresh?: boolean; firstCorrect?: number; firstTotal?: number; bonus?: number
}) {
  const root = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const t = TIERS[tier]

  async function share() {
    if (busy) return
    setBusy(true); setMsg(null)
    try {
      const cs = root.current ? getComputedStyle(root.current) : null
      const av = await getStoryAvatar().catch(() => null)
      const blob = await makeAcademyStory({ tier, handle, name, avatar: av, lessons, fontDisplay: cs?.getPropertyValue('--font-display'), fontBody: cs?.getPropertyValue('--font-body') })
      const how = await shareStory(blob, `addfame-certificat-${tier}.png`)
      if (how === 'downloaded') setMsg('Imaginea s-a descărcat. Pune-o pe Instagram Story și dă tag @addfame.ro')
    } catch { setMsg('Nu am putut crea imaginea. Încearcă din nou.') }
    setBusy(false)
  }

  return (
    <div ref={root} className="al-cert">
      <AvatarWithBadge avatarUrl={avatar} name={name} score={score} size={128} frame={tier} />
      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#ffd166' }}>{fresh ? 'Felicitări!' : 'Academia AddFame'}</span>
      <h2>Ești creator certificat {t.label}</h2>
      {typeof firstCorrect === 'number' && firstTotal ? (
        <p>Ai răspuns corect la {firstCorrect} din {firstTotal} întrebări din prima.{bonus ? ` Bonus: +${bonus} puncte.` : ''}</p>
      ) : (
        <p>Rama {t.label} apare pe poza ta de profil și o văd brandurile.</p>
      )}
      {fresh && <p>Rama {t.label} apare acum pe poza ta de profil și o văd brandurile.</p>}
      <button type="button" className="ac-btn" style={{ alignSelf: 'center' }} onClick={share} disabled={busy}>{busy ? 'Pregătim cardul…' : 'Postează pe Instagram Story'}</button>
      {msg && <p style={{ fontSize: 13.5, fontWeight: 700 }}>{msg}</p>}
    </div>
  )
}
