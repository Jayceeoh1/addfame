import Link from 'next/link'
import SitePage, { PageHero } from '@/components/site/SiteShell'

export const metadata = { title: 'Politica de Confidențialitate — AddFame', description: 'Politica de confidențialitate și prelucrare a datelor personale pe platforma AddFame.' }

const slug = (title: string) => 's-' + title.split('.')[0]

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="lg-sec">
    <h2 id={slug(title)}>{title}</h2>
    {children}
  </section>
)

const TOC = [
  '1. Cine suntem',
  '2. Ce date colectăm',
  '3. De ce colectăm datele',
  '4. Cât timp păstrăm datele',
  '5. Cu cine împărtășim datele',
  '6. Drepturile tale',
  '7. Cookie-uri',
  '8. Securitate',
  '9. Reclamații',
]

const LEGAL_CSS = `
.lg-layout{display:grid;grid-template-columns:240px minmax(0,1fr);gap:clamp(24px,4vw,56px);align-items:start}
.lg-toc{position:sticky;top:88px;padding:20px}
.lg-toc ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px}
.lg-toc a{display:flex;align-items:center;min-height:40px;padding:6px 10px;border-radius:10px;color:var(--muted);text-decoration:none;font-size:14px;font-weight:600;line-height:1.3}
.lg-toc a:hover{background:#f3f0ff;color:var(--violet)}
.lg-sec h2{scroll-margin-top:88px}
.lg-sec:first-child h2{margin-top:0}
.lg-foot{max-width:760px;border-top:1px solid var(--line);margin-top:40px;padding-top:28px;display:flex;flex-wrap:wrap;gap:12px}
@media(max-width:960px){.lg-layout{grid-template-columns:minmax(0,1fr)}.lg-toc{position:static}}
`

export default function PrivacyPage() {
  return (
    <SitePage>
      <style>{LEGAL_CSS}</style>
      <PageHero eyebrow="Legal" title="Politica de Confidențialitate">
        <p className="sp-meta" style={{ margin: 0 }}>Ultima actualizare: 24 Iunie 2026</p>
      </PageHero>

      <div className="af-wrap sp-section">
        <div className="lg-layout">
          <nav className="sp-card lg-toc" aria-label="Cuprins">
            <p className="af-eyebrow">Cuprins</p>
            <ol>
              {TOC.map(t => <li key={t}><a href={`#${slug(t)}`}>{t}</a></li>)}
            </ol>
          </nav>

          <div>
            <div className="sp-prose">
        <Section title="1. Cine suntem">
          <p><strong>ADD FAME DIGITAL S.R.L.</strong> este operatorul de date personale responsabil pentru platforma addfame.ro.</p><p>CUI: <strong>54992560</strong> · Reg. Com.: <strong>J2026040984009</strong> · Sediu: Județul Argeș, România</p><p>Contact GDPR: <a href="mailto:privacy@addfame.ro">privacy@addfame.ro</a></p>
        </Section>

        <Section title="2. Ce date colectăm">
          <p><strong>Date furnizate de tine:</strong> Nume, adresă de email, parolă (stocată criptat), informații despre companie (pentru branduri), informații despre profilul tău social (pentru influenceri), date bancare pentru procesarea plăților.</p>
          <p><strong>Date colectate automat:</strong> Adresa IP, tipul de browser, paginile vizitate, durata sesiunii. Aceste date sunt folosite exclusiv pentru securitate și îmbunătățirea platformei.</p>
          <p><strong>Date de tranzacție:</strong> Istoricul plăților și retragerilor, pentru conformitate fiscală și rezolvarea disputelor.</p>
        </Section>

        <Section title="3. De ce colectăm datele">
          <p>Datele tale sunt folosite pentru: furnizarea serviciilor platformei (bază legală: executarea contractului), trimiterea notificărilor despre colaborări (bază legală: interes legitim), conformitate fiscală și contabilă (bază legală: obligație legală), și îmbunătățirea platformei (bază legală: interes legitim).</p>
        </Section>

        <Section title="4. Cât timp păstrăm datele">
          <p>Datele contului: cât timp contul este activ + 3 ani după ștergere. Datele de tranzacție: 10 ani conform legislației fiscale românești. Datele de log: 90 de zile.</p>
        </Section>

        <Section title="5. Cu cine împărtășim datele">
          <p>Nu vindem datele tale. Le împărtășim doar cu: Supabase (infrastructură bază de date, hosting UE), Resend (trimitere emailuri), furnizori de plată (pentru procesarea tranzacțiilor). Toți furnizorii sunt contractați conform GDPR.</p>
          <p>Datele publice ale profilului tău de influencer (nume, nișe, platforme, rate) sunt vizibile pentru brandurile înregistrate pe platformă.</p>
        </Section>

        <Section title="5.1. Conectarea contului Instagram">
          <p>Dacă alegi să conectezi un cont Instagram profesional (Business sau Creator), AddFame primește prin API-ul oficial Instagram, doar cu acordul tău: numele de utilizator, poza de profil, biografia, numărul de urmăritori și de postări, precum și ultimele postări (link, imagine, număr de aprecieri și comentarii). Le folosim exclusiv pentru a-ți afișa în profil statistici verificate și pentru ca brandurile să îți evalueze audiența.</p>
          <p>Tokenul de acces este stocat securizat, accesibil doar serverelor AddFame, și nu este vizibil nici ție, nici brandurilor. Nu publicăm și nu trimitem mesaje în numele tău. Poți deconecta contul oricând din Profil → Rețele sociale, sau din setările Instagram (Aplicații și site-uri); la deconectare ștergem tokenul și toate datele Instagram sincronizate. Poți cere ștergerea și la <a href="mailto:privacy@addfame.ro">privacy@addfame.ro</a> sau prin opțiunea de ștergere a datelor din Instagram.</p>
        </Section>

        <Section title="6. Drepturile tale">
          <p>Conform GDPR, ai dreptul la: <strong>acces</strong> (să știi ce date deținem), <strong>rectificare</strong> (să corectezi date incorecte), <strong>ștergere</strong> (să ceri ștergerea datelor), <strong>portabilitate</strong> (să primești datele în format structurat), <strong>opoziție</strong> (față de prelucrarea bazată pe interes legitim).</p>
          <p>Exercitați aceste drepturi scriind la <a href="mailto:privacy@addfame.ro">privacy@addfame.ro</a>. Răspundem în maxim 30 de zile.</p>
        </Section>

        <Section title="7. Cookie-uri">
          <p>Folosim exclusiv cookie-uri funcționale necesare pentru autentificare și menținerea sesiunii. Nu folosim cookie-uri de tracking sau publicitare.</p>
        </Section>

        <Section title="8. Securitate">
          <p>Datele sunt stocate pe servere în UE, criptate în tranzit (HTTPS/TLS) și în repaus. Parolele sunt hash-uite. Accesul la date este limitat la personalul care are nevoie de ele.</p>
        </Section>

        <Section title="9. Reclamații">
          <p>Dacă crezi că datele tale nu sunt prelucrate corect, poți depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP): <a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer">dataprotection.ro</a>.</p>
        </Section>
            </div>

            <div className="lg-foot">
              <Link href="/terms" className="af-btn af-btn-ghost af-btn-sm">Termeni și Condiții</Link>
              <Link href="/" className="af-btn af-btn-ghost af-btn-sm">Înapoi la platformă</Link>
            </div>
          </div>
        </div>
      </div>
    </SitePage>
  )
}
