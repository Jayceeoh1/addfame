'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, Mail, MessageSquare, Building2, User, Send, CheckCircle } from 'lucide-react'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', type: 'general' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // Simulate send — integrate with Resend later
    await new Promise(r => setTimeout(r, 1200))
    setLoading(false)
    setSent(true)
  }

  const TOPICS = [
    { value: 'general', label: 'Întrebare generală', icon: '💬' },
    { value: 'brand', label: 'Sunt brand', icon: '🏢' },
    { value: 'influencer', label: 'Sunt influencer', icon: '🎬' },
    { value: 'payment', label: 'Problemă plată', icon: '💳' },
    { value: 'bug', label: 'Raportez un bug', icon: '🐛' },
    { value: 'partnership', label: 'Parteneriat', icon: '🤝' },
  ]

  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&display=swap');
        .brand-grad { background: linear-gradient(135deg, #f97316, #ec4899); }
        .brand-grad-text { background: linear-gradient(135deg, #f97316, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .input-field { width: 100%; padding: 12px 16px; border: 2px solid #f0f0f0; border-radius: 12px; font-size: 14px; font-family: inherit; font-weight: 500; outline: none; transition: border-color 0.2s; background: white; }
        .input-field:focus { border-color: #f97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.08); }
        .topic-chip { padding: 8px 16px; border-radius: 10px; border: 2px solid #f0f0f0; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; background: white; }
        .topic-chip:hover { border-color: #f97316; background: #fff7ed; }
        .topic-chip.active { border-color: #f97316; background: #fff7ed; color: #ea580c; }
      `}</style>

      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="AddFame" className="w-8 h-8 rounded-xl object-contain" />
            <span className="font-black text-lg">AddFame</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-700 transition">
            <ArrowLeft className="w-4 h-4" /> Înapoi
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-4 py-1.5 mb-5">
            <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
            <span className="text-sm font-bold text-orange-700">Suntem aici pentru tine</span>
          </div>
          <h1 className="text-5xl font-black mb-4 leading-tight">
            Hai să <span className="brand-grad-text" style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }}>vorbim</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Ai o întrebare, o problemă sau vrei să colaborăm? Scrie-ne și îți răspundem în maxim 24 de ore.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Contact info */}
          <div className="space-y-5">
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="w-10 h-10 brand-grad rounded-xl flex items-center justify-center mb-4">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-black text-gray-900 mb-1">Email</h3>
              <p className="text-sm text-gray-500 mb-2">Pentru orice întrebare generală</p>
              <a href="mailto:contact@addfame.ro" className="text-sm font-bold text-orange-500 hover:underline">
                contact@addfame.ro
              </a>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="w-10 h-10 brand-grad rounded-xl flex items-center justify-center mb-4">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-black text-gray-900 mb-1">Plăți & Facturare</h3>
              <p className="text-sm text-gray-500 mb-2">Probleme cu credite sau retrageri</p>
              <a href="mailto:payments@addfame.ro" className="text-sm font-bold text-orange-500 hover:underline">
                payments@addfame.ro
              </a>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="w-10 h-10 brand-grad rounded-xl flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-black text-gray-900 mb-1">Support</h3>
              <p className="text-sm text-gray-500 mb-2">Timp de răspuns: max 24h</p>
              <a href="mailto:support@addfame.ro" className="text-sm font-bold text-orange-500 hover:underline">
                support@addfame.ro
              </a>
            </div>

            <div className="rounded-2xl p-6 border-2 border-dashed border-orange-200 bg-orange-50/50">
              <p className="text-sm font-bold text-orange-700 mb-1">⚡ Răspuns rapid</p>
              <p className="text-xs text-orange-600">Luni–Vineri, 9:00–18:00 (EET) răspundem de obicei în câteva ore.</p>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            {sent ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 bg-gray-50 rounded-3xl border border-gray-100">
                <div className="w-16 h-16 brand-grad rounded-2xl flex items-center justify-center mb-5 shadow-lg" style={{ boxShadow: '0 8px 30px rgba(249,115,22,0.3)' }}>
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Mesaj trimis! 🎉</h2>
                <p className="text-gray-500 max-w-sm">Îți vom răspunde la <strong>{form.email}</strong> în maxim 24 de ore.</p>
                <button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '', type: 'general' }) }}
                  className="mt-8 text-sm font-bold text-orange-500 hover:underline">
                  Trimite alt mesaj
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
                {/* Topic chips */}
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-3">Subiect</label>
                  <div className="flex flex-wrap gap-2">
                    {TOPICS.map(t => (
                      <button key={t.value} type="button"
                        onClick={() => setForm(f => ({ ...f, type: t.value }))}
                        className={`topic-chip ${form.type === t.value ? 'active' : ''}`}>
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-black text-gray-700 mb-1.5">Numele tău *</label>
                    <input className="input-field" placeholder="Marius Ciprian" required
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-black text-gray-700 mb-1.5">Email *</label>
                    <input className="input-field" type="email" placeholder="tu@exemplu.ro" required
                      value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-1.5">Titlu mesaj *</label>
                  <input className="input-field" placeholder="Ex: Nu pot retrage banii din wallet" required
                    value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-black text-gray-700 mb-1.5">Mesajul tău *</label>
                  <textarea className="input-field resize-none" rows={5}
                    placeholder="Descrie problema sau întrebarea ta cât mai detaliat..." required
                    value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full brand-grad text-white font-black py-4 rounded-2xl text-base flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60"
                  style={{ boxShadow: '0 8px 30px rgba(249,115,22,0.3)' }}>
                  {loading
                    ? <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Se trimite...</>
                    : <><Send className="w-4 h-4" /> Trimite mesajul</>
                  }
                </button>

                <p className="text-xs text-gray-400 text-center">
                  Prin trimiterea acestui formular ești de acord cu{' '}
                  <Link href="/privacy" className="text-orange-500 font-bold hover:underline">Politica de confidențialitate</Link>.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 px-6 mt-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="AddFame" className="w-7 h-7 rounded-lg object-contain" />
            <span className="font-black text-gray-900">AddFame</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/terms" className="hover:text-gray-700 transition">Termeni</Link>
            <Link href="/privacy" className="hover:text-gray-700 transition">Confidențialitate</Link>
            <Link href="/about" className="hover:text-gray-700 transition">Despre noi</Link>
          </div>
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} AddFame.</p>
        </div>
      </footer>
    </div>
  )
}
