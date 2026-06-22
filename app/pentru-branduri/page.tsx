import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Pentru Branduri — AddFame | Influencer Marketing România',
  description: 'Lansează campanii cu micro-influenceri români verificați. Fără echipă de marketing, fără riscuri — plătești doar după ce postarea e publicată.',
}

export default function PentruBranduri() {
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: 'white' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .container { max-width: 900px; margin: 0 auto; padding: 0 24px; }
        .btn-orange { display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px; background: linear-gradient(135deg,#f97316,#ec4899); color: white; border-radius: 14px; font-weight: 900; font-size: 15px; text-decoration: none; transition: transform .15s; }
        .btn-orange:hover { transform: translateY(-2px); }
        .btn-ghost { display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px; border: 2px solid #f0f0f0; color: #6b7280; border-radius: 14px; font-weight: 700; font-size: 15px; text-decoration: none; }
        .card { background: white; border-radius: 20px; border: 1.5px solid #f0f0f0; padding: 28px; }
        .step-num { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 18px; flex-shrink: 0; }
      `}</style>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #f0f0f0', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#f97316' }}>Add</span>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#ec4899' }}>Fame</span>
        </Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/pentru-influenceri" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none', fontWeight: 600 }}>Pentru Influenceri</Link>
          <Link href="/auth/register?type=brand" className="btn-orange" style={{ padding: '9px 18px', fontSize: 13 }}>Înregistrează-te gratuit</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, #fed7aa44, transparent), #fff', padding: '72px 24px 80px', textAlign: 'center' }}>
        <div className="container">
          <span style={{ display: 'inline-block', background: '#fff7ed', border: '1px solid #fed7aa', color: '#ea580c', padding: '4px 14px', borderRadius: 99, fontSize: 12, fontWeight: 800, marginBottom: 20 }}>Pentru Branduri</span>
          <h1 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, color: '#111', margin: '0 0 16px', lineHeight: 1.15 }}>
            Crește cu conținut<br />
            <span style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>autentic din România</span>
          </h1>
          <p style={{ fontSize: 18, color: '#6b7280', maxWidth: 580, margin: '0 auto 36px', lineHeight: 1.7 }}>
            Lansează o campanie în câteva minute. Ajunge la mii de potențiali clienți prin conținut genuine de la micro-influenceri — fără să ai nevoie de o echipă de marketing.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth/register?type=brand" className="btn-orange">Începe gratuit →</Link>
            <Link href="/cum-functioneaza" className="btn-ghost">Cum funcționează</Link>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap', marginTop: 48, paddingTop: 48, borderTop: '1px solid #f0f0f0' }}>
            {[['180+', 'Influenceri verificați'], ['0%', 'Comision prima campanie'], ['3 zile', 'Conținut gata'], ['100%', 'Plată protejată']].map(([val, label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 28, fontWeight: 900, color: '#f97316', margin: 0 }}>{val}</p>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: '4px 0 0', fontWeight: 600 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '72px 24px', background: '#f9fafb' }}>
        <div className="container">
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>De ce AddFame?</p>
          <h2 style={{ fontSize: 'clamp(24px,4vw,36px)', fontWeight: 900, textAlign: 'center', margin: '0 0 48px' }}>Tot ce ai nevoie, într-un singur loc</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {[
              { emoji: '🎯', title: 'Nu ai nevoie de experiență', desc: 'Platforma te ghidează pas cu pas. Lansezi prima campanie în sub 5 minute.' },
              { emoji: '🔒', title: 'Plată 100% protejată', desc: 'Banii tăi stau în escrow și ajung la influencer doar după ce postarea e publicată și tu confirmi livrarea.' },
              { emoji: '✅', title: 'Influenceri verificați', desc: 'Identitate reală, statistici autentice, zero followeri cumpărați. Noi verificăm totul.' },
              { emoji: '🎬', title: 'Conținut refolosibil', desc: 'Videoclipurile și postările create pot fi refolosite pentru reclame plătite pe Meta sau TikTok.' },
              { emoji: '⚡', title: 'Rapid și simplu', desc: 'Postezi campania, influencerii potrivi­ți aplică, tu alegi. Fără negocieri lungi prin DM.' },
              { emoji: '📊', title: 'Transparență totală', desc: 'Vezi în timp real cine a aplicat, cine postează, ce performanță are fiecare colaborare.' },
            ].map(({ emoji, title, desc }) => (
              <div key={title} className="card">
                <p style={{ fontSize: 28, margin: '0 0 12px' }}>{emoji}</p>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: '0 0 8px' }}>{title}</h3>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '72px 24px' }}>
        <div className="container">
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Proces simplu</p>
          <h2 style={{ fontSize: 'clamp(24px,4vw,36px)', fontWeight: 900, textAlign: 'center', margin: '0 0 48px' }}>4 pași simpli</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600, margin: '0 auto' }}>
            {[
              { n: '01', bg: '#fef9c3', color: '#854d0e', title: 'Creează campania', desc: 'Setează bugetul, descrie produsul și brief-ul creativ. Durează sub 5 minute.' },
              { n: '02', bg: '#dbeafe', color: '#1e40af', title: 'Influencerii aplică', desc: 'Micro-influencerii din nișa ta văd campania și aplică. Tu alegi cu cine lucrezi.' },
              { n: '03', bg: '#dcfce7', color: '#166534', title: 'Ei postează', desc: 'Creatorul postează conținutul din propriul cont. Tu aprobi livrarea.' },
              { n: '04', bg: '#ede9fe', color: '#5b21b6', title: 'Plata se face automat', desc: 'Banii din escrow ajung la influencer. Tu primești o singură factură clară.' },
            ].map(({ n, bg, color, title, desc }) => (
              <div key={n} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div className="step-num" style={{ background: bg, color }}>{n}</div>
                <div style={{ paddingTop: 10 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: '0 0 4px' }}>{title}</h3>
                  <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '72px 24px', background: 'linear-gradient(135deg,#fff7ed,#fce7f3)', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(24px,4vw,36px)', fontWeight: 900, margin: '0 0 12px' }}>Prima ta campanie este fără comision</h2>
          <p style={{ fontSize: 16, color: '#6b7280', margin: '0 0 32px' }}>Înregistrează-te gratuit și lansează prima campanie. Plătești comision abia de la a doua.</p>
          <Link href="/auth/register?type=brand" className="btn-orange">Înregistrează-te gratuit →</Link>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 16 }}>Fără card de credit. Fără angajament.</p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/" style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>← Înapoi la AddFame</Link>
        <Link href="/pentru-influenceri" style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>Pentru Influenceri</Link>
        <Link href="/cum-functioneaza" style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>Cum funcționează</Link>
        <Link href="/contact" style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>Contact</Link>
      </footer>
    </div>
  )
}
