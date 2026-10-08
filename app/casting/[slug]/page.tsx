import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SitePage from '@/components/site/SiteShell'
import CastingForm from '@/components/casting/CastingForm'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'
import { isCastingOpen, type Casting } from '@/lib/castings'

export const dynamic = 'force-dynamic'

async function loadCasting(slug: string): Promise<Casting | null> {
  if (!/^[a-z0-9][a-z0-9-]{2,59}$/.test(slug)) return null
  const { data } = await createAdminClient().from('castings').select('*').eq('slug', slug).maybeSingle()
  return (data as Casting) || null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await loadCasting((await params).slug)
  if (!c || c.status === 'draft') return { title: 'Casting', robots: { index: false } }
  return {
    title: `${c.title} · Casting`,
    description: c.intro || 'Înscrie-te la casting pe AddFame.',
    openGraph: { title: c.title, description: c.intro || undefined },
  }
}

export default async function CastingPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = await loadCasting((await params).slug)
  if (!c) notFound()
  // ciorna o vede doar adminul (previzualizare)
  const isAdmin = c.status === 'draft' ? !!(await verifyAdminSession()) : false
  if (c.status === 'draft' && !isAdmin) notFound()
  return (
    <SitePage>
      <CastingForm casting={c} open={isCastingOpen(c)} preview={c.status === 'draft'} />
    </SitePage>
  )
}
