'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/verify-admin'
import { revalidatePath } from 'next/cache'

// ─── Helper: calculate engagement rate ──────────────────────────
function calcER(likes: number, comments: number, shares: number, saves: number, reach: number): number {
  if (!reach || reach <= 0) return 0
  const total = (likes || 0) + (comments || 0) + (shares || 0) + (saves || 0)
  return Number(((total / reach) * 100).toFixed(2))
}

// ─── Fetch all performance data for a campaign ──────────────────
export async function getCampaignPerformance(campaignId: string) {
  try {
    await requireAdmin()
    const admin = createAdminClient()

    // Fetch toate colaborările acceptate sau finalizate
    // Exclude doar PENDING/REJECTED — restul sunt influenceri care lucrează sau au lucrat
    const { data: collabs } = await admin
      .from('collaborations')
      .select('id, status, influencer_id, influencers(id, name, avatar, platforms, ig_followers, tt_followers)')
      .eq('campaign_id', campaignId)
      .not('status', 'in', '(REJECTED,PENDING,INVITED)')

    if (!collabs) return { collabs: [], performance: [], posts: [] }

    const collabIds = collabs.map((c: any) => c.id)

    const [{ data: performance }, { data: posts }] = await Promise.all([
      admin.from('campaign_performance').select('*').in('collaboration_id', collabIds),
      admin.from('campaign_posts').select('*').in('collaboration_id', collabIds).order('post_date', { ascending: false })
    ])

    return {
      collabs: collabs || [],
      performance: performance || [],
      posts: posts || []
    }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── Save/update performance data for an influencer ─────────────
export async function savePerformance(data: {
  collaboration_id: string
  campaign_id: string
  influencer_id: string
  audience_female_pct?: number
  audience_male_pct?: number
  audience_age_18_24?: number
  audience_age_25_34?: number
  audience_age_35_44?: number
  audience_age_45_54?: number
  audience_age_55_plus?: number
  audience_top_locations?: Array<{ city: string; pct: number }>
  sentiment?: 'positive' | 'neutral' | 'negative'
  ugc_reusable_count?: number
  promo_code?: string
  promo_uses?: number
  promo_sales_ron?: number
  best_post_screenshot_url?: string
  admin_notes?: string
}) {
  try {
    await requireAdmin()
    const admin = createAdminClient()

    const { error } = await admin
      .from('campaign_performance')
      .upsert({
        ...data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'collaboration_id' })

    if (error) return { error: error.message }

    revalidatePath(`/admin/campaigns/${data.campaign_id}/performance`)
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── Add a post for an influencer ───────────────────────────────
export async function addPost(data: {
  collaboration_id: string
  campaign_id: string
  influencer_id: string
  post_type: 'feed' | 'reel' | 'story' | 'carousel' | 'tiktok' | 'youtube_short' | 'youtube_video'
  post_url?: string
  post_date?: string
  views?: number
  reach?: number
  likes?: number
  comments?: number
  shares?: number
  saves?: number
}) {
  try {
    await requireAdmin()
    const admin = createAdminClient()

    const engagement_rate = calcER(data.likes || 0, data.comments || 0, data.shares || 0, data.saves || 0, data.reach || 0)

    const { data: newPost, error } = await admin
      .from('campaign_posts')
      .insert({ ...data, engagement_rate })
      .select()
      .single()

    if (error) return { error: error.message }

    revalidatePath(`/admin/campaigns/${data.campaign_id}/performance`)
    return { success: true, post: newPost }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── Update post ────────────────────────────────────────────────
export async function updatePost(postId: string, data: Partial<{
  post_type: string
  post_url: string
  post_date: string
  views: number
  reach: number
  likes: number
  comments: number
  shares: number
  saves: number
}>) {
  try {
    await requireAdmin()
    const admin = createAdminClient()

    // Recalculate ER if relevant fields changed
    const recalcER = ['likes', 'comments', 'shares', 'saves', 'reach'].some(k => k in data)
    let updateData: any = { ...data, updated_at: new Date().toISOString() }

    if (recalcER) {
      const { data: existing } = await admin
        .from('campaign_posts').select('*').eq('id', postId).single()
      if (existing) {
        const merged = { ...existing, ...data }
        updateData.engagement_rate = calcER(merged.likes, merged.comments, merged.shares, merged.saves, merged.reach)
      }
    }

    const { error } = await admin.from('campaign_posts').update(updateData).eq('id', postId)
    if (error) return { error: error.message }

    return { success: true, engagement_rate: updateData.engagement_rate }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── Delete post ────────────────────────────────────────────────
export async function deletePost(postId: string) {
  try {
    await requireAdmin()
    const admin = createAdminClient()
    const { error } = await admin.from('campaign_posts').delete().eq('id', postId)
    if (error) return { error: error.message }
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── Aggregated stats for report ────────────────────────────────
export async function getCampaignStats(campaignId: string) {
  try {
    await requireAdmin()
    const admin = createAdminClient()

    const { data: posts } = await admin
      .from('campaign_posts').select('*').eq('campaign_id', campaignId)

    if (!posts) return { totalReach: 0, totalEngagement: 0, totalPosts: 0, avgER: 0, postsByType: {} }

    const totalReach = posts.reduce((s, p) => s + (p.reach || 0), 0)
    const totalEngagement = posts.reduce((s, p) => s + (p.likes || 0) + (p.comments || 0) + (p.shares || 0) + (p.saves || 0), 0)
    const avgER = posts.length > 0 ? posts.reduce((s, p) => s + (p.engagement_rate || 0), 0) / posts.length : 0

    const postsByType = posts.reduce((acc: Record<string, number>, p) => {
      acc[p.post_type] = (acc[p.post_type] || 0) + 1
      return acc
    }, {})

    return {
      totalReach,
      totalEngagement,
      totalPosts: posts.length,
      avgER: Number(avgER.toFixed(2)),
      postsByType
    }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── Get campaign data for PDF report ────────────────────────────────────────
export async function getCampaignForReport(campaignId: string) {
  try {
    await requireAdmin()
    const admin = createAdminClient()

    const { data: campaign } = await admin
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    return { campaign: campaign || null }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ─── Update influencer followers (admin bypass RLS) ────────────────────────
export async function updateInfluencerFollowers(
  influencerId: string,
  igFollowers: number,
  ttFollowers: number
) {
  try {
    await requireAdmin()
    const admin = createAdminClient()
    const { error } = await admin
      .from('influencers')
      .update({ ig_followers: igFollowers, tt_followers: ttFollowers })
      .eq('id', influencerId)
    if (error) return { error: error.message }
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}
