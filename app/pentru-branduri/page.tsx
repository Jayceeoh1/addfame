import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BarChart3, Clapperboard, CreditCard, ShieldCheck, Target, Zap } from 'lucide-react'
import SitePage, { PageHero } from '@/components/site/SiteShell'

export const metadata: Metadata = {
  title: 'Pentru Branduri — AddFame | Influencer Marketing România',
  description: 'Lansează campanii cu micro-influenceri români verificați. Fără echipă de marketing, fără abonamente — costul campaniei afișat înainte să publici.',
}

const STATS = [['Preț fix', 'Per influencer'], ['3 zile', 'Conținut gata'], ['0', 'Abonamente']]

const FEATURES = [
  { Icon: Target, title: 'Nu ai nevoie de experiență', desc: 'Platforma te ghidează pas cu pas. Lansezi prima campanie în sub 5 minute.' },
  { Icon: CreditCard, title: 'Preț fix, fără surprize', desc: 'Plătești o taxă fixă pentru fiecare influencer selectat. Vezi costul total înainte să publici, iar locurile neocupate îți sunt returnate.' },
  { Icon: ShieldCheck, title: 'Profiluri autentice', desc: 'Statistici autentice, zero followeri cumpărați.' },
  { Icon: Clapperboard, title: 'Conținut refolosibil', desc: 'Videoclipurile și postările create pot fi refolosite pentru reclame plătite pe Meta sau TikTok.' },
  { Icon: Zap, title: 'Rapid și simplu', desc: 'Postezi campania, influencerii potriviți aplică, tu alegi. Fără negocieri lungi prin DM.' },
  { Icon: BarChart3, title: 'Transparență totală', desc: 'Vezi în timp real cine a aplicat, cine postează, ce performanță are fiecare colaborare.' },
]

const STEPS = [
  { n: '01', title: 'Creează campania', desc: 'Alegi câți influenceri vrei, descrii produsul și brief-ul creativ. Durează sub 5 minute.' },
  { n: '02', title: 'Influencerii aplică', desc: 'Micro-influencerii din nișa ta văd campania și aplică. Tu alegi cu cine lucrezi.' },
  { n: '03', title: 'Ei postează', desc: 'Creatorul postează conținutul din propriul cont. Tu aprobi livrarea.' },
  { n: '04', title: 'Primești rezultatele', desc: 'Urmărești postările și performanța fiecărui influencer direct din platformă.' },
]

const PB_CSS = `
.pb-stats{margin-top:14px;max-width:720px}
.pb-narrow{max-width:900px}
.pb-note{position:relative;margin:12px 0 0;font-size:13px;color:#c9c5e8}
`

export default function PentruBranduri() {
  return (
    <SitePage>
      <style>{PB_CSS}</style>

      <PageHero
        eyebrow="Pentru Branduri"
        title="Crește cu conținut"
        accent="autentic din România"
        lead="Lansează o campanie în câteva minute. Ajunge la mii de potențiali clienți prin conținut genuine de la micro-influenceri — fără să ai nevoie de o echipă de marketing."
      >
        <div className="af-row">
          <Link href="/auth/register?type=brand" className="af-btn af-btn-brand">Începe gratuit <ArrowRight size={18} aria-hidden="true" /></Link>
          <Link href="/cum-functioneaza" className="af-btn af-btn-ghost">Cum funcționează</Link>
        </div>
        <div className="sp-stats pb-stats">
          {STATS.map(([val, label]) => (
            <div key={label} className="sp-stat">
              <b>{val}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </PageHero>

      {/* Features */}
      <section className="sp-section">
        <div className="af-wrap">
          <div className="sp-head">
            <span className="af-eyebrow">De ce AddFame?</span>
            <h2 className="sp-h2">Tot ce ai nevoie, într-un singur loc</h2>
          </div>
          <div className="sp-grid">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div key={title} className="sp-card">
                <span className="sp-icon sp-icon-brand"><Icon size={22} aria-hidden="true" /></span>
                <h3 className="sp-h3">{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="sp-section sp-section-white">
        <div className="af-wrap pb-narrow">
          <div className="sp-head">
            <span className="af-eyebrow">Proces simplu</span>
            <h2 className="sp-h2">4 pași simpli</h2>
          </div>
          <div className="sp-steps">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="sp-step">
                <span className="sp-num">{n}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="sp-section">
        <div className="af-wrap">
          <div className="sp-cta">
            <div className="sp-cta-glow af-grad" aria-hidden="true" />
            <div>
              <h2>Preț simplu, fără surprize</h2>
              <p>Înregistrarea e gratuită. Plătești doar o taxă fixă pentru fiecare influencer din campanie. Pentru campanii mari, cere-ne o ofertă personalizată.</p>
              <p className="pb-note">Fără card de credit. Fără angajament.</p>
            </div>
            <div className="af-row">
              <Link href="/auth/register?type=brand" className="af-btn af-btn-white">Înregistrează-te gratuit <ArrowRight size={18} aria-hidden="true" /></Link>
            </div>
          </div>
        </div>
      </section>
    </SitePage>
  )
}
