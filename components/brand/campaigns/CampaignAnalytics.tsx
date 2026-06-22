// @ts-nocheck
'use client'
import React from 'react'
import { BarChart2, Users, Eye, Wallet, Target, Star, DollarSign, CheckCircle, Zap } from 'lucide-react'
import { fmt, fmtNum } from './types'

function KpiCard({ label, value, sub, icon, color, bg }: any) {
  return (
    <div className={`${bg} rounded-2xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-400">{label}</p>
        <span className={`w-7 h-7 rounded-xl ${bg} flex items-center justify-center`}>
          {React.cloneElement(icon, { className: `w-4 h-4 ${color}` })}
        </span>
      </div>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5 font-semibold">{sub}</p>}
    </div>
  )
}

export function CampaignAnalytics({ campaign, collabs, counts, totalReach, totalSpent, completionRate, avgRating, costPerCompleted, budgetUsedPct, activeAndCompleted, completedCollabs, reviews }: any) {
  return (
    <div className="card p-5 mb-5 card-anim" style={{ animationDelay: '.04s' }}>
      <h2 className="font-black text-gray-900 text-lg mb-4 flex items-center gap-2">
        <span className="w-7 h-7 rounded-xl bg-orange-50 flex items-center justify-center">
          <BarChart2 className="w-4 h-4 text-orange-500" />
        </span>
        Analytics campanie
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Reach total" value={fmtNum(totalReach)} sub={`${activeAndCompleted.length} influenceri activi`} icon={<Users />} color="text-purple-600" bg="bg-purple-50" />
        <KpiCard label="Impresii estimate" value={fmtNum(Math.round(totalReach * 0.08))} sub="~8% reach mediu" icon={<Eye />} color="text-blue-600" bg="bg-blue-50" />
        <KpiCard label="Total cheltuit" value={fmt(totalSpent)} sub={campaign.budget > 0 ? `${budgetUsedPct}% din buget` : undefined} icon={<Wallet />} color="text-green-600" bg="bg-green-50" />
        <KpiCard label="Rată finalizare" value={`${completionRate}%`} sub={`${completedCollabs.length} din ${collabs.length} colaborări`} icon={<Target />} color="text-orange-600" bg="bg-orange-50" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Rating mediu" value={avgRating ? `⭐ ${avgRating.toFixed(1)}` : '—'} sub={reviews.length > 0 ? `${reviews.length} review${reviews.length !== 1 ? 'uri' : ''} primite` : 'Fără review-uri încă'} icon={<Star />} color="text-amber-500" bg="bg-amber-50" />
        <KpiCard label="Cost per colaborare" value={costPerCompleted ? fmt(costPerCompleted) : '—'} sub="per influencer finalizat" icon={<DollarSign />} color="text-teal-600" bg="bg-teal-50" />
        <KpiCard label="Rată aprobare" value={collabs.length > 0 ? `${Math.round((counts.active + counts.completed) / collabs.length * 100)}%` : '—'} sub="din total aplicanți" icon={<CheckCircle />} color="text-green-600" bg="bg-green-50" />
        <KpiCard label="Aplicanți noi" value={counts.pending} sub="în așteptare aprobare" icon={<Zap />} color="text-pink-600" bg="bg-pink-50" />
      </div>

      {campaign.campaign_type !== 'BARTER' && campaign.budget > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Utilizare buget</p>
            <p className="text-xs font-bold text-gray-600">{fmt(totalSpent)} / {fmt(campaign.budget)}</p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className="h-3 rounded-full transition-all" style={{
              width: `${budgetUsedPct}%`,
              background: budgetUsedPct > 90 ? 'linear-gradient(90deg,#ef4444,#dc2626)' : budgetUsedPct > 60 ? 'linear-gradient(90deg,#f97316,#ea580c)' : 'linear-gradient(90deg,#22c55e,#16a34a)'
            }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-400">{budgetUsedPct}% utilizat</span>
            <span className="text-xs text-gray-400">{fmt(Math.max(0, campaign.budget - totalSpent))} rămas</span>
          </div>
        </div>
      )}

      {collabs.length > 0 && (
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Distribuție colaborări</p>
          <div className="space-y-2">
            {[
              { label: 'Aplicat', count: counts.pending, color: 'bg-amber-400' },
              { label: 'Invitat', count: counts.invited, color: 'bg-blue-400' },
              { label: 'Activ', count: counts.active, color: 'bg-purple-400' },
              { label: 'Finalizat', count: counts.completed, color: 'bg-green-400' },
              { label: 'Refuzat', count: counts.rejected, color: 'bg-gray-300' },
            ].filter(r => r.count > 0).map(row => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 w-20 flex-shrink-0">{row.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                  <div className={`${row.color} h-2.5 rounded-full transition-all`} style={{ width: `${Math.round((row.count / collabs.length) * 100)}%` }} />
                </div>
                <span className="text-xs font-black text-gray-600 w-6 text-right">{row.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {reviews.length > 0 && (
        <div className="mt-5 pt-5 border-t border-gray-100">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Review-uri recente de la influenceri</p>
          <div className="space-y-2">
            {reviews.slice(0, 3).map((r: any, i: number) => (
              <div key={i} className="bg-amber-50 rounded-xl p-3">
                <div className="flex items-center gap-1 mb-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                  ))}
                  <span className="text-xs text-gray-400 ml-1">{new Date(r.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}</span>
                </div>
                {r.comment && <p className="text-xs text-gray-600 italic">"{r.comment}"</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
