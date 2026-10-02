import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 })

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Șterge toate datele influencerului
    // 1. Găsim ID-ul influencerului
    const { data: inf } = await serviceClient
      .from('influencers')
      .select('id')
      .eq('user_id', user.id)
      .single()
    const influencerId = inf?.id

    if (influencerId) {
      // 2. Șterge fișierele din Storage (poze profil, identitate)
      const { data: files } = await serviceClient.storage
        .from('avatars')
        .list(`influencers/${influencerId}`)
      if (files?.length) {
        await serviceClient.storage
          .from('avatars')
          .remove(files.map(f => `influencers/${influencerId}/${f.name}`))
      }

      // 3. Șterge datele din toate tabelele
      await serviceClient.from('influencer_strikes').delete().eq('influencer_id', influencerId)
      await serviceClient.from('collaborations').delete().eq('influencer_id', influencerId)
      await serviceClient.from('reviews').delete().eq('influencer_id', influencerId)
      await serviceClient.from('withdrawal_requests').delete().eq('influencer_id', influencerId)
      await serviceClient.from('promo_codes').delete().eq('influencer_id', influencerId)
    }

    // 4. Șterge mesaje, notificări, tranzacții
    await serviceClient.from('messages').delete().eq('sender_id', user.id)
    await serviceClient.from('notifications').delete().eq('user_id', user.id)
    await serviceClient.from('transactions').delete().eq('user_id', user.id)
    await serviceClient.from('influencer_payment_methods').delete().eq('user_id', user.id)
    await serviceClient.from('reviews').delete().eq('reviewer_id', user.id)

    // 5. Șterge profilul influencerului
    await serviceClient.from('influencers').delete().eq('user_id', user.id)
    await serviceClient.from('profiles').delete().eq('id', user.id)

    // Șterge contul din Supabase Auth
    const { error: authError } = await serviceClient.auth.admin.deleteUser(user.id)
    if (authError) throw authError

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[Delete account]', e)
    return NextResponse.json({ error: e.message || 'Eroare la ștergere' }, { status: 500 })
  }
}
