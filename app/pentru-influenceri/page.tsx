import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Heart, Palette, Smartphone, TrendingUp, Wallet } from 'lucide-react'
import SitePage, { PageHero } from '@/components/site/SiteShell'

export const metadata: Metadata = {
  title: 'Pentru Influenceri — AddFame | Câștigă din audiența ta',
  description: 'Conectează-te cu branduri românești care se potrivesc nișei tale. Fii plătit pentru conținut autentic — de la 1.000 de urmăritori poți participa.',
}

const STATS = [['1.000+', 'Urmăritori minim'], ['100%', 'Plată garantată'], ['Gratuit', 'Înscriere pentru creatori']]

const FEATURES = [
  { Icon: Wallet, title: 'Plată rapidă, direct în cont', desc: 'Câștigurile ajung la tine după ce brandul confirmă postarea. Fără întârzieri, fără scuze.' },
  { Icon: Heart, title: 'Branduri pe care le iubești', desc: 'Aplici doar la campaniile care ți se potrivesc. Tu alegi cu cine colaborezi, nu invers.' },
  { Icon: Palette, title: 'Libertate creativă totală', desc: 'Creezi conținut în stilul tău. Brandul oferă brief-ul, tu aduci creativitatea.' },
  { Icon: Smartphone, title: 'De la 1.000 de urmăritori', desc: 'Nu trebuie să fii mega-influencer. Micro-influencerii au rate de engagement mai mari.' },
  { Icon: TrendingUp, title: 'Îți crești portofoliul', desc: 'Fiecare colaborare îți construiește un portofoliu profesional vizibil brandurilor din platformă.' },
]

const STEPS = [
  { n: '01', title: 'Creează profilul', desc: 'Adaugă bio, nișele tale, platformele sociale și câteva exemple de conținut.' },
  { n: '02', title: 'Aplică la campanii', desc: 'Navighezi campaniile active și aplici la cele care ți se potrivesc cu nișa și stilul.' },
  { n: '03', title: 'Primești brief-ul', desc: 'Când un brand te selectează, primești brief-ul campaniei și, la campaniile barter, produsul.' },
  { n: '04', title: 'Postezi și ești plătit', desc: 'Creezi conținut, postezi din propriul cont și primești plata automat după confirmare.' },
]

const PI_CSS = `
.pi-stats{margin-top:14px;max-width:720px}
.pi-narrow{max-width:900px}
`

export default function PentruInfluenceri() {
  return (
    <SitePage>
      <style>{PI_CSS}</style>

      <PageHero
        eyebrow="Pentru Influenceri"
        title="Câștigă din audiența ta"
        accent="cu branduri din România"
        lead="Conectează-te cu branduri care se potrivesc nișei tale. Fii plătit pentru conținut autentic pe care l-ai crea oricum — după programul tău, din contul tău."
      >
        <div className="af-row">
          <Link href="/auth/register?type=influencer" className="af-btn af-btn-infl">Alătură-te gratuit <ArrowRight size={18} aria-hidden="true" /></Link>
          <Link href="/cum-functioneaza" className="af-btn af-btn-ghost">Cum funcționează</Link>
        </div>
        <div className="sp-stats pi-stats">
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
            <h2 className="sp-h2">Colaborări simple, plăți sigure</h2>
          </div>
          <div className="sp-grid">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div key={title} className="sp-card">
                <span className="sp-icon sp-icon-infl"><Icon size={22} aria-hidden="true" /></span>
                <h3 className="sp-h3">{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="sp-section sp-section-white">
        <div className="af-wrap pi-narrow">
          <div className="sp-head">
            <span className="af-eyebrow">Simplu de început</span>
            <h2 className="sp-h2">Cum funcționează pentru tine</h2>
          </div>
          <div className="sp-steps">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="sp-step sp-step-infl">
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
              <h2>Alătură-te comunității de creatori AddFame.</h2>
              <p>Înscrierea e gratuită pentru creatori.</p>
            </div>
            <div className="af-row">
              <Link href="/auth/register?type=influencer" className="af-btn af-btn-white">Înregistrează-te gratuit <ArrowRight size={18} aria-hidden="true" /></Link>
            </div>
          </div>
        </div>
      </section>
    </SitePage>
  )
}
