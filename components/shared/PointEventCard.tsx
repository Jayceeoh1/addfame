'use client'

import { useState, useEffect } from 'react'
import { claimPointEvent } from '@/app/actions/point-events'

interface PointEvent {
  id: string
  title: string
  description?: string
  points: number
  max_claims: number
  expires_at: string
  claims_count: number
  already_claimed: boolean
  spots_left: number | null
}

function useCountdown(expiresAt: string) {
  const getSeconds = () => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  const [secs, setSecs] = useState(getSeconds)

  useEffect(() => {
    const id = setInterval(() => setSecs(getSeconds()), 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  if (secs <= 0) return 'Expirat'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 24) return `${Math.floor(h / 24)}z ${h % 24}h`
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  return `${m}m ${String(s).padStart(2, '0')}s`
}

export function PointEventCard({ event, onClaimed }: { event: PointEvent; onClaimed?: (points: number) => void }) {
  const [claimed, setClaimed] = useState(event.already_claimed)
  const [claimsCount, setClaimsCount] = useState(event.claims_count)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const countdown = useCountdown(event.expires_at)

  const expired = countdown === 'Expirat'
  const full = event.max_claims > 0 && claimsCount >= event.max_claims
  const pct = event.max_claims > 0 ? Math.min(100, Math.round((claimsCount / event.max_claims) * 100)) : 0

  async function handleClaim() {
    if (loading || claimed || expired || full) return
    setLoading(true)
    setError(null)
    try {
      const res = await claimPointEvent(event.id)
      if ('error' in res && res.error) {
        setError(res.error)
      } else {
        setClaimed(true)
        setClaimsCount(c => c + 1)
        onClaimed?.(event.points)
      }
    } catch (e: any) {
      setError('Eroare de rețea. Încearcă din nou.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: claimed ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : expired || full ? '#f9fafb' : 'linear-gradient(135deg,#faf5ff,#ede9fe)',
      border: `1.5px solid ${claimed ? '#86efac' : expired || full ? '#e5e7eb' : '#c4b5fd'}`,
      borderRadius: 20,
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
      opacity: (expired || full) && !claimed ? 0.7 : 1,
      transition: 'all .2s',
    }}>
      {/* Shimmer background */}
      {!claimed && !expired && !full && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(124,92,252,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        {/* Badge stare */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: claimed ? '#dcfce7' : expired ? '#fee2e2' : full ? '#fef9c3' : 'rgba(124,92,252,0.12)',
          border: `1px solid ${claimed ? '#86efac' : expired ? '#fca5a5' : full ? '#fde047' : 'rgba(124,92,252,0.3)'}`,
          borderRadius: 99, padding: '4px 12px',
          fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' as const,
          color: claimed ? '#16a34a' : expired ? '#dc2626' : full ? '#b45309' : '#7c3aed',
        }}>
          {!claimed && !expired && !full && (
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: '#7c3aed',
              animation: 'pe-pulse 1.4s ease-in-out infinite',
            }} />
          )}
          {claimed ? '✓ Revendicat' : expired ? 'Expirat' : full ? 'Locuri epuizate' : 'Bonus limitat'}
        </span>

        {/* Countdown */}
        {!claimed && !expired && (
          <span style={{
            fontSize: 13, fontWeight: 700, color: '#dc2626',
            fontVariantNumeric: 'tabular-nums',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            ⏱ {countdown}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Points badge */}
        <div style={{
          flexShrink: 0,
          width: 64, height: 64,
          borderRadius: '50%',
          background: claimed
            ? 'linear-gradient(135deg,#22c55e,#16a34a)'
            : expired || full
              ? '#e5e7eb'
              : 'linear-gradient(135deg,#7c3aed,#a78bfa)',
          display: 'flex', flexDirection: 'column' as const,
          alignItems: 'center', justifyContent: 'center',
          boxShadow: claimed
            ? '0 4px 16px rgba(34,197,94,0.3)'
            : !expired && !full ? '0 4px 16px rgba(124,92,252,0.35)' : 'none',
        }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            +{event.points}
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
            pts
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: '0 0 4px', lineHeight: 1.3 }}>
            {event.title}
          </h3>
          {event.description && (
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 10px', lineHeight: 1.4 }}>
              {event.description}
            </p>
          )}

          {/* Progress */}
          {event.max_claims > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>Revendicări</span>
                <span style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ color: '#7c3aed' }}>{claimsCount}</span>
                  <span style={{ color: '#9ca3af' }}> / {event.max_claims}</span>
                </span>
              </div>
              <div style={{ height: 6, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: claimed ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#7c3aed,#a78bfa)',
                  borderRadius: 99,
                  transition: 'width .4s ease',
                }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginTop: 12, padding: '8px 12px',
          background: '#fef2f2', border: '1px solid #fca5a5',
          borderRadius: 10, fontSize: 13, color: '#dc2626',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* CTA */}
      <button
        onClick={handleClaim}
        disabled={loading || claimed || expired || full}
        style={{
          width: '100%', marginTop: 16,
          padding: '13px',
          background: claimed
            ? 'linear-gradient(135deg,#22c55e,#16a34a)'
            : expired || full
              ? '#e5e7eb'
              : 'linear-gradient(135deg,#7c3aed,#9d79fd)',
          color: expired || full ? '#9ca3af' : '#fff',
          border: 'none', borderRadius: 12,
          fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
          cursor: loading || claimed || expired || full ? 'default' : 'pointer',
          boxShadow: claimed ? '0 4px 14px rgba(34,197,94,0.3)' : !expired && !full ? '0 4px 14px rgba(124,92,252,0.35)' : 'none',
          transition: 'all .15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        {loading ? (
          <><span style={{ animation: 'pe-spin 0.7s linear infinite', display: 'inline-block' }}>⏳</span> Se procesează...</>
        ) : claimed ? (
          '✓ Bonus revendicat cu succes!'
        ) : expired ? (
          'Eveniment expirat'
        ) : full ? (
          'Toate locurile ocupate'
        ) : (
          <>Revendică +{event.points} puncte →</>
        )}
      </button>

      <style>{`
        @keyframes pe-pulse {
          0%,100%{opacity:1;transform:scale(1)}
          50%{opacity:.4;transform:scale(.7)}
        }
        @keyframes pe-spin {
          to{transform:rotate(360deg)}
        }
      `}</style>
    </div>
  )
}

// ─── Container care fetch-uieste evenimentele și le afișează ──────────────────
export function PointEventsSection({ influencerId }: { influencerId: string }) {
  const [events, setEvents] = useState<PointEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        // Folosim API route ca să nu expunem admin client în browser
        const res = await fetch(`/api/point-events?influencer_id=${influencerId}`)
        const data = await res.json()
        setEvents(data.events ?? [])
      } catch (_) { }
      finally { setLoading(false) }
    }
    load()
  }, [influencerId])

  function handleClaimed(points: number) {
    setToastMsg(`🎉 +${points} puncte adăugate la Creator Score!`)
    setTimeout(() => setToastMsg(null), 4000)
  }

  if (loading) return null
  if (events.length === 0) return null

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#111827', color: '#fff', borderRadius: 12,
          padding: '12px 20px', fontSize: 14, fontWeight: 700, zIndex: 9999,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)', whiteSpace: 'nowrap',
        }}>
          {toastMsg}
        </div>
      )}

      <h2 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        🎁 Bonusuri disponibile
        <span style={{ fontSize: 12, background: '#ede9fe', color: '#7c3aed', borderRadius: 99, padding: '2px 10px', fontWeight: 700 }}>
          {events.filter(e => !e.already_claimed).length} noi
        </span>
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {events.map(ev => (
          <PointEventCard key={ev.id} event={ev} onClaimed={handleClaimed} />
        ))}
      </div>
    </div>
  )
}
