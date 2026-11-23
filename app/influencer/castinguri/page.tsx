'use client'

import { useEffect, useState } from 'react'
import { Calendar, MapPin, Users, ArrowRight, Loader2, Megaphone, Images, X, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { getEventsForInfluencer, getPastEventsForInfluencer } from '@/app/actions/event-signup'

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
  kind?: 'campaign' | 'site'
  href?: string | null
}

type PastEvent = {
  id: string; title: string; date: string | null; location: string | null; organizer: string; logo: string | null
  description: string | null; cover: string | null; photos: { url: string; caption: string | null }[]; href: string | null
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
  const [past, setPast] = useState<PastEvent[]>([])
  const [viewer, setViewer] = useState<{ ev: PastEvent; i: number } | null>(null)

  useEffect(() => {
    getEventsForInfluencer().then(r => {
      if ('success' in r) setCampaigns(r.events as EventItem[])
      else setError(r.error || 'Eroare')
    }).catch(() => setError('Nu am putut încărca evenimentele.')).finally(() => setLoading(false))
    getPastEventsForInfluencer().then(r => { if ('success' in r) setPast(r.events as PastEvent[]) }).catch(() => {})
  }, [])

  // galeria: săgeți și Escape
  useEffect(() => {
    if (!viewer) return
    const n = viewer.ev.photos.length
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewer(null)
      if (e.key === 'ArrowRight') setViewer(v => v && { ...v, i: (v.i + 1) % n })
      if (e.key === 'ArrowLeft') setViewer(v => v && { ...v, i: (v.i - 1 + n) % n })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewer])

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
        .cs-past-h { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-top: 34px; margin-bottom: 14px; }
        .cs-past .cs-ban { height: 190px; cursor: pointer; border: 0; padding: 0; width: 100%; }
        .cs-past .cs-ban .cs-count { position: absolute; right: 10px; bottom: 10px; display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 99px; background: rgba(20,18,58,.72); color: #fff; font-size: 12px; font-weight: 800; }
        .cs-past .cs-ban .cs-was { position: absolute; left: 10px; top: 10px; padding: 4px 10px; border-radius: 99px; background: rgba(255,255,255,.92); color: #14123a; font-size: 11.5px; font-weight: 800; }
        .cs-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
        .cs-strip button { position: relative; aspect-ratio: 1; border: 0; padding: 0; border-radius: 10px; overflow: hidden; cursor: pointer; background: #f0eff7; }
        .cs-strip img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .cs-strip .more { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(20,18,58,.6); color: #fff; font-weight: 800; font-size: 15px; }
        .cs-desc { margin: 0; font-size: 13.5px; line-height: 1.5; color: #4a4770; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .cs-lb { position: fixed; inset: 0; z-index: 1000; background: rgba(10,9,30,.97); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 56px 12px 20px; }
        .cs-lb img { max-width: min(100%, 1100px); max-height: calc(100vh - 140px); object-fit: contain; border-radius: 12px; }
        .cs-lb-top { position: absolute; top: 12px; left: 16px; right: 12px; display: flex; justify-content: space-between; align-items: center; color: #fff; gap: 10px; }
        .cs-lb-top b { font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cs-lb-btn { width: 44px; height: 44px; border-radius: 99px; border: 0; background: rgba(255,255,255,.14); color: #fff; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex: none; }
        .cs-lb-nav { position: absolute; top: 50%; transform: translateY(-50%); }
        .cs-lb-cap { color: #e6e3f7; font-size: 13px; margin-top: 10px; text-align: center; }
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
            <Link key={c.id} href={c.href || `/influencer/castinguri/${c.id}`} className="iu-card cs-card">
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

                {c.kind === 'site' ? (
                  <div className="cs-foot">
                    <span className="iu-btn p" style={{ marginLeft: 'auto' }}>Vezi evenimentul <ArrowRight size={14} /></span>
                  </div>
                ) : c.my_status ? (
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

      {past.length > 0 && (
        <section className="cs-past">
          <div className="cs-past-h">
            <h2 style={{ margin: 0, fontSize: 22 }}>Evenimente care au avut loc</h2>
            <span className="iu-muted iu-sm">{past.length} {past.length === 1 ? 'eveniment' : 'evenimente'} · {past.reduce((n, e) => n + e.photos.length, 0)} poze</span>
          </div>
          <div className="cs-grid">
            {past.map(ev => (
              <div key={ev.id} className="iu-card cs-card">
                <button type="button" className="cs-ban" onClick={() => ev.photos.length && setViewer({ ev, i: 0 })} aria-label={`Pozele de la ${ev.title}`}>
                  {ev.cover ? <img src={ev.cover} alt={ev.title} loading="lazy" /> : <Megaphone size={44} />}
                  {ev.date && <span className="cs-was">A avut loc · {fmt(ev.date)}</span>}
                  {ev.photos.length > 1 && <span className="cs-count"><Images size={13} /> {ev.photos.length} poze</span>}
                </button>
                <div className="cs-body">
                  <div className="iu-row" style={{ gap: 8, minWidth: 0 }}>
                    {ev.logo
                      ? <img src={ev.logo} alt={ev.organizer} style={{ width: 26, height: 26, borderRadius: 8, objectFit: 'cover', flex: 'none' }} />
                      : <span className="iu-face" style={{ width: 26, height: 26, borderRadius: 8, background: '#efeaff', color: '#5b2fd0', fontSize: 12 }}>{ev.organizer[0]}</span>}
                    <span className="iu-xs iu-muted" style={{ fontWeight: 700 }}>{ev.organizer}</span>
                  </div>
                  <h3 className="cs-title">{ev.title}</h3>
                  {ev.location && <div className="cs-meta"><span className="iu-chip" style={{ background: '#f0eff7', color: '#4a4770' }}><MapPin size={12} /> {ev.location}</span></div>}
                  {ev.description && <p className="cs-desc">{ev.description}</p>}
                  {ev.photos.length > 1 && (
                    <div className="cs-strip">
                      {ev.photos.slice(1, 5).map((p, k) => (
                        <button key={k} type="button" onClick={() => setViewer({ ev, i: k + 1 })} aria-label="Deschide poza">
                          <img src={p.url} alt={p.caption || ev.title} loading="lazy" />
                          {k === 3 && ev.photos.length > 5 && <span className="more">+{ev.photos.length - 5}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {ev.href && (
                    <div className="cs-foot">
                      <a href={ev.href} target="_blank" rel="noopener noreferrer" className="iu-btn" style={{ marginLeft: 'auto' }}>Povestea evenimentului <ArrowRight size={14} /></a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {viewer && (
        <div className="cs-lb" role="dialog" aria-modal="true" aria-label={`Galerie: ${viewer.ev.title}`} onClick={() => setViewer(null)}>
          <div className="cs-lb-top" onClick={e => e.stopPropagation()}>
            <b>{viewer.ev.title} · {viewer.i + 1} / {viewer.ev.photos.length}</b>
            <button className="cs-lb-btn" onClick={() => setViewer(null)} aria-label="Închide"><X size={20} /></button>
          </div>
          <img src={viewer.ev.photos[viewer.i].url} alt={viewer.ev.photos[viewer.i].caption || viewer.ev.title} onClick={e => e.stopPropagation()} />
          {viewer.ev.photos[viewer.i].caption && <div className="cs-lb-cap">{viewer.ev.photos[viewer.i].caption}</div>}
          {viewer.ev.photos.length > 1 && (<>
            <button className="cs-lb-btn cs-lb-nav" style={{ left: 12 }} aria-label="Poza anterioară"
              onClick={e => { e.stopPropagation(); setViewer(v => v && { ...v, i: (v.i - 1 + v.ev.photos.length) % v.ev.photos.length }) }}><ChevronLeft size={22} /></button>
            <button className="cs-lb-btn cs-lb-nav" style={{ right: 12 }} aria-label="Poza următoare"
              onClick={e => { e.stopPropagation(); setViewer(v => v && { ...v, i: (v.i + 1) % v.ev.photos.length }) }}><ChevronRight size={22} /></button>
          </>)}
        </div>
      )}
    </div>
  )
}
