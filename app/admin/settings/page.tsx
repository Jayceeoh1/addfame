'use client'

import { useState, useEffect } from 'react'
import { getAllPlatformSettings, updatePlatformSettings } from '@/app/actions/admin'
import {
  Settings, Save, RotateCcw, DollarSign, TrendingUp, Clock,
  Percent, Eye, CheckCircle, AlertCircle, ChevronRight,
  Sparkles, Building2, BarChart3, Zap, Package, Truck
} from 'lucide-react'

type AgencyComparison = {
  setup_cost: number
  selection_cost: number
  management_cost: number
  reporting_cost: number
  agency_commission_min: number
  agency_commission_max: number
  addfame_commission: number
  // Performanță & timp
  hours_saved: number
  eng_rate_addfame: number
  eng_rate_industry: number
  setup_time_addfame: string
  setup_time_agency: string
  selection_addfame: string
  selection_agency: string
  reporting_addfame: string
  reporting_agency: string
}

const DEFAULT_AGENCY: AgencyComparison = {
  setup_cost: 800,
  selection_cost: 1200,
  management_cost: 1500,
  reporting_cost: 350,
  agency_commission_min: 15,
  agency_commission_max: 25,
  addfame_commission: 15,
  // Performanță & timp
  hours_saved: 40,
  eng_rate_addfame: 3.8,
  eng_rate_industry: 1.9,
  setup_time_addfame: '15 minute',
  setup_time_agency: '5–7 zile',
  selection_addfame: 'Automată',
  selection_agency: '3 zile manual',
  reporting_addfame: 'Real-time',
  reporting_agency: 'La final campaniei',
}

const COST_META = [
  { key: 'setup_cost' as const, label: 'Setup campanie', hint: 'Cost mediu setup la agenții din România', icon: '⚙️' },
  { key: 'selection_cost' as const, label: 'Selecție influenceri', hint: 'Research + selecție manuală', icon: '🔍' },
  { key: 'management_cost' as const, label: 'Management campanie', hint: 'Coordonare influenceri + comunicare', icon: '📋' },
  { key: 'reporting_cost' as const, label: 'Raportare & analytics', hint: 'Raport final de campanie', icon: '📊' },
]

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agency, setAgency] = useState<AgencyComparison>(DEFAULT_AGENCY)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [eawbSender, setEawbSender] = useState({
    contact: '', phone: '', email: '',
    postal_code: '', city: '', county: '',
    street: '', street_number: '',
    billing_address_id: 341839,
  })
  const [eawbSaving, setEawbSaving] = useState(false)
  const [eawbSaved, setEawbSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'comparatie' | 'comisioane' | 'performanta' | 'eawb'>('comparatie')

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    setLoading(true)
    const res = await getAllPlatformSettings() as any
    if (res?.success && res.data) {
      const agencySetting = res.data.find((s: any) => s.key === 'agency_comparison')
      if (agencySetting?.value) {
        setAgency({ ...DEFAULT_AGENCY, ...agencySetting.value })
        if (agencySetting.updated_at) {
          setLastSaved(new Date(agencySetting.updated_at).toLocaleString('ro-RO'))
        }
      }
      const eawbSetting = res.data.find((s: any) => s.key === 'eawb_sender')
      if (eawbSetting?.value) {
        setEawbSender(prev => ({ ...prev, ...eawbSetting.value }))
      }
    }
    setLoading(false)
  }

  async function saveEawbSender() {
    setEawbSaving(true)
    const res = await updatePlatformSettings('eawb_sender', eawbSender) as any
    if (!res?.error) {
      setEawbSaved(true)
      setTimeout(() => setEawbSaved(false), 3000)
    }
    setEawbSaving(false)
  }

  async function saveAgency() {
    setSaving(true)
    setError(null)
    const res = await updatePlatformSettings('agency_comparison', agency) as any
    if (res?.error) {
      setError(res.error)
    } else {
      setSaved(true)
      setLastSaved(new Date().toLocaleString('ro-RO'))
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  const totalSavings = agency.setup_cost + agency.selection_cost + agency.management_cost + agency.reporting_cost
  const maxCost = Math.max(agency.setup_cost, agency.selection_cost, agency.management_cost, agency.reporting_cost, 1)
  const commissionSaving = ((agency.agency_commission_min + agency.agency_commission_max) / 2) - agency.addfame_commission

  const set = (key: keyof AgencyComparison, val: number) =>
    setAgency(p => ({ ...p, [key]: val }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-40">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-[3px] border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-gray-400">Se încarcă setările...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-gray-50/60" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Page header */}
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900">Setări platformă</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Configurări globale vizibile pentru branduri și influenceri
                {lastSaved && <span className="ml-2 text-gray-300">· Salvat: {lastSaved}</span>}
              </p>
            </div>
          </div>

          {/* Save button - always visible in header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setAgency(DEFAULT_AGENCY) }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
            <button
              onClick={saveAgency}
              disabled={saving}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition shadow-sm disabled:opacity-60 ${
                saved
                  ? 'bg-green-500 text-white shadow-green-200'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
              }`}
            >
              {saving ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : saved ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saved ? 'Salvat!' : saving ? 'Se salvează...' : 'Salvează modificările'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-8 bg-white rounded-2xl p-1.5 border border-gray-100 w-fit shadow-sm">
          {([
            { id: 'comparatie', label: 'Comparație agenție', icon: Building2 },
            { id: 'comisioane', label: 'Comisioane', icon: Percent },
          { id: 'performanta', label: 'Timp & Performanță', icon: Zap },
          { id: 'eawb', label: 'Expediere eAWB', icon: Package },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── TAB: COMPARATIE ──────────────────────────────────── */}
        {activeTab === 'comparatie' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* LEFT: Form inputs */}
            <div className="lg:col-span-3 space-y-5">

              {/* Impact summary bar */}
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Total economii afișate brandurilor</p>
                    <p className="text-3xl font-black mt-1">{totalSavings.toLocaleString('ro-RO')} RON</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {COST_META.map(m => (
                    <div key={m.key} className="bg-white/10 rounded-xl p-2.5">
                      <p className="text-[10px] font-bold text-indigo-200 truncate">{m.label.split(' ')[0]}</p>
                      <p className="text-sm font-black text-white mt-0.5">{agency[m.key].toLocaleString('ro-RO')}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost inputs */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">Costuri agenție tradițională</p>
                    <p className="text-xs text-gray-400">Valori afișate ca economii în analytics-ul brandului</p>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {COST_META.map(m => {
                    const pct = Math.round((agency[m.key] / maxCost) * 100)
                    return (
                      <div key={m.key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <span>{m.icon}</span> {m.label}
                          </label>
                          <span className="text-xs text-gray-400">{m.hint}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="relative flex-1">
                            <input
                              type="number" min={0} step={50}
                              value={agency[m.key]}
                              onChange={e => set(m.key, parseFloat(e.target.value) || 0)}
                              className="w-full pl-4 pr-16 py-2.5 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 bg-gray-50 focus:bg-white transition"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">RON</span>
                          </div>
                        </div>
                        {/* Mini bar */}
                        <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-400 to-violet-400 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT: Live preview */}
            <div className="lg:col-span-2 space-y-4">
              <div className="sticky top-4">
                {/* Preview label */}
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-gray-400" />
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider">Preview — văzut de brand</p>
                </div>

                {/* Brand-facing card preview */}
                <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden shadow-lg">
                  {/* Card header */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-800">Economii cu AddFame</p>
                          <p className="text-[10px] text-gray-500">față de o agenție tradițională</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-green-600 uppercase tracking-wide">Total salvat</p>
                        <p className="text-lg font-black text-green-600">{totalSavings.toLocaleString('ro-RO')} RON</p>
                      </div>
                    </div>
                  </div>

                  {/* Rows with visual bars */}
                  <div className="p-5 space-y-3">
                    {COST_META.map(m => {
                      const pct = Math.round((agency[m.key] / totalSavings) * 100)
                      return (
                        <div key={m.key}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-semibold text-gray-600">{m.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-red-400 line-through text-[11px]">{agency[m.key].toLocaleString('ro-RO')} RON</span>
                              <span className="bg-green-100 text-green-700 font-black text-[10px] px-1.5 py-0.5 rounded-md">
                                -{agency[m.key].toLocaleString('ro-RO')}
                              </span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}

                    <div className="pt-3 mt-3 border-t-2 border-dashed border-gray-100 flex items-center justify-between">
                      <p className="text-xs font-black text-gray-700">Total economisit</p>
                      <p className="text-base font-black text-green-600">{totalSavings.toLocaleString('ro-RO')} RON</p>
                    </div>
                  </div>

                  {/* Footer badge */}
                  <div className="bg-green-50 px-5 py-3 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-green-500" />
                    <p className="text-[11px] font-bold text-green-700">
                      Cu AddFame ai economisit echivalentul a {Math.round(totalSavings / 350)} rapoarte complete
                    </p>
                  </div>
                </div>

                {/* Mini stat */}
                <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3">Distribuție economii</p>
                  <div className="space-y-2">
                    {COST_META.map(m => {
                      const pct = totalSavings > 0 ? Math.round((agency[m.key] / totalSavings) * 100) : 0
                      return (
                        <div key={m.key} className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500 flex-1 truncate">{m.label}</span>
                          <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-black text-gray-600 w-8 text-right">{pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: COMISIOANE ──────────────────────────────────── */}
        {activeTab === 'comisioane' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-5">

              {/* Commission summary */}
              <div className="bg-gradient-to-r from-violet-600 to-purple-700 rounded-2xl p-5 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-bold text-violet-200 uppercase tracking-wider">Avantaj comision AddFame</p>
                    <p className="text-3xl font-black mt-1">
                      -{commissionSaving.toFixed(1)}%
                    </p>
                    <p className="text-xs text-violet-300 mt-1">față de media agenției tradiționale</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
                    <Percent className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Min. agenție', val: `${agency.agency_commission_min}%`, sub: 'Minim tradițional' },
                    { label: 'Max. agenție', val: `${agency.agency_commission_max}%`, sub: 'Maxim tradițional' },
                    { label: 'AddFame', val: `${agency.addfame_commission}%`, sub: 'Comisionul nostru', highlight: true },
                  ].map(s => (
                    <div key={s.label} className={`rounded-xl p-3 ${s.highlight ? 'bg-white/20 ring-1 ring-white/30' : 'bg-white/10'}`}>
                      <p className="text-[10px] font-bold text-violet-200">{s.label}</p>
                      <p className={`text-xl font-black mt-0.5 ${s.highlight ? 'text-white' : 'text-violet-100'}`}>{s.val}</p>
                      <p className="text-[10px] text-violet-300 mt-0.5">{s.sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Commission inputs */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                    <Percent className="w-4 h-4 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">Configurare comisioane</p>
                    <p className="text-xs text-gray-400">Valorile sunt afișate în comparativul brand analytics</p>
                  </div>
                </div>
                <div className="p-6 space-y-5">
                  {/* Agenție range */}
                  <div>
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Interval comision agenție tradițională</p>
                    <div className="grid grid-cols-2 gap-4">
                      {([
                        { key: 'agency_commission_min' as const, label: 'Minim', color: 'orange' },
                        { key: 'agency_commission_max' as const, label: 'Maxim', color: 'red' },
                      ]).map(f => (
                        <div key={f.key}>
                          <label className="block text-xs font-bold text-gray-600 mb-1.5">{f.label}</label>
                          <div className="relative">
                            <input
                              type="number" min={0} max={100} step={1}
                              value={agency[f.key]}
                              onChange={e => set(f.key, parseFloat(e.target.value) || 0)}
                              className="w-full pl-4 pr-10 py-2.5 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-violet-400 bg-gray-50 focus:bg-white transition"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-gray-100" />

                  {/* AddFame commission */}
                  <div>
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Comision AddFame</p>
                    <div className="relative max-w-xs">
                      <input
                        type="number" min={0} max={100} step={1}
                        value={agency.addfame_commission}
                        onChange={e => set('addfame_commission', parseFloat(e.target.value) || 0)}
                        className="w-full pl-4 pr-10 py-3 border-2 border-violet-200 rounded-xl text-lg font-black text-gray-900 outline-none focus:border-violet-500 bg-violet-50/50 focus:bg-white transition"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-violet-400">%</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Comisionul actual aplicat de AddFame pe tranzacții</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: commission visualizer */}
            <div className="lg:col-span-2">
              <div className="sticky top-4 space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-gray-400" />
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wider">Vizualizare comparativă</p>
                </div>

                <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 shadow-lg space-y-5">
                  {/* Visual bar comparison */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-4">Comision aplicat (%)</p>
                    <div className="space-y-3">
                      {[
                        { label: 'Agenție min.', value: agency.agency_commission_min, color: 'bg-orange-200', text: 'text-orange-700' },
                        { label: 'Agenție max.', value: agency.agency_commission_max, color: 'bg-red-300', text: 'text-red-700' },
                        { label: 'AddFame', value: agency.addfame_commission, color: 'bg-violet-500', text: 'text-violet-700', highlight: true },
                      ].map(b => {
                        const pct = (b.value / Math.max(agency.agency_commission_max, 1)) * 100
                        return (
                          <div key={b.label}>
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className={`font-bold ${b.highlight ? 'text-violet-700' : 'text-gray-600'}`}>{b.label}</span>
                              <span className={`font-black ${b.highlight ? 'text-violet-700' : 'text-gray-700'}`}>{b.value}%</span>
                            </div>
                            <div className={`h-3 rounded-full overflow-hidden ${b.highlight ? 'bg-violet-100' : 'bg-gray-100'}`}>
                              <div
                                className={`h-full ${b.color} rounded-full transition-all duration-700`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="h-px bg-gray-100" />

                  {/* Savings callout */}
                  <div className="bg-violet-50 rounded-xl p-4">
                    <p className="text-[10px] font-black text-violet-500 uppercase tracking-wider mb-2">Avantaj față de medie agenție</p>
                    <div className="flex items-end gap-2">
                      <p className="text-2xl font-black text-violet-700">
                        {commissionSaving > 0 ? `-${commissionSaving.toFixed(1)}` : commissionSaving.toFixed(1)}%
                      </p>
                      <p className="text-xs text-violet-500 mb-1 font-semibold">
                        {commissionSaving > 0 ? 'mai ieftin' : 'mai scump'}
                      </p>
                    </div>
                    <p className="text-[11px] text-violet-500 mt-1">
                      Media agenție: {((agency.agency_commission_min + agency.agency_commission_max) / 2).toFixed(1)}% · AddFame: {agency.addfame_commission}%
                    </p>
                  </div>

                  {/* Impact note */}
                  <div className="flex items-start gap-2.5 text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-gray-400 flex-shrink-0" />
                    <p>Valorile comisioanelor sunt afișate brandurilor în secțiunea de comparație analytics pentru a evidenția economiile față de agențiile tradiționale.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-100 rounded-2xl px-5 py-4 flex items-center gap-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* ─── TAB: PERFORMANTA ──────────────────────────────────── */}
        {activeTab === 'performanta' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Timp */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">Comparații timp</p>
                  <p className="text-xs text-gray-400">Afișate în secțiunea economii de pe pagina campaniei</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-blue-50 rounded-xl p-3 mb-2">
                  <p className="text-xs font-black text-blue-600 mb-1">Ore economisite față de agenție</p>
                  <div className="relative max-w-xs">
                    <input type="number" min={0} step={1}
                      value={agency.hours_saved}
                      onChange={e => setAgency(p => ({ ...p, hours_saved: parseFloat(e.target.value) || 0 }))}
                      className="w-full pl-4 pr-16 py-2.5 border-2 border-blue-200 rounded-xl text-lg font-black text-gray-900 outline-none focus:border-blue-500 bg-white transition"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-blue-400">ore</span>
                  </div>
                  <p className="text-xs text-blue-500 mt-1">Câte ore economisește brandul față de lucrul cu o agenție</p>
                </div>

                {([
                  { label: 'Setup campanie AddFame', key: 'setup_time_addfame' as const, placeholder: '15 minute', hint: 'Cât durează să lansezi o campanie pe AddFame' },
                  { label: 'Setup campanie agenție', key: 'setup_time_agency' as const, placeholder: '5–7 zile', hint: 'Cât durează la o agenție tradițională' },
                  { label: 'Selecție influenceri AddFame', key: 'selection_addfame' as const, placeholder: 'Automată', hint: 'Descriere scurtă a procesului AddFame' },
                  { label: 'Selecție influenceri agenție', key: 'selection_agency' as const, placeholder: '3 zile manual', hint: 'Descriere scurtă a procesului agenției' },
                  { label: 'Raportare AddFame', key: 'reporting_addfame' as const, placeholder: 'Real-time', hint: 'Cum raportează AddFame' },
                  { label: 'Raportare agenție', key: 'reporting_agency' as const, placeholder: 'La final campaniei', hint: 'Cum raportează o agenție tradițională' },
                ] as const).map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">{f.label}</label>
                    <input
                      type="text"
                      value={(agency as any)[f.key] ?? ''}
                      placeholder={f.placeholder}
                      onChange={e => setAgency(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-900 outline-none focus:border-indigo-400 bg-gray-50 focus:bg-white transition"
                    />
                    <p className="text-xs text-gray-400 mt-1">{f.hint}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Performanță */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">Metrici performanță</p>
                  <p className="text-xs text-gray-400">Rate afișate în comparativul cu industria</p>
                </div>
              </div>
              <div className="p-6 space-y-5">

                {/* Eng rate */}
                <div className="bg-amber-50 rounded-xl p-4">
                  <p className="text-xs font-black text-amber-600 uppercase tracking-wider mb-3">Engagement rate (%)</p>
                  <div className="grid grid-cols-2 gap-4">
                    {([
                      { label: 'AddFame (platforma ta)', key: 'eng_rate_addfame' as const, hint: 'Media platformei noastre' },
                      { label: 'Industrie (benchmark)', key: 'eng_rate_industry' as const, hint: 'Media generală din industrie' },
                    ] as const).map(f => (
                      <div key={f.key}>
                        <label className="block text-xs font-bold text-amber-700 mb-1.5">{f.label}</label>
                        <div className="relative">
                          <input type="number" min={0} max={100} step={0.1}
                            value={agency[f.key]}
                            onChange={e => setAgency(p => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))}
                            className="w-full pl-4 pr-10 py-2.5 border-2 border-amber-200 rounded-xl text-sm font-black text-gray-900 outline-none focus:border-amber-400 bg-white transition"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-amber-400">%</span>
                        </div>
                        <p className="text-xs text-amber-600 mt-1">{f.hint}</p>
                      </div>
                    ))}
                  </div>
                  {agency.eng_rate_addfame > agency.eng_rate_industry && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-100 rounded-lg px-3 py-2">
                      <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
                      AddFame este cu <strong>{((agency.eng_rate_addfame / agency.eng_rate_industry - 1) * 100).toFixed(0)}% mai performant</strong> față de industrie — asta apare brandurilor
                    </div>
                  )}
                </div>

                {/* Preview card */}
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Preview — cum apare brandului</p>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Setup campanie', addfame: agency.setup_time_addfame || '—', agency: agency.setup_time_agency || '—' },
                      { label: 'Selecție influenceri', addfame: agency.selection_addfame || '—', agency: agency.selection_agency || '—' },
                      { label: 'Raportare', addfame: agency.reporting_addfame || '—', agency: agency.reporting_agency || '—' },
                    ].map(row => (
                      <div key={row.label} className="flex items-center gap-2 text-xs bg-gray-50 rounded-xl px-3 py-2">
                        <span className="text-gray-500 w-32 flex-shrink-0">{row.label}</span>
                        <span className="bg-green-100 text-green-700 font-black px-2 py-0.5 rounded-md flex-1 text-center">{row.addfame}</span>
                        <span className="text-gray-300 text-[10px]">vs</span>
                        <span className="text-red-400 line-through flex-1 text-center">{row.agency}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* ─── TAB: EAWB SENDER ──────────────────────────────────── */}
        {activeTab === 'eawb' && (
          <div className="space-y-5">

            {/* Info card */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
              <Truck className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-black text-indigo-800 mb-1">Adresa expeditor pentru AWB-uri eAWB</p>
                <p className="text-xs text-indigo-600 leading-relaxed">
                  Această adresă e folosită automat când generezi AWB-uri din <strong>/admin/deliveries</strong>. 
                  Se salvează în platformă — nu mai trebuie configurată în Vercel.
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-50 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Package className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">Date expeditor</p>
                  <p className="text-xs text-gray-400">De unde pleacă coletele către influenceri</p>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-1.5">Persoana de contact *</label>
                    <input value={eawbSender.contact}
                      onChange={e => setEawbSender(p => ({ ...p, contact: e.target.value }))}
                      placeholder="ex: Stancu Marius Ciprian"
                      className="w-full px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 bg-gray-50 focus:bg-white transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-1.5">Telefon *</label>
                    <input value={eawbSender.phone}
                      onChange={e => setEawbSender(p => ({ ...p, phone: e.target.value }))}
                      placeholder="ex: 0765389576"
                      className="w-full px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 bg-gray-50 focus:bg-white transition" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-1.5">Email (opțional)</label>
                    <input value={eawbSender.email} type="email"
                      onChange={e => setEawbSender(p => ({ ...p, email: e.target.value }))}
                      placeholder="ex: contact@addfame.ro"
                      className="w-full px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 bg-gray-50 focus:bg-white transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-1.5">Stradă *</label>
                    <input value={eawbSender.street}
                      onChange={e => setEawbSender(p => ({ ...p, street: e.target.value }))}
                      placeholder="ex: Strada Exemplu"
                      className="w-full px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 bg-gray-50 focus:bg-white transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-1.5">Număr *</label>
                    <input value={eawbSender.street_number}
                      onChange={e => setEawbSender(p => ({ ...p, street_number: e.target.value }))}
                      placeholder="ex: 10, bl A, sc 1, ap 5"
                      className="w-full px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 bg-gray-50 focus:bg-white transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-1.5">Oraș *</label>
                    <input value={eawbSender.city}
                      onChange={e => setEawbSender(p => ({ ...p, city: e.target.value }))}
                      placeholder="ex: Bucuresti"
                      className="w-full px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 bg-gray-50 focus:bg-white transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-1.5">Județ *</label>
                    <input value={eawbSender.county}
                      onChange={e => setEawbSender(p => ({ ...p, county: e.target.value }))}
                      placeholder="ex: Ilfov"
                      className="w-full px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 bg-gray-50 focus:bg-white transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-1.5">Cod poștal *</label>
                    <input value={eawbSender.postal_code}
                      onChange={e => setEawbSender(p => ({ ...p, postal_code: e.target.value }))}
                      placeholder="ex: 077190"
                      className="w-full px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 bg-gray-50 focus:bg-white transition" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-1.5">Billing Address ID</label>
                    <input type="number" value={eawbSender.billing_address_id}
                      onChange={e => setEawbSender(p => ({ ...p, billing_address_id: parseInt(e.target.value) || 1 }))}
                      placeholder="1"
                      className="w-full px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 bg-gray-50 focus:bg-white transition" />
                    <p className="text-xs text-gray-400 mt-1">ID-ul adresei de facturare din contul eAWB (default: 1)</p>
                  </div>
                </div>

                {/* Preview */}
                {eawbSender.contact && eawbSender.street && (
                  <div className="mt-5 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                    <p className="text-xs font-black text-indigo-600 uppercase tracking-wider mb-2">Preview adresă expeditor</p>
                    <p className="text-sm font-bold text-gray-800">{eawbSender.contact}</p>
                    {eawbSender.phone && <p className="text-xs text-gray-600">📞 {eawbSender.phone}</p>}
                    {eawbSender.email && <p className="text-xs text-gray-600">✉️ {eawbSender.email}</p>}
                    <p className="text-xs text-gray-600">🏠 {eawbSender.street} {eawbSender.street_number}</p>
                    <p className="text-xs text-gray-600">📍 {eawbSender.city}, {eawbSender.county} {eawbSender.postal_code}</p>
                  </div>
                )}

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400">* Câmpuri obligatorii pentru generarea AWB</p>
                  <button onClick={saveEawbSender} disabled={eawbSaving}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition disabled:opacity-60 ${eawbSaved ? 'bg-green-500' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                    {eawbSaving ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Se salvează...</>
                    ) : eawbSaved ? (
                      <><CheckCircle className="w-4 h-4" />Salvat!</>
                    ) : (
                      <><Save className="w-4 h-4" />Salvează adresa</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Bottom navigation between tabs */}
        <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Modificările se aplică imediat după salvare pentru toți utilizatorii platformei.
          </p>
          <div className="flex gap-2">
            {activeTab === 'comparatie' && (
              <button
                onClick={() => setActiveTab('comisioane')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition"
              >
                Setări comisioane <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
