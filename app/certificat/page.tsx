import type { Metadata } from 'next'
import SitePage from '@/components/site/SiteShell'
import { CERT_CSS, CertForm } from './cert-ui'

export const metadata: Metadata = {
  title: 'Verifică un certificat · AddFame',
  description: 'Verifică un certificat din Academia AddFame după cod.',
  alternates: { canonical: '/certificat' },
}

export default function CertificatSearchPage() {
  return (
    <SitePage>
      <style>{CERT_CSS}</style>
      <section className="cf-wrap">
        <div className="cf-card">
          <span className="cf-k">Academia AddFame</span>
          <h1>Verifică un certificat</h1>
          <p>Scrie codul de pe certificat, de exemplu AF-2026-0042.</p>
          <CertForm />
        </div>
      </section>
    </SitePage>
  )
}
