import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Building2, Clapperboard } from 'lucide-react'
import SitePage, { PageHero } from '@/components/site/SiteShell'

export const metadata: Metadata = {
  title: 'Cum Funcționează AddFame — Influencer Marketing Simplu',
  description: 'Totul este automatizat și ușor pe AddFame. Lansezi o campanie în 5 minute, influencerii aplică, tu alegi, ei postează și primești conținut în 3 zile.',
}

const BRAND_STEPS = [
  { n: '01', title: 'Creează campania', desc: 'Alegi câți influenceri vrei, descrii produsul și brief-ul creativ. Specifici nișa dorită, platforma (Instagram, TikTok etc.) și deadline-ul. Vezi costul total înainte să publici. Durează sub 5 minute.' },
  { n: '02', title: 'Influencerii aplică', desc: 'Micro-influencerii potriviți din platformă văd campania ta și aplică. Tu revizuiești profilul, statisticile și portofoliul fiecăruia înainte să alegi.' },
  { n: '03', title: 'Alegi influencerii', desc: 'Selectezi influencerii cu care vrei să lucrezi, până la numărul de locuri ales. Plătești o taxă fixă per influencer, iar locurile neocupate îți sunt returnate.' },
  { n: '04', title: 'Ei postează, tu confirmi', desc: 'Influencerul postează conținutul din propriul cont și îți trimite dovada. Tu verifici și confirmi livrarea.' },
]

const INFL_STEPS = [
  { n: '01', title: 'Creează profilul', desc: 'Completezi bio-ul, nișele tale, platformele sociale și câteva exemple de conținut. Cu cât profilul e mai complet, cu atât brandurile te găsesc mai ușor.' },
  { n: '02', title: 'Aplică la campanii', desc: 'Navighezi campaniile active și aplici la cele care se potrivesc nișei și stilului tău. Poți aplica la oricâte campanii dorești.' },
  { n: '03', title: 'Primești brief-ul', desc: 'Când un brand te selectează, primești brief-ul campaniei și, la campaniile barter, produsul.' },
  { n: '04', title: 'Postezi și ești plătit', desc: 'Creezi conținut în stilul tău, postezi din propriul cont și trimiți dovada în platformă. Brandul confirmă, iar echipa AddFame se ocupă de plata ta.' },
]

const FAQ = [
  { q: 'Cât costă AddFame?', a: 'Costul depinde de câți influenceri alegi și îl vezi înainte să publici campania. Fără abonamente. Locurile neocupate se returnează la final.' },
  { q: 'Cum primesc banii ca influencer?', a: 'După ce brandul confirmă livrarea, echipa AddFame se ocupă de plata ta. Înscrierea e gratuită pentru creatori.' },
  { q: 'De câți urmăritori am nevoie?', a: 'Minimum 1.000 urmăritori pe orice platformă (Instagram, TikTok, YouTube etc.).' },
  { q: 'Ce se întâmplă dacă influencerul nu livrează?', a: 'Echipa AddFame intervine: influencerul primește un avertisment sau este suspendat, iar brandul poate selecta alt influencer în locul lui.' },
  { q: 'Pot folosi conținutul creat pentru reclame?', a: 'Da! Conținutul creat în cadrul campaniei poate fi reutilizat pentru reclame plătite pe Meta, TikTok sau alte platforme.' },
]

const CF_CSS = `
.cf-title{display:flex;flex-wrap:wrap;align-items:center;gap:12px}
.cf-narrow{max-width:900px}
.cf-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
`

export default function CumFunctioneaza() {
  return (
    <SitePage>
      <style>{CF_CSS}</style>

      <PageHero
        eyebrow="Simplu și transparent"
        title="Cum funcționează"
        accent="AddFame"
        lead="Totul este automatizat și ușor, chiar dacă nu ai mai făcut marketing cu influenceri înainte."
      />

      {/* Pentru Branduri */}
      <section className="sp-section">
        <div className="af-wrap cf-narrow">
          <div className="sp-head">
            <div className="cf-title">
              <span className="sp-icon sp-icon-brand"><Building2 size={22} aria-hidden="true" /></span>
              <h2 className="sp-h2">Pentru Branduri</h2>
              <span className="sp-tag sp-tag-brand">Brand</span>
            </div>
          </div>
          <div className="sp-steps">
            {BRAND_STEPS.map(({ n, title, desc }) => (
              <div key={n} className="sp-step">
                <span className="sp-num">{n}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="cf-actions">
            <Link href="/auth/register?type=brand" className="af-btn af-btn-brand">Începe ca brand <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      {/* Pentru Influenceri */}
      <section className="sp-section sp-section-white">
        <div className="af-wrap cf-narrow">
          <div className="sp-head">
            <div className="cf-title">
              <span className="sp-icon sp-icon-infl"><Clapperboard size={22} aria-hidden="true" /></span>
              <h2 className="sp-h2">Pentru Influenceri</h2>
              <span className="sp-tag sp-tag-infl">Creator</span>
            </div>
          </div>
          <div className="sp-steps">
            {INFL_STEPS.map(({ n, title, desc }) => (
              <div key={n} className="sp-step sp-step-infl">
                <span className="sp-num">{n}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="cf-actions">
            <Link href="/auth/register?type=influencer" className="af-btn af-btn-infl">Alătură-te ca influencer <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>

      {/* FAQ rapid */}
      <section className="sp-section">
        <div className="af-wrap cf-narrow">
          <div className="sp-head">
            <h2 className="sp-h2">Întrebări frecvente</h2>
          </div>
          <div className="sp-faq">
            {FAQ.map(({ q, a }) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="sp-section" style={{ paddingTop: 0 }}>
        <div className="af-wrap">
          <div className="sp-cta">
            <div className="sp-cta-glow af-grad" aria-hidden="true" />
            <div>
              <h2>Gata să începi?</h2>
              <p>Înregistrarea e gratuită și durează 2 minute.</p>
            </div>
            <div className="af-row">
              <Link href="/auth/register?type=brand" className="af-btn af-btn-white">Sunt brand <ArrowRight size={18} aria-hidden="true" /></Link>
              <Link href="/auth/register?type=influencer" className="af-btn af-btn-infl">Sunt influencer <ArrowRight size={18} aria-hidden="true" /></Link>
            </div>
          </div>
        </div>
      </section>
    </SitePage>
  )
}
