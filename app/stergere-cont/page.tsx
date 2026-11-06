import Link from 'next/link'
import SitePage, { PageHero } from '@/components/site/SiteShell'
import { DeletionRequestForm } from '@/components/account/DeletionRequestForm'

export const metadata = {
  title: 'Ștergerea contului — AddFame',
  description: 'Cum îți ștergi contul AddFame, ce date se anonimizează și ce evidențe contabile păstrăm.',
}

export default async function StergereContPage({ searchParams }: { searchParams: Promise<{ confirmat?: string }> }) {
  const { confirmat } = await searchParams

  return (
    <SitePage>
      <PageHero
        eyebrow="Cont și date"
        title="Ștergerea contului"
        accent="AddFame"
        lead="Poți cere închiderea contului din site sau din aplicația Android, fără să reinstalezi aplicația. Brand și creator, inclusiv creatorii al căror profil încă așteaptă aprobarea."
      />

      <div className="af-wrap sp-section" style={{ paddingTop: 0 }}>
        {confirmat === '1' && (
          <div className="sp-alert sp-alert-ok" role="status" style={{ marginBottom: 20 }}>
            Cererea a fost înregistrată. Dacă autentificarea a fost închisă, nu te mai poți conecta cu emailul vechi.
          </div>
        )}

        <div className="sp-prose" style={{ maxWidth: 860 }}>
          <h2>Cum ceri ștergerea</h2>
          <ol>
            <li>Autentifică-te cu emailul contului. Dacă nu mai ai parola, folosește „Am uitat parola” sau scrie-ne de pe aceeași adresă la <a href="mailto:privacy@addfame.ro">privacy@addfame.ro</a>.</li>
            <li>Din aplicație sau din site: <strong>Setări → Ștergere cont</strong>. Creatorii care încă nu sunt aprobați găsesc cererea pe pagina „în verificare”, pentru că nu pot deschide Setări. Poți folosi și direct această pagină.</li>
            <li>Scrie <strong>ȘTERGE</strong> și trimite cererea.</li>
            <li>Dacă nu ai colaborări deschise, bani în escrow sau sold în portofel, anonimizăm datele personale și închidem autentificarea. Primești un cod de referință.</li>
            <li>Dacă există un blocaj, cererea rămâne înregistrată și îți spunem ce trebuie rezolvat. Nu ștergem nimic și nu îți închidem intrarea până atunci. După ce rezolvi, trimite cererea din nou.</li>
          </ol>
          <p>Finalizăm cererile care nu pot fi închise automat în cel mult <strong>30 de zile</strong>.</p>

          <h2>Ce se anonimizează</h2>
          <ul>
            <li>Numele din profil, emailul de autentificare, telefonul, poza, descrierea, orașul și site-ul.</li>
            <li>Conturile sociale conectate și tokenul Instagram.</li>
            <li>Datele de contact pentru facturare salvate pe profil și datele din metodele de plată (IBAN).</li>
            <li>Posibilitatea de a te mai autentifica. Emailul vechi poate fi folosit ulterior pentru un cont nou.</li>
          </ul>

          <h2>Ce păstrăm și cât timp</h2>
          <p>Nu ștergem evidențele legate de bani. Le păstrăm pentru obligațiile contabile și fiscale și pentru contractele deja semnate.</p>
          <div className="sp-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Ce se întâmplă</th>
                  <th>Perioadă</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Tranzacții, facturi SmartBill, portofel (evidența), escrow, retrageri</td>
                  <td>Rămân în evidență. Soldul trebuie să fie zero înainte de închiderea contului.</td>
                  <td>10 ani</td>
                </tr>
                <tr>
                  <td>Colaborări și campanii legate de aceste plăți</td>
                  <td>Rămân, ca să se poată explica plățile. Numele din profil devine „Cont șters”.</td>
                  <td>10 ani</td>
                </tr>
                <tr>
                  <td>Contracte semnate</td>
                  <td>Rămân cu datele din momentul semnării. Sunt documente juridice.</td>
                  <td>10 ani</td>
                </tr>
                <tr>
                  <td>Cererea de ștergere (email, dată, cod)</td>
                  <td>O păstrăm ca să putem dovedi că am primit-o.</td>
                  <td>3 ani</td>
                </tr>
                <tr>
                  <td>Jurnale tehnice</td>
                  <td>Securitate și diagnostic.</td>
                  <td>90 de zile</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2>Când nu închidem contul pe loc</h2>
          <ul>
            <li>Ai colaborări încă deschise sau un litigiu nerezolvat.</li>
            <li>Ai o campanie activă sau în pauză.</li>
            <li>Ai bani în escrow (inclusiv credite rezervate) sau o retragere în curs.</li>
            <li>Portofelul de creator sau creditele de brand au sold diferit de zero.</li>
          </ul>
          <p>
            Operatorul de date este <strong>ADD FAME DIGITAL S.R.L.</strong>, CUI 54992560.
            Detalii în <Link href="/politica-de-confidentialitate">politica de confidențialitate</Link>.
          </p>
        </div>

        <div className="sp-card" style={{ maxWidth: 640, marginTop: 8 }} id="cerere">
          <h2 style={{ margin: 0, fontSize: 22 }}>Trimite cererea</h2>
          <DeletionRequestForm source="web" />
        </div>
      </div>
    </SitePage>
  )
}
