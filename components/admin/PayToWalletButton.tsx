'use client'
// Buton „Plătește în wallet” pe o colaborare (admin). Cere suma, arată ce s-a plătit deja și cere confirmare.
import { useState } from 'react'
import { Wallet, Loader2, Check, X } from 'lucide-react'
import { adminPayToWallet } from '@/app/actions/admin-wallet'

export default function PayToWalletButton({ collabId, name, paid, suggested, onPaid }: {
  collabId: string; name: string; paid: number; suggested: number; onPaid: (paid: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(suggested > 0 ? String(suggested) : '')
  const [note, setNote] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const value = Number(String(amount).replace(',', '.'))

  async function pay() {
    setBusy(true); setMsg(null)
    const r: any = await adminPayToWallet(collabId, amount, note)
    setBusy(false); setConfirm(false)
    if (r?.error) return setMsg({ ok: false, text: r.error })
    setMsg({ ok: true, text: `Plătit. ${name} are acum ${r.balance != null ? r.balance.toLocaleString('ro-RO') + ' RON' : 'banii'} în wallet.` })
    setOpen(false); setNote('')
    onPaid(r.paid)
  }

  if (!open) return (
    <span className="inline-flex items-center gap-2 flex-wrap">
      <button type="button" onClick={() => { setOpen(true); setMsg(null) }}
        className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition">
        <Wallet className="w-3.5 h-3.5" /> Plătește în wallet
      </button>
      {msg && <span className={`text-xs font-bold ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</span>}
    </span>
  )

  return (
    <div className="w-full rounded-xl border-2 border-violet-200 bg-violet-50 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <b className="text-sm text-gray-900">Plătește în wallet-ul lui {name}</b>
        <button type="button" onClick={() => { setOpen(false); setConfirm(false) }} aria-label="Închide" className="w-8 h-8 rounded-lg hover:bg-white flex items-center justify-center text-gray-500"><X className="w-4 h-4" /></button>
      </div>
      {paid > 0 && <p className="text-xs font-bold text-amber-700">Atenție: pe această colaborare s-au plătit deja {paid.toLocaleString('ro-RO')} RON. Suma de mai jos se adaugă peste.</p>}
      <div className="flex flex-wrap gap-2">
        <label className="flex flex-col gap-1 text-xs font-bold text-gray-600">Sumă (RON)
          <input inputMode="decimal" value={amount} onChange={e => { setAmount(e.target.value); setConfirm(false) }}
            className="h-10 w-32 rounded-lg border-2 border-gray-200 px-3 text-sm font-bold text-gray-900 bg-white" placeholder="200" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-gray-600 flex-1 min-w-[180px]">Notă (opțional, apare în istoricul creatorului)
          <input value={note} onChange={e => setNote(e.target.value)} maxLength={160}
            className="h-10 rounded-lg border-2 border-gray-200 px-3 text-sm text-gray-900 bg-white" placeholder="ex. plată pe factura ADDF-0014" />
        </label>
      </div>
      {!confirm ? (
        <button type="button" disabled={!(value > 0)} onClick={() => setConfirm(true)}
          className="self-start h-10 px-4 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-black">Continuă</button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black text-gray-900">Sigur pui {value.toLocaleString('ro-RO')} RON în wallet-ul lui {name}?</span>
          <button type="button" onClick={pay} disabled={busy}
            className="h-10 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-black inline-flex items-center gap-1.5">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Da, plătește
          </button>
          <button type="button" onClick={() => setConfirm(false)} className="h-10 px-4 rounded-lg bg-white border-2 border-gray-200 text-xs font-black text-gray-700">Nu</button>
        </div>
      )}
      {msg && !msg.ok && <span className="text-xs font-bold text-red-600">{msg.text}</span>}
    </div>
  )
}
