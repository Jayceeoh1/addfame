'use client'
// @ts-nocheck

import { useState } from 'react'
import { Star } from 'lucide-react'

type Props = {
  collaborationId: string
  reviewerRole: 'brand' | 'influencer'
  targetName: string
  existingReview?: { rating: number; comment: string } | null
  onSaved?: () => void
}

export function LeaveReview({ collaborationId, reviewerRole, targetName, existingReview, onSaved }: Props) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState(existingReview?.comment ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(!!existingReview)
  const [error, setError] = useState<string | null>(null)

  if (saved) return (
    <div className="p-4 bg-green-50 rounded-2xl border border-green-200">
      <p className="text-xs font-black text-green-600 mb-2">✅ Review trimis</p>
      <div className="flex gap-0.5 mb-1">
        {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-4 h-4 ${s <= (existingReview?.rating ?? rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />)}
      </div>
      {(existingReview?.comment || comment) && (
        <p className="text-sm text-gray-600 italic">"{existingReview?.comment || comment}"</p>
      )}
    </div>
  )

  async function submit() {
    if (!rating) { setError('Selectează un rating'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/reviews/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collaboration_id: collaborationId,
          reviewer_role: reviewerRole,
          rating,
          comment: comment.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Eroare la salvare')
        setSaving(false)
        return
      }
      setSaved(true)
      onSaved?.()
    } catch (e: any) {
      setError(e.message || 'Eroare')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 rounded-2xl border-2 border-gray-100 bg-gray-50 space-y-3">
      <p className="text-xs font-black text-gray-600 uppercase tracking-wider">
        Rate your experience with {targetName}
      </p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(s => (
          <button key={s} type="button"
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            onClick={() => { setRating(s); setError(null) }}>
            <Star className={`w-7 h-7 transition-colors ${s <= (hover || rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm font-black text-amber-500 self-center">
            {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
          </span>
        )}
      </div>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Share your experience (optional)…"
        rows={2}
        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-300 transition resize-none bg-white"
        style={{ fontFamily: 'inherit' }}
      />
      {error && <p className="text-xs text-red-600 font-bold">{error}</p>}
      <button
        onClick={submit}
        disabled={saving || !rating}
        className="w-full py-2.5 rounded-xl font-black text-sm text-white disabled:opacity-40 transition"
        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
      >
        {saving ? 'Se salvează…' : '⭐ Submit Review'}
      </button>
    </div>
  )
}

export function StarRating({ rating, count }: { rating: number; count?: number }) {
  if (!rating) return null
  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
        ))}
      </div>
      <span className="text-xs font-bold text-gray-500">
        {rating.toFixed(1)}{count ? ` (${count})` : ''}
      </span>
    </div>
  )
}
