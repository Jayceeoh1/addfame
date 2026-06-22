import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { emailIdentityVerified, emailIdentityRejected } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { influencer_id, action, reason } = await req.json()
    if (!influencer_id || !action) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Verify caller is admin
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Check admin
    const { data: adminRow } = await admin.from('admins').select('user_id').eq('user_id', user.id).single()
    if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: inf } = await admin.from('influencers').select('user_id, name, email').eq('id', influencer_id).single()
    if (!inf) return NextResponse.json({ error: 'Influencer not found' }, { status: 404 })

    if (action === 'approve') {
      await admin.from('influencers').update({
        verification_status: 'verified',
        identity_verified: true,
        identity_verified_at: new Date().toISOString(),
        verification_rejection_reason: null,
      }).eq('id', influencer_id)

      // Notificare in platforma
      await admin.from('notifications').insert({
        user_id: inf.user_id,
        title: '✅ Identitatea ta a fost verificată!',
        body: 'Badge-ul de identitate verificată este acum vizibil pe profilul tău. Brandurile au mai multă încredere în tine.',
        link: '/influencer/settings',
        read: false,
      })

      // Email influencer
      if (inf.email) {
        emailIdentityVerified(inf.email, inf.name || 'Influencer').catch(e =>
          console.error('[identity-verify] Email verified failed:', e)
        )
      }

    } else if (action === 'reject') {
      const rejectReason = reason || 'Documente invalide'

      await admin.from('influencers').update({
        verification_status: 'rejected',
        identity_verified: false,
        verification_rejection_reason: rejectReason,
      }).eq('id', influencer_id)

      // Notificare in platforma
      await admin.from('notifications').insert({
        user_id: inf.user_id,
        title: '❌ Verificare respinsă',
        body: `Motivul: ${rejectReason}. Poți retrimite documentele din Settings.`,
        link: '/influencer/verify',
        read: false,
      })

      // Email influencer
      if (inf.email) {
        emailIdentityRejected(inf.email, inf.name || 'Influencer', rejectReason).catch(e =>
          console.error('[identity-verify] Email rejected failed:', e)
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
