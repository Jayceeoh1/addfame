import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Marchează emailul ca deschis
    await admin.from('email_tracking').update({
      opened: true,
      opened_at: new Date().toISOString(),
      opens_count: admin.rpc('increment', { row_id: params.id }) as any,
    }).eq('id', params.id).eq('opened', false) // doar prima deschidere

    // Update simplu fără rpc
    await admin.from('email_tracking')
      .update({ opened: true, opened_at: new Date().toISOString() })
      .eq('id', params.id)

  } catch (e) {
    // Fail silently — nu vrem să afectăm experiența utilizatorului
  }

  // Returnează un pixel transparent 1x1
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  )

  return new NextResponse(pixel, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
    },
  })
}
