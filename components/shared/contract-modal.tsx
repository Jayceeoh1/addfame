'use client'
// @ts-nocheck

import { useState } from 'react'
import { FileText, X, CheckCircle, AlertCircle, PenLine, Shield, Clock } from 'lucide-react'

type ContractStatus = 'pending_brand' | 'pending_influencer' | 'fully_signed' | null

type Props = {
  contract: {
    id: string
    contract_text: string
    status: ContractStatus
    brand_signed_at?: string
    influencer_signed_at?: string
    brand_signature_name?: string
    influencer_signature_name?: string
    campaign_title: string
    amount: number
    deadline?: string
  } | null
  collaborationId: string
  role: 'brand' | 'influencer'
  userName: string
  onSigned?: () => void
  onClose: () => void
}

export function ContractModal({ contract, collaborationId, role, userName, onSigned, onClose }: Props) {
  const [signatureName, setSignatureName] = useState(userName || '')
  const [agreed, setAgreed] = useState(false)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signed, setSigned] = useState(false)

  if (!contract) return null

  const isSigned = role === 'brand' ? !!contract.brand_signed_at : !!contract.influencer_signed_at
  const otherSigned = role === 'brand' ? !!contract.influencer_signed_at : !!contract.brand_signed_at
  const fullySigned = contract.status === 'fully_signed'

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
          action: role === 'brand' ? 'sign_brand' : 'sign_influencer',
          collaboration_id: collaborationId,
          signature_name: signatureName.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error || 'Eroare'); return }
      setSigned(true)
      onSigned?.()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSigning(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-black text-gray-900">Contract de colaborare</h2>
              <p className="text-xs text-gray-400">{contract.campaign_title} · €{contract.amount?.toFixed(2)}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-3 px-6 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
          <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${contract.brand_signed_at ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {contract.brand_signed_at ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            Brand {contract.brand_signed_at ? `semnat (${contract.brand_signature_name})` : 'nesemnat'}
          </div>
          <div className="w-8 h-px bg-gray-300" />
          <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${contract.influencer_signed_at ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {contract.influencer_signed_at ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            Influencer {contract.influencer_signed_at ? `semnat (${contract.influencer_signature_name})` : 'nesemnat'}
          </div>
          {fullySigned && (
            <div className="ml-auto flex items-center gap-1.5 text-xs font-black text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
              <CheckCircle className="w-3 h-3" /> Contract activ
            </div>
          )}
        </div>

        {/* Contract text */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <pre className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed font-mono bg-gray-50 rounded-xl p-4 border border-gray-100">
            {contract.contract_text}
          </pre>
        </div>

        {/* Sign section */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          {signed || (isSigned && !fullySigned) ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="font-black text-green-700">Ai semnat contractul!</p>
              <p className="text-sm text-green-600 mt-1">
                {otherSigned || (signed && contract.brand_signed_at)
                  ? 'Ambele semnături primite — colaborarea e activă! 🚀'
                  : `Se așteaptă semnătura ${role === 'brand' ? 'influencerului' : 'brandului'}.`
                }
              </p>
            </div>
          ) : fullySigned ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="font-black text-green-700">Contract semnat de ambele părți ✅</p>
              <p className="text-sm text-green-600 mt-1">Colaborarea este activă.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-black text-gray-500 mb-1.5 uppercase tracking-wide">
                  Semnează cu numele complet
                </label>
                <input
                  type="text"
                  value={signatureName}
                  onChange={e => setSignatureName(e.target.value)}
                  placeholder="Introdu numele complet exact"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 transition"
                  style={{ fontFamily: 'inherit' }}
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-indigo-600 flex-shrink-0" />
                <span className="text-xs text-gray-600 leading-relaxed">
                  Am citit și sunt de acord cu termenii contractului de mai sus. Înțeleg că această semnătură electronică are valoare juridică conform <strong>Legii nr. 455/2001</strong>.
                </span>
              </label>

              {error && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-xl p-3">
                <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                Semnătura ta electronică include: numele introdus, timestamp și adresa IP — valabilă legal în România.
              </div>

              <button onClick={handleSign} disabled={signing || !agreed || !signatureName.trim()}
                className="w-full py-3 rounded-xl font-black text-sm text-white disabled:opacity-40 transition flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                {signing
                  ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Se semnează…</>
                  : <><PenLine className="w-4 h-4" /> Semnează contractul</>
                }
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
