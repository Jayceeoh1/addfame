import Link from 'next/link'
import { Mail, ArrowRight, RefreshCw } from 'lucide-react'

export const metadata = { title: 'Verifică emailul — AddFame' }

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { email?: string; type?: string }
}) {
  const email = searchParams.email ?? ''
  const isBrand = searchParams.type === 'brand'

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>

      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-7"
          style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', boxShadow: '0 12px 32px rgba(139,92,246,0.35)' }}>
          <Mail className="w-9 h-9 text-white" />
        </div>

        <h1 className="text-3xl font-black text-gray-900 mb-3">Verifică-ți emailul</h1>
        <p className="text-gray-500 mb-2 leading-relaxed">
          Am trimis un link de confirmare la
        </p>
        {email && (
          <p className="font-black text-gray-900 text-lg mb-6">{email}</p>
        )}
        <p className="text-gray-400 text-sm mb-10 leading-relaxed">
          Deschide emailul și apasă pe link pentru a-ți activa contul.
          Dacă nu îl găsești, verifică și folderul <strong>Spam</strong>.
        </p>

        {/* Steps */}
        <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-left space-y-4">
          {[
            { n: '1', text: 'Deschide emailul de la AddFame' },
            { n: '2', text: 'Apasă "Confirmă contul"' },
            { n: '3', text: isBrand ? 'Ești redirecționat în dashboard-ul brandului' : 'Ești redirecționat și aștepți aprobarea profilului' },
          ].map(s => (
            <div key={s.n} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 font-black text-sm flex items-center justify-center flex-shrink-0">{s.n}</div>
              <p className="text-sm text-gray-600 font-semibold">{s.text}</p>
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-400 mb-6">
          Nu ai primit emailul?{' '}
          <Link href={`/auth/register${isBrand ? '?type=brand' : '?type=influencer'}`}
            className="font-black text-purple-600 hover:underline">
            Încearcă din nou
          </Link>
        </p>

        <Link href="/auth/login"
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-700 transition">
          <ArrowRight className="w-4 h-4 rotate-180" /> Înapoi la login
        </Link>
      </div>
    </div>
  )
}
