'use client'
// @ts-nocheck
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FileText, CheckCircle, Clock, ArrowLeft, PenLine, Shield } from 'lucide-react'
import Link from 'next/link'

export default function BrandContractPage() {
  const { id } = useParams()
  const router = useRouter()
  const [contract, setContract] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [signatureName, setSignatureName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signed, setSigned] = useState(false)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }

      // Fetch brand name for signature
      const { data: brand } = await sb.from('brands').select('name').eq('user_id', user.id).single()
      if (brand) setSignatureName(brand.name)

      const res = await fetch(`/api/contracts/${id}`)
      if (res.ok) {
        const data = await res.json()
        setContract(data)
        if (data.brand_signed_at) setSigned(true)
      }
      setLoading(false)
    }
    load()
  }, [id, router])

  async function handleSign() {
    if (!agreed || !signatureName.trim()) {
      setError('Bifează acordul și introdu numele complet.')
      return
    }
    setSigning(true)
    setError(null)
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sign_brand',
          collaboration_id: contract?.collaboration_id,
          signature_name: signatureName.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error || 'Eroare'); return }
      setSigned(true)
      setContract(prev => ({ ...prev, brand_signed_at: new Date().toISOString(), brand_signature_name: signatureName }))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSigning(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!contract) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="font-black text-gray-700 text-lg mb-2">Contract negăsit</p>
        <Link href="/brand/collaborations" className="text-orange-500 font-bold text-sm">← Înapoi la colaborări</Link>
      </div>
    </div>
  )

  const fullySigned = contract.brand_signed_at && contract.influencer_signed_at

  return (
    <div className="min-h-screen bg-gray-50 pb-20" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 px-5 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/brand/collaborations" className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div className="flex-1">
            <p className="font-black text-gray-900">Contract colaborare</p>
            <p className="text-xs text-gray-400">{contract.campaign_title}</p>
          </div>
          {fullySigned && (
            <span className="flex items-center gap-1.5 text-xs font-black text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
              <CheckCircle className="w-3.5 h-3.5" /> Semnat de ambele părți
            </span>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 pt-6 space-y-5">

        {/* Status semnături */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4">Status semnături</p>
          <div className="grid grid-cols-2 gap-4">
            <div className={`rounded-xl p-4 border-2 ${contract.brand_signed_at ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                {contract.brand_signed_at
                  ? <CheckCircle className="w-4 h-4 text-green-500" />
                  : <Clock className="w-4 h-4 text-gray-400" />}
                <p className="text-xs font-black text-gray-700">Brand</p>
              </div>
              {contract.brand_signed_at ? (
                <>
                  <p className="text-xs font-bold text-green-700">{contract.brand_signature_name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{new Date(contract.brand_signed_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </>
              ) : (
                <p className="text-xs text-gray-400">Nesemnat</p>
              )}
            </div>
            <div className={`rounded-xl p-4 border-2 ${contract.influencer_signed_at ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                {contract.influencer_signed_at
                  ? <CheckCircle className="w-4 h-4 text-green-500" />
                  : <Clock className="w-4 h-4 text-gray-400" />}
                <p className="text-xs font-black text-gray-700">Influencer</p>
              </div>
              {contract.influencer_signed_at ? (
                <>
                  <p className="text-xs font-bold text-green-700">{contract.influencer_signature_name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{new Date(contract.influencer_signed_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </>
              ) : (
                <p className="text-xs text-gray-400">Nesemnat</p>
              )}
            </div>
          </div>
        </div>

        {/* Contract text */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-gray-400" />
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Conținut contract</p>
          </div>
          <pre className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-sans">{contract.contract_text}</pre>
        </div>

        {/* Semnează */}
        {!signed ? (
          <div className="bg-white rounded-2xl border-2 border-orange-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <PenLine className="w-4 h-4 text-orange-500" />
              <p className="font-black text-gray-900">Semnează contractul</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1.5">Nume complet (semnătură)</label>
                <input
                  value={signatureName}
                  onChange={e => setSignatureName(e.target.value)}
                  placeholder="Numele tău complet sau al companiei"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-orange-400 transition"
                />
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-orange-500"
                />
                <span className="text-sm text-gray-600">
                  Am citit și sunt de acord cu termenii contractului de mai sus. Înțeleg că această semnătură electronică are valoare juridică.
                </span>
              </label>
              {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
              <button
                onClick={handleSign}
                disabled={signing || !agreed || !signatureName.trim()}
                className="w-full py-3.5 rounded-2xl font-black text-sm text-white disabled:opacity-50 transition flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', boxShadow: '0 4px 14px rgba(249,115,22,0.3)' }}
              >
                {signing
                  ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Se procesează…</>
                  : <><PenLine className="w-4 h-4" /> Semnează contractul</>
                }
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="font-black text-green-800">Ai semnat contractul!</p>
              <p className="text-sm text-green-600 mt-0.5">
                {contract.influencer_signed_at
                  ? 'Ambele semnături au fost primite. Colaborarea e activă!'
                  : 'Așteptăm semnătura influencerului pentru a activa colaborarea.'}
              </p>
            </div>
          </div>
        )}

        {/* Security note */}
        <div className="flex items-center gap-2 text-xs text-gray-400 justify-center pb-4">
          <Shield className="w-3.5 h-3.5" />
          Semnătură electronică conform Legii nr. 455/2001 · Securizat de AddFame
        </div>
      </div>
    </div>
  )
}
