'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PartyPopper, AlertCircle, ShieldCheck } from 'lucide-react'
import SitePage, { PageHero } from '@/components/site/SiteShell'

export default function EvenimentToamna() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    instagram: '',
    tiktok: '',
    category: '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.first_name || !form.last_name || !form.email || !form.phone) {
      setError('Te rugăm completează toate câmpurile obligatorii.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/eveniment-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Eroare necunoscută')
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Ceva nu a mers. Încearcă din nou.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SitePage>
      <style>{EV_CSS}</style>

      {success ? (
        /* Success state */
        <section className="ev-success">
          <div className="ev-wash" aria-hidden="true" />
          <div className="af-wrap ev-success-inner">
            <div className="ev-panel ev-done">
              <span className="ev-done-icon af-grad"><PartyPopper size={34} aria-hidden="true" /></span>
              <h1 className="ev-h1">Te-ai înscris!</h1>
              <p className="sp-muted">
                Înscrierea ta a fost înregistrată cu succes. Te vom contacta în curând cu toate detaliile despre evenimentul din toamnă.
              </p>
              <Link href="/" className="af-btn af-btn-violet">
                Înapoi acasă →
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* Header */}
          <PageHero
            eyebrow="Eveniment exclusiv · Toamnă 2026"
            title="Înscrie-te la"
            accent="AddFame Fall Event"
            lead="Un eveniment exclusiv pentru influencerii AddFame. Locurile sunt limitate — înscrie-te acum și te contactăm cu detalii."
          />

          <section className="sp-section">
            <div className="af-wrap">
              {/* Form */}
              <form onSubmit={handleSubmit} className="ev-panel sp-form">

                {/* Nume */}
                <div className="ev-two">
                  <div>
                    <label htmlFor="ev-first_name" className="sp-label">Prenume *</label>
                    <input
                      id="ev-first_name"
                      className="sp-input"
                      type="text"
                      name="first_name"
                      placeholder="Maria"
                      autoComplete="given-name"
                      value={form.first_name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="ev-last_name" className="sp-label">Nume *</label>
                    <input
                      id="ev-last_name"
                      className="sp-input"
                      type="text"
                      name="last_name"
                      placeholder="Popescu"
                      autoComplete="family-name"
                      value={form.last_name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="ev-email" className="sp-label">Email *</label>
                  <input
                    id="ev-email"
                    className="sp-input"
                    type="email"
                    name="email"
                    placeholder="maria@email.com"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Telefon */}
                <div>
                  <label htmlFor="ev-phone" className="sp-label">Număr de telefon *</label>
                  <input
                    id="ev-phone"
                    className="sp-input"
                    type="tel"
                    name="phone"
                    placeholder="+40 7XX XXX XXX"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Divider */}
                <div className="ev-divider">
                  <p className="af-eyebrow">Platforme sociale</p>
                </div>

                {/* Instagram */}
                <div>
                  <label htmlFor="ev-instagram" className="sp-label">Instagram</label>
                  <div className="ev-handle">
                    <span className="ev-at" aria-hidden="true">@</span>
                    <input
                      id="ev-instagram"
                      className="sp-input"
                      type="text"
                      name="instagram"
                      placeholder="username"
                      value={form.instagram}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* TikTok */}
                <div>
                  <label htmlFor="ev-tiktok" className="sp-label">TikTok</label>
                  <div className="ev-handle">
                    <span className="ev-at" aria-hidden="true">@</span>
                    <input
                      id="ev-tiktok"
                      className="sp-input"
                      type="text"
                      name="tiktok"
                      placeholder="username"
                      value={form.tiktok}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Categorie */}
                <div>
                  <label htmlFor="ev-category" className="sp-label">Categorie de conținut</label>
                  <select
                    id="ev-category"
                    className="sp-input ev-select"
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                  >
                    <option value="">Alege categoria ta</option>
                    <option>Beauty & Makeup</option>
                    <option>Fashion & Style</option>
                    <option>Lifestyle</option>
                    <option>Wellness & Fitness</option>
                    <option>Travel</option>
                    <option>Food & Drink</option>
                    <option>Altele</option>
                  </select>
                </div>

                {/* Error */}
                {error && (
                  <div className="sp-alert sp-alert-err" role="alert">
                    <AlertCircle size={18} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="af-btn af-btn-infl ev-submit"
                >
                  {loading ? 'Se trimite...' : 'Mă înscriu la eveniment →'}
                </button>

                <p className="ev-note">
                  <ShieldCheck size={15} aria-hidden="true" /> Datele tale sunt în siguranță. Nu trimitem spam.
                </p>
              </form>
            </div>
          </section>
        </>
      )}
    </SitePage>
  )
}

const EV_CSS = `
.ev-panel{max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e3f3;border-radius:24px;padding:clamp(20px,4vw,36px);box-shadow:0 24px 48px -32px rgba(20,18,58,.25)}
.ev-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:16px}
.ev-divider{border-top:1px solid #eeecf7;padding-top:18px;margin-top:4px}
.ev-handle{display:flex;gap:8px}
.ev-at{flex:none;width:50px;min-height:50px;border:1.5px solid #dcd9ee;border-radius:12px;background:#f6f6fc;display:flex;align-items:center;justify-content:center;font-weight:700;color:#6a6690}
.ev-handle .sp-input{flex:1;min-width:0}
.ev-select{cursor:pointer;padding-right:44px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235a35e6' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center;background-size:18px}
.ev-submit{width:100%}
.ev-note{margin:0;display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;color:#6a6690;text-align:center}
.ev-success{position:relative;overflow:hidden;background:linear-gradient(160deg,#eaf8fe 0%,#f0f1ff 50%,#f5eeff 100%);border-bottom:1px solid #e5e3f3}
.ev-wash{position:absolute;inset:0;pointer-events:none;background:radial-gradient(520px 320px at 88% 0%,rgba(34,200,240,.20),transparent 70%),radial-gradient(520px 360px at 0% 100%,rgba(144,48,240,.13),transparent 70%)}
.ev-success-inner{position:relative;padding-block:clamp(56px,9vw,112px)}
.ev-done{display:flex;flex-direction:column;align-items:center;text-align:center;gap:16px}
.ev-done-icon{width:76px;height:76px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 14px 32px -12px rgba(112,64,240,.55)}
.ev-h1{margin:0;font-weight:800;font-size:clamp(30px,4.5vw,42px);letter-spacing:-.03em;line-height:1.05}
`
