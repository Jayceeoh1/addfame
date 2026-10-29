import Link from 'next/link'
import SitePage, { PageHero } from '@/components/site/SiteShell'

export const metadata = {
  title: 'Politica de Confidențialitate — AddFame',
  description: 'Ce date personale prelucrează AddFame, în ce scop, cu ce furnizori și ce drepturi ai, pe site și în aplicația mobilă.',
}

const slug = (title: string) => 's-' + title.split('.')[0]

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="lg-sec">
    <h2 id={slug(title)}>{title}</h2>
    {children}
  </section>
)

const Todo = ({ children }: { children: React.ReactNode }) => (
  <p className="lg-todo"><strong>[DE COMPLETAT]</strong> {children}</p>
)

const TOC = [
  '1. Cine suntem',
  '2. Ce acoperă această politică',
  '3. Ce date colectăm',
  '4. De ce prelucrăm datele',
  '5. Cu cine partajăm datele',
  '6. Transferuri în afara SEE',
  '7. Cookie-uri și analitice',
  '8. Cât timp păstrăm datele',
  '9. Aplicația mobilă',
  '10. Vârsta minimă',
  '11. Drepturile tale',
  '12. Securitate',
  '13. Reclamații',
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
.lg-todo{background:#fff7e8;border:1px solid #f3d7a1;border-radius:12px;padding:12px 14px;color:#7a4b00;font-size:14.5px}
.lg-table-wrap{overflow-x:auto;margin:0 0 14px}
@media(max-width:960px){.lg-layout{grid-template-columns:minmax(0,1fr)}.lg-toc{position:static}}
`

export default function PrivacyPage() {
  return (
    <SitePage>
      <style>{LEGAL_CSS}</style>
      <PageHero eyebrow="Legal" title="Politica de Confidențialitate">
        <p className="sp-meta" style={{ margin: 0 }}>Ultima actualizare: 22 octombrie 2026</p>
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
          <p><strong>ADD FAME DIGITAL S.R.L.</strong> este operatorul de date cu caracter personal pentru platforma AddFame (addfame.ro) și pentru aplicația mobilă care folosește același serviciu.</p>
          <p>CUI: <strong>54992560</strong> · Reg. Com.: <strong>J2026040984009</strong><br />
          Sediu social: Municipiul Pitești, Județul Argeș, Bulevardul Nicolae Bălcescu, Bl. C5, Scara B, Etaj 2, Ap. 9, România</p>
          <p>Contact pentru protecția datelor: <a href="mailto:privacy@addfame.ro">privacy@addfame.ro</a>. Pentru suport general: <a href="mailto:support@addfame.ro">support@addfame.ro</a> și <a href="mailto:contact@addfame.ro">contact@addfame.ro</a>.</p>
          <Todo>Nu am găsit în cod un responsabil cu protecția datelor (DPO) desemnat. Dacă ați numit un DPO, treceți aici numele și datele de contact. Până atunci, adresa de mai sus este contactul pentru cererile GDPR.</Todo>
        </Section>

        <Section title="2. Ce acoperă această politică">
          <p>Politica descrie prelucrările pe care le face codul platformei: site-ul addfame.ro, aplicația web instalabilă (PWA) și aplicația Android publicată cu identificatorul <strong>ro.addfame.app</strong>, în măsura în care aceasta încarcă același serviciu. Se aplică vizitatorilor, creatorilor (influencerilor), brandurilor, persoanelor care trimit formulare fără cont și conturilor de administrator.</p>
          <p>Nu vindem date personale și nu le folosim pentru publicitate comportamentală a unor terți. Nu am găsit în cod un SDK de reclame, Google Analytics sau un script Google Tag Manager încărcat în pagini.</p>
          <Todo>Confirmați că build-ul trimis în Google Play nu adaugă biblioteci native (crash reporting, publicitate, identificatori de publicitate) care nu există în depozitul de cod al site-ului. Dacă există, enumerați-le aici înainte de formularul Data safety.</Todo>
        </Section>

        <Section title="3. Ce date colectăm">
          <h3>Vizitatori, fără cont</h3>
          <ul>
            <li>Date tehnice ale vizitei: adresa IP (pentru limitarea abuzurilor și, la semnarea unui contract, ca dovadă), tipul de browser, pagina și, prin Vercel Analytics, statistici de trafic descrise la secțiunea 7.</li>
            <li>Alegerea din bannerul de cookie-uri, salvată local în browser (cheia <code>addfame_cookies</code>).</li>
            <li>Dacă pagina întâmpină o eroare, trimitem către server un mesaj de eroare, adresa paginii și o parte din user-agent. Dacă ești autentificat, se poate asocia identificatorul contului. Mesajul este curățat de emailuri și de tokenuri înainte de salvare.</li>
            <li>Formularul de contact: nume, email, subiect, tipul mesajului și textul. Mesajul este trimis pe email echipei; ruta respectivă nu îl scrie într-un tabel din baza de date.</li>
          </ul>

          <h3>Creatori (influenceri)</h3>
          <ul>
            <li>Cont: nume, email, parolă (stocată doar ca hash, prin autentificarea Supabase), telefon, oraș și, dacă alegi o localitate din căutare, coordonatele acelei localități.</li>
            <li>Profil public, în limitele setărilor tale de confidențialitate: descriere, poză, nișe, platforme și nume de utilizator, tarife, portofoliu, oraș, statistici sociale, evaluări. Poți ascunde profilul, căutarea, contactul din partea brandurilor, statisticile sau câștigurile.</li>
            <li>Colaborări: mesaje, livrabile (linkuri și fișiere video), metrici de postare, recenzii, strike-uri, dispute.</li>
            <li>Pentru campaniile cu produs trimis acasă: nume, telefon și adresă de livrare. Acestea ajung la brand și, când se emite un AWB, la serviciul de curierat.</li>
            <li>Plăți către tine: titular, IBAN, BIC și banca, sau datele pe care le introduci pentru PayPal, Revolut, Wise ori o adresă de portofel crypto. Le păstrăm ca să putem face plata manual. Nu apelăm API-urile PayPal, Revolut, Wise sau ale unei rețele crypto.</li>
            <li>Verificarea identității, dacă o trimiți: tipul documentului, numele declarat, imaginea actului și un selfie. Un administrator poate trimite imaginile către Google Gemini pentru o sugestie; decizia o ia o persoană.</li>
            <li>Contracte: la contractul de cesiune poți completa CNP, seria și numărul cărții de identitate, adresa și telefonul, plus semnătura, adresa IP și browserul. La contractul de colaborare și la contractul UGC: nume, email, telefon, adresă, semnătură, IP și browser.</li>
            <li>Opțional, dacă le activezi: conectarea Instagram, chat-ul Telegram, notificările push și acordul pentru anunțuri de campanie pe WhatsApp.</li>
          </ul>

          <h3>Formulare publice, fără cont de creator</h3>
          <p>Înscrierile la castinguri, formularele de creatori și înscrierile la evenimente pot cere, după caz: nume, email, telefon, data nașterii, gen, oraș sau zonă, adrese de rețele sociale, număr de urmăritori, tipuri de conținut, tarife, linkuri de exemplu, o captură de ecran și un mesaj. La înscrierea de creatori îți cerem acordul ca profilul să poată fi propus brandului. Data nașterii este folosită ca să verificăm vârsta cerută de campanie.</p>

          <h3>Branduri</h3>
          <ul>
            <li>Cont: email, parolă (hash), numele brandului, telefon, industrie, mărimea companiei, website.</li>
            <li>Date de firmă: denumire legală, CUI, adresă. La facturare: nume, CUI sau, dacă factura este pe persoană fizică, CNP-ul introdus de tine, număr de înregistrare, adresă, oraș, email și suma.</li>
            <li>Campanii, mesaje, colaborări, adresa de expediere pentru produse și creditele din wallet.</li>
            <li>Plata cu cardul: numărul cardului este introdus în formularul Stripe și nu este salvat pe serverele AddFame. Păstrăm identificatorul de client Stripe, suma, referința și datele de facturare.</li>
            <li>Opțional: conectarea unui cont Instagram profesional al brandului, cu aceleași tipuri de date ca la creatori, fără salvarea postărilor.</li>
          </ul>

          <h3>Administratori</h3>
          <p>Contul de administrator are email, rol și permisiuni, legate de un utilizator autentificat. Administratorii văd datele utilizatorilor în măsura necesară pentru verificare, plăți, contracte, moderare și suport. Acțiunile lor (de exemplu trimiterea unui mesaj WhatsApp sau a unui email) pot fi jurnalizate împreună cu identificatorul administratorului.</p>

          <h3>Instagram, TikTok, YouTube și Facebook</h3>
          <p>Dacă alegi să conectezi un cont Instagram profesional (Business sau Creator), AddFame primește prin API-ul oficial Instagram, cu acordul tău, doar: identificatorul contului, numele de utilizator, tipul contului, poza de profil, biografia, numărul de urmăritori, de conturi urmărite și de postări, plus ultimele postări (identificator, tip, link, imagine, text scurt, aprecieri, comentarii, data). Le folosim ca să afișăm statistici verificate și ca brandurile să evalueze audiența. Postările sincronizate se păstrează pentru creatori.</p>
          <p>Tokenul de acces stă într-un tabel separat, pe server. Nu este afișat ție sau brandurilor. Nu publicăm și nu trimitem mesaje în numele tău: integrarea citește datele de mai sus. Tokenul durează aproximativ 60 de zile și este reînnoit cât timp contul rămâne conectat. Poți deconecta din profil (creator) sau din setări (brand); la deconectare ștergem tokenul și datele Instagram sincronizate. Poți cere același lucru la <a href="mailto:privacy@addfame.ro">privacy@addfame.ro</a> sau din Instagram (Aplicații și site-uri). Instagram ne poate anunța și direct, prin adresa de callback de deconectare sau de ștergere.</p>
          <p>Nu conectăm conturi TikTok printr-un API. Numele de utilizator TikTok este cel pe care îl scrii tu. Pentru un link public de TikTok sau Instagram putem cere o previzualizare (oEmbed) ca să arătăm miniatura. Statisticile postărilor de YouTube depuse ca livrabile sunt citite din YouTube Data API (vizualizări, aprecieri, comentarii, miniatură), fără autentificarea canalului tău. Vizualizările și reach-ul de Instagram, TikTok sau Facebook pe care nu le putem citi automat sunt cele raportate de creator sau verificate de echipă.</p>
          <p>În cod există și o rută care redirecționează către dialogul de autentificare Facebook. Butonul din profil folosește Instagram Login, nu acest dialog.</p>
        </Section>

        <Section title="4. De ce prelucrăm datele">
          <ul>
            <li><strong>Executarea contractului</strong> (art. 6 alin. 1 lit. b GDPR): contul, profilul, campaniile, mesajele, livrabilele, wallet-ul, plățile și contractele semnate pe platformă.</li>
            <li><strong>Obligație legală</strong> (lit. c): facturile și evidențele contabile, răspunsul la cererile autorităților.</li>
            <li><strong>Interes legitim</strong> (lit. f): securitatea conturilor, limitarea abuzurilor, jurnalele de erori, potrivirea creatorilor cu campaniile, scorul de creator calculat din datele de profil, mementourile despre termene și măsurarea traficului cu Vercel Analytics. Te poți opune prelucrării bazate pe interes legitim.</li>
            <li><strong>Consimțământ</strong> (lit. a): conectarea Instagram, legarea Telegram, notificările push, anunțurile de campanie pe WhatsApp pe care le accepți din dashboard sau din Setări → Notificări, și acordul de a fi propus unui brand în formularele publice. Consimțământul se poate retrage; retragerea nu afectează prelucrarea deja făcută.</li>
          </ul>
          <p>Anunțurile de campanie pe WhatsApp pleacă, în mod obișnuit, doar către creatorii care au acceptat. Echipa poate folosi și o trimitere către creatorii care au un număr valid și nu au refuzat explicit. Mementourile de termen, contractele de semnat și alte mesaje operaționale pot pleca pe WhatsApp către numărul din profil, prin Twilio, fără un bifă separat în cod.</p>
          <p>Unele emailuri trimise de echipă (anunțuri și outreach) includ un pixel care înregistrează dacă mesajul a fost deschis. Nu este un cookie în browser.</p>
          <p>Sugestiile generate de Anthropic (brief, chat, recomandări de creatori, ciorne de email) și de Gemini (verificarea actului, răspunsurile din botul Telegram) sunt ajutoare. Nu am găsit o decizie cu efect juridic luată exclusiv automat: verificarea identității este confirmată de un administrator.</p>
          <Todo>Confirmați temeiul pentru imaginile actului de identitate și ale selfie-ului trimise la Gemini (compararea feței poate fi o prelucrare biometrică) și pentru mesajele WhatsApp trimise fără acordul explicit, inclusiv varianta „și celor care nu au răspuns”. Confirmați și temeiul pixelului de deschidere din emailurile de outreach.</Todo>
        </Section>

        <Section title="5. Cu cine partajăm datele">
          <p>Datele publice ale profilului, așa cum le lași în setările de confidențialitate, sunt vizibile brandurilor înregistrate sau creatorilor, după rol. Într-o colaborare, cealaltă parte vede ce este necesar pentru brief, mesaje și livrabile. Telefonul și adresa de livrare nu stau pe profilul public; sunt folosite pentru expediere.</p>
          <p>Furnizorii de mai jos prelucrează date ca persoane împuternicite sau, acolo unde își stabilesc propriile scopuri (de exemplu plata cu cardul), ca operatori independenți. Lista urmărește integrările găsite în cod.</p>
          <div className="lg-table-wrap">
            <table>
              <thead>
                <tr><th>Furnizor</th><th>Rol</th><th>Date care pot ajunge la el</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Supabase</td>
                  <td>Bază de date, autentificare, stocare fișiere, conexiune în timp real</td>
                  <td>Datele contului, fișierele (poze, acte, videoclipuri, semnături) și sesiunea</td>
                </tr>
                <tr>
                  <td>Vercel</td>
                  <td>Găzduirea aplicației, sarcinile programate și Vercel Analytics</td>
                  <td>Conținutul cererilor către aplicație, jurnale tehnice, statistici de vizită</td>
                </tr>
                <tr>
                  <td>Stripe</td>
                  <td>Plata cu cardul pentru creditele brandului și pentru badge-ul de creator</td>
                  <td>Datele cardului (la Stripe), email, nume, sumă în RON, datele de facturare, identificatorul de client</td>
                </tr>
                <tr>
                  <td>SmartBill</td>
                  <td>Emiterea facturilor (ws.smartbill.ro)</td>
                  <td>Nume, CUI sau CNP dacă l-ai dat, adresă, email, suma și descrierea serviciului</td>
                </tr>
                <tr>
                  <td>Resend</td>
                  <td>Trimiterea emailurilor</td>
                  <td>Adresa de email, numele și conținutul mesajului</td>
                </tr>
                <tr>
                  <td>Twilio</td>
                  <td>Mesaje WhatsApp (șabloane aprobate)</td>
                  <td>Numărul de telefon, prenumele și textul notificării</td>
                </tr>
                <tr>
                  <td>Telegram</td>
                  <td>Notificări și botul legat opțional de cont</td>
                  <td>Identificatorul de chat, numele și textul notificării sau al întrebării</td>
                </tr>
                <tr>
                  <td>Anthropic</td>
                  <td>Asistent pentru brief, chat, recomandări și ciorne de email</td>
                  <td>Textul introdus și, la recomandări, nume, nișă, oraș și număr de urmăritori</td>
                </tr>
                <tr>
                  <td>Google Gemini</td>
                  <td>Sugestie la verificarea identității; răspunsuri în botul Telegram</td>
                  <td>Imaginea actului, selfie-ul, numele declarat; întrebarea din Telegram și prenumele</td>
                </tr>
                <tr>
                  <td>Google (YouTube Data API și Google Fonts)</td>
                  <td>Statistici ale videoclipurilor depuse ca livrabile; fonturi pe unele pagini</td>
                  <td>URL-ul videoclipului YouTube; la fonturi, adresa IP a browserului</td>
                </tr>
                <tr>
                  <td>Meta (Instagram și Facebook)</td>
                  <td>Instagram Login, citirea profilului profesional, oEmbed, callback de deconectare</td>
                  <td>Tokenul, datele de profil și de postări descrise la secțiunea 3; URL-ul public pentru miniatură</td>
                </tr>
                <tr>
                  <td>TikTok</td>
                  <td>Doar previzualizarea unui link public (oEmbed). Fără conectare de cont</td>
                  <td>URL-ul postării</td>
                </tr>
                <tr>
                  <td>Europarcel (eAWB)</td>
                  <td>Generarea AWB-ului pentru coletele de barter (api.europarcel.com)</td>
                  <td>Nume, telefon, email și adresa destinatarului și ale expeditorului</td>
                </tr>
                <tr>
                  <td>OpenStreetMap (Nominatim)</td>
                  <td>Căutarea orașului la înregistrare, în setări și la campaniile locale</td>
                  <td>Textul căutat și adresa IP a cererii</td>
                </tr>
                <tr>
                  <td>Serviciul push al browserului</td>
                  <td>Notificări push, doar dacă le activezi (Web Push, chei VAPID)</td>
                  <td>Endpoint-ul dispozitivului, titlul, textul și linkul notificării. Furnizorul depinde de browser (de exemplu Google, Mozilla sau Apple)</td>
                </tr>
                <tr>
                  <td>jsDelivr și cdnjs</td>
                  <td>Biblioteci încărcate în browserul administratorului, pentru export de raport și foi de calcul</td>
                  <td>Adresa IP a administratorului care deschide acea pagină</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>Când îți plătim o retragere, banca sau serviciul pe care l-ai ales (transfer, PayPal, Revolut, Wise sau rețeaua crypto) primește datele necesare plății. Curierul ales prin Europarcel primește datele de pe AWB.</p>
          <Todo>Confirmați că lista de mai sus acoperă și conturile de producție (aceleași integrări pot fi oprite dacă lipsește cheia din mediul de rulare). Nu am găsit în cod regiunea proiectului Supabase și nici regiunea în care rulează Vercel.</Todo>
        </Section>

        <Section title="6. Transferuri în afara SEE">
          <p>SmartBill și Europarcel sunt servicii folosite prin adrese din România. Supabase și Vercel pot stoca sau procesa date în regiunea configurată în contul lor; regiunea nu este scrisă în cod.</p>
          <p>Stripe, Resend, Twilio, Anthropic, Google și Meta sunt societăți care pot prelucra date în Statele Unite sau în alte țări din afara Spațiului Economic European. Telegram și TikTok sunt servicii internaționale. Nominatim este operat de OpenStreetMap Foundation. Serviciul de notificări push este cel al browserului.</p>
          <p>Un transfer în afara SEE este permis doar cu o garanție din capitolul V al GDPR (de exemplu clauze contractuale standard sau o decizie de adecvare). Nu afirmăm în această pagină că un anumit contract este deja semnat: acest lucru nu rezultă din cod.</p>
          <Todo>Treceți, pentru fiecare furnizor din afara SEE, mecanismul de transfer folosit și dacă există un acord de prelucrare semnat. Treceți regiunea proiectului Supabase și regiunea de hosting Vercel. Până la completare, nu prezentați stocarea ca fiind „doar în UE”.</Todo>
        </Section>

        <Section title="7. Cookie-uri și analitice">
          <p>Folosim cookie-uri și stocări strict necesare pentru funcționarea contului:</p>
          <ul>
            <li>cookie-urile de sesiune setate de autentificarea Supabase;</li>
            <li>cookie-uri de scurtă durată pentru conectarea Instagram (<code>ig_oauth_state</code>, <code>ig_oauth_redirect</code>, <code>ig_oauth_user</code>, <code>ig_oauth_kind</code>), ca să legăm răspunsul de contul tău și să limităm reutilizarea linkului;</li>
            <li>în browser, cheia <code>addfame_cookies</code>, care reține dacă ai închis bannerul cu „Accept toate” sau „Refuz”.</li>
          </ul>
          <p>Nu folosim cookie-uri de publicitate și nu am găsit un identificator publicitar.</p>
          <p><strong>Vercel Analytics</strong> este încărcat pe toate paginile, din layout-ul aplicației. Înregistrează vizitele (pagina, referrerul, tipul de browser și de dispozitiv, țara aproximativă) ca să măsurăm traficul. Nu este oprit de butonul „Refuz” din banner: bannerul doar salvează alegerea în browser, iar componenta de analitice rămâne montată pentru toți vizitatorii. Vercel descrie acest produs ca fiind fără cookie-uri de urmărire; totuși este o măsurare a utilizării și o menționăm ca atare.</p>
          <Todo>Dacă doriți ca „Refuz” să oprească Vercel Analytics, este nevoie de o schimbare în cod. Această pagină doar descrie comportamentul actual.</Todo>
        </Section>

        <Section title="8. Cât timp păstrăm datele">
          <p>Păstrăm datele contului cât timp contul este folosit și cât timp avem o obligație legală sau o apărare a unui drept.</p>
          <ul>
            <li>Fișierele video încărcate ca draft se șterg la 10 zile după încheierea colaborării (sau după ultima activitate pe fișier). Cu 3 zile înainte primești un avertisment. Dacă există un litigiu deschis pe colaborare, fișierul nu se șterge. Încărcările abandonate mai vechi de 24 de ore se curăță. Comentariile text rămân.</li>
            <li>Tokenul Instagram este șters la deconectare. Cât timp contul rămâne conectat, tokenul este reînnoit (durata unui token este de aproximativ 60 de zile).</li>
            <li>Facturile și documentele contabile se păstrează pe perioada cerută de legea contabilității. Contractele semnate, inclusiv IP-ul și semnătura, se păstrează ca dovadă a acordului.</li>
          </ul>
          <Todo>Stabiliți și treceți aici perioadele concrete pe care le aplicați după ștergerea contului, pentru jurnalele de erori, jurnalele WhatsApp, pixelul de email, contracte și documente contabile. Numerele vechi din politică (3 ani, 10 ani, 90 de zile) nu sunt implementate ca regulă automată în cod, așa că nu le mai afirmăm.</Todo>
        </Section>

        <Section title="9. Aplicația mobilă">
          <p>Poți folosi AddFame în browser sau ca aplicație instalată. Site-ul are un manifest și un service worker, deci poate fi adăugat pe ecranul principal. Notificările push apar doar dacă le pornești; poți să le oprești din setările dispozitivului sau din cont.</p>
          <p>Aplicația Android cu identificatorul <strong>ro.addfame.app</strong> folosește același serviciu și aceleași prelucrări. În codul platformei nu există permisiuni native de cameră, microfon sau localizare GPS: antetul de securitate le lasă închise. Orașul este cel pe care îl cauți tu, nu o citire a GPS-ului. Actul și selfie-ul se încarcă ca fișiere.</p>
          <Todo>Dacă pachetul din Google Play colectează altceva decât site-ul (jurnale de crash, identificatorul de publicitate Android, permisiuni native), completați lista înainte de Data safety. Nu am găsit aceste SDK-uri în depozitul site-ului.</Todo>
        </Section>

        <Section title="10. Vârsta minimă">
          <p>Termenii și condițiile spun că înregistrarea este permisă de la 18 ani. Ecranul de înregistrare cere, în plus, confirmarea că ai cel puțin 18 ani sau acordul unui tutore legal. Formularele publice de înscriere la campanii resping data nașterii care arată sub 18 ani pentru campaniile limitate astfel.</p>
          <p>Nu căutăm în mod intenționat date ale copiilor. Dacă aflăm că un cont aparține unei persoane care nu avea voie să se înregistreze, îl putem închide și șterge datele care nu trebuie păstrate prin lege.</p>
          <Todo>Alegeți o singură regulă și aliniați textul. Recomandarea, fără a modifica acum formularul: păstrați pragul de 18 ani din termeni (platforma presupune contracte, plăți și, la cesiune, CNP) și scoateți ulterior din bifă formula „sau acordul unui tutore”. Până la această decizie, nu declarați în Google Play că acceptați minori.</Todo>
        </Section>

        <Section title="11. Drepturile tale">
          <p>Conform GDPR ai dreptul de acces, rectificare, ștergere, restricționare, portabilitate și opoziție, precum și dreptul de a retrage un consimțământ. Poți cere să nu faci obiectul unei decizii bazate exclusiv pe prelucrare automată; sugestiile AI descrise mai sus sunt revăzute de o persoană când produc un efect asupra contului.</p>
          <p>Poți cere ștergerea din setările contului sau din pagina de ștergere a contului, ori scriind la <a href="mailto:privacy@addfame.ro">privacy@addfame.ro</a> de pe adresa contului. Răspundem în cel mult 30 de zile.</p>
          <p>Pentru creatori, acțiunea din setări șterge profilul, strike-urile, colaborările, recenziile, cererile de retragere, mesajele, notificările, tranzacțiile, metodele de plată și apoi contul de autentificare. Pentru branduri, butonul actual din setări șterge rândul de profil al brandului și închide sesiunea; nu șterge, prin el însuși, utilizatorul de autentificare. Instagram conectat se poate deconecta separat, cum este descris la secțiunea 3. Facturile și contractele pe care legea ne obligă să le păstrăm nu se șterg odată cu contul.</p>
          <Todo>Confirmați lista exactă a datelor care rămân după fiecare tip de ștergere, inclusiv după pagina publică de ștergere aflată într-un flux separat. Nu includem aici un URL pe care nu îl putem verifica în acest moment.</Todo>
        </Section>

        <Section title="12. Securitate">
          <p>Traficul dintre browser și aplicație este protejat prin HTTPS. Parolele nu sunt păstrate în clar. Tokenurile Instagram nu sunt afișate în interfață. Accesul la datele unui cont este limitat la titular, la cealaltă parte a unei colaborări (doar ce este necesar) și la administratorii platformei. Jurnalele de erori sunt curățate de emailuri, chei și tokenuri înainte de salvare.</p>
          <p>Nicio metodă nu este lipsită de risc. Dacă bănuiești un acces neautorizat, scrie-ne la <a href="mailto:privacy@addfame.ro">privacy@addfame.ro</a>.</p>
        </Section>

        <Section title="13. Reclamații">
          <p>Ne poți scrie mai întâi la <a href="mailto:privacy@addfame.ro">privacy@addfame.ro</a>. Ai și dreptul de a depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP): <a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer">dataprotection.ro</a>.</p>
          <p>Putem actualiza această politică atunci când se schimbă prelucrările. Data de la începutul paginii este data ultimei actualizări.</p>
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
