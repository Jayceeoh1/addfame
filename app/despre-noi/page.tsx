import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Despre Noi | AddFame',
  description: 'Cunoaște echipa din spatele AddFame — platforma care conectează brandurile cu influencerii din România.',
  openGraph: {
    title: 'Despre Noi | AddFame',
    description: 'Cunoaște echipa din spatele AddFame.',
    url: 'https://addfame.ro/about',
  },
}

const TEAM = [
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
  { icon: '🤝', title: 'Transparență totală', desc: 'Fără surprize. Comisioanele, plățile și procesele sunt clare de la început — atât pentru branduri, cât și pentru influenceri.' },
  { icon: '🔒', title: 'Plăți garantate', desc: 'Sistemul nostru escrow blochează fondurile înainte de colaborare. Influencerul primește banii garantat după livrare.' },
  { icon: '🇷🇴', title: 'Făcut pentru România', desc: 'Înțelegem piața locală. Suntem construiți pentru branduri și influenceri din România, cu suport în română.' },
  { icon: '⚡', title: 'Simplitate radicală', desc: 'De la brief la plată în câteva click-uri. Platformele complexe pierd timp. Noi câștigăm timp.' },
]

export default function AboutPage() {
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="min-h-screen bg-white text-gray-900">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&display=swap');
        .brand-grad { background: linear-gradient(135deg, #f97316, #ec4899); }
        .brand-grad-text { background: linear-gradient(135deg, #f97316, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .team-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .team-card:hover { transform: translateY(-6px); box-shadow: 0 24px 60px rgba(0,0,0,0.1); }
        .social-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 10px; font-size: 13px; font-weight: 700; transition: all 0.15s; border: 1.5px solid #e5e7eb; color: #4b5563; text-decoration: none; }
        .social-btn:hover { border-color: #f97316; color: #f97316; background: #fff7ed; }
      `}</style>

      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 overflow-hidden rounded-xl flex-shrink-0">
              <img src="/logo.png" alt="AddFame" className="w-full h-full object-contain" />
            </div>
            <span className="font-black text-lg">AddFame</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition">Acasă</Link>
            <Link href="/auth/register" className="text-sm font-bold text-white brand-grad px-4 py-2 rounded-xl hover:opacity-90 transition">
              Înregistrează-te
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-4 py-1.5 mb-6">
          <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
          <span className="text-sm font-bold text-orange-700">Echipa AddFame</span>
        </div>
        <h1 className="text-5xl font-black mb-6 leading-tight tracking-tight">
          Construim viitorul<br />
          <span className="brand-grad-text" style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }}>
            marketingului cu influenceri
          </span>
          <br />în România
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
          AddFame a pornit dintr-o problemă reală — colaborările dintre branduri și influenceri erau complicate, nesigure și lipsite de transparență. Am construit platforma pe care ne-am fi dorit-o noi înșine.
        </p>
      </section>

      {/* Mission quote */}
      <section className="max-w-6xl mx-auto px-6 mb-24">
        <div className="brand-grad rounded-3xl p-10 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <p className="text-2xl font-black relative z-10 max-w-3xl mx-auto leading-relaxed">
            "Misiunea noastră este să facem colaborările dintre branduri și influenceri simple, transparente și profitabile pentru toată lumea."
          </p>
          <p className="mt-4 text-white/80 font-semibold relative z-10">— Stancu Marius Ciprian, Fondator AddFame</p>
        </div>
      </section>

      {/* Team */}
      <section className="max-w-6xl mx-auto px-6 mb-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-black mb-3">Oamenii din spatele platformei</h2>
          <p className="text-gray-500">O echipă mică, cu o viziune mare.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TEAM.map((member, i) => (
            <div key={i} className={`team-card rounded-3xl border overflow-hidden ${member.placeholder
              ? 'border-dashed border-gray-200 bg-gray-50/50'
              : 'border-gray-100 bg-white shadow-sm'
              }`}>
              {/* Photo */}
              <div className="relative overflow-hidden bg-gradient-to-br from-orange-100 to-pink-100"
                style={{ height: member.name.includes('Maria') ? '320px' : '256px' }}>
                {member.image ? (
                  <img src={member.image} alt={member.name}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: member.name.includes('Maria') ? '50% 55%' : '50% 8%' }} />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                    <div className="w-20 h-20 rounded-full border-4 border-dashed border-gray-300 flex items-center justify-center bg-white">
                      <span className="text-3xl text-gray-300">?</span>
                    </div>
                    <span className="text-sm font-bold text-gray-400">Poziție deschisă</span>
                  </div>
                )}
                {!member.placeholder && (
                  <div className="absolute bottom-4 left-4">
                    <span className="brand-grad text-white text-xs font-black px-3 py-1.5 rounded-full shadow">
                      {(member as any).badge || 'Fondator'}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-6">
                <h3 className={`font-black text-xl mb-0.5 ${member.placeholder ? 'text-gray-400' : 'text-gray-900'}`}>
                  {member.name}
                </h3>
                <p className="brand-grad-text font-bold text-sm mb-4">{member.role}</p>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">{member.bio}</p>

                {!member.placeholder && (
                  <div className="flex gap-2 flex-wrap">
                    {member.linkedin && (
                      <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="social-btn">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current flex-shrink-0">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                        LinkedIn
                      </a>
                    )}
                    {member.instagram && (
                      <a href={member.instagram} target="_blank" rel="noopener noreferrer" className="social-btn">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current flex-shrink-0">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                        </svg>
                        Instagram
                      </a>
                    )}
                  </div>
                )}

                {member.placeholder && (member as any).cta && (
                  <a href={(member as any).ctaHref}
                    className="inline-flex items-center gap-2 brand-grad text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition">
                    {(member as any).cta} →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black mb-3">Ce ne ghidează</h2>
            <p className="text-gray-500">Valorile care stau la baza fiecărei decizii pe care o luăm.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map((v, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="text-3xl mb-4">{v.icon}</div>
                <h3 className="font-black text-gray-900 mb-2">{v.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h2 className="text-4xl font-black mb-4 leading-tight">
          Gata să faci parte din<br />
          <span className="brand-grad-text" style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }}>
            povestea AddFame?
          </span>
        </h2>
        <p className="text-gray-500 mb-8 text-lg">Alătură-te brandurilor și influencerilor care colaborează deja prin platforma noastră.</p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/auth/register?role=brand"
            className="brand-grad text-white font-bold px-8 py-4 rounded-2xl text-base hover:opacity-90 transition"
            style={{ boxShadow: '0 8px 30px rgba(249,115,22,0.3)' }}>
            Sunt brand →
          </Link>
          <Link href="/auth/register?role=influencer"
            className="bg-white border-2 border-gray-200 text-gray-900 font-bold px-8 py-4 rounded-2xl text-base hover:border-orange-300 transition">
            Sunt influencer →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 overflow-hidden rounded-lg flex-shrink-0">
              <img src="/logo.png" alt="AddFame" className="w-full h-full object-contain" />
            </div>
            <span className="font-black text-gray-900">AddFame</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/terms" className="hover:text-gray-700 transition">Termeni</Link>
            <Link href="/privacy" className="hover:text-gray-700 transition">Confidențialitate</Link>
            <a href="mailto:contact@addfame.ro" className="hover:text-gray-700 transition">Contact</a>
          </div>
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} AddFame.</p>
        </div>
      </footer>
    </div>
  )
}
