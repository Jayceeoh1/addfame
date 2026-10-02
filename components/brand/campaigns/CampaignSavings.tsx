// @ts-nocheck
'use client'

export function CampaignSavings({ agencyCosts, collabs }: any) {
  const totalAgencyCost = agencyCosts.setup_cost + agencyCosts.selection_cost + agencyCosts.management_cost + agencyCosts.reporting_cost
  const moneySaved = totalAgencyCost
  const hoursSaved = agencyCosts.hours_saved
  const influencersFiltered = collabs.length
  const engRateBoost = agencyCosts.eng_rate_addfame
  const engRateIndustry = agencyCosts.eng_rate_industry

  return (
    <div className="card p-5 mb-5 card-anim" style={{ animationDelay: '.06s' }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-sm shadow-green-200">
            <span className="text-white text-sm font-black">₿</span>
          </div>
          <div>
            <h2 className="font-black text-gray-900 text-base leading-tight">Economii generate cu AddFame</h2>
            <p className="text-xs text-gray-400">față de o agenție tradițională de influencer marketing</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-xl px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-xs font-black text-green-700">Economii active</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="col-span-2 sm:col-span-1 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl p-4">
          <p className="text-xs font-bold text-green-600 mb-1">💰 Bani economisiți</p>
          <p className="text-2xl font-black text-green-700">{moneySaved.toLocaleString("ro-RO")} RON</p>
          <p className="text-xs text-green-600 mt-1 font-medium">costuri agenție evitate</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs font-bold text-blue-600 mb-1">⏱ Timp economisit</p>
          <p className="text-2xl font-black text-blue-700">{hoursSaved}h</p>
          <p className="text-xs text-blue-500 mt-1 font-medium">economisite față de agenție</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100 rounded-2xl p-4">
          <p className="text-xs font-bold text-purple-600 mb-1">👥 Influenceri verificați</p>
          <p className="text-2xl font-black text-purple-700">{influencersFiltered}</p>
          <p className="text-xs text-purple-500 mt-1 font-medium">procesați automat</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-4">
          <p className="text-xs font-bold text-orange-600 mb-1">📈 Eng. rate mediu</p>
          <p className="text-2xl font-black text-orange-600">{engRateBoost}%</p>
          <p className="text-xs text-orange-500 mt-1 font-medium">vs {engRateIndustry}% industrie</p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-2xl p-4 mb-4">
        <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Ce ai fi plătit la o agenție tradițională</p>
        <div className="space-y-2.5">
          {[
            { label: "Setup campanie", cost: agencyCosts.setup_cost, icon: "⚙️", desc: "brief, strategie, planificare" },
            { label: "Selecție influenceri", cost: agencyCosts.selection_cost, icon: "🔍", desc: "research + negociere manuală" },
            { label: "Management campanie", cost: agencyCosts.management_cost, icon: "📋", desc: "coordonare + comunicare" },
            { label: "Raportare & analytics", cost: agencyCosts.reporting_cost, icon: "📊", desc: "raport final livrat" },
          ].map(row => {
            const pct = Math.round((row.cost / totalAgencyCost) * 100)
            return (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{row.icon}</span>
                    <span className="text-xs font-bold text-gray-700">{row.label}</span>
                    <span className="text-xs text-gray-400 hidden sm:inline">· {row.desc}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-red-500 line-through">{row.cost.toLocaleString("ro-RO")} RON</span>
                    <span className="text-xs font-black text-green-600 bg-green-100 px-1.5 py-0.5 rounded-md">0 RON ✓</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t-2 border-dashed border-gray-200">
          <span className="text-sm font-black text-gray-700">Total economisit</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-400 line-through font-bold">{totalAgencyCost.toLocaleString("ro-RO")} RON</span>
            <span className="text-base font-black text-green-600">0 RON 🎉</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Setup timp", addfame: agencyCosts.setup_time_addfame, agency: agencyCosts.setup_time_agency, icon: "🚀" },
          { label: "Selecție influenceri", addfame: agencyCosts.selection_addfame, agency: agencyCosts.selection_agency, icon: "🤖" },
          { label: "Raportare", addfame: agencyCosts.reporting_addfame, agency: agencyCosts.reporting_agency, icon: "📡" },
        ].map(c => (
          <div key={c.label} className="bg-white border border-gray-100 rounded-xl p-3 text-center">
            <p className="text-lg mb-1">{c.icon}</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-2">{c.label}</p>
            <p className="text-xs font-black text-green-600 bg-green-50 rounded-lg px-2 py-1 mb-1">{c.addfame}</p>
            <p className="text-[10px] text-red-400 line-through">{c.agency}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
