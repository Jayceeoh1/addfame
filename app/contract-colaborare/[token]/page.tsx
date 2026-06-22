'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle, PenLine, RotateCcw } from 'lucide-react'

type Contract = {
  id: string
  token: string
  influencer_name: string
  influencer_email: string
  influencer_phone?: string
  influencer_address?: string
  amount_lei: number
  payment_days: number
  campaign_title?: string
  platform?: string
  deliverables?: string
  status: string
  signed_at?: string
}

export default function ContractColaborarePage() {
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
  const [address, setAddress] = useState('')
  const [signatureName, setSignatureName] = useState('')
  const [signatureImage, setSignatureImage] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/colaborare-contracts/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setContract(d.contract)
        setName(d.contract.influencer_name || '')
        setEmail(d.contract.influencer_email || '')
        setPhone(d.contract.influencer_phone || '')
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
      const res = await fetch(`/api/colaborare-contracts/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature_image: signatureImage, signature_name: signatureName.trim() || name, influencer_name: name, influencer_email: email, influencer_phone: phone, influencer_address: address }),
      })
      const data = await res.json()
      if (data.error) { alert(data.error); return }
      setSigned(true); setSignedAt(data.signed_at)
    } finally { setSigning(false) }
  }

  const today = new Date().toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })
  const fmt = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

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
        <a href={`/api/colaborare-contracts/${token}/pdf`} target="_blank"
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
          <h1 className="text-2xl font-black text-gray-900">Contract de Colaborare</h1>
          <p className="text-sm text-gray-400 mt-1">Citește cu atenție înainte de a semna</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
            <span className="text-white text-sm font-black">Document confidențial</span>
            <span className="text-orange-100 text-xs">addfame.ro</span>
          </div>

          <div className="p-8">
            <div className="text-center mb-8 pb-6 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-900 mb-1">CONTRACT DE COLABORARE</h2>
              <p className="text-sm text-gray-400">Încheiat la data de: {today}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="rounded-2xl p-5 border" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
                <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: '#f97316' }}>Beneficiar</p>
                <p className="font-black text-gray-900">AddFame Digital S.R.L.</p>
                <p className="text-sm text-gray-500 mt-1">addfame.ro</p>
                <p className="text-sm text-gray-500">contact@addfame.ro</p>
              </div>
              <div className="rounded-2xl p-5 border" style={{ background: '#fdf4ff', borderColor: '#e9d5ff' }}>
                <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: '#a855f8' }}>Creator / Influencer</p>
                <p className="font-black text-gray-900">{contract.influencer_name}</p>
                <p className="text-sm text-gray-500 mt-1">{contract.influencer_email}</p>
                {contract.influencer_phone && <p className="text-sm text-gray-500">{contract.influencer_phone}</p>}
              </div>
            </div>

            {(contract.campaign_title || contract.platform || contract.deliverables) && (
              <div className="mb-8 p-5 rounded-2xl border border-gray-100 bg-gray-50">
                <p className="text-xs font-black uppercase tracking-wider mb-3 text-gray-400">Detalii campanie</p>
                {contract.campaign_title && <p className="text-sm text-gray-700 mb-1"><strong>Campanie:</strong> {contract.campaign_title}</p>}
                {contract.platform && <p className="text-sm text-gray-700 mb-1"><strong>Platformă:</strong> {contract.platform}</p>}
                {contract.deliverables && <p className="text-sm text-gray-700"><strong>Livrabile:</strong> {contract.deliverables}</p>}
              </div>
            )}

            <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
              <div>
                <h4 className="font-black text-gray-900 mb-2">1. Obiectul contractului</h4>
                <p>Creatorul se obligă să creeze și să publice conținut promoțional (postări, stories, reels, videoclipuri sau alt format agreat) pe platformele de social media agreate, pentru promovarea produselor și/sau serviciilor indicate de AddFame Digital S.R.L., în conformitate cu brieful transmis.</p>
              </div>
              <div>
                <h4 className="font-black text-gray-900 mb-2">2. Livrabilele și termenele</h4>
                <p>Creatorul se obligă să livreze conținutul conform specificațiilor transmise de Beneficiar, în termenul agreat. Înainte de publicare, Creatorul va transmite spre aprobare materialele finale. Beneficiarul are dreptul de a solicita modificări rezonabile în limita a 2 runde de feedback.</p>
              </div>
              <div>
                <h4 className="font-black text-gray-900 mb-2">3. Drepturi de utilizare</h4>
                <p>Prin semnarea prezentului contract, Creatorul acordă Beneficiarului dreptul neexclusiv de a utiliza conținutul creat pentru o perioadă de <strong className="text-orange-600">12 luni</strong> de la data publicării, pe toate canalele digitale ale Beneficiarului, inclusiv website, Facebook, Instagram, TikTok, YouTube, Google Ads și Meta Ads. Sunt permise editări tehnice, decupare, redimensionare, adăugare de subtitrări, texte sau elemente grafice.</p>
              </div>
              <div>
                <h4 className="font-black text-gray-900 mb-2">4. Remunerația</h4>
                <p>Pentru serviciile prestate, Beneficiarul va achita Creatorului suma de <strong className="text-orange-600">{contract.amount_lei.toLocaleString('ro-RO')} LEI</strong>. Plata se va efectua în termen de <strong className="text-orange-600">{contract.payment_days} zile lucrătoare</strong> de la livrarea și aprobarea finală a conținutului, prin transfer bancar în contul indicat de Creator.</p>
              </div>
              <div>
                <h4 className="font-black text-gray-900 mb-2">5. Obligațiile Creatorului</h4>
                <p>Creatorul garantează că: (a) deține toate drepturile asupra conținutului creat; (b) conținutul nu încalcă drepturile unor terțe persoane; (c) va menționa colaborarea comercială conform reglementărilor în vigoare (#ad, #colaborareplătită); (d) nu va șterge postările agreate pe durata campaniei; (e) nu va publica conținut care afectează imaginea Beneficiarului.</p>
              </div>
              <div>
                <h4 className="font-black text-gray-900 mb-2">6. Confidențialitate</h4>
                <p>Ambele Părți se obligă să păstreze confidențialitatea termenilor financiari și a informațiilor comerciale schimbate, pe o perioadă de 2 ani de la data semnării.</p>
              </div>
              <div>
                <h4 className="font-black text-gray-900 mb-2">7. Dispoziții finale</h4>
                <p>Prezentul contract intră în vigoare la data semnării. Orice modificare este valabilă doar în formă scrisă. Legea aplicabilă este legea română. Prin semnare, Creatorul confirmă că a citit, înțeles și acceptat toate clauzele prezentului contract.</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Beneficiar</p>
                  <p className="font-black text-gray-900">AddFame Digital S.R.L.</p>
                  <div className="mt-4 border-b border-gray-300 pb-1"><p className="text-xs text-gray-400">Semnătură</p></div>
                  <div className="mt-3 border-b border-gray-300 pb-1"><p className="text-xs text-gray-400">Data: {today}</p></div>
                </div>
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Creator</p>
                  <p className="font-black text-gray-900">{contract.influencer_name}</p>
                  <div className="mt-4 border-b border-gray-300 pb-1"><p className="text-xs text-gray-400">Semnătură (completați mai jos)</p></div>
                  <div className="mt-3 border-b border-gray-300 pb-1"><p className="text-xs text-gray-400">Data: {today}</p></div>
                </div>
              </div>
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
                <p className="text-xs text-gray-400">Verifică datele tale înainte de semnare</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Nume complet *</label>
                  <input required value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Email *</label>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Telefon</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-1.5">Adresă</label>
                  <input value={address} onChange={e => setAddress(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wider">Semnătură desenată</label>
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
                  Am citit și sunt de acord cu toate clauzele prezentului Contract de Colaborare. Înțeleg că semnătura electronică are valoare juridică conform legislației române.
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
