'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function IntrebariFrecvente() {

  const [open, setOpen] = useState<string | null>(null)
  const [tab, setTab] = useState<'toate' | 'branduri' | 'influenceri'>('toate')

  const toggle = (id: string) => setOpen(prev => prev === id ? null : id)

  const faqs = {
    branduri: [
      { id: 'b1', q: 'Cât de repede voi primi conținutul?', a: 'În cele mai multe cazuri în 3 zile de la lansarea campaniei. Odată ce influencerul postează și tu confirmi livrarea, primești acces complet la conținut.' },
      { id: 'b2', q: 'Ce se întâmplă dacă nu sunt mulțumit de livrare?', a: 'Tu controlezi aprobarea fiecărei livrări. Dacă conținutul nu respectă brief-ul, poți solicita modificări sau deschide un ticket de dispută — echipa AddFame mediază situația.' },
      { id: 'b3', q: 'Am nevoie de experiență în marketing?', a: 'Deloc. AddFame este conceput pentru afaceri de toate dimensiunile. Te ghidăm prin fiecare pas, de la crearea campaniei până la livrarea finală.' },
      { id: 'b4', q: 'Pot folosi conținutul pentru reclame plătite?', a: 'Da! Tot conținutul creat prin AddFame poate fi reutilizat pentru publicitate plătită pe Meta, TikTok Ads sau orice alte canale de marketing. Fără licențe suplimentare.' },
      { id: 'b5', q: 'Ce platforme sociale sunt suportate?', a: 'TikTok, Instagram, YouTube, X (Twitter) și LinkedIn sunt toate suportate. Poți specifica platforma dorită la crearea campaniei.' },
      { id: 'b6', q: 'Cum funcționează plata și escrow-ul?', a: 'La aprobarea unei colaborări, suma se rezervă în escrow — în siguranță în platformă. Influencerul primește banii DOAR după ce postează și tu confirmi livrarea. Nu există niciun risc.' },
      { id: 'b7', q: 'Cât costă comisionul AddFame?', a: 'AddFame percepe un comision de 15% din valoarea colaborării. Prima ta campanie este 0% comision — vrem să demonstrăm că merităm încrederea ta.' },
      { id: 'b8', q: 'Cum aleg influencerii potriviți?', a: 'Postezi campania cu nișa, platforma și bugetul dorit. Influencerii potrivi­ți aplică, tu le vizualizezi profilul, statisticile și portofoliul și alegi cu cine lucrezi.' },
      { id: 'b9', q: 'Pot lansa campanii barter (fără bani)?', a: 'Da! AddFame suportă și campanii barter — oferi produse sau servicii în schimbul postărilor. Ideal pentru branduri la început de drum.' },
      { id: 'b10', q: 'Cum îmi creez un cont de brand?', a: 'Mergi pe addfame.ro, dai click pe "Înregistrare", selectezi "Brand" și completezi datele firmei. Contul este activ imediat.' },
    ],
    influenceri: [
      { id: 'i1', q: 'De câți urmăritori am nevoie pentru a mă înscrie?', a: 'Minimum 1.000 de urmăritori pe orice platformă — Instagram, TikTok, YouTube, X sau LinkedIn. Micro-influencerii au rate de engagement mai mari și brandurile îi preferă.' },
      { id: 'i2', q: 'Când și cum primesc banii?', a: 'Imediat după ce brandul confirmă postarea ta. Banii sunt deja rezervați în escrow și sunt eliberați automat. Îi poți retrage în cont bancar, PayPal, Revolut, Wise sau crypto.' },
      { id: 'i3', q: 'Ce comision ia AddFame din câștigurile mele?', a: 'AddFame nu percepe niciun comision din câștigurile influencerilor. Comisionul de 15% este plătit de brand, nu de tine.' },
      { id: 'i4', q: 'Ce înseamnă verificarea identității?', a: 'Un pas simplu în care încarci o poză cu buletinul/pașaportul și un selfie cu documentul. Durează 2 minute și îți crește credibilitatea față de branduri. Fără verificare nu poți retrage bani.' },
      { id: 'i5', q: 'Pot refuza o campanie după ce am aplicat?', a: 'Da, poți retrage oricând aplicarea înainte ca brandul să o aprobe. Odată aprobată, există o perioadă de grație de 24 de ore pentru retragere.' },
      { id: 'i6', q: 'Trebuie să am cont de business pe Instagram/TikTok?', a: 'Nu este obligatoriu, dar un cont de creator/business îți oferă acces la statistici pe care le poți arăta brandurilor pentru a crește șansele de aprobare.' },
      { id: 'i7', q: 'Pot lucra cu mai multe branduri simultan?', a: 'Da! Poți aplica la oricâte campanii dorești și poți rula colaborări multiple în același timp, cu condiția să respecți deadline-urile fiecăreia.' },
      { id: 'i8', q: 'Ce se întâmplă dacă brandul nu aprobă livrarea?', a: 'Dacă brandul refuză nejustificat o livrare corectă, poți deschide un ticket de dispută. Echipa AddFame analizează situația și mediază. Interesele tale sunt protejate.' },
      { id: 'i9', q: 'Pot descărca o chitanță pentru câștigurile mele?', a: 'Da! Din secțiunea Wallet → Tranzacții, fiecare câștig are un buton de descărcare chitanță. Documentul este generat automat.' },
      { id: 'i10', q: 'Cum îmi creez un cont de influencer?', a: 'Mergi pe addfame.ro, dai click pe "Înregistrare", selectezi "Influencer/Creator" și completezi profilul. Cu cât profilul e mai complet, cu atât mai mari șansele să fii ales de branduri.' },
    ],
  }

  const allFaqs = [
    ...faqs.branduri.map(f => ({ ...f, cat: 'branduri' })),
    ...faqs.influenceri.map(f => ({ ...f, cat: 'influenceri' })),
  ]

  const displayed = tab === 'toate' ? allFaqs : tab === 'branduri'
    ? faqs.branduri.map(f => ({ ...f, cat: 'branduri' }))
    : faqs.influenceri.map(f => ({ ...f, cat: 'influenceri' }))

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: 'white', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .container { max-width: 760px; margin: 0 auto; padding: 0 24px; }
        .tab { padding: 8px 20px; border-radius: 99px; font-size: 13px; font-weight: 800; border: 2px solid #f0f0f0; cursor: pointer; background: white; font-family: inherit; transition: all .15s; }
        .tab.active-all { background: #111; color: white; border-color: #111; }
        .tab.active-brand { background: #fff7ed; color: #ea580c; border-color: #fed7aa; }
        .tab.active-infl { background: #faf5ff; color: #7c3aed; border-color: #ddd6fe; }
        .faq-item { border: 1.5px solid #f0f0f0; border-radius: 14px; overflow: hidden; transition: border-color .15s; }
        .faq-item:hover { border-color: #ddd6fe; }
        .faq-item.open { border-color: #8b5cf6; }
        .faq-q { padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; background: white; }
        .faq-a { padding: 0 20px 18px; font-size: 14px; color: #6b7280; line-height: 1.7; }
        .chevron { width: 20px; height: 20px; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 14px; transition: all .2s; }
      `}</style>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #f0f0f0', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#f97316' }}>Add</span>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#ec4899' }}>Fame</span>
        </Link>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/auth/login" style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none', fontWeight: 600, padding: '8px 14px' }}>Autentificare</Link>
          <Link href="/auth/register" style={{ fontSize: 13, fontWeight: 800, color: 'white', background: 'linear-gradient(135deg,#f97316,#ec4899)', padding: '8px 16px', borderRadius: 10, textDecoration: 'none' }}>Înregistrare</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '56px 24px 48px', textAlign: 'center' }}>
        <div className="container">
          <span style={{ display: 'inline-block', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '4px 14px', borderRadius: 99, fontSize: 12, fontWeight: 800, marginBottom: 16 }}>Suport</span>
          <h1 style={{ fontSize: 'clamp(28px,5vw,44px)', fontWeight: 900, color: '#111', margin: '0 0 12px' }}>Întrebări frecvente</h1>
          <p style={{ fontSize: 16, color: '#6b7280', margin: '0 0 32px' }}>Tot ce trebuie să știi despre AddFame — pentru branduri și influenceri.</p>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className={`tab ${tab === 'toate' ? 'active-all' : ''}`} onClick={() => setTab('toate')}>
              Toate ({allFaqs.length})
            </button>
            <button className={`tab ${tab === 'branduri' ? 'active-brand' : ''}`} onClick={() => setTab('branduri')}>
              🏢 Branduri ({faqs.branduri.length})
            </button>
            <button className={`tab ${tab === 'influenceri' ? 'active-infl' : ''}`} onClick={() => setTab('influenceri')}>
              🎬 Influenceri ({faqs.influenceri.length})
            </button>
          </div>
        </div>
      </section>

      {/* FAQ List */}
      <section style={{ padding: '0 24px 72px' }}>
        <div className="container">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {displayed.map((faq) => (
              <div key={faq.id} className={`faq-item ${open === faq.id ? 'open' : ''}`}>
                <div className="faq-q" onClick={() => toggle(faq.id)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {faq.cat === 'branduri'
                      ? <span style={{ background: '#fff7ed', color: '#ea580c', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap' }}>Brand</span>
                      : <span style={{ background: '#faf5ff', color: '#7c3aed', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap' }}>Creator</span>
                    }
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#111', margin: 0 }}>{faq.q}</p>
                  </div>
                  <div className="chevron" style={{ background: open === faq.id ? '#ede9fe' : '#f3f4f6', color: open === faq.id ? '#7c3aed' : '#9ca3af', transform: open === faq.id ? 'rotate(180deg)' : 'none' }}>
                    ▾
                  </div>
                </div>
                {open === faq.id && (
                  <p className="faq-a">{faq.a}</p>
                )}
              </div>
            ))}
          </div>

          {/* Contact CTA */}
          <div style={{ marginTop: 48, background: '#f9fafb', borderRadius: 20, padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 20, margin: '0 0 8px' }}>🤔</p>
            <h3 style={{ fontSize: 16, fontWeight: 900, color: '#111', margin: '0 0 6px' }}>Nu ai găsit răspunsul?</h3>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 20px' }}>Scrie-ne direct și îți răspundem în maxim 24 de ore.</p>
            <a href="mailto:contact@addfame.ro" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 24px', background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', color: 'white', borderRadius: 12, fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>
              contact@addfame.ro →
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '28px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/" style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>← Înapoi la AddFame</Link>
        <Link href="/pentru-branduri" style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>Pentru Branduri</Link>
        <Link href="/pentru-influenceri" style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>Pentru Influenceri</Link>
        <Link href="/contact" style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>Contact</Link>
      </footer>
    </div>
  )
}
