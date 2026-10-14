// Contractele de cesiune trimise creatorului și încă nesemnate (pentru cardul din panou).
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser } from '@/lib/api-auth'

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ contracts: [] })
    const db = createAdminClient()
    const { data: inf } = await db.from('influencers').select('id, email').eq('user_id', user.id).maybeSingle()
    if (!inf) return NextResponse.json({ contracts: [] })
    const email = String(inf.email || user.email || '').trim().toLowerCase()
    const COLS = 'id, token, campaign_title, brand_name, product_name, created_at'
    const byId = db.from('cesiune_contracts').select(COLS).eq('status', 'sent').eq('influencer_id', inf.id).limit(5)
    const byEmail = email
      ? db.from('cesiune_contracts').select(COLS).eq('status', 'sent').ilike('influencer_email', email.replace(/[\\%_]/g, m => '\\' + m)).limit(5)
      : Promise.resolve({ data: [] as any[] })
    const [a, b] = await Promise.all([byId, byEmail])
    const seen = new Set<string>()
    const data = [...(a.data ?? []), ...(b.data ?? [])]
      .filter((c: any) => !seen.has(c.id) && seen.add(c.id))
      .sort((x: any, y: any) => String(y.created_at).localeCompare(String(x.created_at)))
      .map(({ id, ...rest }: any) => rest)
    return NextResponse.json({ contracts: data ?? [] })
  } catch {
    return NextResponse.json({ contracts: [] })
  }
}
