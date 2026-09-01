'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle, PenLine, RotateCcw } from 'lucide-react'

type Contract = {
  id: string
  token: string
  contract_number?: string
  influencer_name: string
  influencer_email: string
  influencer_phone?: string
  influencer_cnp?: string
  influencer_ci_serie?: string
  influencer_ci_numar?: string
  influencer_address?: string
  campaign_title?: string
  product_name?: string
  product_value_lei?: number
  brand_name?: string
  brand_cui?: string
  brand_reg_com?: string
  brand_address?: string
  brand_website?: string
  status: string
  signed_at?: string
}

export default function ContractCesiunePage() {
  const params = useParams()
  const token = params?.token as string
  const router = useRouter()

  useEffect(() => {
    const originalPush = router.push.bind(router)
    const originalReplace = router.replace.bind(router)
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
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [cnp, setCnp] = useState('')
  const [ciSerie, setCiSerie] = useState('')
  const [ciNumar, setCiNumar] = useState('')
  const [address, setAddress] = useState('')
  const [signatureName, setSignatureName] = useState('')
  const [signatureImage, setSignatureImage] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/cesiune-contracts/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setContract(d.contract)
        setName(d.contract.influencer_name || '')
        setEmail(d.contract.influencer_email || '')
        setPhone(d.contract.influencer_phone || '')
        setCnp(d.contract.influencer_cnp || '')
        setCiSerie(d.contract.influencer_ci_serie || '')
        setCiNumar(d.contract.influencer_ci_numar || '')
        setAddress(d.contract.influencer_address || '')
        if (d.contract.status === 'signed') { setSigned(true); setSignedAt(d.contract.signed_at || '') }
      })
      .catch(() => setError('Eroare la încărcarea contractului'))
      .finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [contract])

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current; if (!canvas) return
    e.preventDefault(); setIsDrawing(true)
    const ctx = canvas.getContext('2d')!
    const { x, y } = getPos(e, canvas)
    ctx.beginPath(); ctx.moveTo(x, y)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return
    const canvas = canvasRef.current; if (!canvas) return
    e.preventDefault()
    const ctx = canvas.getContext('2d')!
    const { x, y } = getPos(e, canvas)
    ctx.lineTo(x, y); ctx.stroke()
  }

  function endDraw() {
    setIsDrawing(false)
    const canvas = canvasRef.current; if (!canvas) return
    setSignatureImage(canvas.toDataURL('image/png'))
  }

  function clearCanvas() {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
    setSignatureImage(null)
  }

  async function handleSign(e: React.FormEvent) {
    e.preventDefault()
    if (!signatureImage && !signatureName.trim()) { alert('Te rugăm să semnezi sau să introduci numele complet.'); return }
    setSigning(true)
    try {
      const res = await fetch(`/api/cesiune-contracts/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature_image: signatureImage,
          signature_name: signatureName.trim() || name,
          influencer_name: name,
          influencer_email: email,
          influencer_phone: phone,
          influencer_cnp: cnp,
          influencer_ci_serie: ciSerie,
          influencer_ci_numar: ciNumar,
          influencer_address: address,
        }),
      })
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      setSigned(true); setSignedAt(data.signed_at)
    } finally { setSigning(false) }
  }

  const today = new Date().toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })
  const fmt = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100'
  const labelCls = 'block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5'

  if (loading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
  if (error) return <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4"><div className="bg-white rounded-3xl p-10 text-center max-w-sm shadow-xl"><div className="text-4xl mb-4">⚠️</div><h2 className="font-black text-gray-900 text-xl mb-2">Contract negăsit</h2><p className="text-gray-400 text-sm">{error}</p></div></div>

  if (signed) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-10 text-center max-w-md shadow-xl">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5"><CheckCircle className="w-9 h-9 text-green-500" /></div>
        <h2 className="font-black text-gray-900 text-2xl mb-2">Contract semnat!</h2>
        <p className="text-gray-400 text-sm mb-1">Semnat de <strong className="text-gray-700">{contract?.influencer_name}</strong></p>
        {signedAt && <p className="text-gray-400 text-sm">La data: <strong className="text-gray-700">{fmt(signedAt)}</strong></p>}
        <div className="mt-6 p-4 bg-green-50 rounded-2xl border border-green-200">
          <p className="text-green-700 text-sm font-semibold">Contractul tău a fost înregistrat. Echipa AddFame te va contacta în curând.</p>
        </div>
        <a href={`/api/cesiune-contracts/${token}/pdf`} target="_blank"
          className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-black hover:opacity-90 transition"
          style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
          📄 Descarcă copia contractului
        </a>
      </div>
    </div>
  )

  if (!contract) return null

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#f1f5f9', minHeight: '100vh' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>
      <div className="max-w-3xl mx-auto px-4 py-10">

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
              <img src="/logo.png" alt="AddFame" className="w-6 h-6 object-contain" />
            </div>
            <span className="font-black text-xl">Add<span className="text-orange-500">Fame</span></span>
          </div>
          <h1 className="text-2xl font-black text-gray-900">Contract de Cesiune a Drepturilor de Autor</h1>
          <p className="text-sm text-gray-400 mt-1">Citește cu atenție înainte de a semna</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
            <span className="text-white text-sm font-black">Document confidențial</span>
            <span className="text-orange-100 text-xs">addfame.ro</span>
          </div>

          <div className="p-8">
            <div className="text-center mb-8 pb-6 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-900 mb-1">CONTRACT DE CESIUNE A DREPTURILOR DE AUTOR</h2>
              <p className="text-sm text-gray-400">Nr. {contract.contract_number || '—'} · Încheiat la data de: {today}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="rounded-2xl p-5 border" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
                <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: '#f97316' }}>Beneficiar – Cesionar</p>
                <p className="font-black text-gray-900">ADD FAME DIGITAL S.R.L.</p>
                <p className="text-sm text-gray-500 mt-1">CUI 54992560 · J2026040984009</p>
                <p className="text-sm text-gray-500">Mun. Pitești, Jud. Argeș, Bd. Nicolae Bălcescu, Bl. C5, Sc. B, Et. 2, Ap. 9</p>
                <p className="text-sm text-gray-500">prin Stancu Marius Ciprian, Administrator</p>
              </div>
              <div className="rounded-2xl p-5 border" style={{ background: '#fdf4ff', borderColor: '#e9d5ff' }}>
                <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: '#a855f8' }}>Autor – Cedent</p>
                <p className="font-black text-gray-900">{contract.influencer_name}</p>
                <p className="text-sm text-gray-500 mt-1">{contract.influencer_email}</p>
                {contract.influencer_phone && <p className="text-sm text-gray-500">{contract.influencer_phone}</p>}
                <p className="text-xs text-gray-400 mt-1">Datele complete se completează mai jos</p>
              </div>
            </div>

            {contract.brand_name && (
              <div className="mb-6 p-5 rounded-2xl border border-gray-100 bg-gray-50">
                <p className="text-xs font-black uppercase tracking-wider mb-2 text-gray-400">Brand partener (advertiser)</p>
                <p className="text-sm text-gray-700 font-bold">{contract.brand_name}</p>
                <p className="text-sm text-gray-500">
                  {[contract.brand_cui && `CUI ${contract.brand_cui}`, contract.brand_reg_com, contract.brand_address].filter(Boolean).join(' · ')}
                </p>
              </div>
            )}

            {(contract.campaign_title || contract.product_name) && (
              <div className="mb-8 p-5 rounded-2xl border border-gray-100 bg-gray-50">
                <p className="text-xs font-black uppercase tracking-wider mb-2 text-gray-400">Detalii campanie</p>
                {contract.campaign_title && <p className="text-sm text-gray-700 mb-1"><strong>Campanie:</strong> {contract.campaign_title}</p>}
                {contract.product_name && <p className="text-sm text-gray-700"><strong>Produs (remunerație în natură):</strong> {contract.product_name}</p>}
              </div>
            )}

            <div className="space-y-5 text-sm text-gray-700 leading-relaxed">
              <div><h4 className="font-black text-gray-900 mb-2">Art. 1 — Cedentul și Cesionarul</h4><p>Prezentul contract se încheie între Autorul-Cedent (creatorul de conținut identificat mai sus și prin datele completate la semnare) și ADD FAME DIGITAL S.R.L., în calitate de Beneficiar-Cesionar.</p></div>
              <div><h4 className="font-black text-gray-900 mb-2">Art. 2 — Obiectul contractului</h4><p>Autorul creează o operă audio-vizuală (Înregistrarea) constând în prezentarea, desigilarea, examinarea și utilizarea produsului furnizat de Beneficiar, direct sau prin brandul partener, și cedează Beneficiarului drepturile patrimoniale asupra acesteia (reproducere, distribuire, comunicare publică, opere derivate, retransmisie), în schimbul produsului primit cu titlu de remunerație.</p></div>
              <div><h4 className="font-black text-gray-900 mb-2">Art. 3 — Modalități de exploatare</h4><p>Beneficiarul difuzează și utilizează Înregistrarea în scop publicitar, inclusiv în campanii de <strong className="text-orange-600">publicitate plătită (ads)</strong> pe Meta (Facebook, Instagram), TikTok, YouTube și Google. Brandul partener al campaniei va utiliza Înregistrarea în scop publicitar, Beneficiarul putând pune Înregistrarea la dispoziția sa în acest scop.</p></div>
              <div><h4 className="font-black text-gray-900 mb-2">Art. 4 — Teritorialitatea</h4><p>Beneficiarul poate reproduce Înregistrarea în orice limbă și în orice teritoriu, cu respectarea legislației relevante.</p></div>
              <div><h4 className="font-black text-gray-900 mb-2">Art. 5 — Exclusivitatea</h4><p>Cesiunea drepturilor prevăzute în prezentul contract este <strong>exclusivă</strong>.</p></div>
              <div><h4 className="font-black text-gray-900 mb-2">Art. 6 — Remunerația Autorului</h4><p>Remunerația este în natură — produsul furnizat de Beneficiar anterior semnării. Valoarea este prețul de vânzare al produsului din avizul/factura care l-a însoțit. Autorul confirmă primirea produsului și că acesta reprezintă echivalentul integral și suficient al drepturilor cedate. Eventualele obligații fiscale aferente vor fi îndeplinite conform legii aplicabile.</p></div>
              <div><h4 className="font-black text-gray-900 mb-2">Art. 7 — Durata cesiunii</h4><p>Autorul cedează drepturile pe o durată de <strong className="text-orange-600">6 luni</strong>, începând cu data semnării.</p></div>
              <div><h4 className="font-black text-gray-900 mb-2">Art. 8 — Modificarea contractului</h4><p>Contractul poate fi modificat cu acordul ambelor Părți, prin act adițional.</p></div>
              <div><h4 className="font-black text-gray-900 mb-2">Art. 9 — Încetarea contractului</h4><p>Contractul încetează la împlinirea duratei sau prin acordul scris al Părților. Niciuna dintre Părți nu poate denunța sau rezilia unilateral contractul.</p></div>
              <div><h4 className="font-black text-gray-900 mb-2">Art. 10 — Garanții și clauze finale</h4><p>Autorul garantează că Înregistrarea este o operă originală, că este unicul titular al drepturilor cedate și că acestea sunt libere de sarcini. Cesiunea acoperă toate modalitățile de exploatare prevăzute de Legea nr. 8/1996, inclusiv transformarea, adaptarea și crearea de opere derivate. Autorul nu va împiedica utilizarea Înregistrării și nu va solicita retragerea ei din circulație după publicare.</p></div>
              <div><h4 className="font-black text-gray-900 mb-2">Art. 11 — Notificări între părți</h4><p>Orice notificare este valabil îndeplinită dacă este transmisă la adresa/sediul din partea introductivă a contractului.</p></div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSign}>
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#fff7ed' }}>
                <PenLine className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <h3 className="font-black text-gray-900">Completează și semnează</h3>
                <p className="text-xs text-gray-400">Datele de identificare sunt necesare pentru validitatea contractului</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nume complet *</label>
                  <input required value={name} onChange={e => setName(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Email *</label>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Telefon</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>CNP *</label>
                  <input required value={cnp} onChange={e => setCnp(e.target.value)} className={inputCls} placeholder="1234567890123" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>C.I. seria</label>
                    <input value={ciSerie} onChange={e => setCiSerie(e.target.value)} className={inputCls} placeholder="XX" />
                  </div>
                  <div>
                    <label className={labelCls}>C.I. nr.</label>
                    <input value={ciNumar} onChange={e => setCiNumar(e.target.value)} className={inputCls} placeholder="123456" />
                  </div>
                </div>
              </div>
              <div>
                <label className={labelCls}>Domiciliu complet *</label>
                <input required value={address} onChange={e => setAddress(e.target.value)} className={inputCls} placeholder="Localitate, județ, stradă, nr., bl., sc., et., ap." />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls}>Semnătură desenată</label>
                  <button type="button" onClick={clearCanvas} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition">
                    <RotateCcw className="w-3 h-3" /> Șterge
                  </button>
                </div>
                <div className="border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden" style={{ touchAction: 'none' }}>
                  <canvas ref={canvasRef} width={640} height={160} className="w-full cursor-crosshair" style={{ display: 'block' }}
                    onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                    onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
                </div>
                <p className="text-xs text-gray-400 mt-2 mb-1">Sau semnează tastând numele complet:</p>
                <input value={signatureName} onChange={e => setSignatureName(e.target.value)} placeholder="ex. Maria Ionescu"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                  style={{ fontFamily: 'cursive', fontSize: '18px' }} />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" required className="mt-0.5 w-4 h-4 rounded accent-orange-500" />
                <span className="text-xs text-gray-500 leading-relaxed">
                  Am citit și sunt de acord cu toate clauzele prezentului Contract de Cesiune a Drepturilor de Autor. Confirm primirea produsului cu titlu de remunerație în natură și înțeleg că semnătura electronică are valoare juridică conform legislației române.
                </span>
              </label>
            </div>
          </div>

          <button type="submit" disabled={signing}
            className="w-full py-4 rounded-2xl font-black text-white text-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', boxShadow: '0 4px 20px rgba(249,115,22,0.35)' }}>
            {signing
              ? <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Se procesează...</>
              : <><PenLine className="w-5 h-5" /> Semnează și trimite contractul</>}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Prin semnare, confirmați că ați citit și acceptați toate clauzele contractului. Semnătura electronică este valabilă conform legislației române.
        </p>
      </div>
    </div>
  )
}
