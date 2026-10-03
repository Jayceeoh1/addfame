'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Mail, MessageSquare, Building2, Send, CheckCircle, Zap, MessageCircle, Clapperboard, CreditCard, Bug, Handshake, Landmark } from 'lucide-react'
import SitePage, { PageHero } from '@/components/site/SiteShell'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', type: 'general' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Server error')
      setSent(true)
    } catch {
      alert('A apărut o eroare. Încearcă din nou sau scrie direct la contact@addfame.ro')
    } finally {
      setLoading(false)
    }
  }

  const TOPICS = [
    { value: 'general', label: 'Întrebare generală', icon: MessageCircle },
    { value: 'brand', label: 'Sunt brand', icon: Building2 },
    { value: 'influencer', label: 'Sunt influencer', icon: Clapperboard },
    { value: 'payment', label: 'Problemă plată', icon: CreditCard },
    { value: 'bug', label: 'Raportez un bug', icon: Bug },
    { value: 'partnership', label: 'Parteneriat', icon: Handshake },
  ]

  return (
    <SitePage>
      <style>{CT_CSS}</style>

      <PageHero
        eyebrow="Suntem aici pentru tine"
        title="Hai să"
        accent="vorbim"
        lead="Ai o întrebare, o problemă sau vrei să colaborăm? Scrie-ne și îți răspundem în maxim 24 de ore."
      />

      <section className="sp-section">
        <div className="af-wrap ct-layout">
          {/* Contact info */}
          <div className="ct-side" role="complementary" aria-label="Date de contact">
            <div className="sp-card">
              <span className="sp-icon sp-icon-brand"><Mail size={20} aria-hidden="true" /></span>
              <h3 className="sp-h3">Email</h3>
              <p>Pentru orice întrebare generală</p>
              <a href="mailto:contact@addfame.ro" className="ct-mail">contact@addfame.ro</a>
            </div>

            <div className="sp-card">
              <span className="sp-icon sp-icon-brand"><Building2 size={20} aria-hidden="true" /></span>
              <h3 className="sp-h3">Plăți & Facturare</h3>
              <p>Probleme cu credite sau retrageri</p>
              <a href="mailto:payments@addfame.ro" className="ct-mail">payments@addfame.ro</a>
            </div>

            <div className="sp-card">
              <span className="sp-icon sp-icon-infl"><MessageSquare size={20} aria-hidden="true" /></span>
              <h3 className="sp-h3">Support</h3>
              <p>Timp de răspuns: max 24h</p>
              <a href="mailto:support@addfame.ro" className="ct-mail">support@addfame.ro</a>
            </div>

            <div className="ct-fast">
              <p className="ct-fast-title"><Zap size={16} aria-hidden="true" /> Răspuns rapid</p>
              <p className="ct-fast-text">Luni–Vineri, 9:00–18:00 (EET) răspundem de obicei în câteva ore.</p>
            </div>

            <div className="sp-card">
              <span className="sp-icon sp-icon-soft"><Landmark size={20} aria-hidden="true" /></span>
              <h3 className="sp-h3">Date firmă</h3>
              <p className="ct-company">
                <strong>ADD FAME DIGITAL S.R.L.</strong><br />
                CUI: 54992560<br />
                Reg. Com.: J2026040984009<br />
                Județul Argeș, România
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="ct-main">
            {sent ? (
              <div className="ct-panel ct-sent">
                <span className="ct-sent-icon af-grad"><CheckCircle size={32} aria-hidden="true" /></span>
                <h2 className="sp-h2">Mesaj trimis!</h2>
                <p className="sp-muted">Îți vom răspunde la <strong>{form.email}</strong> în maxim 24 de ore.</p>
                <button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '', type: 'general' }) }}
                  className="af-btn af-btn-ghost">
                  Trimite alt mesaj
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="ct-panel sp-form">
                {/* Topic chips */}
                <div role="group" aria-labelledby="ct-topic-label">
                  <span id="ct-topic-label" className="sp-label">Subiect</span>
                  <div className="ct-chips">
                    {TOPICS.map(t => {
                      const Icon = t.icon
                      return (
                        <button key={t.value} type="button"
                          aria-pressed={form.type === t.value}
                          onClick={() => setForm(f => ({ ...f, type: t.value }))}
                          className={`ct-chip ${form.type === t.value ? 'active' : ''}`}>
                          <Icon size={16} aria-hidden="true" /> {t.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Name + Email */}
                <div className="ct-two">
                  <div>
                    <label htmlFor="ct-name" className="sp-label">Numele tău *</label>
                    <input id="ct-name" className="sp-input" placeholder="Marius Ciprian" required autoComplete="name"
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label htmlFor="ct-email" className="sp-label">Email *</label>
                    <input id="ct-email" className="sp-input" type="email" placeholder="tu@exemplu.ro" required autoComplete="email"
                      value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="ct-subject" className="sp-label">Titlu mesaj *</label>
                  <input id="ct-subject" className="sp-input" placeholder="Ex: Nu pot retrage banii din wallet" required
                    value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="ct-message" className="sp-label">Mesajul tău *</label>
                  <textarea id="ct-message" className="sp-input" rows={5}
                    placeholder="Descrie problema sau întrebarea ta cât mai detaliat..." required
                    value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
                </div>

                <button type="submit" disabled={loading} className="af-btn af-btn-violet ct-submit">
                  {loading
                    ? <><span className="ct-spin" aria-hidden="true" /> Se trimite...</>
                    : <><Send size={16} aria-hidden="true" /> Trimite mesajul</>
                  }
                </button>

                <p className="ct-note">
                  Prin trimiterea acestui formular ești de acord cu{' '}
                  <Link href="/politica-de-confidentialitate">Politica de confidențialitate</Link>.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </SitePage>
  )
}

const CT_CSS = `
.ct-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:24px;align-items:start}
.ct-side{display:flex;flex-direction:column;gap:14px}
.ct-mail{color:#5a35e6;font-weight:700;font-size:15px;text-decoration:none;word-break:break-word;min-height:44px;display:inline-flex;align-items:center}
.ct-mail:hover{text-decoration:underline}
.ct-company{font-size:14px!important;line-height:1.7}
.ct-company strong{color:#14123a}
.ct-fast{border:1.5px dashed #cfc4ff;background:#f5f2ff;border-radius:18px;padding:20px 22px}
.ct-fast-title{display:flex;align-items:center;gap:8px;margin:0 0 4px;font-weight:700;color:#4423c4;font-size:15px}
.ct-fast-text{margin:0;font-size:14px;color:#4a4770}
.ct-panel{background:#fff;border:1px solid #e5e3f3;border-radius:24px;padding:clamp(20px,4vw,36px);box-shadow:0 24px 48px -32px rgba(20,18,58,.25)}
.ct-sent{display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px;padding-block:clamp(48px,8vw,80px)}
.ct-sent-icon{width:64px;height:64px;border-radius:18px;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 12px 30px -10px rgba(112,64,240,.5)}
.ct-chips{display:flex;flex-wrap:wrap;gap:8px}
.ct-chip{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:10px 16px;border-radius:12px;border:1.5px solid #dcd9ee;background:#fff;color:#14123a;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:border-color .15s,background .15s,color .15s}
.ct-chip:hover{border-color:#7040f0}
.ct-chip.active{border-color:#5a35e6;background:#efeaff;color:#4423c4}
.ct-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:16px}
.ct-submit{width:100%}
.ct-spin{width:18px;height:18px;border-radius:50%;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;animation:ct-rot .8s linear infinite}
@keyframes ct-rot{to{transform:rotate(360deg)}}
.ct-note{margin:0;font-size:13px;color:#6a6690;text-align:center}
.ct-note a{color:#5a35e6;font-weight:700}
@media(max-width:900px){.ct-layout{grid-template-columns:1fr}.ct-main{order:-1}}
`
