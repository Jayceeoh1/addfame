'use server'

import { emailCollaborationApproved, emailDeliverableSubmitted, emailPaymentReleased } from '@/lib/email'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

interface CreateCampaignInput {
  title: string
  description: string
  budget: number
  budget_per_influencer: number
  max_influencers: number
  platforms: string[]
  deliverables: string
  deadline: string
  countries?: string[]
  niches?: string[]
  product_name?: string
  product_url?: string
  product_description?: string
  key_messages?: string[]
  content_type?: string[]
  min_duration?: number | null
  product_in_frame?: boolean
  mention_price?: boolean
  discount_code?: string
  content_tone?: string[]
  required_caption?: string
  required_hashtags?: string[]
  link_in_bio?: boolean
  post_time_start?: string | null
  post_time_end?: string | null
  min_days_online?: number
  forbidden_mentions?: string[]
  forbidden_content?: string
  proof_requirements?: string[]
}

export async function createCampaign(data: CreateCampaignInput) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')

    const supabase = await createClient()
    if (!supabase) throw new Error('Failed to initialize Supabase client')

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError) {
      if (authError.message.includes('session') || authError.message.includes('missing'))
        throw new Error('Auth session missing! Please log out and log back in.')
      if (authError.message.includes('expired'))
        throw new Error('Your session has expired. Please refresh the page.')
      throw new Error(`Authentication failed: ${authError.message}`)
    }
    if (!user) throw new Error('User not authenticated. Please login first.')

    const { data: brand, error: brandError } = await supabase
      .from('brands').select('id, name').eq('user_id', user.id).single()
    if (brandError) throw new Error(`Brand profile not found: ${brandError.message}`)
    if (!brand) throw new Error('Your brand profile is missing. Please complete your profile first.')

    const invalidPlatforms = data.platforms.filter((p) => p === 'YOUTUBE')
    if (invalidPlatforms.length > 0) throw new Error('YouTube campaigns are not yet available')

    const { data: campaign, error } = await supabase.from('campaigns').insert({
      brand_id: brand.id,
      brand_name: brand.name,
      title: data.title,
      description: data.description,
      budget: data.budget,
      budget_per_influencer: data.budget_per_influencer,
      max_influencers: data.max_influencers,
      current_influencers: 0,
      platforms: data.platforms,
      deliverables: data.deliverables || (data.content_type || []).join(', '),
      deadline: data.deadline,
      countries: data.countries || [],
      niches: data.niches || [],
      status: 'DRAFT',
      invited_influencers: [],
      accepted_influencers: [],
      declined_influencers: [],
      product_name: data.product_name || null,
      product_url: data.product_url || null,
      product_description: data.product_description || null,
      key_messages: data.key_messages || [],
      content_type: data.content_type || [],
      min_duration: data.min_duration || null,
      product_in_frame: data.product_in_frame || false,
      mention_price: data.mention_price || false,
      discount_code: data.discount_code || null,
      content_tone: data.content_tone || [],
      required_caption: data.required_caption || null,
      required_hashtags: data.required_hashtags || [],
      link_in_bio: data.link_in_bio || false,
      post_time_start: data.post_time_start || null,
      post_time_end: data.post_time_end || null,
      min_days_online: data.min_days_online || 30,
      forbidden_mentions: data.forbidden_mentions || [],
      forbidden_content: data.forbidden_content || null,
      proof_requirements: data.proof_requirements || ['screenshot_post', 'link_post'],
    }).select().single()

    if (error) throw new Error(`Campaign creation failed: ${error.message}`)
    revalidatePath('/brand/campaigns')
    return { success: true, campaign }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create campaign. Please try again.' }
  }
}

// ─── Lansare campanie cu blocare escrow ──────────────────────────────────────
// Când brandul publică campania (DRAFT → ACTIVE), blocăm:
// budget_per_influencer × max_influencers din credite în escrow
export async function updateCampaignStatus(campaignId: string, status: 'ACTIVE' | 'DRAFT' | 'PAUSED' | 'COMPLETED') {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Not authenticated')

    const { data: brand } = await admin
      .from('brands')
      .select('id, credits_balance, credits_reserved')
      .eq('user_id', user.id).single()
    if (!brand) throw new Error('Brand profile not found')

    const { data: campaign } = await admin
      .from('campaigns')
      .select('id, status, budget_per_influencer, budget, max_influencers, escrow_amount')
      .eq('id', campaignId)
      .eq('brand_id', brand.id)
      .single()
    if (!campaign) throw new Error('Campaign not found')

    // Brandul NU poate închide campania — doar adminul sau sistemul automat
    if (status === 'COMPLETED') {
      return {
        success: false,
        error: 'Nu poți închide manual o campanie. Campania se va închide automat la deadline sau prin admin.',
      }
    }

    // ── ACTIVE: blochează escrow ──────────────────────────────────────────────
    if (status === 'ACTIVE' && campaign.status === 'DRAFT') {
      const budgetPerInf = campaign.budget_per_influencer || 0
      const maxInf = campaign.max_influencers || 1
      const escrowNeeded = Math.round(budgetPerInf * maxInf * 100) / 100

      if (escrowNeeded > 0) {
        const available = (brand.credits_balance || 0) - (brand.credits_reserved || 0)
        if (available < escrowNeeded) {
          return {
            success: false,
            error: `Credite insuficiente. Ai €${available.toFixed(2)} disponibili, campania necesită €${escrowNeeded.toFixed(2)} (€${budgetPerInf} × ${maxInf} influenceri).`,
            insufficientFunds: true,
            required: escrowNeeded,
            available,
          }
        }

        // Blochează escrow-ul
        await admin.from('brands').update({
          credits_reserved: (brand.credits_reserved || 0) + escrowNeeded,
        }).eq('id', brand.id)

        // Salvează suma escrow pe campanie
        await admin.from('campaigns').update({
          status,
          escrow_amount: escrowNeeded,
          escrow_reserved_at: new Date().toISOString(),
        }).eq('id', campaignId)

        // Log tranzacție escrow
        await admin.from('brand_transactions').insert({
          brand_id: brand.id,
          type: 'ESCROW_LOCK',
          amount: escrowNeeded,
          description: `Escrow blocat pentru campania: ${campaign.id} (€${budgetPerInf} × ${maxInf} influenceri)`,
          status: 'completed',
          campaign_id: campaignId,
        })

        revalidatePath('/brand/campaigns')
        return { success: true, escrowLocked: escrowNeeded }
      }
    }

    // ── COMPLETED / PAUSED: returnează escrow neutilizat ─────────────────────
    if ((status === 'COMPLETED' || status === 'PAUSED') && campaign.escrow_amount > 0) {
      // Calculează câți bani au fost deja plătiți influencerilor din această campanie
      const { data: completedCollabs } = await admin
        .from('collaborations')
        .select('reserved_amount')
        .eq('campaign_id', campaignId)
        .eq('status', 'COMPLETED')

      const alreadyPaid = (completedCollabs || []).reduce((s: number, c: any) => s + (c.reserved_amount || 0), 0)
      const toReturn = Math.max(0, Math.round(((campaign.escrow_amount || 0) - alreadyPaid) * 100) / 100)

      if (toReturn > 0) {
        await admin.from('brands').update({
          credits_reserved: Math.max(0, (brand.credits_reserved || 0) - toReturn),
        }).eq('id', brand.id)

        await admin.from('brand_transactions').insert({
          brand_id: brand.id,
          type: 'ESCROW_RETURN',
          amount: toReturn,
          description: `Escrow returnat la închiderea campaniei (€${toReturn.toFixed(2)} neutilizat)`,
          status: 'completed',
          campaign_id: campaignId,
        })
      }

      await admin.from('campaigns').update({
        status,
        escrow_amount: 0,
      }).eq('id', campaignId)

      revalidatePath('/brand/campaigns')
      return { success: true, escrowReturned: toReturn }
    }

    // ── Orice alt status change ───────────────────────────────────────────────
    await admin.from('campaigns').update({ status }).eq('id', campaignId)
    revalidatePath('/brand/campaigns')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function validateSession() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) return { valid: false, error: error.message }
    if (!user) return { valid: false, error: 'No active session' }
    return { valid: true, user }
  } catch (err: any) {
    return { valid: false, error: err.message }
  }
}

export async function completeCollaboration(collabId: string) {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const sb = await createClient()
    const admin = createAdminClient()

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: collab, error: collabErr } = await admin
      .from('collaborations')
      .select('*, campaigns(budget, budget_per_influencer, max_influencers, brand_id, title), influencers(id, user_id, wallet_balance, total_earned)')
      .eq('id', collabId).single()
    if (collabErr || !collab) return { error: 'Collaboration not found' }
    if (collab.status === 'COMPLETED') return { error: 'Already completed' }

    const { data: brand } = await admin.from('brands').select('id').eq('user_id', user.id).single()
    if (!brand || brand.id !== collab.campaigns?.brand_id) return { error: 'Not authorized' }

    // Suma corectă: reserved_amount > budget_per_influencer > budget/max_influencers
    const maxInf = collab.campaigns?.max_influencers || 1
    const payAmount = collab.reserved_amount && collab.reserved_amount > 0
      ? collab.reserved_amount
      : collab.campaigns?.budget_per_influencer
      || Math.round((collab.campaigns?.budget || 0) / maxInf * 100) / 100

    await admin.from('collaborations').update({
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
      payment_amount: payAmount,
    }).eq('id', collabId)

    if (payAmount > 0 && collab.influencers?.user_id) {
      await admin.from('influencers').update({
        wallet_balance: (collab.influencers.wallet_balance || 0) + payAmount,
        total_earned: (collab.influencers.total_earned || 0) + payAmount,
      }).eq('id', collab.influencers.id)

      await admin.from('transactions').insert({
        user_id: collab.influencers.user_id,
        type: 'EARN',
        amount: payAmount,
        description: `Payment for campaign: ${collab.campaigns?.title ?? 'Campaign'}`,
        status: 'completed',
      })

      const { data: brandFull } = await admin.from('brands').select('credits_balance, credits_reserved, total_spent').eq('id', brand.id).single()
      if (brandFull) {
        await admin.from('brands').update({
          credits_balance: Math.max(0, (brandFull.credits_balance || 0) - payAmount),
          credits_reserved: Math.max(0, (brandFull.credits_reserved || 0) - payAmount),
          total_spent: (brandFull.total_spent || 0) + payAmount,
        }).eq('id', brand.id)

        await admin.from('brand_transactions').insert({
          brand_id: brand.id,
          type: 'SPEND',
          amount: payAmount,
          description: `Campaign payout: ${collab.campaigns?.title ?? 'Campaign'}`,
          status: 'completed',
        })
      }
    }

    if (payAmount > 0 && collab.influencers?.user_id) {
      const { data: inf } = await admin.from('influencers').select('email, name').eq('id', collab.influencers.id).single()
      if (inf?.email) emailPaymentReleased(inf.email, inf.name || 'Influencer', payAmount, collab.campaigns?.title ?? 'Campaign').catch(() => { }).catch(() => { })
    }
    return { success: true, payAmount }
  } catch (e: any) { return { error: e.message } }
}

// ─── Admin închide campania (cu returnare escrow) ────────────────────────────
export async function adminCompleteCampaign(campaignId: string) {
  try {
    const admin = createAdminClient()

    const { data: campaign } = await admin
      .from('campaigns')
      .select('id, status, brand_id, escrow_amount, title, max_influencers, budget_per_influencer')
      .eq('id', campaignId).single()
    if (!campaign) return { error: 'Campaign not found' }
    if (campaign.status === 'COMPLETED') return { error: 'Already completed' }

    const { data: brand } = await admin
      .from('brands')
      .select('id, credits_reserved')
      .eq('id', campaign.brand_id).single()

    // Calculează escrow neutilizat
    const { data: completedCollabs } = await admin
      .from('collaborations')
      .select('reserved_amount')
      .eq('campaign_id', campaignId)
      .eq('status', 'COMPLETED')

    const alreadyPaid = (completedCollabs || []).reduce((s: number, c: any) => s + (c.reserved_amount || 0), 0)
    const toReturn = Math.max(0, Math.round(((campaign.escrow_amount || 0) - alreadyPaid) * 100) / 100)

    // Returnează escrow neutilizat
    if (toReturn > 0 && brand) {
      await admin.from('brands').update({
        credits_reserved: Math.max(0, (brand.credits_reserved || 0) - toReturn),
      }).eq('id', brand.id)

      await admin.from('brand_transactions').insert({
        brand_id: brand.id,
        type: 'ESCROW_RETURN',
        amount: toReturn,
        description: `Escrow returnat — campania "${campaign.title}" a fost închisă (€${toReturn.toFixed(2)} neutilizat)`,
        status: 'completed',
        campaign_id: campaignId,
      })

      // Notificare brand
      await admin.from('notifications').insert({
        user_id: (await admin.from('brands').select('user_id').eq('id', campaign.brand_id).single()).data?.user_id,
        title: '✅ Campanie închisă',
        body: `Campania "${campaign.title}" a fost închisă. €${toReturn.toFixed(2)} din escrow au fost returnați în credite.`,
        link: '/brand/campaigns',
        read: false,
      })
    }

    await admin.from('campaigns').update({
      status: 'COMPLETED',
      escrow_amount: 0,
    }).eq('id', campaignId)

    revalidatePath('/brand/campaigns')
    revalidatePath('/admin')
    return { success: true, escrowReturned: toReturn }
  } catch (e: any) { return { error: e.message } }
}

// ─── Cron: închide automat campaniile expirate ───────────────────────────────
// Apelat din /api/cron/expire-campaigns zilnic
export async function expireOverdueCampaigns() {
  try {
    const admin = createAdminClient()
    const now = new Date().toISOString()

    // Campanii ACTIVE sau PAUSED cu deadline trecut
    const { data: expired } = await admin
      .from('campaigns')
      .select('id, title, brand_id, escrow_amount')
      .in('status', ['ACTIVE', 'PAUSED'])
      .lt('deadline', now)

    if (!expired?.length) return { success: true, expired: 0 }

    let count = 0
    for (const camp of expired) {
      const result = await adminCompleteCampaign(camp.id)
      if (result.success) count++
    }

    return { success: true, expired: count }
  } catch (e: any) { return { error: e.message } }
}
