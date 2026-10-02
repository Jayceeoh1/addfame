'use client'

import Link from 'next/link'
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react'

type Step = {
  id: string
  label: string
  desc: string
  href: string
  done: boolean
}

type Props = {
  role: 'brand' | 'influencer'
  steps: Step[]
  onDismiss?: () => void
}

export function OnboardingChecklist({ role, steps }: Props) {
  const done = steps.filter(s => s.done).length
  const total = steps.length
  const pct = Math.round((done / total) * 100)
  const currentStep = steps.find(s => !s.done)
  const currentIndex = steps.findIndex(s => !s.done)

  const grad = role === 'brand'
    ? 'linear-gradient(135deg,#f97316,#ec4899)'
    : 'linear-gradient(135deg,#8b5cf6,#06b6d4)'
  const light = role === 'brand' ? '#fff7ed' : '#f5f3ff'
  const border = role === 'brand' ? '#fed7aa' : '#ddd6fe'
  const accent = role === 'brand' ? '#f97316' : '#8b5cf6'

  if (done === total) return null
  if (!currentStep) return null

  return (
    <div style={{ border: `1.5px solid ${border}`, background: light, borderRadius: 16, overflow: 'hidden', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Progress header */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles style={{ width: 14, height: 14, color: 'white' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#111' }}>
              {total - done} {total - done === 1 ? 'pas rămas' : 'pași rămași'}
            </span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 900, color: accent }}>{pct}%</span>
        </div>

        {/* Progress bar cu dots */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {steps.map((s, i) => (
            <div key={s.id} style={{
              flex: 1, height: 4, borderRadius: 4,
              background: s.done ? grad : i === currentIndex ? '#e0e7ff' : '#f0f0f0',
              transition: 'all 0.3s',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {i === currentIndex && (
                <div style={{ position: 'absolute', inset: 0, background: grad, opacity: 0.3 }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pasul curent — mare și clar */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: grad, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, flexShrink: 0 }}>
            {currentIndex + 1}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 900, color: '#111', margin: '0 0 2px' }}>{currentStep.label}</p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{currentStep.desc}</p>
          </div>
        </div>

        <Link href={currentStep.href} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 12, border: 'none',
          background: grad, color: 'white', fontSize: 13, fontWeight: 800,
          textDecoration: 'none', width: '100%', boxSizing: 'border-box',
        }}>
          Completează acum <ArrowRight style={{ width: 16, height: 16 }} />
        </Link>
      </div>

      {/* Pașii completați — mici, discreți */}
      {done > 0 && (
        <div style={{ padding: '0 16px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {steps.filter(s => s.done).map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'white', borderRadius: 20, padding: '3px 10px 3px 6px', border: `1px solid ${border}` }}>
              <CheckCircle style={{ width: 12, height: 12, color: accent }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280' }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
