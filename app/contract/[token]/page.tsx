'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle, Download, PenLine, RotateCcw } from 'lucide-react'

type Contract = {
  id: string
  token: string
  influencer_name: string
  influencer_email: string
  influencer_phone?: string
  influencer_address?: string
  amount_lei: number
  payment_days: number
  status: string
  signed_at?: string
  signature_name?: string
}

export default function ContractPage() {
  const params = useParams()
  const token = params?.token as string
  const router = useRouter()

  // Prevent ANY redirect away from this page — contract is fully public
  useEffect(() => {
    const originalPush = router.push.bind(router)
    const originalReplace = router.replace.bind(router)
    // Block redirects to login
    ;(router as any).push = (url: string, ...args: any[]) => {
      if (typeof url === 'string' && url.includes('/auth/')) return
      return originalPush(url, ...args)
    }
    ;(router as any).replace = (url: string, ...args: any[]) => {
      if (typeof url === 'string' && url.includes('/auth/')) return
      return originalReplace(url, ...args)
    }
    return () => {
      ;(router as any).push = originalPush
      ;(router as any).replace = originalReplace
    }
  }, [router])

  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)
  const [signedAt, setSignedAt] = useState('')

  // Form fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [signatureName, setSignatureName] = useState('')
  const [agreed, setAgreed] = useState(false)

  // Canvas signature
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/ugc-contracts/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        const c = d.contract
        setContract(c)
        setName(c.influencer_name || '')
        setEmail(c.influencer_email || '')
        setPhone(c.influencer_phone || '')
        setAddress(c.influencer_address || '')
        if (c.status === 'signed') { setSigned(true); setSignedAt(c.signed_at || '') }
        setLoading(false)
      })
      .catch(() => { setError('Eroare la încărcarea contractului'); setLoading(false) })
  }, [token])

  // Canvas helpers
  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const canvas = canvasRef.current!
    const pos = getPos(e, canvas)
    lastPos.current = pos
    setIsDrawing(true)
    setHasSignature(true)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!isDrawing || !lastPos.current) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
  }

  function stopDraw() { setIsDrawing(false); lastPos.current = null }

  function clearCanvas() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  async function handleSign(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed) { alert('Trebuie să fii de acord cu termenii contractului.'); return }
    if (!hasSignature && !signatureName.trim()) { alert('Adaugă semnătura desenată sau numele tău ca semnătură electronică.'); return }

    setSigning(true)
    try {
      let signatureImage: string | null = null
      if (hasSignature && canvasRef.current) {
        signatureImage = canvasRef.current.toDataURL('image/png')
      }

      const res = await fetch(`/api/ugc-contracts/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature_image: signatureImage,
          signature_name: signatureName.trim() || name,
          influencer_name: name,
          influencer_email: email,
          influencer_phone: phone,
          influencer_address: address,
        }),
      })
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      setSigned(true)
      setSignedAt(data.signed_at)
    } finally {
      setSigning(false)
    }
  }

  const today = new Date().toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })
  const fmt = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Se încarcă contractul...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-10 text-center max-w-sm shadow-xl">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="font-black text-gray-900 text-xl mb-2">Contract negăsit</h2>
        <p className="text-gray-400 text-sm">{error}</p>
      </div>
    </div>
  )

  if (signed) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-10 text-center max-w-md shadow-xl">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-9 h-9 text-green-500" />
        </div>
        <h2 className="font-black text-gray-900 text-2xl mb-2">Contract semnat!</h2>
        <p className="text-gray-400 text-sm mb-1">Semnat de <strong className="text-gray-700">{contract?.influencer_name}</strong></p>
        {signedAt && <p className="text-gray-400 text-sm">La data: <strong className="text-gray-700">{fmt(signedAt)}</strong></p>}
        <div className="mt-6 p-4 bg-green-50 rounded-2xl border border-green-200">
          <p className="text-green-700 text-sm font-semibold">
            Contractul tău a fost înregistrat în sistemul AddFame. Vei fi contactat în curând.
          </p>
        </div>
        <a
          href={`/api/ugc-contracts/${token}/pdf`}
          className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 transition"
        >
          <Download className="w-4 h-4" /> Descarcă copia PDF
        </a>
      </div>
    </div>
  )

  if (!contract) return null

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#f1f5f9', minHeight: '100vh' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>

      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
              <img src="/logo.png" alt="AddFame" className="w-6 h-6 object-contain" />
            </div>
            <span className="font-black text-xl">Add<span className="text-orange-500">Fame</span></span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Acord de Colaborare UGC</h1>
          <p className="text-sm text-gray-400 mt-1">Citește cu atenție înainte de a semna</p>
        </div>

        {/* Contract document */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mb-6">

          {/* Status bar */}
          <div className="bg-indigo-600 px-6 py-3 flex items-center justify-between">
            <span className="text-white text-sm font-black">Document confidențial</span>
            <span className="text-indigo-200 text-xs">addfame.ro</span>
          </div>

          <div className="p-8">
            {/* Title */}
            <div className="text-center mb-8 pb-6 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-900 mb-1">ACORD DE COLABORARE UGC</h2>
              <p className="text-sm text-gray-400">Încheiat la data de: {today}</p>
            </div>

            {/* Parties */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
                <p className="text-xs font-black text-indigo-400 uppercase tracking-wider mb-3">Beneficiar</p>
                <p className="font-black text-gray-900">AddFame SRL</p>
                <p className="text-sm text-gray-500 mt-1">addfame.ro</p>
                <p className="text-sm text-gray-500">contact@addfame.ro</p>
              </div>
              <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100">
                <p className="text-xs font-black text-purple-400 uppercase tracking-wider mb-3">Creator / Influencer</p>
                <p className="font-black text-gray-900">{contract.influencer_name}</p>
                <p className="text-sm text-gray-500 mt-1">{contract.influencer_email}</p>
                {contract.influencer_phone && <p className="text-sm text-gray-500">{contract.influencer_phone}</p>}
              </div>
            </div>

            {/* Contract text — exact PDF content */}
            <div className="space-y-6 text-sm text-gray-700 leading-relaxed">

              <div>
                <h4 className="font-black text-gray-900 mb-2">1. Obiectul acordului</h4>
                <p>Creatorul se obliga sa realizeze si sa transmita catre Beneficiar un material video de tip UGC (User Generated Content) pentru promovarea produselor si/sau serviciilor comercializate de Plantica BioLabs.</p>
              </div>

              <div>
                <h4 className="font-black text-gray-900 mb-2">2. Livrarea materialului</h4>
                <p>Creatorul va transmite materialul video final in format digital, conform instructiunilor comunicate. Prin transmiterea materialului, Creatorul confirma ca acesta este original si ca detine toate drepturile necesare asupra continutului realizat.</p>
              </div>

              <div>
                <h4 className="font-black text-gray-900 mb-2">3. Dreptul de utilizare</h4>
                <p>Creatorul isi exprima acordul ca materialul transmis sa fie utilizat timp de 12 luni pe website-uri, Facebook, Instagram, TikTok, YouTube, alte canale oficiale si in campanii Meta Ads, TikTok Ads, Google Ads si platforme similare. Sunt permise editari tehnice sau de marketing, inclusiv decupare, redimensionare, subtitrari, texte, elemente grafice sau muzica.</p>
              </div>

              <div>
                <h4 className="font-black text-gray-900 mb-2">4. Remuneratia</h4>
                <p>Beneficiarul va achita Creatorului suma de <strong className="text-indigo-700">{contract.amount_lei.toLocaleString('ro-RO')} LEI</strong>. Plata se va efectua in termen de <strong className="text-indigo-700">{contract.payment_days} zile</strong> de la acceptarea materialului. Plata include realizarea materialului si drepturile de utilizare acordate.</p>
              </div>

              <div>
                <h4 className="font-black text-gray-900 mb-2">5. Declaratiile Creatorului</h4>
                <p>Creatorul garanteaza ca materialul este realizat de acesta, nu incalca drepturile unor terte persoane, poate fi utilizat conform prezentului acord si nu va solicita plati suplimentare pentru perioada de 12 luni.</p>
              </div>

              <div>
                <h4 className="font-black text-gray-900 mb-2">6. Dispozitii finale</h4>
                <p>Prezentul acord intra in vigoare la data semnarii. Orice modificare este valabila doar in forma scrisa. Prin semnare, Partile confirma ca au citit, inteles si acceptat toate prevederile acordului.</p>
              </div>

            </div>

            {/* Signature preview area - Beneficiar */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Beneficiar</p>
                  <p className="font-black text-gray-900">addfame.ro</p>
                  <div className="mt-4 border-b border-gray-300 pb-1">
                    <p className="text-xs text-gray-400">Semnatura</p>
                  </div>
                  <div className="mt-3 border-b border-gray-300 pb-1">
                    <p className="text-xs text-gray-400">Data: {today}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Creator</p>
                  <p className="font-black text-gray-900">{contract.influencer_name}</p>
                  <div className="mt-4 border-b border-gray-300 pb-1">
                    <p className="text-xs text-gray-400">Semnatura (completati mai jos)</p>
                  </div>
                  <div className="mt-3 border-b border-gray-300 pb-1">
                    <p className="text-xs text-gray-400">Data: {today}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Signing section */}
        <form onSubmit={handleSign}>
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                <PenLine className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-black text-gray-900">Completează și semnează</h3>
                <p className="text-xs text-gray-400">Verifică datele tale înainte de semnare</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Editable fields */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Nume complet *</label>
                  <input required value={name} onChange={e => setName(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Email *</label>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Telefon</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Adresă</label>
                  <input value={address} onChange={e => setAddress(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                </div>
              </div>

              {/* Signature canvas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-wider">Semnătură desenată</label>
                  {hasSignature && (
                    <button type="button" onClick={clearCanvas} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition">
                      <RotateCcw className="w-3 h-3" /> Șterge
                    </button>
                  )}
                </div>
                <div className="border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden bg-gray-50 relative hover:border-indigo-300 transition">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={160}
                    className="w-full cursor-crosshair touch-none"
                    style={{ height: 160 }}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                  />
                  {!hasSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-gray-300 text-sm font-semibold">Desenează semnătura aici</p>
                    </div>
                  )}
                </div>
              </div>

              {/* OR typed name */}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">
                  sau Semnătură electronică (tastează numele complet)
                </label>
                <input
                  value={signatureName}
                  onChange={e => setSignatureName(e.target.value)}
                  placeholder="ex. Maria Ionescu"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  style={{ fontFamily: 'cursive', fontSize: 18, color: '#1e293b' }}
                />
              </div>

              {/* Agreement */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-md border-2 transition flex items-center justify-center ${agreed ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 group-hover:border-indigo-400'}`}>
                    {agreed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                </div>
                <span className="text-sm text-gray-600 leading-relaxed">
                  Am citit, înțeles și sunt de acord cu toate clauzele prezentului Acord de Colaborare UGC. Înțeleg că semnătura mea electronică are valoare juridică conform legii.
                </span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={signing || !agreed}
            className="w-full py-4 rounded-2xl text-white font-black text-base transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 8px 28px rgba(99,102,241,0.35)' }}
          >
            {signing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Se procesează...
              </span>
            ) : (
              '✍️ Semnează și trimite contractul'
            )}
          </button>

          <p className="text-center text-xs text-gray-400 mt-4">
            Prin semnare, accepti termenii contractului. Semnătura electronică este securizată și înregistrată conform Legii 455/2001.
          </p>
        </form>
      </div>
    </div>
  )
}
