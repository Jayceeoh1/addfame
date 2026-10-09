import type { Metadata } from 'next'
import Link from 'next/link'
import SitePage from '@/components/site/SiteShell'
import { Mosaic, AlbumCard, Story, EV_CSS, type GalleryPhoto } from '@/components/events/EventsUI'
import { createAdminClient } from '@/lib/supabase/admin'
import { coverOf, formatEventDate, splitEvents, type SiteEvent, type SiteEventPhoto } from '@/lib/events'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Evenimente · AddFame',
  description: 'Evenimentele AddFame: următoarea întâlnire dintre creatori și branduri, plus pozele de la cele de până acum.',
  alternates: { canonical: '/evenimente' },
}

const GALLERY_MAX = 24

export default async function EvenimentePage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e: filter } = await searchParams
  const admin = createAdminClient()
  const { data: evs } = await admin.from('site_events').select('*').eq('status', 'published')
  const events = (evs || []) as SiteEvent[]
  const { next, past } = splitEvents(events)
  const ids = events.map(e => e.id)
  const { data: ph } = ids.length
    ? await admin.from('site_event_photos').select('*').in('event_id', ids).order('position').order('created_at')
    : { data: [] as SiteEventPhoto[] }
  const photos = (ph || []) as SiteEventPhoto[]
  const byEvent = new Map<string, SiteEventPhoto[]>()
  for (const p of photos) byEvent.set(p.event_id, [...(byEvent.get(p.event_id) || []), p])

  // Evenimentele cu poze, cele mai recente primele; galeria amestecă pozele în ordinea asta
  const withPhotos = [...events].filter(e => byEvent.has(e.id)).sort((a, b) => new Date(b.starts_at || 0).getTime() - new Date(a.starts_at || 0).getTime())
  const active = withPhotos.find(e => e.slug === filter) || null
  const shown: GalleryPhoto[] = (active ? [active] : withPhotos)
    .flatMap(e => (byEvent.get(e.id) || []).map(p => ({ ...p, eventTitle: e.title })))
    .slice(0, GALLERY_MAX)

  // Povestea afișată pe pagină: cel mai recent eveniment trecut care are text scris
  const storyEvent = past.find(e => (e.story || '').trim()) || null

  const cities = new Set(past.map(e => (e.city || '').trim().toLowerCase()).filter(Boolean)).size

  return (
    <SitePage>
      <style>{EV_CSS}</style>

      <section className="af-wrap ev-hero">
        <div className="ev-hero-copy">
          <span className="af-pill"><span className="af-dot" />Comunitatea AddFame, față în față</span>
          <h1 className="ev-h1">Creatori și branduri, <span className="af-grad-text">în aceeași încăpere.</span></h1>
          <p className="af-lead">Organizăm evenimente în care creatorii din platformă se întâlnesc cu brandurile cu care lucrează. Aici găsești următorul eveniment și pozele de la cele de până acum.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {next?.signup_url
              ? <a href={next.signup_url} target="_blank" rel="noopener noreferrer" className="af-btn af-btn-ink">Rezervă-ți locul</a>
              : <Link href="/auth/register?type=influencer" className="af-btn af-btn-ink">Creează cont gratuit</Link>}
            {photos.length > 0 && <a href="#galerie" className="af-btn af-btn-ghost">Vezi pozele</a>}
          </div>
        </div>

        <div className="ev-next">
          <div className="ev-next-top">
            <span className="af-eyebrow">Următorul eveniment</span>
            {next && <span className="ev-next-badge">Locuri limitate</span>}
          </div>
          {next ? (
            <>
              <h2>{next.title}</h2>
              <dl className="ev-dl">
                <dt>Data</dt><dd>{formatEventDate(next.starts_at)}</dd>
                {(next.location || next.city) && <><dt>Locul</dt><dd>{[next.location, next.city].filter(Boolean).join(', ')}</dd></>}
              </dl>
              {next.description && <p>{next.description}</p>}
              {next.signup_url && <a href={next.signup_url} target="_blank" rel="noopener noreferrer" className="af-btn af-btn-violet">Rezervă-ți locul</a>}
            </>
          ) : (
            <>
              <h2>Anunțăm în curând</h2>
              <p>Încă nu am stabilit data următorului eveniment. Creează-ți cont pe AddFame și afli printre primii când îl anunțăm.</p>
              <Link href="/auth/register?type=influencer" className="af-btn af-btn-violet">Creează cont gratuit</Link>
            </>
          )}
        </div>
      </section>

      {past.length > 0 && (
        <section className="ev-stats" aria-label="AddFame în cifre">
          <div className="af-wrap ev-stats-in">
            <div className="ev-stat"><b>{past.length}</b><span>{past.length === 1 ? 'eveniment organizat' : 'evenimente organizate'}</span></div>
            {photos.length > 0 && <div className="ev-stat"><b>{photos.length}</b><span>fotografii în galerie</span></div>}
            {cities > 1 && <div className="ev-stat"><b>{cities}</b><span>orașe</span></div>}
          </div>
        </section>
      )}

      {storyEvent && <Story event={storyEvent} photos={byEvent.get(storyEvent.id) || []} />}

      <section id="galerie" className="af-wrap ev-sec">
        <div className="ev-sec-head">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 640 }}>
            <span className="af-eyebrow">Galerie foto</span>
            <h2 className="ev-h2">Cum arată o seară <span className="af-grad-text">AddFame.</span></h2>
          </div>
          {withPhotos.length > 1 && (
            <nav className="ev-chips" aria-label="Filtrează după eveniment">
              <Link href="/evenimente#galerie" className={`ev-chip${!active ? ' on' : ''}`}>Toate</Link>
              {withPhotos.map(e => <Link key={e.id} href={`/evenimente?e=${e.slug}#galerie`} className={`ev-chip${active?.id === e.id ? ' on' : ''}`}>{e.title}</Link>)}
            </nav>
          )}
        </div>
        {shown.length > 0
          ? <Mosaic photos={shown} />
          : <div className="ev-empty">Pozele de la evenimente apar aici imediat ce le publicăm.</div>}
      </section>

      {past.length > 0 && (
        <section className="af-wrap ev-sec" style={{ paddingBottom: 56 }}>
          <h2 className="ev-h2" style={{ fontSize: 'clamp(24px,3vw,32px)' }}>Evenimente trecute</h2>
          <div className="ev-albums">
            {past.map(e => <AlbumCard key={e.id} event={e} cover={coverOf(e, byEvent.get(e.id) || [])} count={(byEvent.get(e.id) || []).length} />)}
          </div>
        </section>
      )}

      <section className="af-wrap" style={{ paddingBottom: 88, paddingTop: 24 }}>
        <div className="ev-cta">
          <div>
            <h2>Vrei să fii în pozele de la următorul eveniment?</h2>
            <p>Creează-ți cont pe AddFame și primești invitația când anunțăm următoarea întâlnire.</p>
          </div>
          <Link href="/auth/register" className="af-btn af-btn-white">Creează cont gratuit</Link>
        </div>
      </section>
    </SitePage>
  )
}
