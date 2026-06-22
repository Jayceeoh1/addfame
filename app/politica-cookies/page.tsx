import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politica Cookies — AddFame',
  description: 'Informații despre utilizarea cookie-urilor pe platforma AddFame.ro',
}

export default function PoliticaCookies() {
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#f9fafb', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .container { max-width: 760px; margin: 0 auto; padding: 60px 24px; }
        h1 { font-size: 32px; font-weight: 900; color: #1e1b4b; margin: 0 0 8px; }
        .subtitle { font-size: 14px; color: #9ca3af; margin: 0 0 48px; }
        h2 { font-size: 18px; font-weight: 800; color: #1e1b4b; margin: 36px 0 12px; }
        p { font-size: 15px; color: #4b5563; line-height: 1.8; margin: 0 0 14px; }
        ul { padding-left: 20px; margin: 0 0 14px; }
        li { font-size: 15px; color: #4b5563; line-height: 1.8; margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0 24px; font-size: 14px; }
        th { background: #ede9fe; color: #4c1d95; padding: 10px 14px; text-align: left; font-weight: 800; border: 1px solid #ddd6fe; }
        td { padding: 10px 14px; border: 1px solid #f0f0f0; color: #4b5563; vertical-align: top; }
        tr:nth-child(even) td { background: #faf5ff; }
        a { color: #7c3aed; font-weight: 600; }
        .badge { display: inline-block; background: #ede9fe; color: #5b21b6; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; margin-bottom: 32px; }
        .card { background: white; border-radius: 16px; border: 1.5px solid #ede9fe; padding: 20px 24px; margin: 24px 0; }
      `}</style>

      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <a href="/" style={{ display: 'inline-block', marginBottom: 32, textDecoration: 'none' }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#7c3aed' }}>Add</span>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#06b6d4' }}>Fame</span>
          </a>
          <div className="badge">🍪 Politica Cookies</div>
          <h1>Politica de utilizare a cookie-urilor</h1>
          <p className="subtitle">Ultima actualizare: Aprilie 2026</p>
        </div>

        <p>
          AddFame (<strong>addfame.ro</strong>) utilizează cookie-uri și tehnologii similare pentru a asigura funcționarea corectă a platformei, pentru a îmbunătăți experiența utilizatorilor și pentru a analiza modul în care este utilizat site-ul nostru.
        </p>
        <p>
          Prin continuarea utilizării platformei noastre, ești de acord cu utilizarea cookie-urilor conform prezentei politici.
        </p>

        <h2>1. Ce sunt cookie-urile?</h2>
        <p>
          Cookie-urile sunt fișiere text mici stocate pe dispozitivul tău (calculator, telefon, tabletă) atunci când vizitezi un site web. Ele permit site-ului să îți rețină preferințele și să funcționeze corect la vizitele ulterioare.
        </p>

        <h2>2. Ce tipuri de cookie-uri folosim?</h2>

        <table>
          <thead>
            <tr>
              <th>Tip</th>
              <th>Scop</th>
              <th>Durată</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Cookie-uri esențiale</strong></td>
              <td>Necesare pentru funcționarea platformei — autentificare, sesiune utilizator, securitate</td>
              <td>Sesiune / 30 zile</td>
            </tr>
            <tr>
              <td><strong>Cookie-uri funcționale</strong></td>
              <td>Rețin preferințele tale (limbă, setări) pentru o experiență mai bună</td>
              <td>1 an</td>
            </tr>
            <tr>
              <td><strong>Cookie-uri analitice</strong></td>
              <td>Ne ajută să înțelegem cum este folosit site-ul (Vercel Analytics) — date anonime</td>
              <td>90 zile</td>
            </tr>
            <tr>
              <td><strong>Cookie-uri de plată</strong></td>
              <td>Necesare pentru procesarea plăților prin Stripe</td>
              <td>Sesiune</td>
            </tr>
          </tbody>
        </table>

        <h2>3. Cookie-uri terțe</h2>
        <p>Platforma noastră folosește servicii terțe care pot plasa propriile cookie-uri:</p>
        <ul>
          <li><strong>Supabase</strong> — autentificare și stocare date</li>
          <li><strong>Stripe</strong> — procesare plăți</li>
          <li><strong>Vercel Analytics</strong> — statistici anonime de utilizare</li>
          <li><strong>Resend</strong> — trimitere emailuri tranzacționale</li>
        </ul>
        <p>
          Aceste servicii au propriile politici de confidențialitate și cookie-uri, pe care te încurajăm să le consulți.
        </p>

        <h2>4. Cookie-uri esențiale — nu pot fi dezactivate</h2>
        <div className="card">
          <p style={{ margin: 0 }}>
            Cookie-urile esențiale sunt necesare pentru funcționarea de bază a platformei AddFame — autentificare, menținerea sesiunii și securitate. Acestea <strong>nu pot fi dezactivate</strong> fără a afecta funcționalitatea platformei.
          </p>
        </div>

        <h2>5. Cum poți controla cookie-urile?</h2>
        <p>
          Poți controla și șterge cookie-urile direct din browser-ul tău:
        </p>
        <ul>
          <li><strong>Google Chrome</strong>: Setări → Confidențialitate și securitate → Cookie-uri</li>
          <li><strong>Mozilla Firefox</strong>: Opțiuni → Confidențialitate și securitate</li>
          <li><strong>Safari</strong>: Preferințe → Confidențialitate</li>
          <li><strong>Microsoft Edge</strong>: Setări → Cookie-uri și permisiuni site</li>
        </ul>
        <p>
          Atenție: dezactivarea cookie-urilor poate afecta funcționarea platformei AddFame, inclusiv autentificarea și accesul la cont.
        </p>

        <h2>6. Nu urmărim datele tale în scopuri publicitare</h2>
        <div className="card">
          <p style={{ margin: 0 }}>
            AddFame <strong>nu vinde și nu partajează</strong> datele tale cu terți în scopuri publicitare. Nu folosim cookie-uri de tracking publicitar (Facebook Pixel, Google Ads etc.). Platforma noastră este <strong>fără reclame</strong>.
          </p>
        </div>

        <h2>7. Actualizări ale politicii</h2>
        <p>
          Ne rezervăm dreptul de a actualiza această politică periodic. Orice modificare semnificativă va fi comunicată prin email sau prin notificare pe platformă.
        </p>

        <h2>8. Contact</h2>
        <p>
          Pentru întrebări legate de cookie-uri sau confidențialitatea datelor, ne poți contacta la:
        </p>
        <ul>
          <li>Email: <a href="mailto:contact@addfame.ro">contact@addfame.ro</a></li>
          <li>Site: <a href="https://addfame.ro">addfame.ro</a></li>
        </ul>

        {/* Footer links */}
        <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1.5px solid #f0f0f0', display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="/termeni" style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>Termeni și condiții</a>
          <a href="/politica-de-confidentialitate" style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>Politica de confidențialitate</a>
          <a href="/contact" style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'none' }}>Contact</a>
          <a href="/" style={{ fontSize: 13, color: '#7c3aed', fontWeight: 700, textDecoration: 'none' }}>← Înapoi la AddFame</a>
        </div>
      </div>
    </div>
  )
}
