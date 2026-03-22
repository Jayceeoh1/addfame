import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { emailCollaborationApproved } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { influencerId, brandName, campaignTitle } = await req.json()
    const admin = createAdminClient()
    const { data: inf } = await admin.from('influencers').select('email, name').eq('id', influencerId).single()
    if (inf?.email) {
      await emailCollaborationApproved(inf.email, inf.name || 'Influencer', brandName, campaignTitle)
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}