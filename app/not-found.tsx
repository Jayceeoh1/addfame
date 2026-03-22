import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>
      <div className="text-center max-w-md">
        <p className="text-8xl font-black mb-4" style={{ background: 'linear-gradient(135deg,#f97316,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>404</p>
        <h1 className="text-2xl font-black text-gray-900 mb-3">Pagina nu a fost găsită</h1>
        <p className="text-gray-400 mb-8">Pagina pe care o cauți nu există sau a fost mutată.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="inline-flex items-center gap-2 text-white font-black px-6 py-3 rounded-2xl transition hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
            Acasă <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/auth/login" className="inline-flex items-center gap-2 font-bold px-6 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition">
            Login
          </Link>
        </div>
      </div>
    </div>
  )
}
