// @ts-nocheck
'use client'
import { EyeOff, Pause, X } from 'lucide-react'

export function PauseModal({ campaign, statusLoading, onConfirm, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6" style={{ animation: 'fadeUp .3s ease' }}>
        <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-4">
          <Pause className="w-7 h-7 text-orange-500" />
        </div>
        <h2 className="text-xl font-black text-gray-900 text-center mb-2">Ești sigur că vrei să pui pauză?</h2>
        <p className="text-sm text-gray-500 text-center mb-5 leading-relaxed">
          Dacă pui campania pe pauză, <span className="font-black text-red-600">35% din bugetul campaniei</span> va fi reținut ca penalitate.
        </p>
        {campaign && <PenaltyBreakdown campaign={campaign} />}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
          <p className="text-xs text-amber-700 font-semibold text-center">⚠️ Dacă ai colaborări active, campania nu poate fi pauzată. Trebuie să aștepți finalizarea lor.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl font-black text-sm text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition">Anulează</button>
          <button onClick={onConfirm} disabled={statusLoading} className="flex-1 py-3 rounded-2xl font-black text-sm text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 transition flex items-center justify-center gap-2">
            {statusLoading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Pause className="w-4 h-4" />}
            Confirmă pauza
          </button>
        </div>
      </div>
    </div>
  )
}

export function DraftModal({ campaign, statusLoading, onConfirm, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6" style={{ animation: 'fadeUp .3s ease' }}>
        <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <EyeOff className="w-7 h-7 text-amber-500" />
        </div>
        <h2 className="text-xl font-black text-gray-900 text-center mb-2">Muți campania în Draft?</h2>
        <p className="text-sm text-gray-500 text-center mb-5 leading-relaxed">
          Mutarea în Draft oprește campania. <span className="font-black text-red-600">35% din buget</span> va fi reținut ca penalitate.
        </p>
        {campaign && <PenaltyBreakdown campaign={campaign} />}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
          <p className="text-xs text-amber-700 font-semibold text-center">⚠️ Dacă ai colaborări active, campania nu poate fi mutată în Draft. Trebuie să aștepți finalizarea lor.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl font-black text-sm text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition">Anulează</button>
          <button onClick={onConfirm} disabled={statusLoading} className="flex-1 py-3 rounded-2xl font-black text-sm text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 transition flex items-center justify-center gap-2">
            {statusLoading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <EyeOff className="w-4 h-4" />}
            Confirmă mutarea
          </button>
        </div>
      </div>
    </div>
  )
}

export function RejectModal({ rejectModal, rejectReason, setRejectReason, rejecting, onConfirm, onClose }: any) {
  if (!rejectModal) return null
  const QUICK_REASONS = [
    'Ne pare rău, am finalizat lista de influenceri pentru această campanie. Nu îți face griji — lansăm campanii noi des și șansele să fii selectat(ă) sunt mari! Te ținem la curent. 🙌',
    'Profilul nu se potrivește cu brandul nostru',
    'Număr insuficient de followeri',
    'Nișa nu se potrivește cu campania',
    'Am atins numărul maxim de colaboratori',
    'Conținutul anterior nu se aliniază cu valorile noastre',
  ]

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
        <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <X className="w-6 h-6 text-red-500" />
        </div>
        <h2 className="text-lg font-black text-gray-900 text-center mb-1">Refuzi colaborarea?</h2>
        <p className="text-sm text-gray-500 text-center mb-5">{rejectModal.name} va primi o notificare cu motivul refuzului.</p>
        <div className="mb-3">
          <p className="text-xs font-bold text-gray-500 mb-2">Motive rapide:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_REASONS.map(msg => (
              <button key={msg} type="button" onClick={() => setRejectReason(msg)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition ${rejectReason === msg ? 'bg-red-50 border-red-300 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-600'}`}>
                {msg}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-5">
          <label className="text-xs font-bold text-gray-500 block mb-1.5">Sau scrie un mesaj custom <span className="text-gray-400">(opțional)</span></label>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            placeholder="ex. Mulțumim pentru aplicație, dar în acest moment căutăm un profil diferit..."
            rows={3} className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm outline-none focus:border-red-300 transition resize-none" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl font-black text-sm text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition">Anulează</button>
          <button onClick={onConfirm} disabled={rejecting} className="flex-1 py-3 rounded-2xl font-black text-sm text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition flex items-center justify-center gap-2">
            {rejecting ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <X className="w-4 h-4" />}
            Confirmă refuzul
          </button>
        </div>
      </div>
    </div>
  )
}

function PenaltyBreakdown({ campaign }: any) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">Buget campanie</span>
        <span className="font-black text-gray-700">{(campaign.budget || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-red-600 font-bold">Penalitate reținută (35%)</span>
        <span className="font-black text-red-600">- {(Math.round((campaign.budget || 0) * 0.35 * 100) / 100).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</span>
      </div>
      <div className="border-t border-red-200 pt-2 flex items-center justify-between text-sm">
        <span className="text-green-600 font-bold">Credite returnate (65%)</span>
        <span className="font-black text-green-600">{(Math.round((campaign.budget || 0) * 0.65 * 100) / 100).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</span>
      </div>
    </div>
  )
}
