import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import SitePage from '@/components/site/SiteShell'
import SignupForm from '@/components/inscriere/SignupForm'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'
import { isSignupOpen, type SignupFormConfig } from '@/lib/creator-signups'

export const dynamic = 'force-dynamic'

async function loadSignupForm(slug: string): Promise<SignupFormConfig | null> {
  if (!/^[a-z0-9][a-z0-9-]{2,59}$/.test(slug)) return null
  const { data } = await createAdminClient().from('signup_forms').select('*').eq('slug', slug).maybeSingle()
  return (data as SignupFormConfig) || null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await loadSignupForm((await params).slug)
  if (!c || c.status === 'draft') return { title: 'Înscriere creatori', robots: { index: false } }
  return {
    title: `${c.title} · AddFame`,
    description: c.intro || 'Înscrie-te în comunitatea de creatori AddFame.',
    openGraph: { title: c.title, description: c.intro || undefined },
  }
}

export default async function InscrierePage({ params }: { params: Promise<{ slug: string }> }) {
  const c = await loadSignupForm((await params).slug)
  if (!c) notFound()
  // ciorna o vede doar adminul (previzualizare)
  const isAdmin = c.status === 'draft' ? !!(await verifyAdminSession()) : false
  if (c.status === 'draft' && !isAdmin) notFound()
  return (
    <SitePage>
      <SignupForm form={c} open={isSignupOpen(c)} preview={c.status === 'draft'} />
    </SitePage>
  )
}
