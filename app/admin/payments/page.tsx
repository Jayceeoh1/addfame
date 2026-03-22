'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAllPayments, confirmPayment, rejectPayment } from '@/app/actions/admin'
import { DollarSign, Search, Check, X, RefreshCw, Clock, CheckCircle, XCircle, Building2, CreditCard, Smartphone, Globe, Shield, TrendingUp, ChevronDown, ChevronUp, Copy, AlertCircle } from 'lucide-react'

const STATUS: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: 'În așteptare', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  completed: { label: 'Confirmat', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  failed: { label: 'Respins', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' },
}
const METHOD_ICONS: Record<string, any> = { bank_transfer: Building2, paypal: CreditCard, revolut: Smartphone, wise: TrendingUp, crypto: Shield }
const METHOD_LABELS: Record<string, string> = { bank_transfer: 'Bank Transfer', paypal: 'PayPal', revolut: 'Revolut', wise: 'Wise', crypto: 'Crypto' }

const fmt = (n: number) => `${Math.abs(n).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="ml-1 text-gray-400 hover:text-indigo-600 transition">
      {copied ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}

export default function AdminPayments() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [actionId, setActionId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    const res = await getAllPayments() as any
    if (res.success) setPayments(res.data ?? [])
    else setError(res.error ?? 'Eroare')
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function doConfirm(id: string) {
    if (!confirm('Confirmă că ai primit plata și vrei să adaugi creditele brandului?')) return
    setActionId(id)
    const res = await confirmPayment(id) as any
    if (res.success) {
      setPayments(p => p.map(t => t.id === id ? { ...t, status: 'completed' } : t))
      notify('✅ Plată confirmată! Credite adăugate în walletul brandului.')
    } else notify(res.error || 'Eroare.', false)
    setActionId(null)
  }

  async function doReject(id: string) {
    if (!confirm('Respinge această plată?')) return
    setActionId(id)
    const res = await rejectPayment(id) as any
    if (res.success) {
      setPayments(p => p.map(t => t.id === id ? { ...t, status: 'failed' } : t))
      notify('Plată respinsă.')
    } else notify(res.error || 'Eroare.', false)
    setActionId(null)
  }

  const filtered = payments.filter(p => {
    const name = p.brand?.name?.toLowerCase() ?? ''
    const inv = p.invoice_number?.toLowerCase() ?? ''
    const matchSearch = !search || name.includes(search.toLowerCase()) || inv.includes(search.toLowerCase())
    const matchFilter = filter === 'all' || p.status === filter
    return matchSearch && matchFilter
  })

  const totals = {
    pending: payments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0),
    completed: payments.filter(p => p.status === 'completed').reduce((s, p) => s + (p.amount || 0), 0),
    count_pending: payments.filter(p => p.status === 'pending').length,
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>

      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl font-bold text-sm text-white ${toast.ok ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />} {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Plăți Branduri</h1>
          <p className="text-sm text-gray-400 mt-0.5">Confirmă top-up-urile primite manual și adaugă creditele</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-indigo-600 px-3 py-2 rounded-xl border border-gray-200 bg-white transition">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* How it works banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-black mb-1">Flux de confirmare manuală</p>
          <p>Brandul trimite banii și generează o factură. Tu verifici contul și dacă plata a ajuns, apasă <strong>Confirmă</strong>. Creditele sunt adăugate automat în walletul brandului și primesc notificare.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-amber-200 p-5">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">În așteptare</p>
          <p className="text-2xl font-black text-amber-600">{fmt(totals.pending)}</p>
          <p className="text-xs text-gray-400 mt-1">{totals.count_pending} plăți</p>
        </div>
        <div className="bg-white rounded-2xl border border-green-200 p-5">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Total confirmat</p>
          <p className="text-2xl font-black text-green-600">{fmt(totals.completed)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Total plăți</p>
          <p className="text-2xl font-black text-gray-900">{payments.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Caută brand sau factură..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
        <div className="flex gap-2">
          {[['all', 'Toate'], ['pending', 'În așteptare'], ['completed', 'Confirmate'], ['failed', 'Respinse']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} className={`px-3 py-2 rounded-xl text-xs font-black transition ${filter === v ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{l}</button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 text-sm font-bold text-red-600">Eroare: {error}</div>}

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16 bg-white rounded-2xl border border-gray-100">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <DollarSign className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="font-black text-gray-400">{payments.length === 0 ? 'Nu există plăți înregistrate' : 'Niciun rezultat'}</p>
          </div>
        ) : filtered.map(p => {
          const st = STATUS[p.status] ?? STATUS.pending
          const busy = actionId === p.id
          const isExp = expanded === p.id
          const MethodIcon = METHOD_ICONS[p.payment_method] ?? DollarSign
          const billing = p.billing_details ?? {}

          return (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {/* Main row */}
              <div className="flex items-center gap-4 p-5 flex-wrap">
                {/* Brand avatar */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                  {p.brand?.name?.[0]?.toUpperCase() ?? 'B'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-gray-900">{p.brand?.name ?? 'Brand necunoscut'}</p>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black ${st.bg} ${st.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
                    </span>
                    {p.type === 'TOPUP' && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">TOP-UP</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <p className="text-xs text-gray-400">{p.brand?.email ?? ''}</p>
                    {p.invoice_number && (
                      <div className="flex items-center text-xs text-gray-400 font-mono">
                        {p.invoice_number} <CopyBtn text={p.invoice_number} />
                      </div>
                    )}
                    <p className="text-xs text-gray-400">{fmtDate(p.created_at)}</p>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-xl text-gray-900">{fmt(p.amount)}</p>
                  {p.payment_method && (
                    <div className="flex items-center gap-1 justify-end mt-0.5 text-xs text-gray-400">
                      <MethodIcon className="w-3 h-3" />
                      {METHOD_LABELS[p.payment_method] ?? p.payment_method}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setExpanded(isExp ? null : p.id)}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-500 text-xs font-bold rounded-xl transition">
                    {isExp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {isExp ? 'Ascunde' : 'Detalii'}
                  </button>
                  {p.status === 'pending' && <>
                    <button onClick={() => doConfirm(p.id)} disabled={busy}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-black rounded-xl transition disabled:opacity-50">
                      <Check className="w-3 h-3" /> Confirmă
                    </button>
                    <button onClick={() => doReject(p.id)} disabled={busy}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-black rounded-xl transition disabled:opacity-50">
                      <X className="w-3 h-3" /> Respinge
                    </button>
                  </>}
                </div>
              </div>

              {/* Expanded details */}
              {isExp && (
                <div className="border-t border-gray-100 p-5 bg-gray-50 grid md:grid-cols-2 gap-6">
                  {/* Payment info */}
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Detalii plată</p>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2.5">
                      {p.payment_reference && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Referință</span>
                          <div className="flex items-center font-black text-gray-900">
                            <span className="font-mono text-xs">{p.payment_reference}</span>
                            <CopyBtn text={p.payment_reference} />
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Metodă</span>
                        <span className="font-black">{METHOD_LABELS[p.payment_method] ?? p.payment_method ?? '—'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Sumă</span>
                        <span className="font-black text-green-600">{fmt(p.amount)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Data</span>
                        <span className="font-black">{fmtDate(p.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Billing */}
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Date facturare</p>
                    {Object.keys(billing).length > 0 ? (
                      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2.5">
                        {(Object.entries(billing) as Array<[string, unknown]>).map(([k, v]): React.ReactNode => v ? (
                          <div key={k} className="flex justify-between text-sm">
                            <span className="text-gray-400 capitalize">{k}</span>
                            <span className="font-black text-gray-900 text-right break-all max-w-[60%]">{String(v)}</span>
                          </div>
                        ) : null)}
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm text-gray-400">
                        Fără date de facturare completate.
                      </div>
                    )}
                    {p.status === 'pending' && (
                      <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                        Verifică dacă suma de <strong>{fmt(p.amount)}</strong> a ajuns în cont, apoi apasă <strong>Confirmă</strong>.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
