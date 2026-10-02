import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// 1x1 transparent GIF pixel
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const type = searchParams.get('t') || 'brand' // 'brand' or 'inf'

    if (id) {
      const table = type === 'inf' ? 'outreach_influencer_leads' : 'outreach_leads'

      // Get current open count
      const { data } = await supabase
        .from(table)
        .select('open_count, opened_at')
        .eq('id', id)
        .single()

      const now = new Date().toISOString()
      await supabase.from(table).update({
        opened_at: data?.opened_at || now, // primul deschis
        last_opened_at: now,
        open_count: (data?.open_count || 0) + 1,
      }).eq('id', id)
    }
  } catch (e) {
    // Fail silently - nu vrem să blocăm pixelul
  }

  // Returnează pixelul transparent
  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
    },
  })
}
