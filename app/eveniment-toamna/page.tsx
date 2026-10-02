'use client'

import { useState } from 'react'
import Link from 'next/link'

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
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="min-h-screen bg-[#0a0a0a] text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&display=swap');
        .brand-grad { background: linear-gradient(135deg, #f97316, #ec4899); }
        .brand-grad-text { background: linear-gradient(135deg, #f97316, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .field-input { width: 100%; background: #111; border: 1px solid #222; border-radius: 10px; padding: 12px 16px; color: #fff; font-size: 14px; outline: none; transition: border-color .2s; font-family: inherit; }
        .field-input::placeholder { color: #444; }
        .field-input:focus { border-color: #f97316; }
        .field-select { width: 100%; background: #111; border: 1px solid #222; border-radius: 10px; padding: 12px 16px; color: #aaa; font-size: 14px; outline: none; transition: border-color .2s; font-family: inherit; appearance: none; cursor: pointer; }
        .field-select:focus { border-color: #f97316; }
        .field-select option { background: #1a1a1a; color: #fff; }
        .submit-btn { width: 100%; border: none; border-radius: 12px; padding: 15px; color: #fff; font-size: 16px; font-weight: 800; cursor: pointer; font-family: inherit; transition: opacity .2s, transform .1s; }
        .submit-btn:hover { opacity: .9; }
        .submit-btn:active { transform: scale(.99); }
        .submit-btn:disabled { opacity: .6; cursor: not-allowed; }
      `}</style>

      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 overflow-hidden rounded-xl flex-shrink-0">
              <img src="/logo.png" alt="AddFame" className="w-full h-full object-contain" />
            </div>
            <span className="font-black text-lg text-white">AddFame</span>
          </Link>
          <Link href="/auth/register" className="text-sm font-bold text-white brand-grad px-4 py-2 rounded-xl hover:opacity-90 transition">
            Înregistrează-te
          </Link>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-16">

        {success ? (
          /* Success state */
          <div className="text-center py-16">
            <div className="w-20 h-20 brand-grad rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">🎉</div>
            <h1 className="text-3xl font-black mb-3">Te-ai înscris!</h1>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Înscrierea ta a fost înregistrată cu succes. Te vom contacta în curând cu toate detaliile despre evenimentul din toamnă.
            </p>
            <Link href="/" className="brand-grad text-white font-bold px-8 py-3 rounded-xl hover:opacity-90 transition inline-block">
              Înapoi acasă →
            </Link>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-5">
                <span className="w-2 h-2 rounded-full bg-orange-400 inline-block animate-pulse" />
                <span className="text-sm font-bold text-orange-400">Eveniment exclusiv · Toamnă 2026</span>
              </div>
              <h1 className="text-4xl font-black mb-3 leading-tight">
                Înscrie-te la{' '}
                <span className="brand-grad-text" style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic' }}>
                  AddFame Fall Event
                </span>
              </h1>
              <p className="text-gray-400 leading-relaxed">
                Un eveniment exclusiv pentru influencerii AddFame. Locurile sunt limitate — înscrie-te acum și te contactăm cu detalii.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Nume */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2 font-semibold">Prenume *</label>
                  <input
                    className="field-input"
                    type="text"
                    name="first_name"
                    placeholder="Maria"
                    value={form.first_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2 font-semibold">Nume *</label>
                  <input
                    className="field-input"
                    type="text"
                    name="last_name"
                    placeholder="Popescu"
                    value={form.last_name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm text-gray-400 mb-2 font-semibold">Email *</label>
                <input
                  className="field-input"
                  type="email"
                  name="email"
                  placeholder="maria@email.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Telefon */}
              <div>
                <label className="block text-sm text-gray-400 mb-2 font-semibold">Număr de telefon *</label>
                <input
                  className="field-input"
                  type="tel"
                  name="phone"
                  placeholder="+40 7XX XXX XXX"
                  value={form.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Divider */}
              <div className="border-t border-white/5 pt-2">
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-4">Platforme sociale</p>
              </div>

              {/* Instagram */}
              <div>
                <label className="block text-sm text-gray-400 mb-2 font-semibold">Instagram</label>
                <div className="flex gap-2">
                  <div className="bg-[#111] border border-[#222] rounded-[10px] px-3 flex items-center text-gray-500 text-sm font-bold flex-shrink-0">@</div>
                  <input
                    className="field-input"
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
                <label className="block text-sm text-gray-400 mb-2 font-semibold">TikTok</label>
                <div className="flex gap-2">
                  <div className="bg-[#111] border border-[#222] rounded-[10px] px-3 flex items-center text-gray-500 text-sm font-bold flex-shrink-0">@</div>
                  <input
                    className="field-input"
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
                <label className="block text-sm text-gray-400 mb-2 font-semibold">Categorie de conținut</label>
                <select
                  className="field-select"
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
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm font-semibold">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="submit-btn brand-grad"
                style={{ boxShadow: '0 8px 30px rgba(249,115,22,0.25)' }}
              >
                {loading ? 'Se trimite...' : 'Mă înscriu la eveniment →'}
              </button>

              <p className="text-center text-xs text-gray-600">
                Datele tale sunt în siguranță. Nu trimitem spam.
              </p>
            </form>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-black text-white">AddFame</span>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/terms" className="hover:text-gray-300 transition">Termeni</Link>
            <Link href="/privacy" className="hover:text-gray-300 transition">Confidențialitate</Link>
            <a href="mailto:contact@addfame.ro" className="hover:text-gray-300 transition">Contact</a>
          </div>
          <p className="text-sm text-gray-600">© {new Date().getFullYear()} AddFame.</p>
        </div>
      </footer>
    </div>
  )
}
