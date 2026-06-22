import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { emailDeliverableSubmitted } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { collabId } = await req.json()
    if (!collabId) return NextResponse.json({ error: 'collabId required' }, { status: 400 })

    const admin = createAdminClient()

    // Fetch collab cu brand + influencer + campanie
    const { data: collab, error } = await admin
      .from('collaborations')
      .select('id, campaigns(id, title, brand_id), influencers(name, user_id)')
      .eq('id', collabId)
      .single()

    if (error || !collab) return NextResponse.json({ error: 'Collab not found' }, { status: 404 })

    const campaign = collab.campaigns as any
    const influencer = collab.influencers as any

    // Fetch emailul brandului via auth
    const { data: brand } = await admin
      .from('brands')
      .select('user_id, name')
      .eq('id', campaign.brand_id)
      .single()

    if (brand?.user_id) {
      const { data: authUser } = await admin.auth.admin.getUserById(brand.user_id)
      const brandEmail = authUser?.user?.email

      if (brandEmail) {
        await emailDeliverableSubmitted(
          brandEmail,
          brand.name || 'Brand',
          influencer?.name || 'Influencer',
          campaign.title,
          campaign.id
        )
      }
    }

    // Notifică și adminul
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
    if (adminEmail) {
      await emailDeliverableSubmitted(
        adminEmail,
        'AddFame Admin',
        influencer?.name || 'Influencer',
        campaign.title,
        campaign.id
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[notify/deliverable-submitted]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
