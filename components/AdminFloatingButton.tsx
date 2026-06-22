'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AdminFloatingButton() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/admin/me', { cache: 'no-store' })
      .then(r => r.status === 200 ? r.json() : null)
      .then(d => { if (d?.role) setIsAdmin(true) })
      .catch(() => {})
  }, [])

  if (!isAdmin) return null

  return (
    <Link
      href="/admin"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        width: 52,
        height: 52,
        borderRadius: '50%',
        background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(139,92,246,0.5)',
        textDecoration: 'none',
        transition: 'transform .15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      title="Admin Panel"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
      </svg>
    </Link>
  )
}
