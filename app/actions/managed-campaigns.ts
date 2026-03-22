'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface CreateManagedCampaignInput {
  objective: string
  platforms: string[]
  product_name: string
  product_description: string
  product_url?: string
  product_image_url?: string
  target_niches: string[]
  budget: number
  influencer_count: number
  deadline_days: number
  key_messages?: string
  content_instructions?: string
  forbidden_content?: string
}

export async function createManagedCampaign(data: CreateManagedCampaignInput) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Sesiune expirată.')

    const { data: brand } = await supabase
      .from('brands').select('id, name').eq('user_id', user.id).single()
    if (!brand) throw new Error('Profilul brandului nu a fost găsit.')

    if (!data.product_name?.trim()) throw new Error('Numele produsului este obligatoriu.')
    if (!data.product_description?.trim()) throw new Error('Descrierea produsului este obligatorie.')
    if (!data.budget || data.budget < 500) throw new Error('Bugetul minim este 500 RON.')
    if (!data.objective) throw new Error('Selectează un obiectiv.')
    if (!data.platforms?.length) throw new Error('Selectează cel puțin o platformă.')

    const deadline = new Date(Date.now() + data.deadline_days * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]

    const keyMessagesList = data.key_messages
      ? data.key_messages.split('\n').filter(Boolean)
      : []

    const { data: campaign, error } = await supabase.from('campaigns').insert({
      brand_id: brand.id,
      brand_name: brand.name,
      title: `[Managed] ${data.product_name}`,
      description: data.product_description,
      budget: data.budget,
      budget_per_influencer: Math.round((data.budget * 0.75) / data.influencer_count),
      max_influencers: data.influencer_count,
      current_influencers: 0,
      platforms: data.platforms,
      deliverables: `Conținut organic pe ${data.platforms.join(', ')}`,
      deadline,
      countries: ['Romania'],
      niches: data.target_niches,
      status: 'PENDING_REVIEW',
      campaign_type: 'MANAGED',
      // Brief
      product_name: data.product_name,
      offer_image_url: data.product_image_url || null,
      product_url: data.product_url || null,
      product_description: data.product_description,
      key_messages: keyMessagesList,
      content_tone: [],
      forbidden_content: data.forbidden_content || null,
      // Extra metadata
      managed_objective: data.objective,
      managed_instructions: data.content_instructions || null,
      invited_influencers: [],
      accepted_influencers: [],
      declined_influencers: [],
    }).select().single()

    if (error) throw new Error(`Eroare la salvare: ${error.message}`)

    // Notifică admins via email
    try {
      const { sendEmail } = await import('@/lib/email')
      await sendEmail(
        process.env.FROM_EMAIL || 'noreply@addfame.ro',
        `🆕 Campanie Managed nouă: ${data.product_name} — €${data.budget}`,
        `<p>Brand: <strong>${brand.name}</strong></p>
         <p>Produs: ${data.product_name}</p>
         <p>Buget: €${data.budget} | Influenceri: ${data.influencer_count}</p>
         <p>Obiectiv: ${data.objective}</p>
         <p>Platforme: ${data.platforms.join(', ')}</p>
         <p><a href="https://addfame.ro/admin/campaigns">Vezi în admin →</a></p>`
      )
    } catch (e) { console.error('[Managed email failed]', e) }

    revalidatePath('/brand/campaigns')
    return { success: true, campaign }
  } catch (err: any) {
    return { success: false, error: err.message || 'Eroare necunoscută.' }
  }
}

// ── Admin: obține campaniile MANAGED ──────────────────────────────────────
export async function getManagedCampaigns() {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('campaigns')
      .select('*')
      .eq('campaign_type', 'MANAGED')
      .order('created_at', { ascending: false })
    if (error) throw error
    return { success: true, data: data || [] }
  } catch (err: any) {
    return { success: false, error: err.message, data: [] }
  }
}

// ── Admin: asignează influenceri la o campanie Managed ────────────────────
export async function assignInfluencersToManaged(
  campaignId: string,
  influencerIds: string[],
  influencersWithAmounts?: { id: string; amount: number }[]
) {
  try {
    const admin = createAdminClient()

    // Verifică că campania există și e Managed
    const { data: campaign } = await admin
      .from('campaigns').select('id, brand_id, title, brand_name, max_influencers, budget')
      .eq('id', campaignId).eq('campaign_type', 'MANAGED').single()
    if (!campaign) throw new Error('Campania nu există.')

    // Construiește map de sume per influencer
    const amountMap: Record<string, number> = {}
    if (influencersWithAmounts) {
      influencersWithAmounts.forEach(({ id, amount }) => { amountMap[id] = amount })
    }

    // Creează colaborări pentru fiecare influencer cu suma rezervată
    const collaborations = influencerIds.map(infId => ({
      campaign_id: campaignId,
      influencer_id: infId,
      brand_id: campaign.brand_id,
      status: 'INVITED',
      payment_amount: amountMap[infId] || 0,
      reserved_amount: amountMap[infId] || 0,
    }))

    const { error: collabError } = await admin
      .from('collaborations')
      .upsert(collaborations, { onConflict: 'campaign_id,influencer_id' })
    if (collabError) throw new Error(collabError.message)

    // Activează campania
    await admin.from('campaigns')
      .update({ status: 'ACTIVE', invited_influencers: influencerIds })
      .eq('id', campaignId)

    // Rezervă creditele brandului (escrow)
    if (campaign.brand_id && influencersWithAmounts && influencersWithAmounts.length > 0) {
      const totalReserved = influencersWithAmounts.reduce((sum, { amount }) => sum + amount, 0)
      const commission = Math.round((campaign.budget || 0) * 0.25)
      const totalToDeduct = totalReserved + commission

      const { data: brand } = await admin.from('brands')
        .select('credits_balance').eq('id', campaign.brand_id).single()

      if (brand && brand.credits_balance >= totalToDeduct) {
        await admin.from('brands')
          .update({ credits_balance: brand.credits_balance - totalToDeduct })
          .eq('id', campaign.brand_id)

        // Log tranzacție
        await admin.from('brand_transactions').insert({
          brand_id: campaign.brand_id,
          type: 'SPEND',
          amount: -totalToDeduct,
          description: `Campanie Managed: ${campaign.title} — ${influencerIds.length} influenceri (${totalReserved} RON distribuit + ${commission} RON comision AddFame)`,
          status: 'completed',
        })
      }
    }

    // Notifică influencerii
    try {
      const { emailInfluencerInvited } = await import('@/lib/email')
      for (const infId of influencerIds) {
        const { data: inf } = await admin
          .from('influencers').select('user_id, name').eq('id', infId).single()
        if (!inf) continue
        const { data: authUser } = await admin.auth.admin.getUserById(inf.user_id)
        const email = authUser?.user?.email
        if (email) {
          await emailInfluencerInvited(email, inf.name, campaign.brand_name, campaign.title)
        }
      }
    } catch (e) { console.error('[Invite emails failed]', e) }

    revalidatePath('/admin/campaigns')
    return { success: true, count: influencerIds.length }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
