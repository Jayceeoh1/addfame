import Link from 'next/link'
import { Mail, ArrowLeft } from 'lucide-react'
import AuthShell from '@/components/auth/AuthShell'

export const metadata = { title: 'Verifică emailul — AddFame' }

// Next.js 15+/16: searchParams vine ca Promise — trebuie așteptat,
// altfel emailul nu apare pe pagină.
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; type?: string }>
}) {
  const sp = await searchParams
  const email = sp.email ?? ''
  const isBrand = sp.type === 'brand'

  return (
    <AuthShell variant="verify">
      <div className="au-stack au-enter">
        <div>
          <span style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#22c8f0,#3090f0,#7040f0)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, boxShadow: '0 12px 28px -12px rgba(90,53,230,.6)' }}>
            <Mail size={26} />
          </span>
          <h1 className="au-h1">Verifică-ți emailul</h1>
          <p className="au-sub" style={{ marginBottom: 0 }}>
            Am trimis un link de confirmare la{email ? <> <b style={{ color: 'var(--ink)', wordBreak: 'break-all' }}>{email}</b></> : ' adresa ta de email'}.
          </p>
        </div>

        <p className="au-hint" style={{ margin: 0, fontSize: 15 }}>
          Deschide emailul și apasă pe link pentru a-ți activa contul.
          Dacă nu îl găsești, verifică și folderul <b>Spam</b>.
        </p>

        <ol className="au-terms" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {[
            'Deschide emailul de la AddFame',
            'Apasă „Confirmă contul”',
            isBrand ? 'Ești redirecționat în dashboard-ul brandului' : 'Ești redirecționat direct în dashboard-ul tău',
          ].map((text, i) => (
            <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 16px', borderBottom: i < 2 ? '1px solid #ecebf5' : 0, background: '#fafafd', fontSize: 15, fontWeight: 600, color: 'var(--muted)' }}>
              <span className="au-step-n on" style={{ width: 28, height: 28, fontSize: 13 }}>{i + 1}</span>
              {text}
            </li>
          ))}
        </ol>

        <p className="au-hint" style={{ margin: 0, fontSize: 15 }}>
          Nu ai primit emailul?{' '}
          <Link href={`/auth/register${isBrand ? '?type=brand' : '?type=influencer'}`} className="au-link">
            Încearcă din nou
          </Link>
        </p>

        <Link href="/auth/login" className="au-btn-ghost" style={{ textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Înapoi la login
        </Link>
      </div>
    </AuthShell>
  )
}
