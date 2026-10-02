'use client'
// @ts-nocheck
import React, { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Star, X, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

const TYPE_CFG = {
  info:     { border: '#ddd6fe', iconBg: 'rgba(139,92,246,0.15)', emoji: '📢' },
  urgent:   { border: '#fecaca', iconBg: 'rgba(239,68,68,0.15)',  emoji: '🚨' },
  campaign: { border: '#bbf7d0', iconBg: 'rgba(34,197,94,0.15)',  emoji: '🚀' },
  tip:      { border: '#fed7aa', iconBg: 'rgba(249,115,22,0.15)', emoji: '💡' },
}

export default function AnnouncementBanner({ userId }) {
  const [announcements, setAnnouncements] = useState([])
  const [dismissed, setDismissed] = useState(new Set())
  const [starred, setStarred] = useState(new Set())
  const [expanded, setExpanded] = useState(new Set())

  useEffect(() => {
    if (!userId) return
    const sb = createClient()

    async function fetchAnnouncements() {
      const now = new Date().toISOString()
      const { data } = await sb
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('created_at', { ascending: false })
        .limit(3)

      if (!data?.length) return

      const ids = data.map(a => a.id)
      const { data: reads } = await sb
        .from('announcement_reads')
        .select('announcement_id, dismissed, starred')
        .eq('user_id', userId)
        .in('announcement_id', ids)

      const dismissedIds = new Set(reads?.filter(r => r.dismissed).map(r => r.announcement_id) ?? [])
      const starredIds = new Set(reads?.filter(r => r.starred).map(r => r.announcement_id) ?? [])

      setDismissed(dismissedIds)
      setStarred(starredIds)

      const visible = data.filter(a => !dismissedIds.has(a.id))
      setAnnouncements(visible)

      for (const a of visible) {
        const alreadyRead = reads?.find(r => r.announcement_id === a.id)
        if (!alreadyRead) {
          fetch('/api/announcements/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ announcement_id: a.id, action: 'read' }),
          })
        }
      }
    }

    fetchAnnouncements()
  }, [userId])

  async function handleDismiss(id, e) {
    e.stopPropagation()
    setAnnouncements(prev => prev.filter(a => a.id !== id))
    setDismissed(prev => new Set([...prev, id]))
    await fetch('/api/announcements/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcement_id: id, action: 'dismiss' }),
    })
  }

  async function handleStar(id, e) {
    e.stopPropagation()
    const isStarred = starred.has(id)
    setStarred(prev => {
      const next = new Set(prev)
      if (isStarred) next.delete(id)
      else next.add(id)
      return next
    })
    const res = await fetch('/api/announcements/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcement_id: id, action: 'star' }),
    })
    const data = await res.json()
    if (data.starred !== undefined) {
      setStarred(prev => {
        const next = new Set(prev)
        if (data.starred) next.add(id)
        else next.delete(id)
        return next
      })
    }
  }

  function handleExpand(id) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleCtaClick(id) {
    await fetch('/api/announcements/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcement_id: id, action: 'cta_click' }),
    })
  }

  if (announcements.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
      {announcements.map(a => {
        const cfg = TYPE_CFG[a.type] || TYPE_CFG.info
        const isStarred = starred.has(a.id)
        const isExpanded = expanded.has(a.id)
        const isLong = a.message?.length > 120

        return (
          <div
            key={a.id}
            onClick={() => isLong && handleExpand(a.id)}
            style={{
              background: 'linear-gradient(135deg,#1e1b4b,#1e3a5f)',
              borderRadius: 16,
              padding: '14px 16px',
              position: 'relative',
              overflow: 'hidden',
              border: `1.5px solid ${cfg.border}`,
              cursor: isLong ? 'pointer' : 'default',
            }}
          >
            <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(139,92,246,0.15)' }} />

            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              {/* Icon */}
              <div style={{ width: 36, height: 36, borderRadius: 10, background: cfg.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                {cfg.emoji}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: 'white', fontSize: 13, fontWeight: 800, margin: '0 0 4px', lineHeight: 1.4 }}>
                  {a.title}
                </p>

                <p style={{ color: '#a5b4fc', fontSize: 12, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {isLong && !isExpanded ? a.message.substring(0, 120) + '…' : a.message}
                </p>

                {isLong && (
                  <button
                    onClick={e => { e.stopPropagation(); handleExpand(a.id) }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#818cf8', fontSize: 11, fontWeight: 700, padding: 0 }}
                  >
                    {isExpanded
                      ? <><ChevronUp style={{ width: 12, height: 12 }} /> Restrânge</>
                      : <><ChevronDown style={{ width: 12, height: 12 }} /> Citește tot</>}
                  </button>
                )}

                {a.cta_text && a.cta_url && (
                  <Link
                    href={a.cta_url}
                    onClick={e => { e.stopPropagation(); handleCtaClick(a.id) }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, padding: '5px 12px', background: '#f97316', borderRadius: 8, color: 'white', fontSize: 11, fontWeight: 800, textDecoration: 'none' }}
                  >
                    {a.cta_text} <ExternalLink style={{ width: 11, height: 11 }} />
                  </Link>
                )}
              </div>

              {/* Acțiuni */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                <button
                  onClick={e => handleStar(a.id, e)}
                  style={{ width: 28, height: 28, borderRadius: 8, background: isStarred ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title={isStarred ? 'Elimină apreciere' : 'Apreciază'}
                >
                  <Star style={{ width: 13, height: 13, color: isStarred ? '#fbbf24' : 'rgba(255,255,255,0.5)', fill: isStarred ? '#fbbf24' : 'none' }} />
                </button>
                <button
                  onClick={e => handleDismiss(a.id, e)}
                  style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Ascunde anunț"
                >
                  <X style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
