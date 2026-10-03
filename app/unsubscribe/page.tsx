'use client'
import { useState } from 'react'
import Link from 'next/link'
import { MailX, CheckCircle } from 'lucide-react'
import SitePage from '@/components/site/SiteShell'

export default function UnsubscribePage() {
  const [status, setStatus] = useState<'idle' | 'done'>('idle')
  const [email, setEmail] = useState('')

  function handleUnsubscribe() {
    if (!email) return
    // Simply confirm - in production you'd call an API
    setStatus('done')
  }

  return (
    <SitePage>
      <style>{US_CSS}</style>
      <section className="us-section">
        <div className="us-wash" aria-hidden="true" />
        <div className="af-wrap us-inner">
          <div className="us-card">
            {status === 'idle' ? (
              <>
                <span className="us-icon af-grad"><MailX size={28} aria-hidden="true" /></span>
                <h1 className="us-h1">Dezabonare emailuri</h1>
                <p className="sp-muted us-text">
                  Introdu adresa de email și nu vei mai primi emailuri de marketing de la AddFame.
                  Emailurile legate de contul tău (confirmări, notificări) vor continua.
                </p>
                <div className="us-field">
                  <label htmlFor="us-email" className="sp-label">Email</label>
                  <input
                    id="us-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="adresa@email.ro"
                    autoComplete="email"
                    className="sp-input"
                  />
                </div>
                <button
                  onClick={handleUnsubscribe}
                  disabled={!email}
                  className="af-btn af-btn-violet us-btn"
                >
                  Mă dezabonez
                </button>
                <Link href="/" className="us-back">
                  ← Înapoi la AddFame
                </Link>
              </>
            ) : (
              <>
                <span className="us-icon us-icon-ok"><CheckCircle size={28} aria-hidden="true" /></span>
                <h1 className="us-h1">Dezabonat cu succes!</h1>
                <p className="sp-muted us-text">
                  Adresa <strong>{email}</strong> a fost eliminată din lista noastră de emailuri marketing.
                  Îți mulțumim că ai folosit AddFame!
                </p>
                <Link href="/" className="af-btn af-btn-ink">
                  Înapoi la AddFame →
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </SitePage>
  )
}

const US_CSS = `
.us-section{position:relative;overflow:hidden;background:linear-gradient(160deg,#eaf8fe 0%,#f0f1ff 50%,#f5eeff 100%);border-bottom:1px solid #e5e3f3}
.us-wash{position:absolute;inset:0;pointer-events:none;background:radial-gradient(520px 320px at 88% 0%,rgba(34,200,240,.20),transparent 70%),radial-gradient(520px 360px at 0% 100%,rgba(144,48,240,.13),transparent 70%)}
.us-inner{position:relative;display:flex;justify-content:center;padding-block:clamp(48px,9vw,112px)}
.us-card{width:100%;max-width:460px;background:#fff;border:1px solid #e5e3f3;border-radius:24px;padding:clamp(24px,5vw,40px);box-shadow:0 24px 48px -28px rgba(20,18,58,.3);display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px}
.us-icon{width:64px;height:64px;border-radius:18px;display:flex;align-items:center;justify-content:center;color:#fff}
.us-icon-ok{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}
.us-h1{margin:0;font-weight:800;font-size:clamp(26px,4vw,32px);letter-spacing:-.025em;line-height:1.1}
.us-text{font-size:15px;line-height:1.65}
.us-text strong{color:#14123a}
.us-field{width:100%;text-align:left}
.us-btn{width:100%}
.us-back{color:#6a6690;font-size:14px;font-weight:600;text-decoration:none;min-height:44px;display:inline-flex;align-items:center;padding-inline:8px}
.us-back:hover{color:#14123a}
`
