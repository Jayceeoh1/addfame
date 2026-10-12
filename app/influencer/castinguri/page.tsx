'use client'

import { useEffect, useState } from 'react'
import { Calendar, MapPin, Users, ArrowRight, Loader2, Megaphone } from 'lucide-react'
import Link from 'next/link'
import { getEventsForInfluencer } from '@/app/actions/event-signup'

type EventItem = {
  id: string
  title: string
  description: string | null
  banner_url: string | null
  event_date: string | null
  event_location: string | null
  min_followers: number
  application_deadline: string | null
  platforms: string[]
  brand: { name: string; logo: string | null; verification_status?: string } | null
  interested: number
  my_status: string | null
  open: boolean
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtNum(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(0) + 'k'
  return String(n)
}

// Tabul „Evenimente”: evenimentele brandurilor și ale AddFame. Influencerul apasă „Vreau să vin”.
export default function EvenimentePage() {
  const [campaigns, setCampaigns] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getEventsForInfluencer().then(r => {
      if ('success' in r) setCampaigns(r.events as EventItem[])
      else setError(r.error || 'Eroare')
    }).catch(() => setError('Nu am putut încărca evenimentele.')).finally(() => setLoading(false))
  }, [])

  const appChip = (st: string) =>
    st === 'approved' ? { bg: '#dcf5ec', fg: '#14532d', t: '✓ Ești pe lista de invitați' }
    : st === 'rejected' ? { bg: '#fdeceb', fg: '#b42318', t: 'Nu ai fost selectat' }
    : st === 'cancelled' ? { bg: '#f0eff7', fg: '#4a4770', t: 'Te-ai retras' }
    : { bg: '#fff1c2', fg: '#854d0e', t: 'Înscriere trimisă' }

  return (
    <div className="iu cs">
      <style>{`
        .cs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px; }
        .cs-card { display: flex; flex-direction: column; overflow: hidden; text-decoration: none; color: inherit; transition: border-color .15s, box-shadow .15s, transform .15s; }
        .cs-card:hover { border-color: #cdb8ff; box-shadow: 0 16px 34px -22px rgba(112,64,240,.5); transform: translateY(-2px); }
        .cs-ban { position: relative; height: 160px; background: linear-gradient(135deg,#efeaff,#f6f1ff); display: flex; align-items: center; justify-content: center; color: #b9a3f7; }
        .cs-ban img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .cs-body { padding: 18px; display: flex; flex-direction: column; gap: 12px; flex: 1; }
        .cs-title { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .cs-meta { display: flex; flex-wrap: wrap; gap: 6px; }
        .cs-hot { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 12px; background: #fff1e6; color: #9a4206; font-size: 13px; font-weight: 700; }
        .cs-dot { width: 8px; height: 8px; border-radius: 50%; background: #f97316; flex: none; }
        .cs-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-top: auto; }
        .cs-empty { text-align: center; padding: 56px 20px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
        @media (max-width: 767px) { .cs-grid { grid-template-columns: 1fr; gap: 14px; } .cs-foot .iu-btn { width: 100%; height: 44px; } }
      `}</style>

      <div className="iu-head">
        <div className="iu-col" style={{ gap: 6 }}>
          <h1>Evenimente</h1>
          <span className="iu-muted iu-sm">Lansări, petreceri și întâlniri organizate de branduri și de AddFame. Apasă „Vreau să vin” și organizatorul îți răspunde aici.</span>
        </div>
        {!loading && campaigns.length > 0 && (
          <span className="iu-chip" style={{ background: '#efeaff', color: '#5b2fd0' }}>{campaigns.length} {campaigns.length === 1 ? 'eveniment activ' : 'evenimente active'}</span>
        )}
      </div>

      {error && <div className="iu-card" style={{ padding: 16, color: '#b42318' }}>{error}</div>}

      {loading ? (
        <div className="iu-card cs-empty"><Loader2 className="animate-spin" size={28} color="#7040f0" /><span className="iu-muted iu-sm">Se încarcă…</span></div>
      ) : campaigns.length === 0 ? (
        <div className="iu-card cs-empty">
          <div className="iu-ico" style={{ background: '#efeaff', color: '#7040f0', width: 56, height: 56, borderRadius: 18 }}><Megaphone size={26} /></div>
          <h3 style={{ marginTop: 8 }}>Niciun eveniment activ momentan</h3>
          <p className="iu-muted iu-sm" style={{ margin: 0, maxWidth: 380 }}>Revino în curând — brandurile postează constant evenimente și oportunități noi.</p>
        </div>
      ) : (
        <div className="cs-grid">
          {campaigns.map(c => (
            <Link key={c.id} href={`/influencer/castinguri/${c.id}`} className="iu-card cs-card">
              <div className="cs-ban">
                {c.banner_url ? <img src={c.banner_url} alt={c.title} /> : <Megaphone size={44} />}
              </div>
              <div className="cs-body">
                <div className="iu-row" style={{ gap: 8, minWidth: 0 }}>
                  {c.brand?.logo ? (
                    <img src={c.brand.logo} alt={c.brand.name} style={{ width: 26, height: 26, borderRadius: 8, objectFit: 'cover', flex: 'none' }} />
                  ) : (
                    <span className="iu-face" style={{ width: 26, height: 26, borderRadius: 8, background: '#efeaff', color: '#5b2fd0', fontSize: 12 }}>{c.brand?.name?.[0] || 'B'}</span>
                  )}
                  <span className="iu-xs iu-muted" style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.brand?.name}</span>
                  {(c.brand as any)?.verification_status === 'verified' && <span className="iu-chip" style={{ background: '#e6f0ff', color: '#1d4fb8', height: 20, fontSize: 11, padding: '0 8px' }}>✓ Verificat</span>}
                </div>

                <h3 className="cs-title">{c.title}</h3>

                <div className="cs-meta">
                  {c.event_date && (
                    <span className="iu-chip" style={{ background: '#f0eff7', color: '#4a4770' }}><Calendar size={12} /> {fmt(c.event_date)}</span>
                  )}
                  {c.event_location && (
                    <span className="iu-chip" style={{ background: '#f0eff7', color: '#4a4770' }}><MapPin size={12} /> {c.event_location}</span>
                  )}
                  {c.min_followers > 0 && (
                    <span className="iu-chip" style={{ background: '#f0eff7', color: '#4a4770' }}><Users size={12} /> Min {fmtNum(c.min_followers)} followeri</span>
                  )}
                  {(c.platforms || []).map(p => (
                    <span key={p} className="iu-chip" style={{ background: '#efeaff', color: '#5b2fd0' }}>{p}</span>
                  ))}
                </div>

                {c.interested > 0 && (
                  <div className="cs-hot">
                    <span className="cs-dot" />
                    {c.interested} {c.interested === 1 ? 'influencer vrea să vină' : 'influenceri vor să vină'}
                  </div>
                )}

                {c.my_status ? (
                  <div className="cs-foot">
                    <span className="iu-chip" style={{ background: appChip(c.my_status).bg, color: appChip(c.my_status).fg }}>{appChip(c.my_status).t}</span>
                  </div>
                ) : (
                  <div className="cs-foot">
                    {c.application_deadline && (
                      <span className="iu-xs iu-muted">Înscrieri până pe {fmt(c.application_deadline)}</span>
                    )}
                    {c.open
                      ? <span className="iu-btn p" style={{ marginLeft: 'auto' }}>Vreau să vin <ArrowRight size={14} /></span>
                      : <span className="iu-chip" style={{ marginLeft: 'auto', background: '#f0eff7', color: '#4a4770' }}>Înscrieri închise</span>}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
