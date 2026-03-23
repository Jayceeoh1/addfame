'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Circle, ChevronDown, ChevronUp, X, Sparkles } from 'lucide-react'

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

export function OnboardingChecklist({ role, steps, onDismiss }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const done = steps.filter(s => s.done).length
  const total = steps.length
  const pct = Math.round((done / total) * 100)
  const allDone = done === total

  const grad = role === 'brand'
    ? 'linear-gradient(135deg,#f97316,#ec4899)'
    : 'linear-gradient(135deg,#8b5cf6,#06b6d4)'
  const light = role === 'brand' ? '#fff7ed' : '#f5f3ff'
  const border = role === 'brand' ? '#fed7aa' : '#ddd6fe'
  const accent = role === 'brand' ? '#f97316' : '#8b5cf6'

  if (allDone) return null

  return (
    <div className="rounded-2xl overflow-hidden mb-6" style={{ border: `1.5px solid ${border}`, background: light, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white" style={{ background: grad }}>
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <p className="font-black text-gray-900 text-sm">
              {done === 0 ? 'Get started — complete your setup' : `${total - done} step${total - done !== 1 ? 's' : ''} left`}
            </p>
            <span className="text-xs font-black ml-2 flex-shrink-0" style={{ color: accent }}>{pct}%</span>
          </div>
          <div className="w-full bg-white rounded-full h-2">
            <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: grad }} />
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <button onClick={() => setCollapsed(p => !p)}
            className="w-7 h-7 rounded-lg bg-white/70 flex items-center justify-center hover:bg-white transition">
            {collapsed ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronUp className="w-3.5 h-3.5 text-gray-500" />}
          </button>
          {onDismiss && (
            <button onClick={onDismiss}
              className="w-7 h-7 rounded-lg bg-white/70 flex items-center justify-center hover:bg-white transition">
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="px-5 pb-4 space-y-2">
          {steps.map((step, i) => (
            <Link key={step.id} href={step.done ? '#' : step.href}
              className={`flex items-start gap-3 p-3 rounded-xl transition ${step.done ? 'opacity-60 cursor-default' : 'bg-white hover:shadow-sm cursor-pointer'}`}
              onClick={step.done ? e => e.preventDefault() : undefined}>
              <div className="flex-shrink-0 mt-0.5">
                {step.done
                  ? <CheckCircle className="w-5 h-5" style={{ color: accent }} />
                  : <Circle className="w-5 h-5 text-gray-300" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-black ${step.done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{step.label}</p>
                {!step.done && <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>}
              </div>
              {!step.done && (
                <span className="text-xs font-black flex-shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-white" style={{ background: grad }}>
                  {i + 1}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
