import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, CreditCard, Handshake, MapPin, UserPlus, Zap } from 'lucide-react'
import SitePage, { PageHero } from '@/components/site/SiteShell'

export const metadata: Metadata = {
  title: 'Despre Noi | AddFame',
  description: 'Cunoaște echipa din spatele AddFame — platforma care conectează brandurile cu influencerii din România.',
  openGraph: {
    title: 'Despre Noi | AddFame',
    description: 'Cunoaște echipa din spatele AddFame.',
    url: 'https://addfame.ro/about',
  },
}

type Member = {
  name: string
  role: string
  bio: string
  image: string | null
  linkedin: string | null
  instagram: string | null
  placeholder: boolean
  badge?: string
  cta?: string
  ctaHref?: string
}

const TEAM: Member[] = [
  {
    name: 'Stancu Marius Ciprian',
    role: 'Fondator & CEO',
    bio: 'Antreprenor cu o viziune clară asupra viitorului marketingului digital în România. A creat AddFame din dorința de a elimina fricțiunea dintre branduri și influenceri — oferind o platformă transparentă, sigură și eficientă, unde colaborările se întâmplă simplu și plățile sunt garantate.',
    image: '/founder-ciprian.jpg',
    linkedin: 'https://www.linkedin.com/in/marius-ciprian-0b23a430b/',
    instagram: 'https://instagram.com/stancumarius_',
    placeholder: false,
  },
  {
    name: 'Maria-Cristiana Niță',
    role: 'Co-fondator & Head of Marketing',
    bio: 'Antreprenor și specialist în affiliate marketing și managementul campaniilor cu influenceri. A coordonat campanii care au generat peste 100 de milioane de vizualizări, colaborând cu branduri, platforme de afiliere și creatori de conținut pentru a crește vizibilitatea și performanța vânzărilor online.',
    image: '/cofounder-maria.jpeg',
    linkedin: 'https://www.linkedin.com/in/cristiana-nita-b7223a264',
    instagram: null,
    placeholder: false,
    badge: 'Co-fondator',
  },
  {
    name: 'Poziție deschisă',
    role: 'Head of Growth',
    bio: 'Căutăm un specialist în creștere care să ajute AddFame să devină platforma #1 de influencer marketing din România. Background în performance marketing sau community building — ideal.',
    image: null,
    linkedin: null,
    instagram: null,
    placeholder: true,
    cta: 'Aplică acum',
    ctaHref: 'mailto:contact@addfame.ro',
  },
]

const VALUES = [
  { Icon: Handshake, title: 'Transparență totală', desc: 'Fără surprize. Costurile, plățile și procesele sunt clare de la început — atât pentru branduri, cât și pentru influenceri.' },
  { Icon: CreditCard, title: 'Prețuri transparente', desc: 'Costul campaniei e afișat înainte de publicare. Fără abonamente, fără costuri ascunse.' },
  { Icon: MapPin, title: 'Făcut pentru România', desc: 'Înțelegem piața locală. Suntem construiți pentru branduri și influenceri din România, cu suport în română.' },
  { Icon: Zap, title: 'Simplitate radicală', desc: 'De la brief la plată în câteva click-uri. Platformele complexe pierd timp. Noi câștigăm timp.' },
]

const DN_CSS = `
.dn-quote{position:relative;overflow:hidden;background:var(--ink);color:#fff;border-radius:28px;padding:clamp(28px,6vw,56px);text-align:center}
.dn-quote-glow{position:absolute;width:420px;height:420px;left:-140px;bottom:-220px;border-radius:50%;opacity:.35;filter:blur(60px)}
.dn-quote blockquote{position:relative;margin:0 auto;max-width:34em;font-family:var(--font-display,system-ui),system-ui,sans-serif;font-weight:800;font-size:clamp(20px,2.6vw,28px);line-height:1.35;letter-spacing:-.015em;text-wrap:balance}
.dn-quote figcaption{position:relative;margin-top:16px;color:#c9c5e8;font-weight:600;font-size:15px}
.dn-team{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:20px}
.dn-member{background:#fff;border:1px solid var(--line);border-radius:22px;overflow:hidden;display:flex;flex-direction:column;transition:transform .25s,box-shadow .25s}
.dn-member:hover{transform:translateY(-4px);box-shadow:0 24px 48px -24px rgba(20,18,58,.3)}
.dn-member-open{border-style:dashed;border-color:#d8d5ec;background:#fafafd}
.dn-photo{position:relative;height:256px;background:linear-gradient(160deg,#eaf8fe 0%,#f0f1ff 50%,#f5eeff 100%)}
.dn-photo-tall{height:320px}
.dn-photo img{width:100%;height:100%;object-fit:cover;display:block}
.dn-open{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--faint);font-size:14px;font-weight:700}
.dn-open-ring{width:80px;height:80px;border-radius:50%;border:3px dashed #cfc4ff;background:#fff;display:flex;align-items:center;justify-content:center;color:#7040f0}
.dn-badge{position:absolute;left:16px;bottom:16px;color:#fff;font-size:12px;font-weight:800;padding:6px 12px;border-radius:999px;box-shadow:0 6px 16px -6px rgba(20,18,58,.4)}
.dn-info{padding:clamp(20px,3vw,24px);display:flex;flex-direction:column;gap:6px;flex:1}
.dn-info h3{margin:0;font-size:20px;font-weight:800;letter-spacing:-.01em}
.dn-member-open .dn-info h3{color:var(--faint)}
.dn-role{margin:0 0 8px;font-weight:700;font-size:14px}
.dn-bio{margin:0 0 14px;color:var(--muted);font-size:15px;line-height:1.6}
.dn-socials{display:flex;flex-wrap:wrap;gap:8px;margin-top:auto}
.dn-social{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:8px 16px;border-radius:10px;border:1px solid #d8d5ec;color:var(--muted);font-size:13px;font-weight:700;text-decoration:none;transition:border-color .15s,color .15s,background .15s}
.dn-social:hover{border-color:#7040f0;color:#5a35e6;background:#f5f2ff}
.dn-social svg{width:14px;height:14px;fill:currentColor;flex:none}
.dn-apply{margin-top:auto;align-self:flex-start}
.dn-values .sp-card h3{margin:0}
`

export default function AboutPage() {
  return (
    <SitePage>
      <style>{DN_CSS}</style>

      <PageHero
        eyebrow="Echipa AddFame"
        title={<>Construim viitorul <span className="af-grad-text">marketingului cu influenceri</span> în România</>}
        lead="AddFame a pornit dintr-o problemă reală — colaborările dintre branduri și influenceri erau complicate, nesigure și lipsite de transparență. Am construit platforma pe care ne-am fi dorit-o noi înșine."
      />

      {/* Mission quote */}
      <section className="sp-section">
        <div className="af-wrap">
          <figure className="dn-quote" style={{ margin: 0 }}>
            <div className="dn-quote-glow af-grad" aria-hidden="true" />
            <blockquote>
              &bdquo;Misiunea noastră este să facem colaborările dintre branduri și influenceri simple, transparente și profitabile pentru toată lumea.&rdquo;
            </blockquote>
            <figcaption>— Stancu Marius Ciprian, Fondator AddFame</figcaption>
          </figure>
        </div>
      </section>

      {/* Team */}
      <section className="sp-section sp-section-white">
        <div className="af-wrap">
          <div className="sp-head">
            <h2 className="sp-h2">Oamenii din spatele platformei</h2>
            <p className="sp-muted">O echipă mică, cu o viziune mare.</p>
          </div>
          <div className="dn-team">
            {TEAM.map(member => {
              const isMaria = member.name.includes('Maria')
              return (
                <article key={member.name} className={`dn-member${member.placeholder ? ' dn-member-open' : ''}`}>
                  <div className={`dn-photo${isMaria ? ' dn-photo-tall' : ''}`}>
                    {member.image ? (
                      <img src={member.image} alt={member.name} style={{ objectPosition: isMaria ? '50% 55%' : '50% 8%' }} />
                    ) : (
                      <div className="dn-open">
                        <span className="dn-open-ring"><UserPlus size={30} aria-hidden="true" /></span>
                        <span>Poziție deschisă</span>
                      </div>
                    )}
                    {!member.placeholder && (
                      <span className="dn-badge af-grad">{member.badge || 'Fondator'}</span>
                    )}
                  </div>

                  <div className="dn-info">
                    <h3>{member.name}</h3>
                    <p className="dn-role af-grad-text">{member.role}</p>
                    <p className="dn-bio">{member.bio}</p>

                    {!member.placeholder && (
                      <div className="dn-socials">
                        {member.linkedin && (
                          <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="dn-social">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                            LinkedIn
                          </a>
                        )}
                        {member.instagram && (
                          <a href={member.instagram} target="_blank" rel="noopener noreferrer" className="dn-social">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                            </svg>
                            Instagram
                          </a>
                        )}
                      </div>
                    )}

                    {member.placeholder && member.cta && member.ctaHref && (
                      <a href={member.ctaHref} className="af-btn af-btn-violet af-btn-sm dn-apply">
                        {member.cta} <ArrowRight size={16} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="sp-section">
        <div className="af-wrap">
          <div className="sp-head">
            <h2 className="sp-h2">Ce ne ghidează</h2>
            <p className="sp-muted">Valorile care stau la baza fiecărei decizii pe care o luăm.</p>
          </div>
          <div className="sp-grid dn-values">
            {VALUES.map(({ Icon, title, desc }) => (
              <div key={title} className="sp-card">
                <span className="sp-icon sp-icon-soft"><Icon size={22} aria-hidden="true" /></span>
                <h3 className="sp-h3">{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="sp-section" style={{ paddingTop: 0 }}>
        <div className="af-wrap">
          <div className="sp-cta">
            <div className="sp-cta-glow af-grad" aria-hidden="true" />
            <div>
              <h2>Gata să faci parte din <span className="af-grad-text">povestea AddFame?</span></h2>
              <p>Alătură-te brandurilor și influencerilor care colaborează deja prin platforma noastră.</p>
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
