'use client'

import { useState } from 'react'
import { Sparkles, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface Props {
  collaboration: {
    proof_link?: string
    proof_caption?: string
    required_hashtags?: string
    required_caption?: string
    story_instructions?: string
    campaigns?: { title?: string; brand_name?: string }
  }
}

export function AIProofAnalyzer({ collaboration }: Props) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  async function analyze() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'analyze_proof',
          data: {
            proof_link: collaboration.proof_link,
            proof_caption: collaboration.proof_caption,
            required_hashtags: collaboration.required_hashtags,
            required_caption: collaboration.required_caption,
            story_instructions: collaboration.story_instructions,
            brand_name: collaboration.campaigns?.brand_name,
          }
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data.analysis)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!collaboration.proof_link) return null

  return (
    <div className="mt-3">
      {!result ? (
        <button
          onClick={analyze}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black text-white disabled:opacity-60 transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}
        >
          {loading
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analizez cu AI...</>
            : <><Sparkles className="w-3.5 h-3.5" /> ✨ Analizează cu AI</>
          }
        </button>
      ) : (
        <div className="rounded-xl border-2 overflow-hidden" style={{ borderColor: result.approved ? '#bbf7d0' : '#fecaca' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2" style={{ background: result.approved ? '#f0fdf4' : '#fff5f5' }}>
            <div className="flex items-center gap-2">
              {result.recommendation === 'APROBĂ' ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : result.recommendation === 'RESPINGE' ? (
                <XCircle className="w-4 h-4 text-red-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
              <span className="text-xs font-black" style={{ color: result.approved ? '#15803d' : '#dc2626' }}>
                AI: {result.recommendation} • Score {result.score}/100
              </span>
            </div>
            <button onClick={() => setResult(null)} className="text-[10px] text-gray-400 hover:text-gray-600">✕</button>
          </div>

          {/* Checks */}
          <div className="px-3 py-2 space-y-1.5 bg-white">
            {Object.entries(result.checks || {}).map(([key, check]: [string, any]) => (
              <div key={key} className="flex items-start gap-2">
                <span className="text-xs mt-0.5">{check.ok ? '✅' : '❌'}</span>
                <div>
                  <span className="text-[10px] font-black text-gray-500 uppercase">{key === 'hashtags' ? 'Hashtag-uri' : key === 'brand_mention' ? 'Mențiune brand' : 'Caption'}: </span>
                  <span className="text-[11px] text-gray-600">{check.detail}</span>
                </div>
              </div>
            ))}
            <p className="text-[11px] text-gray-500 italic pt-1 border-t border-gray-100">{result.summary}</p>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-red-500 font-bold mt-1">{error}</p>}
    </div>
  )
}
