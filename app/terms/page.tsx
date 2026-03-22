import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'Termeni și Condiții — AddFame', description: 'Termenii și condițiile de utilizare a platformei AddFame.' }

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-xl font-black text-gray-900 mb-3">{title}</h2>
    <div className="text-gray-600 text-sm leading-relaxed space-y-2">{children}</div>
  </section>
)

export default function TermsPage() {
  const updated = '12 Martie 2026'
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>
      <nav className="border-b border-gray-100 px-6 py-4 max-w-4xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
            <img src="/logo.png" alt="AddFame" style={{ width: '110%', height: '110%', objectFit: 'contain' }} />
          </div>
          <span className="font-black text-gray-900">Add<span className="text-orange-500">Fame</span></span>
        </Link>
        <Link href="/" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition">
          <ArrowLeft className="w-4 h-4" /> Înapoi
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-black text-gray-900 mb-2">Termeni și Condiții</h1>
        <p className="text-sm text-gray-400 mb-10">Ultima actualizare: {updated}</p>

        <Section title="1. Acceptarea termenilor">
          <p>Prin accesarea și utilizarea platformei AddFame (addfame.ro), ești de acord cu acești termeni și condiții. Dacă nu ești de acord, te rugăm să nu utilizezi platforma.</p>
          <p>AddFame este operată de AddFame SRL, înregistrată în România, CUI RO12345678.</p>
        </Section>

        <Section title="2. Descrierea serviciului">
          <p>AddFame este o platformă de marketing cu influenceri care conectează branduri cu creatori de conținut. Platforma facilitează crearea campaniilor, gestionarea colaborărilor și plata influencerilor.</p>
          <p>Modelul de tarifare: <strong>0€ înregistrare</strong>, <strong>15% comision platformă</strong> din fiecare colaborare finalizată, <strong>5% fee</strong> la retragerea fondurilor de către influenceri.</p>
        </Section>

        <Section title="3. Conturi și înregistrare">
          <p>Trebuie să ai cel puțin 18 ani pentru a te înregistra. Ești responsabil pentru securitatea contului tău și pentru toate activitățile efectuate din contul tău.</p>
          <p>Brandurile sunt verificate manual de echipa AddFame înainte de a putea lansa campanii. Influencerii sunt verificați înainte de a putea aplica la campanii.</p>
          <p>Ne rezervăm dreptul de a suspenda sau șterge conturi care încalcă acești termeni.</p>
        </Section>

        <Section title="4. Plăți și comisioane">
          <p><strong>Branduri:</strong> Creditele adăugate în wallet sunt utilizate pentru plata influencerilor. La aprobarea unui post, 15% din bugetul colaborării este reținut de AddFame ca comision de platformă, iar restul de 85% este creditat în walletul influencerului.</p>
          <p><strong>Influenceri:</strong> Fondurile câștigate pot fi retrase oricând. La retragere se aplică un fee de procesare de 5% din suma retrasă. Retragerile sunt procesate manual în 3-5 zile lucrătoare.</p>
          <p>Toate prețurile sunt în EUR (€). AddFame nu răspunde pentru pierderile cauzate de fluctuațiile valutare.</p>
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
          <p>Pentru întrebări: <a href="mailto:legal@addfame.ro" className="text-purple-600 font-bold hover:underline">legal@addfame.ro</a></p>
          <p>AddFame SRL, Str. Victoriei 12, București, România</p>
        </Section>

        <div className="border-t border-gray-100 pt-8 flex gap-6">
          <Link href="/privacy" className="text-sm font-bold text-purple-600 hover:underline">Politica de Confidențialitate</Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-700">Înapoi la platformă</Link>
        </div>
      </div>
    </div>
  )
}
