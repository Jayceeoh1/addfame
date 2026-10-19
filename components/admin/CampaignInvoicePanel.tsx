'use client'

// Admin → Campanii → Acțiuni: emite o factură SmartBill pentru campanie, pe suma introdusă de admin.
import { useEffect, useMemo, useState, useCallback } from 'react'
import { getCampaignInvoicePanel, issueCampaignInvoice } from '@/app/actions/campaign-invoices'
import { parseInvoiceAmount } from '@/lib/campaign-invoice'

const STATUS: Record<string, { l: string; c: string }> = {
  issued: { l: 'Emisă', c: 'bg-green-50 text-green-700 border-green-200' },
  pending: { l: 'Se emite…', c: 'bg-amber-50 text-amber-700 border-amber-200' },
  check: { l: 'De verificat în SmartBill', c: 'bg-red-50 text-red-700 border-red-200' },
  failed: { l: 'Refuzată', c: 'bg-gray-50 text-gray-600 border-gray-200' },
}
const newKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

export default function CampaignInvoicePanel({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<any>(null)
  const [err, setErr] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const [key, setKey] = useState(newKey)
  const [f, setF] = useState({ amount: '', description: '', name: '', vat: '', reg_com: '', address: '', city: '', email: '' })

  const load = useCallback(async () => {
    const r: any = await getCampaignInvoicePanel(campaignId)
    if (r?.error) { setErr(r.error); return }
    setErr(null); setData(r)
    setF(p => ({
      ...p,
      name: p.name || r.brand.name, vat: p.vat || r.brand.vat, address: p.address || r.brand.address, email: p.email || r.brand.email,
      description: p.description || `Servicii de promovare prin influenceri — campania „${r.campaignTitle}”`,
    }))
  }, [campaignId])
  useEffect(() => { load() }, [load])

  const amount = useMemo(() => parseInvoiceAmount(f.amount), [f.amount])
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF(p => ({ ...p, [k]: e.target.value }))

  async function submit() {
    if (busy) return
    setBusy(true); setMsg(null)
    const r: any = await issueCampaignInvoice(campaignId, {
      amount: f.amount, description: f.description, request_key: key,
      client: { name: f.name, vat: f.vat, reg_com: f.reg_com, address: f.address, city: f.city, email: f.email },
    })
    setBusy(false)
    if (r?.error) { setMsg({ ok: false, t: r.error }); load(); return }
    setMsg({ ok: true, t: `Factura ${r.number} a fost emisă.` })
    setOpen(false); setKey(newKey()); setF(p => ({ ...p, amount: '' })); load()
  }

  const inp = 'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium focus:outline-none focus:border-violet-400'
  const lab = 'text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1 block'

  return (
    <div className="border-2 border-violet-200 rounded-2xl p-4 bg-gradient-to-br from-violet-50 to-indigo-50">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <p className="text-xs font-black text-violet-600 uppercase tracking-wider mb-1">🧾 Factură campanie</p>
          <p className="text-sm font-black text-gray-900 mb-1">Emite factură SmartBill pe suma pe care o alegi</p>
          <p className="text-xs text-gray-500">Datele brandului se completează singure și le poți corecta. Seria ADDF.</p>
        </div>
        {data && !open && (
          <button onClick={() => { setOpen(true); setMsg(null) }} className="px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-black transition">Emite factură</button>
        )}
      </div>

      {err && <p className="mt-3 text-xs font-bold text-red-600">{err}</p>}
      {data?.smartbillMissing?.length > 0 && <p className="mt-3 text-xs font-bold text-red-600">Lipsește din Vercel: {data.smartbillMissing.join(', ')}</p>}
      {msg && <p className={`mt-3 text-xs font-bold ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.t}</p>}

      {open && (
        <div className="mt-4 bg-white rounded-xl border border-violet-100 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><label className={lab}>Suma (RON)</label><input className={inp} inputMode="decimal" placeholder="ex. 1.250,00" value={f.amount} onChange={set('amount')} /></div>
            <div className="sm:col-span-2"><label className={lab}>Descriere pe factură</label><input className={inp} value={f.description} onChange={set('description')} maxLength={300} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={lab}>Client</label><input className={inp} value={f.name} onChange={set('name')} /></div>
            <div><label className={lab}>CUI</label><input className={inp} value={f.vat} onChange={set('vat')} placeholder="RO12345678" /></div>
            <div><label className={lab}>Reg. Com.</label><input className={inp} value={f.reg_com} onChange={set('reg_com')} placeholder="J40/123/2020" /></div>
            <div><label className={lab}>Oraș</label><input className={inp} value={f.city} onChange={set('city')} /></div>
            <div className="sm:col-span-2"><label className={lab}>Adresă sediu</label><input className={inp} value={f.address} onChange={set('address')} /></div>
            <div className="sm:col-span-2"><label className={lab}>Email (aici trimite SmartBill factura, dacă îl completezi)</label><input className={inp} value={f.email} onChange={set('email')} /></div>
          </div>
          <p className="text-[11px] text-gray-500">Se emite o factură fiscală reală în SmartBill{amount ? <> de <b>{amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</b></> : null}. Dacă AddFame e plătitor de TVA, suma se consideră cu TVA inclus.</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-black text-gray-600">Renunță</button>
            <button onClick={submit} disabled={busy || !amount} className="px-4 py-2 rounded-lg bg-violet-600 disabled:opacity-50 hover:bg-violet-700 text-white text-xs font-black">
              {busy ? 'Se emite…' : `Emite factura${amount ? ` · ${amount.toLocaleString('ro-RO')} RON` : ''}`}
            </button>
          </div>
        </div>
      )}

      {data?.invoices?.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {data.invoices.map((i: any) => {
            const st = STATUS[i.status] || STATUS.failed
            return (
              <div key={i.id} className="flex items-center gap-2 flex-wrap bg-white rounded-xl border border-violet-100 px-3 py-2">
                <span className="text-sm font-black text-gray-900">{i.smartbill_number || '—'}</span>
                <span className="text-sm font-bold text-gray-700">{Number(i.amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</span>
                <span className={`text-[10px] font-black border px-2 py-0.5 rounded-full ${st.c}`}>{st.l}</span>
                <span className="text-[11px] text-gray-400">{new Date(i.created_at).toLocaleDateString('ro-RO')}</span>
                {i.status === 'issued' && <a href={`/api/smartbill/campaign-invoice-pdf?id=${i.id}`} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs font-black text-violet-600 hover:underline">Vezi PDF</a>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
