import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'Politica de Confidențialitate — AddFame', description: 'Politica de confidențialitate și prelucrare a datelor personale pe platforma AddFame.' }

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-xl font-black text-gray-900 mb-3">{title}</h2>
    <div className="text-gray-600 text-sm leading-relaxed space-y-2">{children}</div>
  </section>
)

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>
      <nav className="border-b border-gray-100 px-6 py-4 max-w-4xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="AddFame" className="w-8 h-8 rounded-xl object-contain" />
          <span className="font-black text-gray-900">Add<span className="text-orange-500">Fame</span></span>
        </Link>
        <Link href="/" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition">
          <ArrowLeft className="w-4 h-4" /> Înapoi
        </Link>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-black text-gray-900 mb-2">Politica de Confidențialitate</h1>
        <p className="text-sm text-gray-400 mb-10">Ultima actualizare: 12 Martie 2026</p>

        <Section title="1. Cine suntem">
          <p>AddFame SRL este operatorul de date personale responsabil pentru platforma addfame.ro. Ne poți contacta la <a href="mailto:privacy@addfame.ro" className="text-orange-500 font-bold hover:underline">privacy@addfame.ro</a>.</p>
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

        <Section title="6. Drepturile tale">
          <p>Conform GDPR, ai dreptul la: <strong>acces</strong> (să știi ce date deținem), <strong>rectificare</strong> (să corectezi date incorecte), <strong>ștergere</strong> (să ceri ștergerea datelor), <strong>portabilitate</strong> (să primești datele în format structurat), <strong>opoziție</strong> (față de prelucrarea bazată pe interes legitim).</p>
          <p>Exercitați aceste drepturi scriind la <a href="mailto:privacy@addfame.ro" className="text-orange-500 font-bold hover:underline">privacy@addfame.ro</a>. Răspundem în maxim 30 de zile.</p>
        </Section>

        <Section title="7. Cookie-uri">
          <p>Folosim exclusiv cookie-uri funcționale necesare pentru autentificare și menținerea sesiunii. Nu folosim cookie-uri de tracking sau publicitare.</p>
        </Section>

        <Section title="8. Securitate">
          <p>Datele sunt stocate pe servere în UE, criptate în tranzit (HTTPS/TLS) și în repaus. Parolele sunt hash-uite. Accesul la date este limitat la personalul care are nevoie de ele.</p>
        </Section>

        <Section title="9. Reclamații">
          <p>Dacă crezi că datele tale nu sunt prelucrate corect, poți depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP): <a href="https://www.dataprotection.ro" target="_blank" className="text-orange-500 font-bold hover:underline">dataprotection.ro</a>.</p>
        </Section>

        <div className="border-t border-gray-100 pt-8 flex gap-6">
          <Link href="/terms" className="text-sm font-bold text-orange-500 hover:underline">Termeni și Condiții</Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-700">Înapoi la platformă</Link>
        </div>
      </div>
    </div>
  )
}
