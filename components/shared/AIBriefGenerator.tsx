'use client'

import { useState } from 'react'
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface BriefGeneratorProps {
  offerName: string
  offerValue: string
  offerDescription: string
  platforms: string[]
  campaignType: string
  onApply: (brief: {
    story_instructions?: string
    required_hashtags?: string
    required_caption?: string
    key_messages?: string[]
    forbidden_content?: string
    content_tone?: string[]
  }) => void
}

export function AIBriefGenerator({
  offerName, offerValue, offerDescription, platforms, campaignType, onApply
}: BriefGeneratorProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(true)

  async function generate() {
    if (!offerName.trim()) {
      setError('Completează mai întâi numele produsului/ofertei.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'brief',
          data: { offer_name: offerName, offer_value: offerValue, offer_description: offerDescription, platforms, campaign_type: campaignType }
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data.brief)
      setExpanded(true)
    } catch (e: any) {
      setError(e.message || 'Eroare la generarea brief-ului.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border-2 border-purple-200 bg-purple-50/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-black text-purple-800">Brief Generator AI</p>
            <p className="text-[11px] text-purple-500">Generează automat instrucțiunile pentru influenceri</p>
          </div>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-white disabled:opacity-60 transition hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}
        >
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Se generează...</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" /> ✨ Generează cu AI</>
          )}
        </button>
      </div>

      {error && (
        <div className="mx-4 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-bold">
          {error}
        </div>
      )}

      {result && (
        <div className="border-t border-purple-200">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-black text-purple-700 hover:bg-purple-100/50 transition"
          >
            <span>✅ Brief generat — {expanded ? 'ascunde' : 'arată'} previzualizare</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expanded && (
            <div className="px-4 pb-4 space-y-3">
              {result.story_instructions && (
                <div className="bg-white rounded-xl p-3 border border-purple-100">
                  <p className="text-[10px] font-black text-purple-500 uppercase tracking-wider mb-1">Instrucțiuni postare</p>
                  <p className="text-xs text-gray-700 leading-relaxed">{result.story_instructions}</p>
                </div>
              )}
              {result.required_hashtags && (
                <div className="bg-white rounded-xl p-3 border border-purple-100">
                  <p className="text-[10px] font-black text-purple-500 uppercase tracking-wider mb-1">Hashtag-uri</p>
                  <p className="text-xs text-purple-700 font-bold">{result.required_hashtags}</p>
                </div>
              )}
              {result.required_caption && (
                <div className="bg-white rounded-xl p-3 border border-purple-100">
                  <p className="text-[10px] font-black text-purple-500 uppercase tracking-wider mb-1">Caption model</p>
                  <p className="text-xs text-gray-700 italic">"{result.required_caption}"</p>
                </div>
              )}
              {result.key_messages && result.key_messages.length > 0 && (
                <div className="bg-white rounded-xl p-3 border border-purple-100">
                  <p className="text-[10px] font-black text-purple-500 uppercase tracking-wider mb-1.5">Mesaje cheie</p>
                  <div className="space-y-1">
                    {result.key_messages.map((m: string, i: number) => (
                      <p key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                        <span className="text-purple-400 flex-shrink-0">•</span>{m}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {result.forbidden_content && (
                <div className="bg-white rounded-xl p-3 border border-red-100">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-wider mb-1">⚠️ De evitat</p>
                  <p className="text-xs text-gray-700">{result.forbidden_content}</p>
                </div>
              )}

              <button
                onClick={() => onApply(result)}
                className="w-full py-2.5 rounded-xl font-black text-sm text-white transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}
              >
                ✅ Aplică brief-ul în campanie
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
