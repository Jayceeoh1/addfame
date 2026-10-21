'use client'

// Dashboard: întrebăm o singură dată dacă creatorul vrea anunțuri de campanii pe WhatsApp (acordul cerut de WhatsApp).
import { useEffect, useState } from 'react'
import { getWaOptIn, setWaOptIn } from '@/app/actions/whatsapp-campaign'

export default function WhatsAppOptInCard() {
  const [st, setSt] = useState<{ show: boolean; phone?: string } | null>(null)
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [done, setDone] = useState<'' | 'yes' | 'no'>('')
  useEffect(() => { getWaOptIn().then(r => { setSt(r); setPhone((r as any).phone || '') }).catch(() => {}) }, [])
  if (!st?.show && !done) return null
  if (done === 'no') return null
  async function answer(yes: boolean) {
    setBusy(true); setMsg('')
    const r = await setWaOptIn(yes, phone)
    setBusy(false)
    if ('error' in r) { setMsg(r.error || 'Eroare'); return }
    setDone(yes ? 'yes' : 'no')
  }
  return (
    <div className="waoc">
      <style>{`
        .waoc { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 18px; padding: 16px 20px; border-radius: 20px; background: #ecf8f0; border: 1.5px solid #bfe6cc; color: #12301f; }
        .waoc-txt { flex: 1 1 260px; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .waoc-t { font-size: 17px; font-weight: 800; }
        .waoc-s { font-size: 14px; color: #355a44; }
        .waoc-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
        .waoc input { height: 44px; width: 170px; max-width: 100%; border-radius: 12px; border: 1.5px solid #bfe6cc; padding: 0 12px; font-size: 15px; background: #fff; }
        .waoc button { height: 44px; padding: 0 16px; border-radius: 12px; font-weight: 800; font-size: 14px; border: 0; cursor: pointer; }
        .waoc .y { background: #1f9d55; color: #fff; } .waoc .n { background: transparent; color: #355a44; text-decoration: underline; }
        .waoc-err { flex: 0 0 100%; font-size: 13px; color: #a3261c; font-weight: 600; }
      `}</style>
      {done === 'yes' ? (
        <div className="waoc-txt"><span className="waoc-t">Gata! Primești campaniile noi pe WhatsApp.</span><span className="waoc-s">Le poți opri oricând din Setări → Notificări.</span></div>
      ) : (<>
        <div className="waoc-txt">
          <span className="waoc-t">Vrei să afli primul(a) de campaniile noi pe WhatsApp?</span>
          <span className="waoc-s">Îți scriem doar când apare o campanie nouă. Le oprești oricând din Setări.</span>
        </div>
        <div className="waoc-row">
          <label className="sr-only" htmlFor="waoc-phone">Numărul tău de WhatsApp</label>
          <input id="waoc-phone" inputMode="tel" placeholder="07xx xxx xxx" value={phone} onChange={e => setPhone(e.target.value)} />
          <button className="y" disabled={busy} onClick={() => answer(true)}>Da, vreau</button>
          <button className="n" disabled={busy} onClick={() => answer(false)}>Nu, mulțumesc</button>
        </div>
        {msg && <span className="waoc-err">{msg}</span>}
      </>)}
    </div>
  )
}
