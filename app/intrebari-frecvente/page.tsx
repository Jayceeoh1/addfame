'use client'
import { useState } from 'react'
import { Building2, Clapperboard, ChevronDown, HelpCircle, ArrowRight } from 'lucide-react'
import SitePage, { PageHero } from '@/components/site/SiteShell'

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
      { id: 'b6', q: 'Cum funcționează plata?', a: 'Când publici campania alegi câți influenceri vrei și plătești o taxă fixă pentru fiecare, direct din wallet. Vezi suma exactă înainte să confirmi. Dacă nu ocupi toate locurile, diferența îți este returnată în wallet la închiderea campaniei.' },
      { id: 'b7', q: 'Cât costă AddFame?', a: 'Costul depinde de câți influenceri alegi și îl vezi transparent înainte de publicare. Fără abonamente.' },
      { id: 'b8', q: 'Cum aleg influencerii potriviți?', a: 'Postezi campania cu nișa, platforma și bugetul dorit. Influencerii potrivi­ți aplică, tu le vizualizezi profilul, statisticile și portofoliul și alegi cu cine lucrezi.' },
      { id: 'b9', q: 'Pot lansa campanii barter (fără bani)?', a: 'Da! AddFame suportă și campanii barter — oferi produse sau servicii în schimbul postărilor. Ideal pentru branduri la început de drum.' },
      { id: 'b10', q: 'Cum îmi creez un cont de brand?', a: 'Mergi pe addfame.ro, dai click pe "Înregistrare", selectezi "Brand" și completezi datele firmei. Contul este activ imediat.' },
    ],
    influenceri: [
      { id: 'i1', q: 'De câți urmăritori am nevoie pentru a mă înscrie?', a: 'Minimum 1.000 de urmăritori pe orice platformă — Instagram, TikTok, YouTube, X sau LinkedIn. Micro-influencerii au rate de engagement mai mari și brandurile îi preferă.' },
      { id: 'i2', q: 'Când și cum primesc banii?', a: 'După ce brandul confirmă postarea ta, echipa AddFame se ocupă de plată. Sumele din wallet-ul tău AddFame (bonusuri, recompense) le poți retrage în cont bancar, PayPal, Revolut, Wise sau crypto.' },
      { id: 'i3', q: 'Cât mă costă AddFame ca influencer?', a: 'Înscrierea și aplicarea la campanii sunt gratuite pentru creatori. Taxa platformei este plătită de brand, nu de tine.' },
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
    <SitePage>
      <style>{FQ_CSS}</style>

      {/* Hero */}
      <PageHero
        eyebrow="Suport"
        title="Întrebări"
        accent="frecvente"
        lead="Tot ce trebuie să știi despre AddFame — pentru branduri și influenceri."
      >
        {/* Tabs */}
        <div className="fq-tabs" role="group" aria-label="Filtrează întrebările">
          <button type="button" aria-pressed={tab === 'toate'} className={`fq-tab ${tab === 'toate' ? 'active-all' : ''}`} onClick={() => setTab('toate')}>
            Toate ({allFaqs.length})
          </button>
          <button type="button" aria-pressed={tab === 'branduri'} className={`fq-tab ${tab === 'branduri' ? 'active-brand' : ''}`} onClick={() => setTab('branduri')}>
            <Building2 size={16} aria-hidden="true" /> Branduri ({faqs.branduri.length})
          </button>
          <button type="button" aria-pressed={tab === 'influenceri'} className={`fq-tab ${tab === 'influenceri' ? 'active-infl' : ''}`} onClick={() => setTab('influenceri')}>
            <Clapperboard size={16} aria-hidden="true" /> Influenceri ({faqs.influenceri.length})
          </button>
        </div>
      </PageHero>

      {/* FAQ List */}
      <section className="sp-section">
        <div className="af-wrap">
          <div className="fq-list">
            {displayed.map((faq) => (
              <div key={faq.id} className={`fq-item ${open === faq.id ? 'open' : ''}`}>
                <button type="button" className="fq-q" aria-expanded={open === faq.id} aria-controls={`fq-a-${faq.id}`} onClick={() => toggle(faq.id)}>
                  <span className="fq-q-main">
                    {faq.cat === 'branduri'
                      ? <span className="sp-tag sp-tag-brand fq-tag">Brand</span>
                      : <span className="sp-tag sp-tag-infl fq-tag">Creator</span>
                    }
                    <span className="fq-q-text">{faq.q}</span>
                  </span>
                  <span className="fq-chev" aria-hidden="true"><ChevronDown size={18} /></span>
                </button>
                {open === faq.id && (
                  <p className="fq-a" id={`fq-a-${faq.id}`}>{faq.a}</p>
                )}
              </div>
            ))}
          </div>

          {/* Contact CTA */}
          <div className="sp-cta fq-cta">
            <div className="sp-cta-glow af-grad" aria-hidden="true" />
            <div>
              <span className="sp-icon sp-icon-soft fq-cta-icon"><HelpCircle size={22} aria-hidden="true" /></span>
              <h2>Nu ai găsit răspunsul?</h2>
              <p>Scrie-ne direct și îți răspundem în maxim 24 de ore.</p>
            </div>
            <div className="af-row">
              <a href="mailto:contact@addfame.ro" className="af-btn af-btn-white">
                contact@addfame.ro <ArrowRight size={18} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </SitePage>
  )
}

const FQ_CSS = `
.fq-tabs{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.fq-tab{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:10px 18px;border-radius:999px;border:1.5px solid #dcd9ee;background:#fff;color:#14123a;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:background .15s,border-color .15s,color .15s}
.fq-tab:hover{border-color:#7040f0}
.fq-tab.active-all{background:#14123a;color:#fff;border-color:#14123a}
.fq-tab.active-brand{background:#e6f0ff;color:#1d4fb8;border-color:#a9c6f5}
.fq-tab.active-infl{background:#efeaff;color:#4423c4;border-color:#cfc4ff}
.fq-list{display:flex;flex-direction:column;gap:10px;max-width:860px}
.fq-item{background:#fff;border:1.5px solid #e5e3f3;border-radius:16px;overflow:hidden;transition:border-color .15s}
.fq-item:hover{border-color:#cfc4ff}
.fq-item.open{border-color:#7040f0}
.fq-q{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px;min-height:56px;background:transparent;border:0;cursor:pointer;text-align:left;font-family:inherit;color:#14123a}
.fq-q-main{display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;min-width:0}
.fq-tag{font-size:10px;padding:3px 9px;margin-top:2px}
.fq-q-text{font-size:16px;font-weight:700;line-height:1.4;flex:1 1 220px;min-width:0}
.fq-chev{flex:none;width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#f6f6fc;color:#8783a8;transition:transform .2s,background .2s,color .2s}
.fq-item.open .fq-chev{transform:rotate(180deg);background:#efeaff;color:#5a35e6}
.fq-a{margin:0;padding:0 20px 20px;font-size:15px;color:#4a4770;line-height:1.7;max-width:60em}
.fq-cta{margin-top:clamp(40px,6vw,64px)}
.fq-cta-icon{position:relative;margin-bottom:16px}
`
