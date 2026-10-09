import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import SitePage from '@/components/site/SiteShell'
import { Mosaic, EV_CSS } from '@/components/events/EventsUI'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'
import { coverOf, formatEventDate, isUpcoming, photoUrl, type SiteEvent, type SiteEventPhoto } from '@/lib/events'

export const dynamic = 'force-dynamic'

async function load(slug: string) {
  if (!/^[a-z0-9][a-z0-9-]{2,59}$/.test(slug)) return null
  const admin = createAdminClient()
  const { data: ev } = await admin.from('site_events').select('*').eq('slug', slug).maybeSingle()
  if (!ev) return null
  const { data: ph } = await admin.from('site_event_photos').select('*').eq('event_id', ev.id).order('position').order('created_at')
  return { event: ev as SiteEvent, photos: (ph || []) as SiteEventPhoto[] }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = await load((await params).slug)
  if (!d || d.event.status !== 'published') return { title: 'Eveniment · AddFame', robots: { index: false } }
  const cover = coverOf(d.event, d.photos)
  return {
    title: `${d.event.title} · AddFame`,
    description: d.event.description || `Fotografii de la ${d.event.title}.`,
    alternates: { canonical: `/evenimente/${d.event.slug}` },
    openGraph: { title: d.event.title, description: d.event.description || undefined, images: cover ? [photoUrl(cover.path)] : undefined },
  }
}

export default async function EvenimentPage({ params }: { params: Promise<{ slug: string }> }) {
  const d = await load((await params).slug)
  if (!d) notFound()
  const draft = d.event.status !== 'published'
  if (draft && !(await verifyAdminSession())) notFound()
  const { event, photos } = d
  const upcoming = isUpcoming(event)

  return (
    <SitePage>
      <style>{EV_CSS}</style>
      <section className="af-wrap" style={{ paddingBlock: 'clamp(32px,5vw,64px) 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Link href="/evenimente" className="ev-back">← Toate evenimentele</Link>
        {draft && <span className="af-pill">Ciornă: doar adminii văd pagina asta</span>}
        <h1 className="ev-h1">{event.title}</h1>
        <p className="af-lead">{[formatEventDate(event.starts_at), [event.location, event.city].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</p>
        {event.description && <p className="af-lead" style={{ maxWidth: '42em' }}>{event.description}</p>}
        {upcoming && event.signup_url && (
          <div><a href={event.signup_url} target="_blank" rel="noopener noreferrer" className="af-btn af-btn-violet">Rezervă-ți locul</a></div>
        )}
      </section>
      <section className="af-wrap" style={{ paddingBottom: 88 }}>
        {photos.length > 0
          ? <Mosaic photos={photos.map(p => ({ ...p, eventTitle: event.title }))} />
          : <div className="ev-empty">{upcoming ? 'Pozele apar aici după eveniment.' : 'Pozele de la acest eveniment vor apărea în curând.'}</div>}
      </section>
    </SitePage>
  )
}
