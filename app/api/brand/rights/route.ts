import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, getSessionBrandId, unauthorized, forbidden } from '@/lib/api-auth'
import { loadBrandRights } from '@/lib/campaign-rights'

// Toate drepturile de autor ale brandului, pe campanii (fără date personale ale creatorilor).
export async function GET() {
  const user = await getSessionUser()
  if (!user) return unauthorized()
  const brandId = await getSessionBrandId(user.id)
  if (!brandId) return forbidden()
  const campaigns = await loadBrandRights(createAdminClient(), brandId)
  return NextResponse.json({ campaigns })
}
