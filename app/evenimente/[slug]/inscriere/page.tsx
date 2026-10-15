import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EventSignupForm from '@/components/events/EventSignupForm'
import SitePage from '@/components/site/SiteShell'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatEventDate, isUpcoming, type SiteEvent } from '@/lib/events'

export const dynamic = 'force-dynamic'

async function load(slug: string) {
  if (!/^[a-z0-9][a-z0-9-]{2,59}$/.test(slug)) return null
  const { data } = await createAdminClient().from('site_events').select('*').eq('slug', slug).eq('status', 'published').maybeSingle()
  return (data as SiteEvent) || null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const ev = await load((await params).slug)
  return ev
    ? { title: `Înscriere: ${ev.title} · AddFame`, description: ev.description || undefined, robots: { index: false } }
    : { title: 'Înscriere eveniment · AddFame', robots: { index: false } }
}

export default async function InscriereEveniment({ params }: { params: Promise<{ slug: string }> }) {
  const ev = await load((await params).slug)
  if (!ev) notFound()

  if (!isUpcoming(ev)) {
    return (
      <SitePage>
        <section className="af-wrap" style={{ paddingBlock: 'clamp(48px,8vw,96px)', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
          <h1 style={{ margin: 0, fontWeight: 800, fontSize: 'clamp(28px,4vw,40px)' }}>Înscrierile s-au închis</h1>
          <p className="af-lead">Evenimentul „{ev.title}” a avut deja loc. Vezi pozele și afli primul de următorul eveniment.</p>
          <Link href={`/evenimente/${ev.slug}`} className="af-btn af-btn-violet">Vezi evenimentul</Link>
        </section>
      </SitePage>
    )
  }

  const when = formatEventDate(ev.starts_at)
  const where = [ev.location, ev.city].filter(Boolean).join(', ')
  return (
    <EventSignupForm
      eventId={ev.id}
      eyebrow={['Eveniment AddFame', when].filter(Boolean).join(' · ')}
      title="Înscrie-te la"
      accent={ev.title}
      lead={[where && `📍 ${where}.`, 'Locurile sunt limitate și se ocupă pe bază de selecție. Completează formularul și revenim cu detalii către creatorii selectați.'].filter(Boolean).join(' ')}
      doneText={`Înscrierea ta la „${ev.title}” a fost înregistrată. Revenim către creatorii selectați cu toate detaliile.`}
      backHref={`/evenimente/${ev.slug}`}
      backLabel="Înapoi la eveniment →"
    />
  )
}
