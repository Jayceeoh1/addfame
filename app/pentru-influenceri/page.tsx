import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Pentru Influenceri — AddFame | Câștigă din audiența ta',
  description: 'Conectează-te cu branduri românești care se potrivesc nișei tale. Fii plătit pentru conținut autentic — de la 1.000 de urmăritori poți participa.',
}

export default function PentruInfluenceri() {
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: 'white' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .container { max-width: 900px; margin: 0 auto; padding: 0 24px; }
        .btn-purple { display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px; background: linear-gradient(135deg,#8b5cf6,#06b6d4); color: white; border-radius: 14px; font-weight: 900; font-size: 15px; text-decoration: none; transition: transform .15s; }
        .btn-purple:hover { transform: translateY(-2px); }
        .btn-ghost { display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px; border: 2px solid #f0f0f0; color: #6b7280; border-radius: 14px; font-weight: 700; font-size: 15px; text-decoration: none; }
        .card { background: white; border-radius: 20px; border: 1.5px solid #f0f0f0; padding: 28px; }
        .step-num { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 18px; flex-shrink: 0; }
      `}</style>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #f0f0f0', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#8b5cf6' }}>Add</span>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#06b6d4' }}>Fame</span>
        </Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/pentru-branduri" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none', fontWeight: 600 }}>Pentru Branduri</Link>
          <Link href="/auth/register?type=influencer" className="btn-purple" style={{ padding: '9px 18px', fontSize: 13 }}>Înregistrează-te gratuit</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, #ede9fe44, transparent), #fff', padding: '72px 24px 80px', textAlign: 'center' }}>
        <div className="container">
          <span style={{ display: 'inline-block', background: '#faf5ff', border: '1px solid #ddd6fe', color: '#7c3aed', padding: '4px 14px', borderRadius: 99, fontSize: 12, fontWeight: 800, marginBottom: 20 }}>Pentru Influenceri</span>
          <h1 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, color: '#111', margin: '0 0 16px', lineHeight: 1.15 }}>
            Câștigă din audiența ta<br />
            <span style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>cu branduri din România</span>
          </h1>
          <p style={{ fontSize: 18, color: '#6b7280', maxWidth: 580, margin: '0 auto 36px', lineHeight: 1.7 }}>
            Conectează-te cu branduri care se potrivesc nișei tale. Fii plătit pentru conținut autentic pe care l-ai crea oricum — după programul tău, din contul tău.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth/register?type=influencer" className="btn-purple">Alătură-te gratuit →</Link>
            <Link href="/cum-functioneaza" className="btn-ghost">Cum funcționează</Link>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap', marginTop: 48, paddingTop: 48, borderTop: '1px solid #f0f0f0' }}>
            {[['1.000+', 'Urmăritori minim'], ['180+', 'Creatori înregistrați'], ['100%', 'Plată garantată'], ['0%', 'Comision din câștiguri']].map(([val, label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 28, fontWeight: 900, color: '#8b5cf6', margin: 0 }}>{val}</p>
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
          <h2 style={{ fontSize: 'clamp(24px,4vw,36px)', fontWeight: 900, textAlign: 'center', margin: '0 0 48px' }}>Colaborări simple, plăți sigure</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {[
              { emoji: '💸', title: 'Plată rapidă, direct în cont', desc: 'Câștigurile ajung la tine după ce brandul confirmă postarea. Fără întârzieri, fără scuze.' },
              { emoji: '❤️', title: 'Branduri pe care le iubești', desc: 'Aplici doar la campaniile care ți se potrivesc. Tu alegi cu cine colaborezi, nu invers.' },
              { emoji: '🎨', title: 'Libertate creativă totală', desc: 'Creezi conținut în stilul tău. Brandul oferă brief-ul, tu aduci creativitatea.' },
              { emoji: '📱', title: 'De la 1.000 de urmăritori', desc: 'Nu trebuie să fii mega-influencer. Micro-influencerii au rate de engagement mai mari.' },
              { emoji: '🔐', title: 'Identitate verificată', desc: 'Platforma verifică toți influencerii — asta înseamnă că brandurile au încredere mai mare în tine.' },
              { emoji: '📈', title: 'Îți crești portofoliul', desc: 'Fiecare colaborare îți construiește un portofoliu profesional vizibil brandurilor din platformă.' },
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
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Simplu de început</p>
          <h2 style={{ fontSize: 'clamp(24px,4vw,36px)', fontWeight: 900, textAlign: 'center', margin: '0 0 48px' }}>Cum funcționează pentru tine</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600, margin: '0 auto' }}>
            {[
              { n: '01', bg: '#ede9fe', color: '#5b21b6', title: 'Creează profilul', desc: 'Adaugă bio, nișele tale, platformele sociale și câteva exemple de conținut.' },
              { n: '02', bg: '#dbeafe', color: '#1e40af', title: 'Verifică-ți identitatea', desc: 'Un pas simplu care îți crește credibilitatea față de branduri și îți deblocheaza toate funcțiile.' },
              { n: '03', bg: '#dcfce7', color: '#166534', title: 'Aplică la campanii', desc: 'Navighezi campaniile active și aplici la cele care ți se potrivesc cu nișa și stilul.' },
              { n: '04', bg: '#fef9c3', color: '#854d0e', title: 'Postezi și ești plătit', desc: 'Creezi conținut, postezi din propriul cont și primești plata automat după confirmare.' },
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
      <section style={{ padding: '72px 24px', background: 'linear-gradient(135deg,#faf5ff,#e0f2fe)', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(24px,4vw,36px)', fontWeight: 900, margin: '0 0 12px' }}>180+ creatori s-au înscris în prima săptămână</h2>
          <p style={{ fontSize: 16, color: '#6b7280', margin: '0 0 32px' }}>Fără nicio promovare plătită. Alătură-te comunității de creatori AddFame.</p>
          <Link href="/auth/register?type=influencer" className="btn-purple">Înregistrează-te gratuit →</Link>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 16 }}>Gratuit. Fără comision din câștigurile tale.</p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/" style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>← Înapoi la AddFame</Link>
        <Link href="/pentru-branduri" style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>Pentru Branduri</Link>
        <Link href="/cum-functioneaza" style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>Cum funcționează</Link>
        <Link href="/contact" style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>Contact</Link>
      </footer>
    </div>
  )
}
