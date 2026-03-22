'use client'
// @ts-nocheck

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Shield, Upload, CheckCircle, Clock, XCircle,
  AlertCircle, FileText, Camera, CreditCard, Car,
  X, ChevronRight, Lock
} from 'lucide-react'

const DOC_TYPES = [
  { id: 'id_card', label: 'Buletin / Carte de identitate', icon: CreditCard, desc: 'CI română sau orice document de identitate național' },
  { id: 'passport', label: 'Pașaport', icon: FileText, desc: 'Pagina cu fotografie și date personale' },
  { id: 'driving_license', label: 'Permis auto', icon: Car, desc: 'Față și verso' },
]

export default function InfluencerVerifyPage() {
  const router = useRouter()
  const [influencer, setInfluencer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const [docType, setDocType] = useState('id_card')
  const [docFile, setDocFile] = useState(null)
  const [docPreview, setDocPreview] = useState(null)
  const [selfieFile, setSelfieFile] = useState(null)
  const [selfiePreview, setSelfiePreview] = useState(null)
  const [fullName, setFullName] = useState('')
  const [notes, setNotes] = useState('')

  const notify = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { router.replace('/auth/login'); return }
    const { data } = await sb.from('influencers').select('*').eq('user_id', user.id).single()
    if (!data) { router.replace('/auth/login'); return }
    setInfluencer(data)
    setFullName(data.verification_full_name || data.name || '')
    setNotes(data.verification_notes || '')
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  function handleDocFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { notify('Fișierul trebuie să fie sub 5MB', false); return }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
    if (!allowed.includes(file.type) && !file.name.toLowerCase().endsWith('.heic')) {
      notify('Doar PDF, JPG, PNG acceptate', false); return
    }
    setDocFile(file)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => setDocPreview(reader.result)
      reader.readAsDataURL(file)
    } else {
      setDocPreview('pdf')
    }
  }

  function handleSelfieFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { notify('Selfie-ul trebuie să fie sub 5MB', false); return }
    if (!file.type.startsWith('image/')) { notify('Selfie-ul trebuie să fie o imagine', false); return }
    setSelfieFile(file)
    const reader = new FileReader()
    reader.onload = () => setSelfiePreview(reader.result)
    reader.readAsDataURL(file)
  }

  async function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!fullName.trim()) { notify('Introdu numele complet exact ca pe document', false); return }
    if (!docFile) { notify('Încarcă documentul de identitate', false); return }
    if (!selfieFile) { notify('Încarcă selfie-ul cu documentul', false); return }

    setSaving(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Convert to base64 (same pattern as brand verification)
      const docBase64 = await toBase64(docFile)
      const selfieBase64 = await toBase64(selfieFile)

      const { error } = await sb.from('influencers').update({
        verification_status: 'pending',
        verification_doc_type: docType,
        verification_doc_url: docBase64,
        verification_selfie_url: selfieBase64,
        verification_full_name: fullName.trim(),
        verification_notes: notes.trim() || null,
        verification_submitted_at: new Date().toISOString(),
        verification_rejection_reason: null,
      }).eq('user_id', user.id)

      if (error) throw error

      notify('✅ Documentele au fost trimise! Verificăm în 24-48h.')
      await load()
    } catch (err) {
      notify(err.message || 'Eroare la trimitere', false)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-t-purple-500 border-purple-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
    </div>
  )

  const status = influencer?.verification_status || 'unverified'
  const isPending = status === 'pending'
  const isVerified = status === 'verified'
  const isRejected = status === 'rejected'

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .upload-zone { border: 2px dashed #e5e7eb; border-radius: 16px; padding: 24px; text-align: center; cursor: pointer; transition: all .2s; background: #fafafa; }
        .upload-zone:hover { border-color: #8b5cf6; background: #faf5ff; }
        .upload-zone.has-file { border-color: #10b981; background: #f0fdf4; border-style: solid; }
        .doc-type-btn { border: 2px solid #e5e7eb; border-radius: 14px; padding: 14px 16px; cursor: pointer; transition: all .18s; text-align: left; width: 100%; background: white; }
        .doc-type-btn:hover { border-color: #8b5cf6; background: #faf5ff; }
        .doc-type-btn.selected { border-color: #8b5cf6; background: #f5f3ff; }
        .infl-grad { background: linear-gradient(135deg, #8b5cf6, #06b6d4); }
      `}</style>

      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold max-w-sm ${toast.ok ? 'bg-white border-2 border-green-200 text-green-700' : 'bg-white border-2 border-red-200 text-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 infl-grad rounded-2xl flex items-center justify-center flex-shrink-0" style={{ boxShadow: '0 4px 14px rgba(139,92,246,0.35)' }}>
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Verificare identitate</h1>
          <p className="text-sm text-gray-400">Contul tău devine de încredere pentru branduri</p>
        </div>
      </div>

      {/* Status banners */}
      {isVerified && (
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 mb-6 flex items-center gap-4">
          <CheckCircle className="w-10 h-10 text-green-500 flex-shrink-0" />
          <div>
            <p className="font-black text-green-800 text-lg">Identitate verificată ✓</p>
            <p className="text-sm text-green-600 mt-0.5">Profilul tău are badge-ul de identitate verificată vizibil brandurilor.</p>
          </div>
        </div>
      )}

      {isPending && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 mb-6 flex items-center gap-4">
          <Clock className="w-10 h-10 text-amber-500 flex-shrink-0" />
          <div>
            <p className="font-black text-amber-800 text-lg">În curs de verificare</p>
            <p className="text-sm text-amber-600 mt-0.5">Documentele tale sunt în revizuire. Verificăm în 24-48 ore lucrătoare.</p>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
            <p className="font-black text-red-800">Verificare respinsă</p>
          </div>
          {influencer?.verification_rejection_reason && (
            <p className="text-sm text-red-600 bg-red-100 rounded-xl p-3 mt-2">
              Motiv: {influencer.verification_rejection_reason}
            </p>
          )}
          <p className="text-xs text-red-500 mt-2">Poți retrimite documentele mai jos.</p>
        </div>
      )}

      {/* Benefits */}
      {!isVerified && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-6">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">De ce să te verifici?</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Shield, text: 'Badge "Identitate verificată" pe profil' },
              { icon: ChevronRight, text: 'Prioritate mai mare în lista brandurilor' },
              { icon: CheckCircle, text: 'Brandurile au mai multă încredere' },
              { icon: Lock, text: 'Protecție împotriva conturilor false' },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <b.icon className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <p className="text-xs font-semibold text-gray-600">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      {!isVerified && !isPending && (
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Full name */}
          <div>
            <label className="block text-sm font-black text-gray-700 mb-2">
              Nume complet <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Exact ca pe document (ex: IONESCU MARIA)"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition"
              style={{ fontFamily: 'inherit' }}
            />
            <p className="text-xs text-gray-400 mt-1">Scrie exact cum apare pe document, cu majuscule</p>
          </div>

          {/* Doc type selection */}
          <div>
            <label className="block text-sm font-black text-gray-700 mb-3">
              Tip document <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {DOC_TYPES.map(dt => {
                const Icon = dt.icon
                return (
                  <button
                    key={dt.id}
                    type="button"
                    onClick={() => setDocType(dt.id)}
                    className={`doc-type-btn ${docType === dt.id ? 'selected' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${docType === dt.id ? 'bg-purple-100' : 'bg-gray-100'}`}>
                        <Icon className={`w-4 h-4 ${docType === dt.id ? 'text-purple-600' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${docType === dt.id ? 'text-purple-800' : 'text-gray-700'}`}>{dt.label}</p>
                        <p className="text-xs text-gray-400">{dt.desc}</p>
                      </div>
                      {docType === dt.id && (
                        <div className="ml-auto w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                          <CheckCircle className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Document upload */}
          <div>
            <label className="block text-sm font-black text-gray-700 mb-2">
              Fotografie / scan document <span className="text-red-500">*</span>
            </label>
            <label className={`upload-zone block ${docFile ? 'has-file' : ''}`}>
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic" onChange={handleDocFile} />
              {docPreview ? (
                <div className="flex items-center gap-3 justify-center">
                  {docPreview === 'pdf'
                    ? <FileText className="w-8 h-8 text-green-500" />
                    : <img src={docPreview} alt="doc" className="h-20 rounded-lg object-cover" />
                  }
                  <div className="text-left">
                    <p className="text-sm font-black text-green-700">Fișier încărcat ✓</p>
                    <p className="text-xs text-gray-400">{docFile?.name}</p>
                    <p className="text-xs text-purple-500 mt-1">Click pentru a schimba</p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-600">Click pentru a încărca</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF — max 5MB</p>
                  <p className="text-xs text-gray-400">Asigură-te că toate datele sunt lizibile</p>
                </div>
              )}
            </label>
          </div>

          {/* Selfie with document */}
          <div>
            <label className="block text-sm font-black text-gray-700 mb-2">
              Selfie cu documentul în mână <span className="text-red-500">*</span>
            </label>
            <label className={`upload-zone block ${selfieFile ? 'has-file' : ''}`}>
              <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.heic" capture="user" onChange={handleSelfieFile} />
              {selfiePreview ? (
                <div className="flex items-center gap-3 justify-center">
                  <img src={selfiePreview} alt="selfie" className="h-20 rounded-lg object-cover" />
                  <div className="text-left">
                    <p className="text-sm font-black text-green-700">Selfie încărcat ✓</p>
                    <p className="text-xs text-gray-400">{selfieFile?.name}</p>
                    <p className="text-xs text-purple-500 mt-1">Click pentru a schimba</p>
                  </div>
                </div>
              ) : (
                <div>
                  <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-600">Selfie cu documentul vizibil</p>
                  <p className="text-xs text-gray-400 mt-1">Ține documentul lângă față, ambele să fie clare</p>
                  <p className="text-xs text-gray-400">JPG, PNG — max 5MB</p>
                </div>
              )}
            </label>
            <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs text-blue-700 font-semibold">Cum faci selfie-ul corect:</p>
              <ul className="text-xs text-blue-600 mt-1 space-y-0.5">
                <li>• Ține documentul lângă față, ambele vizibile</li>
                <li>• Lumină bună, fără flash puternic</li>
                <li>• Textul de pe document să fie lizibil</li>
              </ul>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-black text-gray-700 mb-2">Note adiționale (opțional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Orice informație relevantă pentru echipa de verificare..."
              rows={2}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-purple-400 transition resize-none"
              style={{ fontFamily: 'inherit' }}
            />
          </div>

          {/* Privacy notice */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
            <Lock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 leading-relaxed">
              Documentele tale sunt stocate în siguranță și folosite exclusiv pentru verificarea identității. Nu sunt partajate cu brandurile sau terți. Sunt șterse automat după 90 de zile de la verificare.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving || !docFile || !selfieFile || !fullName.trim()}
            className="w-full py-4 rounded-2xl font-black text-base text-white disabled:opacity-40 transition flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', boxShadow: '0 4px 16px rgba(139,92,246,0.35)' }}
          >
            {saving
              ? <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Se trimite…</>
              : <><Shield className="w-5 h-5" /> Trimite pentru verificare</>
            }
          </button>
        </form>
      )}
    </div>
  )
}
