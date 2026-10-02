import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'

export async function POST(req: NextRequest) {
  try {
    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File
    const collabId = formData.get('collab_id') as string
    // Rolul de admin se verifică pe server, nu se ia din formular
    const isAdmin = formData.get('is_admin') === 'true' && !!(await verifyAdminSession())

    if (!file || !collabId) {
      return NextResponse.json({ error: 'Lipsesc parametri' }, { status: 400 })
    }

    const ALLOWED_TYPES: Record<string, string> = {
      'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
      'image/heic': 'heic', 'image/heif': 'heif', 'image/avif': 'avif',
    }
    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json({ error: 'Imaginea trebuie să fie JPG, PNG, WEBP, GIF sau HEIC' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Imaginea trebuie să fie sub 5MB' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verifică că colaborarea există și userul are acces
    const { data: collab } = await admin
      .from('collaborations')
      .select('id, influencer_id, influencers(user_id)')
      .eq('id', collabId)
      .single()

    if (!collab) return NextResponse.json({ error: 'Colaborare negăsită' }, { status: 404 })

    // Influencerul poate uploada doar la propria colaborare
    // Adminul poate uploada la orice colaborare
    if (!isAdmin) {
      const infUserId = (collab.influencers as any)?.user_id
      if (infUserId !== user.id) {
        return NextResponse.json({ error: 'Acces interzis' }, { status: 403 })
      }
    }

    const ext = ALLOWED_TYPES[file.type]
    const path = `thumbnails/${collabId}/${Date.now()}.${ext}`

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { error: uploadErr } = await admin.storage
      .from('campaign-images')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadErr) throw uploadErr

    const { data: urlData } = admin.storage
      .from('campaign-images')
      .getPublicUrl(path)

    const thumbnailUrl = urlData.publicUrl

    // Salvează în DB
    await admin
      .from('collaborations')
      .update({ thumbnail_url: thumbnailUrl })
      .eq('id', collabId)

    return NextResponse.json({ ok: true, thumbnail_url: thumbnailUrl })
  } catch (e: any) {
    console.error('[collaborations/thumbnail]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
