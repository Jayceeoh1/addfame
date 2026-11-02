'use client'

// Academia AddFame — pagina principală: progresul, ce câștigi și lista lecțiilor.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAcademy } from '@/app/actions/academy'
import { ACADEMY_CSS } from './academy-css'
import CertificateCard from '@/components/academy/CertificateCard'
import { TIERS, TIER_ORDER } from '@/lib/academy'

export default function AcademiePage() {
  const [st, setSt] = useState<any>(null)
  useEffect(() => { getAcademy().then(setSt).catch(() => setSt({ error: 'Nu am putut încărca Academia.' })) }, [])

  const lessons: any[] = st?.lessons || []
  const done = lessons.filter(l => l.passed).length
  const next = lessons.find(l => !l.passed)
  const pct = lessons.length ? Math.round(done / lessons.length * 100) : 0
  const totalPoints = lessons.reduce((s, l) => s + (l.points || 0), 0)
  const minutes = lessons.reduce((s, l) => s + (l.minutes || 0), 0)

  return (
    <div className="ac">
      <style>{ACADEMY_CSS}</style>
      <div className="ac-wrap">
        {!st && <p className="ac-muted">Se încarcă…</p>}
        {st?.error && <div className="ac-card"><p>{st.error}</p></div>}

        {st?.success && (<>
          <div className="ac-top">
            <section className="ac-hero">
              <span className="ac-tag"><Cap /> Academia AddFame</span>
              <h1>{st.certifiedAt ? 'Ești creator certificat AddFame' : 'Devino creator certificat AddFame'}</h1>
              <p>Lecții scurte, cu exemple și exerciții, despre ce verifică brandurile la fiecare colaborare. La final primești o ramă pe poza de profil: Bronze, Silver, Gold sau Platinum, după răspunsurile tale de la prima încercare.</p>
              {lessons.length > 0 && (
                <div className="ac-prog">
                  <div className="ac-prog-row"><span>Progresul tău</span><b>{done} din {lessons.length} {lessons.length === 1 ? 'lecție' : 'lecții'}</b></div>
                  <div className="ac-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
                </div>
              )}
              {next ? (
                <Link href={`/influencer/academie/${next.id}`} className="ac-btn">
                  {done === 0 && !next.attempts ? 'Începe lecția ' : 'Continuă lecția '}{next.position} <Arrow />
                </Link>
              ) : lessons.length > 0 ? (
                <span className="ac-done"><Check /> Ai terminat toate lecțiile</span>
              ) : (
                <p className="ac-muted" style={{ color: '#d9d2ff' }}>Pregătim primele lecții. Revino curând.</p>
              )}
            </section>

            <aside className="ac-card ac-gain">
              <span className="ac-label">Ce câștigi</span>
              <div className="ac-gain-row"><span className="ac-ico"><Medal /></span><div><b>Ramă pe poza de profil</b><span>o văd brandurile, pe profil și la aplicări</span></div></div>
              <div className="ac-gain-row"><span className="ac-ico"><StarI /></span><div><b>+{totalPoints} puncte Creator Score</b><span>o singură dată, când treci fiecare test</span></div></div>
              <div className="ac-gain-row"><span className="ac-ico"><Clock /></span><div><b>~{minutes} minute în total</b><span>poți relua testul oricând</span></div></div>
              {!st.approved && <p className="ac-warn">Punctele se acordă după ce profilul tău e aprobat.</p>}
            </aside>
          </div>

          {st.certifiedAt && st.tier && (
            <CertificateCard tier={st.tier} name={st.name} avatar={st.avatar} score={st.score} handle={st.handle} lessons={lessons.length} />
          )}

          {!st.certifiedAt && lessons.length > 0 && (
            <section className="ac-card">
              <div className="ac-sec-h"><h2 style={{ fontSize: 18 }}>Nivelurile de certificat</h2><span className="ac-muted">după răspunsurile corecte din prima, la toate lecțiile</span></div>
              <div className="ac-tiers">
                {TIER_ORDER.map(k => (
                  <div key={k} className="ac-tier">
                    <img src={TIERS[k].frame} alt={`Ramă ${TIERS[k].label}`} width={96} height={96} />
                    <b>{TIERS[k].label}</b>
                    <span className="ac-muted">{k === 'platinum' ? '100% corecte' : k === 'gold' ? 'cel puțin 95%' : k === 'silver' ? 'cel puțin 90%' : 'ai trecut toate lecțiile'}</span>
                    {TIERS[k].bonus > 0 && <span className="ac-chip v">+{TIERS[k].bonus} puncte</span>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {lessons.length > 0 && (
            <section className="ac-sec">
              <div className="ac-sec-h"><h2>Lecțiile</h2><span className="ac-muted">Treci testul de la final ca să bifezi lecția</span></div>
              <div className="ac-grid">
                {lessons.map(l => {
                  const isNext = next?.id === l.id
                  return (
                    <Link key={l.id} href={`/influencer/academie/${l.id}`} className={`ac-lesson ${l.passed ? 'is-done' : isNext ? 'is-next' : ''}`}>
                      <div className="ac-lesson-h">
                        <span className="ac-muted">Lecția {l.position} · {l.minutes} min · {l.total} întrebări</span>
                        {l.passed ? <span className="ac-chip ok"><Check s={12} /> Trecută</span>
                          : l.attempts ? <span className="ac-chip">Scor {l.bestScore}/{l.total}</span>
                          : isNext ? <span className="ac-chip v">Urmează</span> : null}
                      </div>
                      <h3>{l.title}</h3>
                      {l.summary && <p>{l.summary}</p>}
                      <span className="ac-lesson-f"><b>+{l.points} puncte</b><span>{l.passed ? 'Revezi lecția →' : 'Deschide →'}</span></span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}
        </>)}
      </div>
    </div>
  )
}

function Cap() { return <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10L12 5 2 10l10 5 10-5z" /><path d="M6 12v5c3 2 9 2 12 0v-5" /></svg> }
function Arrow() { return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg> }
function Check({ s = 16 }: { s?: number }) { return <svg aria-hidden="true" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg> }
function Medal() { return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="6" /><path d="M8.5 14l-1.5 8 5-3 5 3-1.5-8" /></svg> }
function StarI() { return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" /></svg> }
function Clock() { return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg> }
