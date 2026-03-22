import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Called by Vercel Cron daily at 3:00 AM
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[Cron] Starting social sync...')
  let igSynced = 0, igErrors = 0

  // 1. Sync Instagram
  const { data: igInfluencers } = await admin
    .from('influencers')
    .select('id, user_id, instagram_access_token, instagram_token_expires, instagram_user_id')
    .eq('instagram_connected', true)
    .not('instagram_access_token', 'is', null)

  for (const inf of igInfluencers || []) {
    try {
      // Check if token expired
      if (inf.instagram_token_expires && new Date(inf.instagram_token_expires) < new Date()) {
        // Try to refresh token
        const refreshRes = await fetch(
          `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${inf.instagram_access_token}`
        )
        const refreshData = await refreshRes.json()
        if (refreshData.access_token) {
          const newExpiry = new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
          await admin.from('influencers').update({
            instagram_access_token: refreshData.access_token,
            instagram_token_expires: newExpiry,
          }).eq('id', inf.id)
          inf.instagram_access_token = refreshData.access_token
        } else {
          // Token expired and can't refresh — mark as disconnected
          await admin.from('influencers').update({ instagram_connected: false }).eq('id', inf.id)
          continue
        }
      }

      // Fetch fresh profile data
      const profileRes = await fetch(
        `https://graph.instagram.com/v21.0/me?fields=id,username,biography,followers_count,follows_count,media_count,profile_picture_url&access_token=${inf.instagram_access_token}`
      )
      const profile = await profileRes.json()
      if (!profile.id) { igErrors++; continue }

      // Fetch recent media for engagement
      const mediaRes = await fetch(
        `https://graph.instagram.com/v21.0/me/media?fields=like_count,comments_count&limit=12&access_token=${inf.instagram_access_token}`
      )
      const mediaData = await mediaRes.json()
      let engagementRate = 0
      if (mediaData.data?.length > 0 && profile.followers_count > 0) {
        const totalEng = mediaData.data.reduce((s: number, p: any) =>
          s + (p.like_count || 0) + (p.comments_count || 0), 0)
        engagementRate = (totalEng / mediaData.data.length / profile.followers_count) * 100
      }

      // Update DB
      await admin.from('influencers').update({
        ig_followers: profile.followers_count || 0,
        ig_following: profile.follows_count || 0,
        ig_posts_count: profile.media_count || 0,
        ig_bio: profile.biography || null,
        ig_avatar: profile.profile_picture_url || null,
        ig_engagement_rate: Math.round(engagementRate * 100) / 100,
        ig_last_sync: new Date().toISOString(),
      }).eq('id', inf.id)

      igSynced++
      // Rate limit — wait 200ms between calls
      await new Promise(r => setTimeout(r, 200))
    } catch (e: any) {
      console.error(`[Cron] IG error for ${inf.id}:`, e.message)
      igErrors++
    }
  }

  console.log(`[Cron] Done. IG: ${igSynced} synced, ${igErrors} errors`)
  return NextResponse.json({ ok: true, ig: { synced: igSynced, errors: igErrors } })
}