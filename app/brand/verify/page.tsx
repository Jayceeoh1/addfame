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
    if (file.size > 3 * 1024 * 1024) { notify('Fișierul trebuie să fie sub 3MB', false); return }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { notify('Sunt permise doar fișiere PDF, JPG, PNG', false); return }
    setDocFile(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!website.trim() && !linkedin.trim()) {
      notify('Te rugăm să furnizezi cel puțin website-ul sau URL-ul LinkedIn', false)
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
            reader.onerror = () => reject(new Error('Eroare la citirea fișierului'))
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

      notify('✅ Verificare trimisă! Vom analiza în 24 de ore.')
      setBrand((p: any) => ({ ...p, verification_status: 'pending' }))
    } catch (e: any) {
      notify(e.message || 'Trimitere eșuată', false)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="bu"><div className="bu-card" style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="w-10 h-10 rounded-full border-t-violet-400 border-violet-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
    </div></div>
  )

  const status = brand?.verification_status || 'unverified'
  // Stepper: 0 = detalii, 1 = în analiză, 2 = verificat
  const stepIdx = status === 'verified' ? 2 : status === 'pending' ? 1 : 0
  const steps = ['Trimite detalii', 'În analiză (24h)', 'Verificat']
  const banner = status === 'pending'
    ? { bg: '#fff8dc', bd: '#f3dc8a', fg: '#854d0e', ibg: '#fff1c2', Icon: Clock, title: 'Verificare în analiză', body: 'Îți analizăm cererea. Durează de obicei 24 de ore. Vei fi notificat când este aprobată.' }
    : status === 'verified'
    ? { bg: '#effaf5', bd: '#bfe9d6', fg: '#14532d', ibg: '#dcf5ec', Icon: CheckCircle, title: 'Brand verificat ✓', body: 'Brandul tău este verificat. Poți publica campanii și lucra cu influencerii.' }
    : status === 'rejected'
    ? { bg: '#fff4f2', bd: '#f3c9c4', fg: '#b42318', ibg: '#fde8e6', Icon: XCircle, title: 'Verificare respinsă', body: brand?.verification_rejection_reason ? `Motiv: ${brand.verification_rejection_reason}` : '' }
    : null

  return (
    <div className="bu bv" style={{ maxWidth: 760 }}>
      <style>{`
        .bv-field { width:100%; height:46px; padding:0 14px; border:1.5px solid #e5e3f3; border-radius:12px; font-size:14px; outline:none; background:#fff; font-family:inherit; color:#14123a; box-sizing:border-box; transition:border-color .2s; }
        .bv-field:focus { border-color:#5a35e6; box-shadow:0 0 0 3px rgba(90,53,230,.1); }
        .bv-field::placeholder { color:#a5a2c0; }
        textarea.bv-field { height:auto; padding:12px 14px; resize:vertical; min-height:96px; }
        .bv-lbl { display:flex; align-items:center; gap:6px; flex-wrap:wrap; font-size:12px; font-weight:800; color:#4a4770; margin-bottom:8px; }
        .bv-lbl small { font-weight:500; color:#8783a8; font-size:12px; }
        .bv-steps { display:flex; align-items:flex-start; }
        .bv-step { flex:1; display:flex; flex-direction:column; align-items:center; gap:8px; position:relative; text-align:center; font-size:12px; font-weight:700; color:#8783a8; min-width:0; }
        .bv-step:not(:last-child)::after { content:''; position:absolute; top:16px; left:calc(50% + 20px); right:calc(-50% + 20px); height:2px; background:#e5e3f3; }
        .bv-step.done:not(:last-child)::after { background:#5a35e6; }
        .bv-dot { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:#f0eff7; color:#8783a8; font-weight:800; font-size:13px; }
        .bv-step.done .bv-dot { background:#5a35e6; color:#fff; }
        .bv-step.cur .bv-dot { background:#14123a; color:#fff; box-shadow:0 0 0 4px rgba(90,53,230,.15); }
        .bv-step.cur, .bv-step.done { color:#14123a; }
        .bv-why { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
        .bv-why > div { background:#f6f6fc; border-radius:16px; padding:14px; }
        .bv-toast { position:fixed; top:16px; right:16px; left:16px; margin-left:auto; max-width:380px; z-index:50; display:flex; align-items:center; gap:10px; padding:14px 16px; border-radius:16px; background:#fff; font-size:14px; font-weight:700; box-shadow:0 18px 40px -16px rgba(20,18,58,.35); }
        .bv-drop { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:28px 16px; border:2px dashed #d8d5ec; border-radius:16px; cursor:pointer; text-align:center; transition:all .15s; }
        .bv-drop:hover { border-color:#5a35e6; background:#faf8ff; }
        @media (max-width:560px) { .bv-why { grid-template-columns:minmax(0,1fr); } .bv-step { font-size:11px; } }
      `}</style>

      {toast && (
        <div className="bv-toast" style={{ border: `1.5px solid ${toast.ok ? '#bfe9d6' : '#f3c9c4'}`, color: toast.ok ? '#14532d' : '#b42318' }}>
          {toast.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bu-head">
        <div>
          <div className="bu-label" style={{ marginBottom: 6 }}>Cont</div>
          <h1>Verificare brand</h1>
          <p className="bu-muted bu-sm" style={{ margin: '6px 0 0' }}>Verifică-ți brandul pentru a publica campanii</p>
        </div>
        <span className="bu-chip" style={{
          background: status === 'verified' ? '#dcf5ec' : status === 'pending' ? '#fff1c2' : status === 'rejected' ? '#fde8e6' : '#f0eff7',
          color: status === 'verified' ? '#14532d' : status === 'pending' ? '#854d0e' : status === 'rejected' ? '#b42318' : '#4a4770',
        }}>
          <Shield className="w-3 h-3" />
          {status === 'verified' ? 'Verificat' : status === 'pending' ? 'În analiză' : status === 'rejected' ? 'Respins' : 'Neverificat'}
        </span>
      </div>

      {/* Stepper */}
      <div className="bu-card bu-card-pad">
        <div className="bv-steps">
          {steps.map((label, i) => (
            <div key={label} className={`bv-step${i < stepIdx || (i === 2 && stepIdx === 2) ? ' done' : i === stepIdx ? ' cur' : ''}`}>
              <div className="bv-dot">{i < stepIdx || (i === 2 && stepIdx === 2) ? <CheckCircle className="w-4 h-4" /> : i + 1}</div>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Status banner */}
      {banner && (
        <div className="bu-card bu-card-pad" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: banner.bg, borderColor: banner.bd }}>
          <div className="bu-ico" style={{ background: banner.ibg, color: banner.fg }}><banner.Icon className="w-5 h-5" /></div>
          <div style={{ minWidth: 0, color: banner.fg }}>
            <p style={{ margin: 0, fontWeight: 800 }}>{banner.title}</p>
            {banner.body && <p className="bu-sm" style={{ margin: '4px 0 0' }}>{banner.body}</p>}
            {status === 'rejected' && <p className="bu-sm" style={{ margin: '4px 0 0' }}>Te rugăm să actualizezi detaliile și să retrimiți mai jos.</p>}
            {status === 'verified' && (
              <button onClick={() => router.push('/brand/dashboard')} className="bu-btn p big" style={{ marginTop: 14 }}>
                Mergi la dashboard <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Why verify */}
      {status === 'unverified' && (
        <div className="bu-card bu-card-pad">
          <h2 style={{ marginBottom: 14 }}>De ce să verifici?</h2>
          <div className="bv-why">
            {[
              { icon: '🚀', title: 'Publică campanii', desc: 'Necesar pentru a face campaniile vizibile influencerilor' },
              { icon: '🤝', title: 'Construiește încredere', desc: 'Insigna de verificat este afișată influencerilor pe profilul tău' },
              { icon: '⚡', title: 'Proces rapid', desc: 'De obicei aprobat în 24 de ore' },
            ].map(f => (
              <div key={f.title}>
                <p style={{ fontSize: 22, margin: '0 0 6px' }}>{f.icon}</p>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>{f.title}</p>
                <p className="bu-xs bu-muted" style={{ margin: '4px 0 0' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submission form */}
      {(status === 'unverified' || status === 'rejected') && (
        <form onSubmit={handleSubmit} className="bu-col" style={{ gap: 18 }}>
          <div className="bu-card bu-card-pad">
            <h2 style={{ marginBottom: 18 }}>Detaliile tale</h2>

            <div style={{ marginBottom: 16 }}>
              <label className="bv-lbl"><Globe className="w-3.5 h-3.5" style={{ color: '#5a35e6' }} /> Website companie</label>
              <input type="url" className="bv-field" placeholder="https://yourbrand.com"
                value={website} onChange={e => setWebsite(e.target.value)} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="bv-lbl"><Linkedin className="w-3.5 h-3.5" style={{ color: '#1d4fb8' }} /> Pagina LinkedIn a companiei <small>(recomandat)</small></label>
              <input type="url" className="bv-field" placeholder="https://linkedin.com/company/yourbrand"
                value={linkedin} onChange={e => setLinkedin(e.target.value)} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="bv-lbl"><FileText className="w-3.5 h-3.5" style={{ color: '#5a35e6' }} /> Document de business <small>(opțional, dar accelerează analiza)</small></label>
              <p className="bu-xs bu-muted" style={{ margin: '0 0 10px' }}>Certificat de înregistrare, certificat TVA sau orice document oficial. PDF, JPG sau PNG, max 3MB.</p>

              {docFile || docPreview ? (
                <div className="bu-row" style={{ gap: 12, padding: 14, borderRadius: 16, background: '#efeaff', border: '1.5px solid #d9ccff' }}>
                  <FileText className="w-5 h-5 flex-shrink-0" style={{ color: '#4423c4' }} />
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#4423c4', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {docFile ? docFile.name : 'Document încărcat anterior'}
                  </p>
                  <button type="button" aria-label="Elimină documentul" onClick={() => { setDocFile(null); setDocPreview(null) }}
                    style={{ width: 44, height: 44, margin: '-8px -8px -8px 0', border: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#4423c4' }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="bv-drop">
                  <div className="bu-ico" style={{ background: '#efeaff', color: '#4423c4', marginBottom: 10 }}><Upload className="w-5 h-5" /></div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Apasă pentru a încărca documentul</p>
                  <p className="bu-xs bu-muted" style={{ margin: '4px 0 0' }}>PDF, JPG, PNG — max 3MB</p>
                  <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} />
                </label>
              )}
            </div>

            <div>
              <label className="bv-lbl">Note suplimentare <small>(opțional)</small></label>
              <textarea className="bv-field" placeholder="Spune-ne despre brandul tău, ce vinzi și cum plănuiești să folosești AddFame…"
                value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>

          <button type="submit" disabled={saving} className="bu-btn p big" style={{ width: '100%', height: 52 }}>
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> {uploading ? 'Se încarcă documentul…' : 'Se trimite…'}</>
              : <><Shield className="w-4 h-4" /> Trimite spre verificare <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>
      )}
    </div>
  )
}
