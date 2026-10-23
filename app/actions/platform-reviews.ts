'use server'
// Admin → Rating platformă: toate evaluările AddFame (stele + comentariu) cu cine le-a dat.

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/verify-admin'
import { igHandleOf } from '@/lib/dm-list'

export type PlatformReviewRow = {
  user_id: string
  rating: number
  comment: string | null
  role: string
  created_at: string | null
  updated_at: string | null
  name: string
  email: string | null
  phone: string | null
  instagram: string | null
  influencer_id: string | null
  brand_id: string | null
}

export async function adminPlatformReviews() {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error }
  const admin = createAdminClient()

  const reviews: any[] = []
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await admin.from('platform_reviews').select('*')
      .order('updated_at', { ascending: false, nullsFirst: false }).range(from, from + 999)
    if (error) return { error: error.message }
    reviews.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  const ids = [...new Set(reviews.map(r => r.user_id).filter(Boolean))] as string[]

  const infMap = new Map<string, any>()
  const brandMap = new Map<string, any>()
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200)
    const [{ data: infs }, { data: brands }] = await Promise.all([
      admin.from('influencers').select('id, user_id, name, email, phone, instagram_handle, platforms').in('user_id', chunk),
      admin.from('brands').select('*').in('user_id', chunk),
    ])
    ;(infs || []).forEach((x: any) => infMap.set(x.user_id, x))
    ;(brands || []).forEach((x: any) => brandMap.set(x.user_id, x))
  }

  const rows: PlatformReviewRow[] = []
  for (const r of reviews) {
    const inf = infMap.get(r.user_id)
    const br = brandMap.get(r.user_id)
    let email: string | null = inf?.email || br?.email || null
    if (!email && r.user_id) {
      try { const { data } = await admin.auth.admin.getUserById(r.user_id); email = data?.user?.email || null } catch {}
    }
    rows.push({
      user_id: r.user_id, rating: Number(r.rating) || 0, comment: r.comment || null,
      role: r.role || (br ? 'brand' : 'influencer'),
      created_at: r.created_at || null, updated_at: r.updated_at || r.created_at || null,
      name: inf?.name || br?.name || br?.company_name || email || 'Utilizator șters',
      email, phone: inf?.phone || br?.phone || null,
      instagram: inf ? igHandleOf(inf) : null,
      influencer_id: inf?.id || null, brand_id: br?.id || null,
    })
  }
  return { success: true as const, rows }
}
