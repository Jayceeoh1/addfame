'use client'
// Tabul „Drepturi de autor” din pagina campaniei (brand): ce clipuri poate folosi brandul și până când.
import { useEffect, useState } from 'react'
import { ShieldCheck, Download, Megaphone, Clock, Info } from 'lucide-react'

export type State = 'ads' | 'organic' | 'expired'
export type Item = { ref: string; creator: string; product: string | null; rights: { version: number; signedAt: string; adsUntil: string; organicUntil: string | null; state: State; daysLeftAds: number } }
type Data = { campaign: { name: string; brand: string }; items: Item[]; pending: number }

const ro = (iso: string) => new Date(iso).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })
const STATE: Record<State, { label: string; bg: string; fg: string }> = {
  ads: { label: 'Ads active', bg: '#e6f7ee', fg: '#166534' },
  organic: { label: 'Doar organic', bg: '#eef0ff', fg: '#3730a3' },
  expired: { label: 'Expirat', bg: '#f1f1f5', fg: '#6b7280' },
}

export default function RightsPanel({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<Data | null>(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    let alive = true
    fetch(`/api/brand/campaigns/${campaignId}/rights`).then(async r => {
      const d = await r.json().catch(() => ({}))
      if (!alive) return
      if (!r.ok) setErr(d.error || 'Nu am putut încărca drepturile.')
      else setData(d)
    }).catch(() => alive && setErr('Nu am putut încărca drepturile.'))
    return () => { alive = false }
  }, [campaignId])

  if (err) return <div className="card p-5 text-sm" style={{ color: '#b42318' }}>{err}</div>
  if (!data) return <div className="card p-8 text-center text-sm" style={{ color: '#6a6690' }}>Se încarcă…</div>

  const ads = data.items.filter(i => i.rights.state === 'ads')
  const soon = ads.filter(i => i.rights.daysLeftAds <= 30)

  return (
    <div className="card p-5" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, minWidth: 0 }}>
          <span style={{ width: 42, height: 42, borderRadius: 14, background: '#efeafe', color: '#5a35e6', display: 'grid', placeItems: 'center', flex: 'none' }}><ShieldCheck size={20} /></span>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#14123a' }}>Drepturi de autor</h3>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6a6690', maxWidth: 560 }}>
              Clipurile creatorilor care au semnat cesiunea. Le poți folosi organic fără limită de timp și în reclame plătite 6 luni de la semnare, inclusiv prin partenerii tăi.
            </p>
          </div>
        </div>
        <a href={`/api/brand/campaigns/${campaignId}/rights/pdf`} target="_blank" rel="noopener"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 12, background: '#5a35e6', color: '#fff', fontWeight: 800, fontSize: 13.5, textDecoration: 'none', flex: 'none' }}>
          <Download size={16} /> Descarcă atestarea (PDF)
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
        {[
          { l: 'Contracte semnate', v: data.items.length, c: '#14123a' },
          { l: 'Cu ads active', v: ads.length, c: '#166534' },
          { l: 'Expiră în 30 de zile', v: soon.length, c: soon.length ? '#b45309' : '#14123a' },
          { l: 'În așteptarea semnăturii', v: data.pending, c: '#6a6690' },
        ].map(s => (
          <div key={s.l} style={{ border: '1px solid #ebe8f7', borderRadius: 14, padding: '12px 14px' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.c, fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
            <div style={{ fontSize: 12, color: '#6a6690', fontWeight: 600 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {soon.length > 0 && (
        <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 12, background: '#fff7e6', border: '1px solid #fde3b0', color: '#7a4b00', fontSize: 13 }}>
          <Clock size={16} style={{ flex: 'none', marginTop: 2 }} />
          <span>Perioada de reclame plătite expiră curând pentru {soon.length === 1 ? 'un clip' : `${soon.length} clipuri`}. După expirare le poți folosi doar organic. Pentru prelungire, scrie-ne la support@addfame.ro.</span>
        </div>
      )}

      {data.items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px 12px', color: '#6a6690', fontSize: 14 }}>
          <Megaphone size={28} style={{ margin: '0 auto 8px', color: '#c9c3ea' }} />
          Niciun contract semnat încă. {data.pending ? `${data.pending} ${data.pending === 1 ? 'contract așteaptă' : 'contracte așteaptă'} semnătura creatorilor.` : 'Contractele apar aici imediat ce creatorii le semnează.'}
        </div>
      ) : (
        <RightsRows items={data.items} />
      )}

      <p style={{ display: 'flex', gap: 8, margin: 0, fontSize: 12, color: '#6a6690' }}>
        <Info size={14} style={{ flex: 'none', marginTop: 1 }} />
        Contractele originale (cu datele personale ale creatorilor) sunt păstrate de AddFame. Atestarea PDF e documentul pe care îl poți arăta partenerilor sau platformelor de reclame.
      </p>
    </div>
  )
}

/** Lista creatorilor cu drepturile lor (folosită în campanie și în pagina „Drepturi de autor”). */
export function RightsRows({ items }: { items: Item[] }) {
  return (
    <div style={{ border: '1px solid #ebe8f7', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
      {items.map((i, n) => {
        const st = STATE[i.rights.state]
        return (
          <div key={n} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px', padding: '12px 14px', borderTop: n ? '1px solid #f1eff9' : 'none' }}>
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <div style={{ fontWeight: 800, color: '#14123a', fontSize: 14 }}>{i.creator}</div>
              <div style={{ fontSize: 12, color: '#6a6690' }}>{i.ref}{i.product ? ` · ${i.product}` : ''} · semnat {ro(i.rights.signedAt)}</div>
            </div>
            <div style={{ flex: '0 1 230px', fontSize: 12.5, color: '#4a4770' }}>
              {i.rights.state === 'ads'
                ? <>Ads până la <b>{ro(i.rights.adsUntil)}</b> · {i.rights.daysLeftAds} zile</>
                : i.rights.state === 'organic'
                  ? <>Ads încheiate la {ro(i.rights.adsUntil)} · organic fără limită</>
                  : <>Drepturile au expirat la {ro(i.rights.adsUntil)}</>}
            </div>
            <span style={{ padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 800, background: st.bg, color: st.fg, flex: 'none' }}>{st.label}</span>
          </div>
        )
      })}
    </div>
  )
}
