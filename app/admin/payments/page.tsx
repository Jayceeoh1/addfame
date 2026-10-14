'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAllPayments, confirmPayment, rejectPayment, retryTopupInvoice, linkTopupInvoice, getSmartBillStatus } from '@/app/actions/admin'
import { DollarSign, Search, Check, X, RefreshCw, Clock, CheckCircle, XCircle, Building2, CreditCard, Smartphone, Globe, Shield, TrendingUp, ChevronDown, ChevronUp, Copy, AlertCircle, Receipt, Download } from 'lucide-react'

const STATUS: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: 'În așteptare', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  completed: { label: 'Confirmat', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  failed: { label: 'Respins', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400' },
}
const METHOD_ICONS: Record<string, any> = { bank_transfer: Building2, paypal: CreditCard, revolut: Smartphone, wise: TrendingUp, crypto: Shield }
const METHOD_LABELS: Record<string, string> = { bank_transfer: 'Transfer bancar', stripe_card: 'Card', paypal: 'PayPal', revolut: 'Revolut', wise: 'Wise', crypto: 'Crypto' }

const fmt = (n: number) => `${Math.abs(n).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// Marcaje interne pentru factură: „EMITERE:…” = se emite acum, „VERIFICA” = rezultat nesigur
const realInvoice = (v?: string | null) => !!v && !v.startsWith('EMITERE') && v !== 'VERIFICA'
const invoiceToCheck = (v?: string | null) => !!v && (v.startsWith('EMITERE') || v === 'VERIFICA')

/** Lista facturilor legate de plăți — tot ce e în SmartBill pe seria ADDF și NU e aici e dublură. */
function exportInvoicesCsv(payments: any[]) {
  const rows = payments.filter(p => p.status === 'completed')
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [['Data plății', 'Brand', 'Nume factură', 'CUI', 'Sumă RON', 'Metodă', 'Referință', 'Factură SmartBill'].map(esc).join(';')]
  for (const p of rows) {
    const b = p.billing_details ?? {}
    lines.push([
      new Date(p.created_at).toLocaleString('ro-RO'), p.brand?.name, b.name, b.vat,
      Number(p.amount || 0).toFixed(2).replace('.', ','), METHOD_LABELS[p.payment_method] ?? p.payment_method,
      p.payment_reference || p.invoice_number,
      realInvoice(p.smartbill_invoice_number) ? p.smartbill_invoice_number : invoiceToCheck(p.smartbill_invoice_number) ? 'DE VERIFICAT' : 'FĂRĂ FACTURĂ',
    ].map(esc).join(';'))
  }
  const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `facturi-addfame-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

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

  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 5000) }
  const [sbStatus, setSbStatus] = useState<{ ok: boolean; series: string; nextNumber?: string; error?: string; vat?: number | null } | null>(null)
  const checkSB = useCallback(async () => { setSbStatus(null); setSbStatus(await getSmartBillStatus() as any) }, [])
  useEffect(() => { checkSB() }, [checkSB])

  const [linkInput, setLinkInput] = useState<Record<string, string>>({})
  const [armed, setArmed] = useState<string | null>(null) // al doilea click pentru „emite din nou”

  async function doLink(id: string) {
    setActionId(id)
    const res = await linkTopupInvoice(id, linkInput[id] || '') as any
    if (res.success) {
      setPayments(p => p.map(t => t.id === id ? { ...t, smartbill_invoice_number: res.invoice } : t))
      notify(`🧾 Factura ${res.invoice} a fost legată de plată.`)
    } else notify(res.error || 'Eroare.', false)
    setActionId(null)
  }

  async function doInvoice(id: string, confirmedMissing = false) {
    setActionId(id); setArmed(null)
    const res = await retryTopupInvoice(id, confirmedMissing) as any
    if (res.success) {
      setPayments(p => p.map(t => t.id === id ? { ...t, smartbill_invoice_number: res.invoice } : t))
      notify(`🧾 Factura ${res.invoice} a fost emisă.`)
      checkSB()
    } else { notify(res.error || 'Eroare SmartBill.', false); load() }
    setActionId(null)
  }

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
      setPayments(p => p.map(t => t.id === id ? { ...t, status: 'completed', smartbill_invoice_number: res.invoice ?? t.smartbill_invoice_number } : t))
      if (res.invoice) notify(`✅ Credite adăugate. Factura ${res.invoice} emisă în SmartBill.`)
      else notify(`Credite adăugate, dar factura NU s-a emis: ${res.invoiceError || 'eroare SmartBill'}. Apasă „Emite factura”.`, false)
      checkSB()
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
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">

      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl font-bold text-sm text-white ${toast.ok ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />} {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Încărcări branduri</h1>
          <p className="text-sm text-gray-400 mt-0.5">Confirmă top-up-urile primite manual și adaugă creditele</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => exportInvoicesCsv(payments)} disabled={!payments.length}
            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-indigo-600 px-3 py-2 rounded-xl border border-gray-200 bg-white transition disabled:opacity-50"
            title="Toate plățile confirmate cu factura lor. Orice factură ADDF din SmartBill care nu apare aici este o dublură.">
            <Download className="w-4 h-4" /> Export facturi
          </button>
          <button onClick={load} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-indigo-600 px-3 py-2 rounded-xl border border-gray-200 bg-white transition">
            <RefreshCw className="w-4 h-4" /> Actualizează
          </button>
        </div>
      </div>

      {/* How it works banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700">
          <p className="font-black mb-1">Flux de confirmare manuală</p>
          <p>Brandul cere încărcarea și primește o referință unică (ex. ADF-2610-K7M4Q). Când vezi transferul cu acea referință în extras, apasă <strong>Confirmă</strong>: creditele intră în wallet, brandul primește notificare și email, iar factura se emite automat în SmartBill, seria ADDF.</p>
        </div>
      </div>

      {/* SmartBill */}
      <div className={`rounded-2xl p-4 mb-6 flex items-center gap-3 flex-wrap border ${sbStatus === null ? 'bg-gray-50 border-gray-200' : sbStatus.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <Receipt className={`w-5 h-5 flex-shrink-0 ${sbStatus?.ok ? 'text-green-600' : sbStatus ? 'text-red-500' : 'text-gray-400'}`} />
        <div className="flex-1 min-w-0 text-sm">
          {sbStatus === null ? <p className="text-gray-500 font-bold">Verific legătura cu SmartBill…</p>
            : sbStatus.ok ? <p className="text-green-800"><b>SmartBill conectat · seria {sbStatus.series}</b>{sbStatus.nextNumber ? ` · următoarea factură: ${sbStatus.series} ${sbStatus.nextNumber}` : ''} · {sbStatus.vat ? `TVA ${sbStatus.vat}% inclus` : 'fără TVA'}</p>
            : <p className="text-red-700"><b>SmartBill: </b>{sbStatus.error}</p>}
        </div>
        <button onClick={checkSB} className="text-xs font-bold text-gray-500 hover:text-indigo-600 px-3 py-1.5 rounded-xl border border-gray-200 bg-white">Verifică</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
                        Ref. {p.invoice_number} <CopyBtn text={p.invoice_number} />
                      </div>
                    )}
                    {p.status === 'completed' && (realInvoice(p.smartbill_invoice_number)
                      ? <a href={`/api/smartbill/invoice-pdf?transaction_id=${p.id}`} target="_blank" rel="noopener" className="text-xs font-black text-indigo-600 hover:underline">🧾 {p.smartbill_invoice_number}</a>
                      : invoiceToCheck(p.smartbill_invoice_number)
                        ? <span className="text-xs font-black text-amber-600">⚠ factură de verificat în SmartBill</span>
                        : <span className="text-xs font-black text-red-500">fără factură</span>)}
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
                  {p.status === 'completed' && invoiceToCheck(p.smartbill_invoice_number) && (
                    <button onClick={() => setExpanded(p.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition">
                      <AlertCircle className="w-3 h-3" /> Verifică factura
                    </button>
                  )}
                  {p.status === 'completed' && !p.smartbill_invoice_number && (
                    <button onClick={() => doInvoice(p.id)} disabled={busy}
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition disabled:opacity-50">
                      <Receipt className="w-3 h-3" /> Emite factura
                    </button>
                  )}
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

              {/* Factură de verificat: emiterea s-a întrerupt, poate există deja în SmartBill */}
              {isExp && p.status === 'completed' && invoiceToCheck(p.smartbill_invoice_number) && (
                <div className="border-t border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 space-y-3">
                  <p><b>Emiterea facturii s-a întrerupt.</b> Caută în SmartBill (seria ADDF) o factură pentru <b>{billing.name || p.brand?.name}</b>, <b>{fmt(p.amount)}</b>, din {fmtDate(p.created_at)}.</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input value={linkInput[p.id] ?? ''} onChange={e => setLinkInput(v => ({ ...v, [p.id]: e.target.value }))}
                      placeholder="ex. ADDF-0012" className="px-3 py-2 rounded-xl border border-amber-300 bg-white font-mono text-sm w-40 outline-none focus:ring-2 focus:ring-amber-200" />
                    <button onClick={() => doLink(p.id)} disabled={busy || !(linkInput[p.id] || '').trim()}
                      className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black disabled:opacity-50">Există — leag-o de plată</button>
                    {armed === p.id ? <>
                      <button onClick={() => doInvoice(p.id, true)} disabled={busy}
                        className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black disabled:opacity-50">Da, am verificat — emite factura</button>
                      <button onClick={() => setArmed(null)} className="px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-bold">Renunță</button>
                    </> : (
                      <button onClick={() => setArmed(p.id)} disabled={busy}
                        className="px-3 py-2 rounded-xl border border-amber-400 bg-white hover:bg-amber-100 text-xs font-black disabled:opacity-50">Nu există în SmartBill</button>
                    )}
                  </div>
                </div>
              )}

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
