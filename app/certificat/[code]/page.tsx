import type { Metadata } from 'next'
import Link from 'next/link'
import SitePage from '@/components/site/SiteShell'
import { getCertificateByCode } from '@/app/actions/academy'
import { TIERS } from '@/lib/academy'
import { CERT_CSS, CertForm } from '../cert-ui'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params
  const c = await getCertificateByCode(code)
  return {
    title: c ? `${c.name} · Creator certificat ${TIERS[c.tier].label} · AddFame` : 'Verificare certificat · AddFame',
    robots: { index: false },
  }
}

const fmt = (d: string) => { try { return new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return '' } }

// Verificarea publică a unui certificat din Academia AddFame, după cod (ex. AF-2026-0042).
export default async function CertificatPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const c = await getCertificateByCode(decodeURIComponent(code))
  return (
    <SitePage>
      <style>{CERT_CSS}</style>
      <section className="cf-wrap">
        {c ? (
          <div className="cf-card" style={{ borderColor: TIERS[c.tier].fg }}>
            <span className="cf-ok">✓ Certificat valid</span>
            <div className="cf-ava">
              {c.avatar ? <img className="cf-photo" src={c.avatar} alt="" /> : <span className="cf-photo cf-ini">{c.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}</span>}
              <img className="cf-frame" src={TIERS[c.tier].frame} alt={`Ramă ${TIERS[c.tier].label}`} />
            </div>
            <span className="cf-k">Certificat de absolvire · Academia AddFame</span>
            <h1>{c.name}</h1>
            <p>Creator certificat <b>{TIERS[c.tier].label}</b>{c.total ? <>, cu {c.correct} din {c.total} răspunsuri corecte din prima încercare</> : null}.</p>
            <dl className="cf-meta">
              <div><dt>Data</dt><dd>{fmt(c.at)}</dd></div>
              <div><dt>Cod</dt><dd>{c.code}</dd></div>
              <div><dt>Nivel</dt><dd>{TIERS[c.tier].label}</dd></div>
            </dl>
            <Link className="cf-btn" href={`/influencer/${c.slug}`}>Vezi profilul creatorului</Link>
          </div>
        ) : (
          <div className="cf-card">
            <span className="cf-bad">Nu am găsit certificatul</span>
            <h1>Codul „{decodeURIComponent(code)}” nu există</h1>
            <p>Verifică dacă l-ai scris corect, de exemplu AF-2026-0042.</p>
            <CertForm />
          </div>
        )}
      </section>
    </SitePage>
  )
}
