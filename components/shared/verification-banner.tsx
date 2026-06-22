'use client'

import { Shield, Clock, XCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

type Props = {
  status: 'unverified' | 'pending' | 'rejected' | 'verified'
  rejectionReason?: string | null
  compact?: boolean
}

export function VerificationBanner({ status, rejectionReason, compact = false }: Props) {
  if (status === 'verified') return null

  const configs = {
    unverified: {
      bg: 'bg-amber-50', border: 'border-amber-200',
      icon: <Shield className="w-5 h-5 text-amber-500 flex-shrink-0" />,
      title: 'Verifică-ți brandul pentru a publica campanii',
      desc: 'Contul tău nu este încă verificat. Poți răsfoi și crea campanii draft, dar ai nevoie de verificare pentru a le face vizibile influencerilor.',
      cta: 'Începe verificarea →',
      ctaStyle: 'bg-amber-500 hover:bg-amber-600',
      titleColor: 'text-amber-900',
      descColor: 'text-amber-700',
    },
    pending: {
      bg: 'bg-blue-50', border: 'border-blue-200',
      icon: <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" />,
      title: 'Verificare în curs de analizare',
      desc: 'Analizăm trimiterea ta — de obicei durează până la 24 de ore. Vei putea publica campanii după aprobare.',
      cta: 'Vezi statusul →',
      ctaStyle: 'bg-blue-500 hover:bg-blue-600',
      titleColor: 'text-blue-900',
      descColor: 'text-blue-700',
    },
    rejected: {
      bg: 'bg-red-50', border: 'border-red-200',
      icon: <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />,
      title: 'Verificare respinsă — te rugăm să retrimite',
      desc: rejectionReason ? `Motiv: ${rejectionReason}` : 'Verificarea ta a fost respinsă. Te rugăm să actualizezi detaliile și să retrimite.',
      cta: 'Retrimite →',
      ctaStyle: 'bg-red-500 hover:bg-red-600',
      titleColor: 'text-red-900',
      descColor: 'text-red-700',
    },
  }

  const cfg = configs[status]

  if (compact) {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 ${cfg.bg} ${cfg.border}`}
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {cfg.icon}
        <p className={`text-sm font-bold flex-1 ${cfg.titleColor}`}>{cfg.title}</p>
        <Link href="/brand/verify"
          className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black text-white transition ${cfg.ctaStyle}`}>
          {cfg.cta}
        </Link>
      </div>
    )
  }

  return (
    <div className={`flex items-start gap-4 px-6 py-5 rounded-2xl border-2 ${cfg.bg} ${cfg.border} mb-6`}
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-black ${cfg.titleColor}`}>{cfg.title}</p>
        <p className={`text-sm mt-0.5 ${cfg.descColor}`}>{cfg.desc}</p>
      </div>
      <Link href="/brand/verify"
        className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black text-white transition ${cfg.ctaStyle}`}>
        {cfg.cta} <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}
