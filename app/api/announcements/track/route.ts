import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 })

    const { announcement_id, action } = await req.json()
    if (!announcement_id) return NextResponse.json({ error: 'announcement_id required' }, { status: 400 })

    if (action === 'read') {
      await supabase.from('announcement_reads').upsert({
        announcement_id,
        user_id: user.id,
        read_at: new Date().toISOString(),
      }, { onConflict: 'announcement_id,user_id', ignoreDuplicates: true })
    }

    if (action === 'star') {
      const { data: existing } = await supabase
        .from('announcement_reads')
        .select('id, starred')
        .eq('announcement_id', announcement_id)
        .eq('user_id', user.id)
        .single()

      if (existing) {
        await supabase.from('announcement_reads')
          .update({ starred: !existing.starred })
          .eq('id', existing.id)
        return NextResponse.json({ ok: true, starred: !existing.starred })
      } else {
        await supabase.from('announcement_reads').insert({
          announcement_id,
          user_id: user.id,
          read_at: new Date().toISOString(),
          starred: true,
        })
        return NextResponse.json({ ok: true, starred: true })
      }
    }

    if (action === 'dismiss') {
      await supabase.from('announcement_reads').upsert({
        announcement_id,
        user_id: user.id,
        read_at: new Date().toISOString(),
        dismissed: true,
      }, { onConflict: 'announcement_id,user_id' })
    }

    if (action === 'cta_click') {
      await supabase.from('announcement_reads')
        .update({ clicked_cta: true })
        .eq('announcement_id', announcement_id)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
