import Link from 'next/link'
import SitePage, { PageHero } from '@/components/site/SiteShell'

export const metadata = { title: 'Termeni și Condiții — AddFame', description: 'Termenii și condițiile de utilizare a platformei AddFame.' }

const slug = (title: string) => 's-' + title.split('.')[0]

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="lg-sec">
    <h2 id={slug(title)}>{title}</h2>
    {children}
  </section>
)

const TOC = [
  '1. Acceptarea termenilor',
  '2. Descrierea serviciului',
  '3. Conturi și înregistrare',
  '4. Plăți și comisioane',
  '5. Conținut și proprietate intelectuală',
  '6. Obligațiile utilizatorilor',
  '7. Limitarea răspunderii',
  '8. Modificarea termenilor',
  '9. Contact',
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

export default function TermsPage() {
  const updated = '24 Iunie 2026'
  return (
    <SitePage>
      <style>{LEGAL_CSS}</style>
      <PageHero eyebrow="Legal" title="Termeni și Condiții">
        <p className="sp-meta" style={{ margin: 0 }}>Ultima actualizare: {updated}</p>
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
        <Section title="1. Acceptarea termenilor">
          <p>Prin accesarea și utilizarea platformei AddFame (addfame.ro), ești de acord cu acești termeni și condiții. Dacă nu ești de acord, te rugăm să nu utilizezi platforma.</p>
          <p>AddFame este operată de <strong>ADD FAME DIGITAL S.R.L.</strong>, societate comercială înregistrată în România, CUI <strong>54992560</strong>, Nr. Reg. Com. <strong>J2026040984009</strong>, cu sediul în județul Argeș.</p>
        </Section>

        <Section title="2. Descrierea serviciului">
          <p>AddFame este o platformă de marketing cu influenceri care conectează branduri cu creatori de conținut. Platforma facilitează crearea campaniilor, gestionarea colaborărilor și plata influencerilor.</p>
          <p>Modelul de tarifare: <strong>înregistrarea este gratuită</strong>. Brandurile plătesc o <strong>taxă fixă pentru fiecare influencer</strong> inclus într-o campanie, afișată în platformă înainte de publicare. Influencerii nu plătesc pentru înscriere sau aplicare; la retragerea fondurilor din wallet se aplică fee-ul de procesare descris la secțiunea 4.</p>
        </Section>

        <Section title="3. Conturi și înregistrare">
          <p>Trebuie să ai cel puțin 18 ani pentru a te înregistra. Ești responsabil pentru securitatea contului tău și pentru toate activitățile efectuate din contul tău.</p>
          <p>Brandurile sunt verificate manual de echipa AddFame înainte de a putea lansa campanii. Influencerii sunt verificați înainte de a putea aplica la campanii.</p>
          <p>Ne rezervăm dreptul de a suspenda sau șterge conturi care încalcă acești termeni.</p>
        </Section>

        <Section title="4. Plăți și comisioane">
          <p><strong>Branduri:</strong> La publicarea unei campanii, brandul alege numărul de influenceri și plătește din creditele din wallet taxa fixă per influencer în vigoare la acel moment. Dacă o campanie este respinsă la verificare, taxa se returnează integral. La închiderea campaniei, taxa aferentă locurilor neocupate se returnează în wallet; taxa aferentă influencerilor selectați nu se returnează. Pentru campaniile publicate înainte de introducerea acestui model se aplică condițiile în vigoare la data publicării lor.</p>
          <p><strong>Influenceri:</strong> Fondurile câștigate pot fi retrase oricând. La retragere se aplică un fee de procesare de 5% din suma retrasă. Retragerile sunt procesate manual în 3-5 zile lucrătoare.</p>
          <p>Toate prețurile sunt exprimate în <strong>RON (lei românești)</strong>. Plățile și retragerile se procesează exclusiv în RON.</p>
        </Section>

        <Section title="5. Conținut și proprietate intelectuală">
          <p>Influencerii cedează brandului dreptul de a utiliza conținutul creat în cadrul colaborării, conform briefului campaniei, pe perioada și platformele specificate.</p>
          <p>AddFame nu revendică nicio proprietate asupra conținutului creat de influenceri.</p>
          <p>Este interzis să publici conținut ilegal, înșelător, obscen sau care încalcă drepturile altor persoane.</p>
        </Section>

        <Section title="6. Obligațiile utilizatorilor">
          <p><strong>Branduri:</strong> Să furnizeze brief-uri clare și corecte; să plătească conform termenilor agreați; să revizuiască conținutul în timp util.</p>
          <p><strong>Influenceri:</strong> Să respecte brief-ul campaniei; să publice conținut original; să marcheze posturile ca publicitate conform legislației în vigoare (#ad, #sponsored).</p>
        </Section>

        <Section title="7. Limitarea răspunderii">
          <p>AddFame acționează exclusiv ca intermediar între branduri și influenceri. Nu suntem responsabili pentru calitatea conținutului, rezultatele campaniilor, sau disputele dintre utilizatori.</p>
          <p>Răspunderea noastră totală față de un utilizator nu va depăși suma comisioanelor plătite de acel utilizator în ultimele 12 luni.</p>
        </Section>

        <Section title="8. Modificarea termenilor">
          <p>Ne rezervăm dreptul de a modifica acești termeni oricând. Vei fi notificat prin email cu cel puțin 7 zile înainte de intrarea în vigoare a modificărilor semnificative.</p>
        </Section>

        <Section title="9. Contact">
          <p>Pentru întrebări: <a href="mailto:legal@addfame.ro">legal@addfame.ro</a></p>
          <p><strong>ADD FAME DIGITAL S.R.L.</strong><br />
          CUI: 54992560 · Reg. Com.: J2026040984009<br />
          Județul Argeș, România<br />
          Email: <a href="mailto:contact@addfame.ro">contact@addfame.ro</a>
          </p>
        </Section>
            </div>

            <div className="lg-foot">
              <Link href="/privacy" className="af-btn af-btn-ghost af-btn-sm">Politica de Confidențialitate</Link>
              <Link href="/" className="af-btn af-btn-ghost af-btn-sm">Înapoi la platformă</Link>
            </div>
          </div>
        </div>
      </div>
    </SitePage>
  )
}
