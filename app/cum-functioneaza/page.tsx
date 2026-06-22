import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Cum Funcționează AddFame — Influencer Marketing Simplu',
  description: 'Totul este automatizat și ușor pe AddFame. Lansezi o campanie în 5 minute, influencerii aplică, tu alegi, ei postează și primești conținut în 3 zile.',
}

export default function CumFunctioneaza() {
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: 'white' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .container { max-width: 860px; margin: 0 auto; padding: 0 24px; }
        .btn-orange { display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px; background: linear-gradient(135deg,#f97316,#ec4899); color: white; border-radius: 14px; font-weight: 900; font-size: 15px; text-decoration: none; }
        .btn-purple { display: inline-flex; align-items: center; gap: 8px; padding: 14px 28px; background: linear-gradient(135deg,#8b5cf6,#06b6d4); color: white; border-radius: 14px; font-weight: 900; font-size: 15px; text-decoration: none; }
        .step-card { background: white; border-radius: 20px; border: 1.5px solid #f0f0f0; padding: 28px 28px 28px 24px; display: flex; gap: 20px; align-items: flex-start; }
        .step-num { width: 52px; height: 52px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; flex-shrink: 0; }
        .tab-btn { padding: 10px 20px; border-radius: 99px; font-size: 14px; font-weight: 800; border: 2px solid #f0f0f0; cursor: pointer; background: white; font-family: inherit; transition: all .15s; }
      `}</style>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #f0f0f0', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#f97316' }}>Add</span>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#ec4899' }}>Fame</span>
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/auth/register?type=brand" className="btn-orange" style={{ padding: '9px 18px', fontSize: 13 }}>Înregistrează-te</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '64px 24px 56px', textAlign: 'center' }}>
        <div className="container">
          <span style={{ display: 'inline-block', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '4px 14px', borderRadius: 99, fontSize: 12, fontWeight: 800, marginBottom: 20 }}>Simplu și transparent</span>
          <h1 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: 900, color: '#111', margin: '0 0 16px', lineHeight: 1.2 }}>
            Cum funcționează AddFame
          </h1>
          <p style={{ fontSize: 18, color: '#6b7280', maxWidth: 540, margin: '0 auto', lineHeight: 1.7 }}>
            Totul este automatizat și ușor, chiar dacă nu ai mai făcut marketing cu influenceri înainte.
          </p>
        </div>
      </section>

      {/* Pentru Branduri */}
      <section style={{ padding: '48px 24px 64px', background: '#fff7ed' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <span style={{ fontSize: 20 }}>🏢</span>
            <h2 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 900, color: '#111', margin: 0 }}>Pentru Branduri</h2>
            <span style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#ea580c', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 800 }}>Brand</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { n: '01', bg: '#fef9c3', color: '#854d0e', title: 'Creează campania', desc: 'Setează bugetul, descrie produsul și brief-ul creativ. Specifici nișa dorită, platforma (Instagram, TikTok etc.) și deadline-ul. Durează sub 5 minute.' },
              { n: '02', bg: '#dbeafe', color: '#1e40af', title: 'Influencerii aplică', desc: 'Micro-influencerii potriviți din platformă văd campania ta și aplică. Tu revizuiești profilul, statisticile și portofoliul fiecăruia înainte să alegi.' },
              { n: '03', bg: '#dcfce7', color: '#166534', title: 'Aprobi și plătești în escrow', desc: 'Selectezi influencerii cu care vrei să lucrezi. Suma se rezervă în escrow — în siguranță în platformă, nu ajunge la influencer până nu livrează.' },
              { n: '04', bg: '#ede9fe', color: '#5b21b6', title: 'Ei postează, tu confirmi', desc: 'Influencerul postează conținutul din propriul cont și îți trimite dovada. Tu verifici și confirmi livrarea. Abia atunci banii sunt eliberați.' },
            ].map(({ n, bg, color, title, desc }) => (
              <div key={n} className="step-card">
                <div className="step-num" style={{ background: bg, color }}>{n}</div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: '0 0 6px' }}>{title}</h3>
                  <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.7 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 28 }}>
            <Link href="/auth/register?type=brand" className="btn-orange">Începe ca brand →</Link>
          </div>
        </div>
      </section>

      {/* Pentru Influenceri */}
      <section style={{ padding: '64px 24px', background: '#faf5ff' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <span style={{ fontSize: 20 }}>🎬</span>
            <h2 style={{ fontSize: 'clamp(20px,3vw,28px)', fontWeight: 900, color: '#111', margin: 0 }}>Pentru Influenceri</h2>
            <span style={{ background: '#faf5ff', border: '1px solid #ddd6fe', color: '#7c3aed', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 800 }}>Creator</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { n: '01', bg: '#ede9fe', color: '#5b21b6', title: 'Creează profilul', desc: 'Completezi bio-ul, nișele tale, platformele sociale și câteva exemple de conținut. Cu cât profilul e mai complet, cu atât brandurile te găsesc mai ușor.' },
              { n: '02', bg: '#dbeafe', color: '#1e40af', title: 'Verifică-ți identitatea', desc: 'Un pas simplu de verificare ID care îți crește credibilitatea față de branduri și deblochează toate funcțiile platformei.' },
              { n: '03', bg: '#dcfce7', color: '#166534', title: 'Aplică la campanii', desc: 'Navighezi campaniile active și aplici la cele care se potrivesc nișei și stilului tău. Poți aplica la oricâte campanii dorești.' },
              { n: '04', bg: '#fef9c3', color: '#854d0e', title: 'Postezi și ești plătit', desc: 'Creezi conținut în stilul tău, postezi din propriul cont și trimiți dovada în platformă. Brandul confirmă și primești plata automat.' },
            ].map(({ n, bg, color, title, desc }) => (
              <div key={n} className="step-card">
                <div className="step-num" style={{ background: bg, color }}>{n}</div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#111', margin: '0 0 6px' }}>{title}</h3>
                  <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.7 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 28 }}>
            <Link href="/auth/register?type=influencer" className="btn-purple">Alătură-te ca influencer →</Link>
          </div>
        </div>
      </section>

      {/* FAQ rapid */}
      <section style={{ padding: '64px 24px', background: 'white' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 900, margin: '0 0 36px', textAlign: 'center' }}>Întrebări frecvente</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 660, margin: '0 auto' }}>
            {[
              { q: 'Ce comision percepe AddFame?', a: '15% din valoarea colaborării, plătit de brand. Prima campanie este 0% comision.' },
              { q: 'Cât de repede primesc banii ca influencer?', a: 'Imediat după ce brandul confirmă livrarea. Banii sunt deja rezervați în escrow.' },
              { q: 'De câți urmăritori am nevoie?', a: 'Minimum 1.000 urmăritori pe orice platformă (Instagram, TikTok, YouTube etc.).' },
              { q: 'Ce se întâmplă dacă influencerul nu livrează?', a: 'Banii din escrow sunt returnați integral brandului. Influencerul primește un avertisment sau este suspendat.' },
              { q: 'Pot folosi conținutul creat pentru reclame?', a: 'Da! Conținutul creat în cadrul campaniei poate fi reutilizat pentru reclame plătite pe Meta, TikTok sau alte platforme.' },
            ].map(({ q, a }) => (
              <div key={q} style={{ background: '#f9fafb', borderRadius: 14, padding: '16px 20px' }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111', margin: '0 0 6px' }}>{q}</p>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section style={{ padding: '64px 24px', background: 'linear-gradient(135deg,#fff7ed,#fce7f3)', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 900, margin: '0 0 12px' }}>Gata să începi?</h2>
          <p style={{ fontSize: 16, color: '#6b7280', margin: '0 0 32px' }}>Înregistrarea e gratuită și durează 2 minute.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth/register?type=brand" className="btn-orange">Sunt brand →</Link>
            <Link href="/auth/register?type=influencer" className="btn-purple">Sunt influencer →</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '32px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/" style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>← Înapoi la AddFame</Link>
        <Link href="/pentru-branduri" style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>Pentru Branduri</Link>
        <Link href="/pentru-influenceri" style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>Pentru Influenceri</Link>
        <Link href="/contact" style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>Contact</Link>
      </footer>
    </div>
  )
}
