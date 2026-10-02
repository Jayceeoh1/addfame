'use server'
import { notifyNewCampaign } from '@/lib/telegram'

import { emailCollaborationApproved, emailDeliverableSubmitted, emailPaymentReleased } from '@/lib/email'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { chargeCampaignFee, getInfluencerFeePrice, refundUnusedSlots, settleCampaignFee, isFeeModelCampaign, MAX_FEE_SLOTS } from '@/lib/campaign-fee'

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
export async function updateCampaignStatus(campaignId: string, status: 'ACTIVE' | 'DRAFT' | 'PAUSED' | 'COMPLETED') {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Not authenticated')

    const { data: brand } = await admin
      .from('brands')
      .select('id, credits_balance, credits_reserved, user_id')
      .eq('user_id', user.id).single()
    if (!brand) throw new Error('Brand profile not found')

    const { data: campaign } = await admin
      .from('campaigns')
      .select('id, status, budget, budget_per_influencer, max_influencers, escrow_amount, title, fee_per_influencer')
      .eq('id', campaignId)
      .eq('brand_id', brand.id)
      .single()
    if (!campaign) throw new Error('Campaign not found')

    const feeModel = isFeeModelCampaign(campaign as any)

    // Pauza: doar pentru o campanie activă (altfel s-ar putea ocoli plata/aprobarea)
    if (status === 'PAUSED' && campaign.status !== 'ACTIVE') {
      return { success: false, error: 'Doar o campanie activă poate fi pusă pe pauză.' }
    }

    // Campanii cu taxă plătită: nu se întorc în draft (s-ar plăti din nou la republicare).
    // Excepție: retragerea din aprobare → taxa se returnează integral.
    if (status === 'DRAFT' && feeModel) {
      if (campaign.status === 'PENDING_REVIEW') {
        const { data: withdrawn } = await admin.from('campaigns')
          .update({ status: 'DRAFT' })
          .eq('id', campaignId).eq('status', 'PENDING_REVIEW')
          .select('id')
        if (!withdrawn || withdrawn.length === 0) {
          return { success: false, error: 'Campania a fost deja procesată de admin. Reîncarcă pagina.' }
        }
        const refunded = await settleCampaignFee(campaignId, 0, `Retur taxă — campania "${campaign.title}" a fost retrasă din aprobare`)
        revalidatePath('/brand/campaigns')
        revalidatePath('/brand/wallet')
        return { success: true, refunded }
      }
      return { success: false, error: 'O campanie plătită nu poate fi mutată înapoi în draft. O poți pune pe pauză.' }
    }

    // Brandul NU poate marca manual ca COMPLETED
    if (status === 'COMPLETED') {
      return {
        success: false,
        error: 'Nu poți închide manual o campanie. Campania se va închide automat la deadline sau prin admin.',
      }
    }

    // ── ACTIVE (Publish): brandul plătește taxa per influencer și trimite la aprobare ──
    // Taxa (nr. influenceri × preț) se încasează atomic; fără sold, campania rămâne draft.
    if (status === 'ACTIVE' && (campaign.status === 'DRAFT' || campaign.status === 'REJECTED')) {
      const charge = await chargeCampaignFee(campaignId, brand.id, campaign.max_influencers || 1)
      if (!charge.ok) {
        return {
          success: false,
          error: charge.error,
          insufficientFunds: !!charge.insufficientFunds,
          available: charge.available,
          required: charge.required,
        }
      }
      revalidatePath('/brand/campaigns')
      revalidatePath('/brand/wallet')
      return { success: true, pendingReview: true, feeCharged: charge.total }
    }

    // ── PAUSED / înapoi la DRAFT: verifică colaborări active + aplică penalitate ──
    if ((status === 'PAUSED' || status === 'DRAFT') && campaign.status === 'ACTIVE') {

      // Verifică dacă există colaborări active
      const { data: activeCollabs } = await admin
        .from('collaborations')
        .select('id')
        .eq('campaign_id', campaignId)
        .in('status', ['ACTIVE', 'PENDING'])

      if (activeCollabs && activeCollabs.length > 0) {
        return {
          success: false,
          error: `Nu poți opri campania — ai ${activeCollabs.length} colaborare${activeCollabs.length > 1 ? 'i' : ''} activă${activeCollabs.length > 1 ? '' : ''}. Așteaptă finalizarea lor sau contactează adminul.`,
          hasActiveCollabs: true,
          activeCollabsCount: activeCollabs.length,
        }
      }

      // Nicio colaborare activă — aplică penalitate 35%
      const escrow = campaign.escrow_amount || 0
      if (escrow > 0) {
        const penalty = Math.round(escrow * 0.35 * 100) / 100
        const toReturn = Math.round((escrow - penalty) * 100) / 100

        // Actualizează creditele brandului
        await admin.from('brands').update({
          credits_reserved: Math.max(0, (brand.credits_reserved || 0) - escrow),
          credits_balance: Math.max(0, (brand.credits_balance || 0) - penalty), // penalitatea se scade din sold
        }).eq('id', brand.id)

        // Log penalitate
        await admin.from('brand_transactions').insert({
          brand_id: brand.id,
          type: 'PENALTY',
          amount: penalty,
          description: `Penalitate 35% pentru oprirea campaniei "${campaign.title}" (${penalty.toFixed(2)} RON reținuți)`,
          status: 'completed',
          campaign_id: campaignId,
        })

        // Log returnare parțială
        if (toReturn > 0) {
          await admin.from('brand_transactions').insert({
            brand_id: brand.id,
            type: 'ESCROW_RETURN',
            amount: toReturn,
            description: `Returnare parțială escrow — campanie oprită "${campaign.title}" (65% din ${escrow.toFixed(2)} RON)`,
            status: 'completed',
            campaign_id: campaignId,
          })
        }

        // Notificare brand
        await admin.from('notifications').insert({
          user_id: brand.user_id,
          title: '⚠️ Campanie oprită — penalitate aplicată',
          body: `Campania "${campaign.title}" a fost oprită. Penalitate reținută: ${penalty.toFixed(2)} RON (35%). Suma returnată: ${toReturn.toFixed(2)} RON.`,
          link: '/brand/wallet',
          read: false,
        })

        await admin.from('campaigns').update({
          status: 'PAUSED',
          escrow_amount: 0,
        }).eq('id', campaignId)

        revalidatePath('/brand/campaigns')
        return { success: true, penalty, returned: toReturn }
      }
    }

    // ── Reactivare din PAUSED → ACTIVE ───────────────────────────────────────
    if (status === 'ACTIVE' && campaign.status === 'PAUSED') {
      const escrowNeeded = campaign.budget || 0
      if (escrowNeeded > 0) {
        // Blochează escrow atomic via RPC (fix B3 race condition)
        const { data: lockResult } = await admin.rpc('lock_campaign_escrow', {
          p_brand_id: brand.id,
          p_amount: escrowNeeded,
        })
        if (!lockResult?.ok) {
          return {
            success: false,
            error: `Credite insuficiente pentru reactivare. Ai ${(lockResult?.available || 0).toFixed(2)} RON disponibili, campania necesită ${escrowNeeded.toFixed(2)} RON.`,
            insufficientFunds: true,
          }
        }
        await admin.from('campaigns').update({
          status,
          escrow_amount: escrowNeeded,
        }).eq('id', campaignId)
        revalidatePath('/brand/campaigns')
        return { success: true }
      }
      // Campanii fără buget de blocat (barter, negociabile): reluare simplă, ca înainte
      await admin.from('campaigns').update({ status }).eq('id', campaignId)
      revalidatePath('/brand/campaigns')
      return { success: true }
    }

    // ── Orice alt status change ───────────────────────────────────────────────
    // Brandul nu poate activa direct o campanie (doar adminul, după review)
    if (status === 'ACTIVE') {
      return {
        success: false,
        error: campaign.status === 'PENDING_REVIEW'
          ? 'Campania așteaptă aprobarea adminului.'
          : 'Campania nu poate fi activată din starea curentă.',
      }
    }
    // Alte tranziții permise (ca înainte):
    //  - ACTIVE → PAUSED fără escrow (ex. barter) — cazul cu escrow e tratat mai sus
    //  - campanie pe modelul vechi înapoi în draft
    const allowed =
      (status === 'PAUSED' && campaign.status === 'ACTIVE') ||
      (status === 'DRAFT' && !feeModel && ['PENDING_REVIEW', 'PAUSED', 'ACTIVE'].includes(campaign.status))
    if (!allowed) {
      return { success: false, error: 'Schimbare de status nepermisă.' }
    }
    await admin.from('campaigns').update({ status }).eq('id', campaignId)
    revalidatePath('/brand/campaigns')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── Taxa per influencer: info pentru selectorul din formularul de campanie ──
export async function getCampaignFeeInfo() {
  try {
    const price = await getInfluencerFeePrice()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { price, available: 0, loggedIn: false }
    const admin = createAdminClient()
    const { data: brand } = await admin
      .from('brands').select('credits_balance, credits_reserved').eq('user_id', user.id).maybeSingle()
    const available = Math.max(0, (brand?.credits_balance || 0) - (brand?.credits_reserved || 0))
    return { price, available, loggedIn: true, maxSlots: MAX_FEE_SLOTS }
  } catch {
    return { price: await getInfluencerFeePrice(), available: 0, loggedIn: false, maxSlots: MAX_FEE_SLOTS }
  }
}

// ─── Publicare campanie (orice tip) cu taxa per influencer ───────────────────
// Campania trebuie să existe deja ca DRAFT (sau REJECTED). Dacă soldul nu ajunge,
// rămâne draft și se întoarce insufficientFunds.
export async function publishCampaignWithFee(campaignId: string, slots?: number) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Sesiune expirată. Autentifică-te din nou.' }

    const admin = createAdminClient()
    const { data: brand } = await admin.from('brands').select('id').eq('user_id', user.id).maybeSingle()
    if (!brand) return { success: false, error: 'Profilul brandului nu a fost găsit.' }

    const { data: campaign } = await admin
      .from('campaigns').select('id, brand_id, status, max_influencers')
      .eq('id', campaignId).maybeSingle()
    if (!campaign || campaign.brand_id !== brand.id) return { success: false, error: 'Campania nu a fost găsită.' }

    const n = slots ?? campaign.max_influencers ?? 1
    const charge = await chargeCampaignFee(campaignId, brand.id, n)
    if (!charge.ok) {
      return {
        success: false,
        error: charge.error,
        insufficientFunds: !!charge.insufficientFunds,
        available: charge.available,
        required: charge.required,
        campaignId,
      }
    }
    revalidatePath('/brand/campaigns')
    revalidatePath('/brand/wallet')
    return { success: true, pendingReview: true, campaignId, feeCharged: charge.total }
  } catch (e: any) {
    return { success: false, error: e.message || 'Eroare la publicare.' }
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

// completeCollaboration a fost eliminată: nu era folosită în aplicație, dar putea fi
// apelată din afară și plătea fără comision / fără aprobarea livrabilului.
// Plata se face exclusiv prin approveDeliverable (app/actions/collaborations.ts).

// ─── Admin închide campania (cu returnare escrow) ────────────────────────────
// Funcție internă — apelată de cron și de wrapper-ul cu auth
async function completeCampaignInternal(campaignId: string) {
  try {
    const admin = createAdminClient()

    // Modelul nou: returnează taxa pentru locurile neocupate (înainte de a schimba colaborările)
    const { data: feeCheck } = await admin.from('campaigns').select('status').eq('id', campaignId).maybeSingle()
    if (feeCheck && feeCheck.status !== 'COMPLETED') {
      await refundUnusedSlots(campaignId)
    }

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
        description: `Escrow returnat — campania "${campaign.title}" a fost închisă (${toReturn.toFixed(2)} RON neutilizat)`,
        status: 'completed',
        campaign_id: campaignId,
      })

      // Notificare brand
      await admin.from('notifications').insert({
        user_id: (await admin.from('brands').select('user_id').eq('id', campaign.brand_id).single()).data?.user_id,
        title: '✅ Campanie închisă',
        body: `Campania "${campaign.title}" a fost închisă. ${toReturn.toFixed(2)} RON din escrow au fost returnați în credite.`,
        link: '/brand/campaigns',
        read: false,
      })
    }

    await admin.from('campaigns').update({
      status: 'COMPLETED',
      escrow_amount: 0,
    }).eq('id', campaignId)

    // Colaborările ACTIVE rămase (fără dovadă) se marchează COMPLETED automat —
    // au fost efectiv selectate, deci campania conta pentru ele
    await admin.from('collaborations')
      .update({ status: 'COMPLETED' })
      .eq('campaign_id', campaignId)
      .eq('status', 'ACTIVE')

    // Colaborările care erau doar aplicări/invitații nerezolvate (PENDING/INVITED/etc)
    // se marchează REJECTED — nu au fost niciodată selectate in campanie
    // EXCEPȚIE: campaniile Managed nu auto-resping — adminul selectează manual
    const { data: campType } = await admin.from('campaigns').select('campaign_type').eq('id', campaignId).single()
    const isManaged = campType?.campaign_type === 'MANAGED'

    const { data: openCollabs } = await admin
      .from('collaborations')
      .select('id, influencer_id')
      .eq('campaign_id', campaignId)
      .in('status', ['PENDING', 'INVITED', 'PENDING_INFLUENCER', 'APPLIED'])

    if (openCollabs && openCollabs.length > 0 && !isManaged) {
      await admin.from('collaborations')
        .update({
          status: 'REJECTED',
          rejection_reason: 'Campania a fost finalizată. Locurile disponibile au fost ocupate. Te ținem la curent cu campaniile viitoare! 🙌',
        })
        .eq('campaign_id', campaignId)
        .in('status', ['PENDING', 'INVITED', 'PENDING_INFLUENCER', 'APPLIED'])

      const influencerIds = openCollabs.map((c: any) => c.influencer_id)
      const { data: infs } = await admin.from('influencers').select('id, user_id').in('id', influencerIds)
      if (infs && infs.length > 0) {
        const notifications = infs.map((inf: any) => ({
          user_id: inf.user_id,
          title: '📢 Campanie finalizată',
          body: 'O campanie la care ai aplicat a fost finalizată. Locurile disponibile au fost ocupate — te ținem la curent cu campaniile noi!',
          link: '/influencer/campaigns',
          read: false,
        }))
        await admin.from('notifications').insert(notifications)
      }
    }

    revalidatePath('/brand/campaigns')
    revalidatePath('/influencer/dashboard')
    revalidatePath('/admin')
    return { success: true, escrowReturned: toReturn }
  } catch (e: any) { return { error: e.message } }
}

// ─── Exported admin wrapper cu auth guard ────────────────────────────────────
export async function adminCompleteCampaign(campaignId: string) {
  const { requireAdmin } = await import('@/lib/supabase/verify-admin')
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  return completeCampaignInternal(campaignId)
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
      const result = await completeCampaignInternal(camp.id)
      if (result.success) count++
    }

    return { success: true, expired: count }
  } catch (e: any) { return { error: e.message } }
}

export async function deleteCampaign(campaignId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Neautorizat' }

    // Only DRAFT campaigns can be deleted by brand
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, status, brand_id')
      .eq('id', campaignId)
      .single()

    if (!campaign) return { error: 'Campania nu există.' }
    if (!['DRAFT', 'REJECTED'].includes(campaign.status)) {
      return { error: 'Doar campaniile Draft sau Respinse pot fi șterse.' }
    }

    // Verify brand ownership
    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (!brand || brand.id !== campaign.brand_id) return { error: 'Neautorizat' }

    const { error } = await supabase
      .from('campaigns')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', campaignId)

    if (error) return { error: error.message }
    return { success: true }
  } catch (e: any) { return { error: e.message } }
}
