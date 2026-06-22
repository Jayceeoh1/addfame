'use client'
// @ts-nocheck

import { useState, useEffect } from 'react'
import { Star, CheckCircle, Edit2, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  collaborationId: string
  reviewerRole: 'brand' | 'influencer'
  targetName: string
  onSaved?: () => void
}

const LABELS = ['', 'Slab', 'Acceptabil', 'Bun', 'Foarte bun', 'Excelent']
const LABEL_COLOR = ['', 'text-red-500', 'text-orange-400', 'text-amber-500', 'text-green-500', 'text-emerald-600']

export function LeaveReview({ collaborationId, reviewerRole, targetName, onSaved }: Props) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch review existent la mount
  useEffect(() => {
    async function fetchExisting() {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { setLoading(false); return }

        const { data } = await sb
          .from('reviews')
          .select('rating, comment')
          .eq('collaboration_id', collaborationId)
          .eq('reviewer_id', user.id)
          .eq('reviewer_role', reviewerRole)
          .maybeSingle()

        if (data) {
          setRating(data.rating)
          setComment(data.comment || '')
          setSaved(true)
        }
      } catch (e) {
        // fail silently
      } finally {
        setLoading(false)
      }
    }
    fetchExisting()
  }, [collaborationId, reviewerRole])

  async function submit() {
    if (!rating) { setError('Selectează un rating mai întâi'); return }
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
        setError(data.error || 'Eroare la salvare. Încearcă din nou.')
        return
      }
      setSaved(true)
      setEditing(false)
      onSaved?.()
    } catch (e: any) {
      setError(e.message || 'Eroare de rețea')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 animate-pulse h-16" />
  )

  // View mode — review deja trimis
  if (saved && !editing) return (
    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-amber-500" />
          <p className="text-xs font-black text-amber-700 uppercase tracking-wider">
            Review trimis pentru {targetName}
          </p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 font-bold transition"
        >
          <Edit2 className="w-3 h-3" /> Editează
        </button>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(s => (
            <Star key={s} className={`w-5 h-5 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
          ))}
        </div>
        <span className={`text-sm font-black ${LABEL_COLOR[rating]}`}>{LABELS[rating]}</span>
      </div>
      {comment && (
        <p className="text-xs text-gray-600 italic mt-2 bg-white rounded-xl px-3 py-2 border border-amber-100">
          "{comment}"
        </p>
      )}
    </div>
  )

  // Edit/Create mode
  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-white overflow-hidden">
      <div className="bg-amber-50 px-4 py-3 flex items-center gap-2 border-b border-amber-100">
        <Star className="w-4 h-4 text-amber-500" />
        <p className="text-xs font-black text-amber-700 uppercase tracking-wider">
          {editing ? `Editează review-ul pentru ${targetName}` : `Lasă un review pentru ${targetName}`}
        </p>
      </div>

      <div className="p-4 space-y-3">
        {/* Stars */}
        <div>
          <p className="text-xs text-gray-400 font-semibold mb-2">Rating *</p>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                type="button"
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(0)}
                onClick={() => { setRating(s); setError(null) }}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <Star className={`w-8 h-8 transition-colors ${
                  s <= (hover || rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 hover:text-amber-200'
                }`} />
              </button>
            ))}
            {(hover || rating) > 0 && (
              <span className={`ml-1 text-sm font-black transition-all ${LABEL_COLOR[hover || rating]}`}>
                {LABELS[hover || rating]}
              </span>
            )}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label className="text-xs text-gray-400 font-semibold mb-1.5 block">
            Comentariu <span className="text-gray-300">(opțional)</span>
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={
              reviewerRole === 'influencer'
                ? 'Cum a fost experiența cu acest brand? Brief clar, comunicare rapidă...'
                : 'Cum a fost colaborarea cu acest influencer? Profesionalism, calitatea postului...'
            }
            rows={3}
            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-amber-400 transition resize-none"
            style={{ fontFamily: 'inherit' }}
          />
        </div>

        {error && (
          <p className="text-xs text-red-600 font-bold">{error}</p>
        )}

        <div className="flex gap-2">
          {editing && (
            <button
              onClick={() => { setEditing(false); setError(null) }}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition"
            >
              Anulează
            </button>
          )}
          <button
            onClick={submit}
            disabled={saving || !rating}
            className="flex-1 py-2.5 rounded-xl font-black text-sm text-white disabled:opacity-40 transition flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}
          >
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Se salvează…</>
              : <><Send className="w-3.5 h-3.5" /> {editing ? 'Actualizează review-ul' : 'Trimite review-ul'}</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

export function StarRating({ rating, count }: { rating: number; count?: number }) {
  if (!rating) return null
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
        ))}
      </div>
      <span className="text-sm font-bold text-gray-600">
        {rating.toFixed(1)}{count !== undefined ? ` (${count})` : ''}
      </span>
    </div>
  )
}
