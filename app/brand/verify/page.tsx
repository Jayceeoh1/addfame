'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Shield, Upload, Globe, Linkedin, FileText,
  CheckCircle, Clock, XCircle, AlertCircle, ArrowRight, X
} from 'lucide-react'

export default function BrandVerifyPage() {
  const router = useRouter()
  const [brand, setBrand] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const [website, setWebsite] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [notes, setNotes] = useState('')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docPreview, setDocPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) { router.replace('/auth/login'); return }
    const { data } = await sb.from('brands').select('*').eq('user_id', user.id).single()
    if (!data) { router.replace('/auth/login'); return }
    setBrand(data)
    setWebsite(data.website || '')
    setLinkedin(data.verification_linkedin || '')
    setNotes(data.verification_notes || '')
    setDocPreview(data.verification_document_url || null)
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { notify('File must be under 3MB', false); return }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { notify('Only PDF, JPG, PNG files allowed', false); return }
    setDocFile(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!website.trim() && !linkedin.trim()) {
      notify('Please provide at least your website or LinkedIn URL', false)
      return
    }
    setSaving(true)

    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return

      let docUrl = docPreview

      // Convert file to base64 and store directly in DB
      // This avoids any Storage bucket setup requirements
      if (docFile) {
        setUploading(true)
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = () => reject(new Error('Failed to read file'))
            reader.readAsDataURL(docFile)
          })
          docUrl = base64 // stores as data:application/pdf;base64,... or data:image/...;base64,...
        } catch (readErr: any) {
          notify(`Failed to read file: ${readErr.message}`, false)
          setSaving(false)
          setUploading(false)
          return
        }
        setUploading(false)
      }

      const { error } = await sb.from('brands').update({
        website: website.trim() || null,
        verification_linkedin: linkedin.trim() || null,
        verification_notes: notes.trim() || null,
        verification_document_url: docUrl,
        verification_status: 'pending',
        verification_submitted_at: new Date().toISOString(),
      }).eq('id', brand.id)

      if (error) throw error

      notify('✅ Verification submitted! We\'ll review within 24 hours.')
      setBrand((p: any) => ({ ...p, verification_status: 'pending' }))
    } catch (e: any) {
      notify(e.message || 'Submission failed', false)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="w-10 h-10 rounded-full border-t-orange-400 border-orange-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
    </div>
  )

  const status = brand?.verification_status || 'unverified'

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .card { background:white;border:1.5px solid #f0f0f0;border-radius:20px; }
        .brand-grad { background:linear-gradient(135deg,#f97316,#ec4899); }
        .field { width:100%;padding:11px 16px;border:2px solid #f0f0f0;border-radius:12px;font-size:14px;font-weight:500;outline:none;background:white;transition:border-color .2s;font-family:inherit;color:#111; }
        .field:focus { border-color:#f97316;box-shadow:0 0 0 3px rgba(249,115,22,.08); }
        .field::placeholder { color:#9ca3af;font-weight:400; }
        textarea.field { resize:vertical;min-height:90px; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp .35s ease both; }
        @keyframes slideD { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .toast-anim { animation:slideD .3s ease; }
      `}</style>

      {toast && (
        <div className={`toast-anim fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold max-w-sm ${toast.ok ? 'bg-white border-2 border-green-200 text-green-700' : 'bg-white border-2 border-red-200 text-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-7 fade-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 brand-grad rounded-2xl flex items-center justify-center" style={{ boxShadow: '0 4px 14px rgba(249,115,22,.3)' }}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Brand Verification</h1>
            <p className="text-sm text-gray-400">Verify your brand to publish campaigns</p>
          </div>
        </div>
      </div>

      {/* Status banner */}
      {status === 'pending' && (
        <div className="card p-5 mb-6 fade-up flex items-start gap-4" style={{ animationDelay: '.04s', borderColor: '#fde68a', background: '#fffbeb' }}>
          <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="font-black text-amber-800">Verification under review</p>
            <p className="text-sm text-amber-600 mt-0.5">We're reviewing your submission. This usually takes 24 hours. You'll be notified once approved.</p>
          </div>
        </div>
      )}

      {status === 'verified' && (
        <div className="card p-5 mb-6 fade-up flex items-start gap-4" style={{ animationDelay: '.04s', borderColor: '#bbf7d0', background: '#f0fdf4' }}>
          <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="font-black text-green-800">Brand verified ✓</p>
            <p className="text-sm text-green-600 mt-0.5">Your brand is verified. You can publish campaigns and work with influencers.</p>
          </div>
        </div>
      )}

      {status === 'rejected' && (
        <div className="card p-5 mb-6 fade-up flex items-start gap-4" style={{ animationDelay: '.04s', borderColor: '#fecaca', background: '#fff5f5' }}>
          <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="font-black text-red-800">Verification rejected</p>
            {brand?.verification_rejection_reason && (
              <p className="text-sm text-red-600 mt-0.5">Reason: {brand.verification_rejection_reason}</p>
            )}
            <p className="text-sm text-red-500 mt-1">Please update your details and resubmit below.</p>
          </div>
        </div>
      )}

      {/* Why verify */}
      {status === 'unverified' && (
        <div className="card p-5 mb-6 fade-up" style={{ animationDelay: '.04s' }}>
          <h2 className="font-black text-gray-900 mb-3">Why verify?</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { icon: '🚀', title: 'Publish campaigns', desc: 'Required to make campaigns visible to influencers' },
              { icon: '🤝', title: 'Build trust', desc: 'Verified badge shown to influencers on your profile' },
              { icon: '⚡', title: 'Fast process', desc: 'Usually approved within 24 hours' },
            ].map(f => (
              <div key={f.title} className="bg-gray-50 rounded-2xl p-4">
                <p className="text-2xl mb-2">{f.icon}</p>
                <p className="font-black text-gray-800 text-sm">{f.title}</p>
                <p className="text-xs text-gray-400 mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submission form */}
      {(status === 'unverified' || status === 'rejected') && (
        <form onSubmit={handleSubmit} className="space-y-5 fade-up" style={{ animationDelay: '.1s' }}>
          <div className="card p-6">
            <h2 className="font-black text-gray-900 mb-5">Your details</h2>

            {/* Website */}
            <div className="mb-4">
              <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-orange-400" /> Company Website
              </label>
              <input type="url" className="field" placeholder="https://yourbrand.com"
                value={website} onChange={e => setWebsite(e.target.value)} />
            </div>

            {/* LinkedIn */}
            <div className="mb-4">
              <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Linkedin className="w-3.5 h-3.5 text-blue-500" /> LinkedIn Company Page
                <span className="text-gray-400 font-normal normal-case tracking-normal">(recommended)</span>
              </label>
              <input type="url" className="field" placeholder="https://linkedin.com/company/yourbrand"
                value={linkedin} onChange={e => setLinkedin(e.target.value)} />
            </div>

            {/* Document upload */}
            <div className="mb-4">
              <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-orange-400" /> Business Document
                <span className="text-gray-400 font-normal normal-case tracking-normal">(optional but speeds up review)</span>
              </label>
              <p className="text-xs text-gray-400 mb-3">Business registration, VAT certificate, or any official document. PDF, JPG or PNG, max 3MB.</p>

              {docFile || docPreview ? (
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-orange-50 border-2 border-orange-200">
                  <FileText className="w-5 h-5 text-orange-500 flex-shrink-0" />
                  <p className="text-sm font-bold text-orange-700 flex-1 truncate">
                    {docFile ? docFile.name : 'Previously uploaded document'}
                  </p>
                  <button type="button" onClick={() => { setDocFile(null); setDocPreview(null) }}
                    className="w-6 h-6 rounded-full bg-orange-200 flex items-center justify-center hover:bg-orange-300 transition">
                    <X className="w-3 h-3 text-orange-700" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition">
                  <Upload className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-sm font-bold text-gray-400">Click to upload document</p>
                  <p className="text-xs text-gray-300 mt-1">PDF, JPG, PNG — max 3MB</p>
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} />
                </label>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                Additional notes <span className="text-gray-400 font-normal normal-case tracking-normal">(optional)</span>
              </label>
              <textarea className="field" placeholder="Tell us about your brand, what you sell, and how you plan to use AddFame…"
                value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-white text-sm transition disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', boxShadow: '0 4px 16px rgba(249,115,22,.3)' }}>
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> {uploading ? 'Uploading document…' : 'Submitting…'}</>
              : <><Shield className="w-4 h-4" /> Submit for Verification <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
      )}

      {/* Already verified — redirect */}
      {status === 'verified' && (
        <div className="text-center fade-up" style={{ animationDelay: '.1s' }}>
          <button onClick={() => router.push('/brand/dashboard')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm text-white brand-grad"
            style={{ boxShadow: '0 4px 14px rgba(249,115,22,.3)' }}>
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
