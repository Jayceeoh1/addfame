'use client'

import React, { useState, useEffect } from 'react'
import { createPointEvent, deactivatePointEvent } from '@/app/actions/point-events'
import { Gift, Plus, Users, Clock, XCircle, RefreshCw } from 'lucide-react'

interface PointEvent {
  id: string
  title: string
  description: string
  points: number
  max_claims: number
  expires_at: string
  active: boolean
  created_at: string
  claims_count?: number
}

function timeLeft(expires: string) {
  const diff = new Date(expires).getTime() - Date.now()
  if (diff <= 0) return 'Expirat'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h > 48) return `${Math.floor(h / 24)} zile`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function PointEventsPage() {
  const [events, setEvents] = useState<PointEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    points: '50',
    max_claims: '300',
    hours: '24',
  })

  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function loadEvents() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/point-events')
      const data = await res.json()
      setEvents(data.events ?? [])
    } catch (_) { notify('Eroare la încărcare', false) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadEvents() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.points || !form.hours) return notify('Completează toate câmpurile', false)
    setSubmitting(true)
    try {
      const expiresAt = new Date(Date.now() + parseInt(form.hours) * 3600 * 1000).toISOString()
      const res = await createPointEvent({
        title: form.title,
        description: form.description,
        points: parseInt(form.points),
        max_claims: parseInt(form.max_claims) || 0,
        expires_at: expiresAt,
      })
      if ('error' in res && res.error) return notify(res.error, false)
      notify('✅ Eveniment creat cu succes!')
      setShowForm(false)
      setForm({ title: '', description: '', points: '50', max_claims: '300', hours: '24' })
      loadEvents()
    } catch (e: any) { notify(e.message || 'Eroare', false) }
    finally { setSubmitting(false) }
  }

  async function handleDeactivate(id: string) {
    if (!confirm('Dezactivezi evenimentul? Influencerii nu vor mai putea revendica.')) return
    const res = await deactivatePointEvent(id)
    if ('error' in res && res.error) return notify(res.error, false)
    notify('Eveniment dezactivat.')
    setEvents(prev => prev.map(e => e.id === id ? { ...e, active: false } : e))
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 999,
          background: toast.ok ? '#f0fdf4' : '#fef2f2',
          border: `1.5px solid ${toast.ok ? '#86efac' : '#fca5a5'}`,
          color: toast.ok ? '#166534' : '#dc2626',
          borderRadius: 12, padding: '12px 18px', fontSize: 14, fontWeight: 700,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#111827', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Gift size={22} color="#7c3aed" /> Point Events
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Creează bonusuri de puncte cu timp și locuri limitate pentru influenceri</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadEvents} style={{ border: '1.5px solid #e5e7eb', background: 'white', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>
            <RefreshCw size={14} /> Reîncarcă
          </button>
          <button
            onClick={() => setShowForm(s => !s)}
            style={{ background: 'linear-gradient(135deg,#7c3aed,#9d79fd)', color: 'white', border: 'none', borderRadius: 10, padding: '8px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, boxShadow: '0 3px 10px rgba(124,92,252,0.35)' }}
          >
            <Plus size={15} /> Eveniment nou
          </button>
        </div>
      </div>

      {/* Formular creare */}
      {showForm && (
        <form onSubmit={handleCreate} style={{ background: 'white', border: '1.5px solid #ddd6fe', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: '0 0 16px' }}>Eveniment nou</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>Titlu *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="ex: Creator Score Boost 🚀"
                required
                style={inp}
              />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>Descriere</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="ex: Primii 300 influenceri activi primesc bonus!"
                rows={2}
                style={{ ...inp, resize: 'none' as const }}
              />
            </div>
            <div>
              <label style={lbl}>Puncte acordate *</label>
              <input
                type="number" min="1" max="10000"
                value={form.points}
                onChange={e => setForm(f => ({ ...f, points: e.target.value }))}
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}>Max. revendicări (0 = nelimitat)</label>
              <input
                type="number" min="0"
                value={form.max_claims}
                onChange={e => setForm(f => ({ ...f, max_claims: e.target.value }))}
                style={inp}
              />
            </div>
            <div>
              <label style={lbl}>Expiră în (ore) *</label>
              <input
                type="number" min="1" max="720"
                value={form.hours}
                onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
                style={inp}
              />
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0' }}>
                Expiră la: {new Date(Date.now() + parseInt(form.hours || '0') * 3600000).toLocaleString('ro-RO')}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              style={{ border: '1.5px solid #e5e7eb', background: 'white', borderRadius: 10, padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#374151' }}
            >
              Anulează
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{ background: 'linear-gradient(135deg,#7c3aed,#9d79fd)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 24px', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, flex: 1, boxShadow: '0 3px 10px rgba(124,92,252,0.3)' }}
            >
              {submitting ? '⏳ Se creează...' : '✨ Creează evenimentul'}
            </button>
          </div>
        </form>
      )}

      {/* Lista evenimente */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>Se încarcă...</div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 16, border: '1.5px dashed #e5e7eb' }}>
          <Gift size={32} color="#ddd6fe" style={{ marginBottom: 12 }} />
          <p style={{ color: '#9ca3af', fontSize: 14, fontWeight: 600, margin: 0 }}>Niciun eveniment creat încă</p>
          <p style={{ color: '#d1d5db', fontSize: 13, margin: '4px 0 0' }}>Apasă „Eveniment nou" pentru a crea primul bonus</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {events.map(ev => {
            const expired = new Date(ev.expires_at) < new Date()
            const pct = ev.max_claims > 0 ? Math.min(100, Math.round(((ev.claims_count ?? 0) / ev.max_claims) * 100)) : null

            return (
              <div key={ev.id} style={{
                background: 'white',
                border: `1.5px solid ${ev.active && !expired ? '#ddd6fe' : '#e5e7eb'}`,
                borderRadius: 16, padding: '18px 20px',
                opacity: !ev.active || expired ? 0.7 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: ev.active && !expired ? '#ede9fe' : '#f3f4f6',
                        color: ev.active && !expired ? '#7c3aed' : '#9ca3af',
                        borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                      }}>
                        {ev.active && !expired ? '🟢 Activ' : !ev.active ? '⭕ Dezactivat' : '🔴 Expirat'}
                      </span>
                      <span style={{ fontSize: 12, color: '#9ca3af', fontVariantNumeric: 'tabular-nums' }}>
                        <Clock size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                        {expired ? 'Expirat' : `Expiră în ${timeLeft(ev.expires_at)}`}
                      </span>
                    </div>

                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>{ev.title}</h3>
                    {ev.description && <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 10px' }}>{ev.description}</p>}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 18, fontWeight: 900, color: '#7c3aed' }}>+{ev.points} pts</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#374151', fontWeight: 600 }}>
                        <Users size={14} />
                        <strong style={{ color: '#7c3aed' }}>{ev.claims_count ?? 0}</strong>
                        {ev.max_claims > 0 && <span style={{ color: '#9ca3af' }}>/ {ev.max_claims}</span>}
                        {ev.max_claims === 0 && <span style={{ color: '#9ca3af' }}> revendicări (nelimitat)</span>}
                      </span>
                    </div>

                    {pct !== null && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ height: 6, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#7c3aed,#a78bfa)', borderRadius: 99 }} />
                        </div>
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: '3px 0 0' }}>{pct}% locuri ocupate</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ flexShrink: 0 }}>
                    {ev.active && !expired && (
                      <button
                        onClick={() => handleDeactivate(ev.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
                      >
                        <XCircle size={14} /> Dezactivează
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }
const inp: React.CSSProperties = { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', color: '#111827', background: '#fafafa' }
