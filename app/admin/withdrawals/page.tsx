'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAllWithdrawals, approveWithdrawal, rejectWithdrawal } from '@/app/actions/admin'
import { Search, Check, X, RefreshCw, CheckCircle, XCircle, Wallet, Building2, CreditCard, Smartphone, Shield, TrendingUp } from 'lucide-react'

const STATUS: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: 'În așteptare', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  completed: { label: 'Procesat', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  failed: { label: 'Respins', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' },
}
const METHOD_ICONS: Record<string, any> = { bank_transfer: Building2, paypal: CreditCard, revolut: Smartphone, wise: TrendingUp, crypto: Shield }
const METHOD_COLORS: Record<string, string> = { bank_transfer: 'text-blue-600 bg-blue-50', paypal: 'text-indigo-600 bg-indigo-50', revolut: 'text-cyan-600 bg-cyan-50', wise: 'text-green-600 bg-green-50', crypto: 'text-orange-600 bg-orange-50' }

const fmt = (n: number) => `${Math.abs(n).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function AdminWithdrawals() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [actionId, setActionId] = useState<string | null>(null)
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  const load = useCallback(async () => {
    setLoading(true); setFetchError(null)
    const res = await getAllWithdrawals() as any
    if (res.success) setItems(res.data ?? [])
    else setFetchError(res.error ?? 'Eroare')
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function doApprove(id: string) {
    setActionId(id)
    const res = await approveWithdrawal(id) as any
    if (res.success) { setItems(p => p.map(t => t.id === id ? { ...t, status: 'completed' } : t)); notify('✅ Aprobat! Influencerul a fost notificat.') }
    else notify(res.error || 'Eroare.', false)
    setActionId(null)
  }

  async function doReject() {
    if (!rejectModal || !rejectReason.trim()) return
    setActionId(rejectModal.id)
    const res = await rejectWithdrawal(rejectModal.id, rejectReason.trim()) as any
    if (res.success) { setItems(p => p.map(t => t.id === rejectModal!.id ? { ...t, status: 'failed' } : t)); notify('Respins. Suma returnată în wallet.') }
    else notify(res.error || 'Eroare.', false)
    setActionId(null); setRejectModal(null); setRejectReason('')
  }

  const filtered = items.filter(i => {
    const name = i.influencer?.name?.toLowerCase() ?? ''
    const matchSearch = !search || name.includes(search.toLowerCase())
    const matchFilter = filter === 'all' || i.status === filter
    return matchSearch && matchFilter
  })

  const totals = {
    pending: items.filter(i => i.status === 'pending').reduce((s, i) => s + Math.abs(i.amount), 0),
    completed: items.filter(i => i.status === 'completed').reduce((s, i) => s + Math.abs(i.amount), 0),
    count_pending: items.filter(i => i.status === 'pending').length,
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
          <h1 className="text-2xl font-black text-gray-900">Retrageri Influenceri</h1>
          <p className="text-sm text-gray-400 mt-0.5">Verifică detaliile și aprobă după ce ai trimis banii</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-indigo-600 px-3 py-2 rounded-xl border border-gray-200 bg-white transition">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-amber-200 p-5">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">În așteptare</p>
          <p className="text-2xl font-black text-amber-600">{fmt(totals.pending)}</p>
          <p className="text-xs text-gray-400 mt-1">{totals.count_pending} cereri</p>
        </div>
        <div className="bg-white rounded-2xl border border-green-200 p-5">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Procesate total</p>
          <p className="text-2xl font-black text-green-600">{fmt(totals.completed)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Total cereri</p>
          <p className="text-2xl font-black text-gray-900">{items.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Caută influencer..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
        <div className="flex gap-2">
          {[['all', 'Toate'], ['pending', 'În așteptare'], ['completed', 'Procesate'], ['failed', 'Respinse']].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} className={`px-3 py-2 rounded-xl text-xs font-black transition ${filter === v ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{l}</button>
          ))}
        </div>
      </div>

      {fetchError && <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-5 text-sm font-bold text-red-600">Eroare: {fetchError}</div>}

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16 bg-white rounded-2xl border border-gray-100">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <Wallet className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="font-black text-gray-400">{items.length === 0 ? 'Nu există cereri de retragere' : 'Niciun rezultat'}</p>
          </div>
        ) : filtered.map((item) => {
          const st = STATUS[item.status] ?? STATUS.pending
          const busy = actionId === item.id
          const isExp = expanded === item.id
          const method = item.default_method
          const MethodIcon = method ? (METHOD_ICONS[method.type] ?? Wallet) : Wallet
          const methodColor = method ? (METHOD_COLORS[method.type] ?? 'text-gray-600 bg-gray-50') : 'text-gray-600 bg-gray-50'
          const gross = Math.abs(item.amount)
          const fee = item.fee ?? Math.round(gross * 0.05 * 100) / 100
          const net = gross - fee

          return (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-4 p-5 flex-wrap">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                  {item.influencer?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-gray-900">{item.influencer?.name ?? 'Influencer necunoscut'}</p>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black ${st.bg} ${st.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{item.influencer?.email ?? '—'} · {fmtDate(item.created_at)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-lg text-gray-900">{fmt(gross)}</p>
                  <p className="text-xs text-gray-400">net de trimis: <span className="font-black text-green-600">{fmt(net)}</span></p>
                </div>
                {method ? (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black ${methodColor} flex-shrink-0`}>
                    <MethodIcon className="w-3.5 h-3.5" /> {method.label || method.type}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-amber-50 text-amber-600 flex-shrink-0">
                    ⚠️ Fără metodă
                  </div>
                )}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setExpanded(isExp ? null : item.id)}
                    className="px-3 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-500 text-xs font-bold rounded-xl transition">
                    {isExp ? 'Ascunde' : '🔍 Detalii'}
                  </button>
                  {item.status === 'pending' && <>
                    <button onClick={() => doApprove(item.id)} disabled={busy}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-black rounded-xl transition disabled:opacity-50">
                      <Check className="w-3 h-3" /> Aprobă
                    </button>
                    <button onClick={() => setRejectModal({ id: item.id, name: item.influencer?.name ?? '' })} disabled={busy}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-black rounded-xl transition disabled:opacity-50">
                      <X className="w-3 h-3" /> Respinge
                    </button>
                  </>}
                </div>
              </div>

              {isExp && (
                <div className="border-t border-gray-100 p-5 bg-gray-50 grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Unde trimiți banii</p>
                    {method ? (
                      <>
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black ${methodColor} mb-3`}>
                          <MethodIcon className="w-3.5 h-3.5" /> {method.label || method.type}
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2.5">
                          {Object.entries(method.details ?? {}).map(([k, v]) => (
                            <div key={k} className="flex items-start justify-between gap-4">
                              <span className="text-xs text-gray-400 capitalize flex-shrink-0">{k.replace(/_/g, ' ')}</span>
                              <span className="text-xs font-black text-gray-900 text-right break-all select-all">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 font-semibold">
                        ⚠️ Fără metodă salvată. Contactează la {item.influencer?.email}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Sumar</p>
                    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-gray-500">Sumă solicitată</span><span className="font-black">{fmt(gross)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-500">Fee platformă 5%</span><span className="font-bold text-red-500">-{fmt(fee)}</span></div>
                      <div className="flex justify-between text-sm border-t border-gray-100 pt-2 mt-1">
                        <span className="font-black">De trimis</span>
                        <span className="font-black text-green-600 text-base">{fmt(net)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-3 leading-relaxed">
                      Trimite <strong>{fmt(net)}</strong> în contul de mai sus, apoi apasă <strong>Aprobă</strong>. Influencerul e notificat automat.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-black text-gray-900 mb-1">Respinge retragerea</h3>
            <p className="text-sm text-gray-500 mb-4">Suma va fi returnată automat în walletul lui <strong>{rejectModal.name}</strong>.</p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
              placeholder="Motivul respingerii..." className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200 resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setRejectModal(null); setRejectReason('') }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">Anulează</button>
              <button onClick={doReject} disabled={!rejectReason.trim() || !!actionId}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-black rounded-xl disabled:opacity-50 transition">Respinge</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
