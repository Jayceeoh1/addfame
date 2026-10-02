'use client'

import { useRouter } from 'next/navigation'
import { Shield, ArrowLeft } from 'lucide-react'

export default function InfluencerVerifyPage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Shield style={{ width: 28, height: 28, color: '#7c3aed' }} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e1b4b', margin: '0 0 10px' }}>
          Verificare identitate — în curând
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7, margin: '0 0 24px' }}>
          Această funcționalitate este temporar suspendată. Lucrăm la îmbunătățirea procesului de verificare pentru a respecta toate cerințele legale. Vei fi notificat când devine disponibilă.
        </p>
        <button
          onClick={() => router.push('/influencer/dashboard')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#7c3aed', color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          Înapoi la dashboard
        </button>
      </div>
    </div>
  )
}
