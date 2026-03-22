'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  emailCollaborationApproved,
  emailPaymentReleased,
  emailInfluencerInvited,
} from '@/lib/email'

const PLATFORM_COMMISSION = 0.15
const WITHDRAWAL_FEE = 0.05

async function notify(admin: any, userId: string, title: string, body: string, link?: string) {
  try {
    await admin.from('notifications').insert({ user_id: userId, title, body, link, read: false })
  } catch (e) { console.error('notify error', e) }
}

// ─── 1. Brand approves influencer application → ESCROW ────────────────────────
// Blochează suma din credite ca rezervă → influencerul vede plata garantată
export async function approveApplication(collabId: string) {
  try {
    const sb = await createClient()
    const admin = createAdminClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: brand } = await admin
      .from('brands')
      .select('id, name, credits_balance, credits_reserved')
      .eq('user_id', user.id).single()
    if (!brand) return { error: 'Brand not found' }

    const { data: collab } = await admin
      .from('collaborations')
      .select('*, campaigns(id, title, budget, budget_per_influencer, max_influencers, current_influencers, brand_id), influencers(id, user_id, name, email)')
      .eq('id', collabId).single()

    if (!collab) return { error: 'Collaboration not found' }
    if (collab.campaigns?.brand_id !== brand.id) return { error: 'Not authorized' }
    if (collab.status !== 'PENDING') return { error: 'Status invalid' }

    // Budget per influencer: folosim budget_per_influencer dacă există
    // Dacă nu, împărțim budget total la max_influencers
    // Niciodată nu rezervăm întregul budget total pentru un singur influencer
    const maxInf = collab.campaigns?.max_influencers || 1
    const budget = collab.campaigns?.budget_per_influencer
      || (collab.campaigns?.budget ? Math.round((collab.campaigns.budget / maxInf) * 100) / 100 : 0)
    const currentInf = collab.campaigns?.current_influencers || 0

    // Verifică dacă mai sunt locuri disponibile
    if (currentInf >= maxInf) {
      return { error: `Campania a atins numărul maxim de ${maxInf} influenceri.` }
    }

    // Verifică sold disponibil (balance - deja rezervat)
    const availableBalance = (brand.credits_balance || 0) - (brand.credits_reserved || 0)
    if (availableBalance < budget) {
      return {
        error: `Sold insuficient pentru a garanta plata. Disponibil: ${availableBalance.toFixed(2)} RON, necesar: ${budget.toFixed(2)} RON.`,
        insufficientFunds: true,
        available: availableBalance,
        required: budget,
      }
    }

    // 1. Marchează colaborarea ACTIVE + salvează suma rezervată
    await admin.from('collaborations').update({
      status: 'ACTIVE',
      reserved_amount: budget,
    }).eq('id', collabId)

    // 2. Crește credits_reserved pe brand (fondurile sunt acum blocate)
    await admin.from('brands').update({
      credits_reserved: (brand.credits_reserved || 0) + budget,
    }).eq('id', brand.id)

    // 3. Incrementează current_influencers pe campanie
    await admin.from('campaigns').update({
      current_influencers: currentInf + 1,
    }).eq('id', collab.campaign_id)

    // 3. Log RESERVE în brand_transactions
    await admin.from('brand_transactions').insert({
      brand_id: brand.id,
      type: 'RESERVE',
      amount: budget,
      description: `Fonduri rezervate escrow: "${collab.campaigns?.title}" → ${collab.influencers?.name}`,
      status: 'completed',
      collab_id: collabId,
    })

    // 4. Notifică influencer — IMPORTANT: arată suma garantată
    if (collab.influencers?.user_id) {
      await notify(admin, collab.influencers.user_id,
        '🔒 Plată garantată! Aplicația aprobată.',
        `${brand.name} a aprobat colaborarea și a blocat ${budget.toFixed(2)} RON escrow pentru tine. Publică postul și trimiți dovada pentru a primi plata.`,
        '/influencer/collaborations'
      )
      if (collab.influencers?.email) {
        emailCollaborationApproved(
          collab.influencers.email,
          collab.influencers.name || 'Influencer',
          brand.name,
          collab.campaigns?.title || 'Campaign'
        ).catch(() => { })
      }
    }

    return { success: true, reservedAmount: budget }
  } catch (e: any) { return { error: e.message } }
}

// ─── 2. Brand approves post → release escrow to influencer ───────────────────
export async function approveDeliverable(collabId: string) {
  try {
    const sb = await createClient()
    const admin = createAdminClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: brand } = await admin
      .from('brands')
      .select('id, name, credits_balance, credits_reserved, total_spent')
      .eq('user_id', user.id).single()
    if (!brand) return { error: 'Brand not found' }

    const { data: collab } = await admin
      .from('collaborations')
      .select('*, campaigns(title, budget, budget_per_influencer, brand_id), influencers(id, user_id, name, email, wallet_balance, total_earned)')
      .eq('id', collabId).single()

    if (!collab) return { error: 'Collaboration not found' }
    if (collab.campaigns?.brand_id !== brand.id) return { error: 'Not authorized' }
    if (!collab.deliverable_submitted_at) return { error: 'No deliverable submitted' }
    if (collab.status === 'COMPLETED') return { error: 'Already completed' }

    // Prioritate: reserved_amount (suma rezervata la aprobare) > budget_per_influencer > budget/max_influencers
    // NICIODATA nu folosim budget total al campaniei direct
    const maxInf = collab.campaigns?.max_influencers || 1
    const budgetPerInf = collab.campaigns?.budget_per_influencer
      || (collab.campaigns?.budget ? Math.round((collab.campaigns.budget / maxInf) * 100) / 100 : 0)
    const totalBudget = (collab.reserved_amount && collab.reserved_amount > 0)
      ? collab.reserved_amount
      : budgetPerInf
    const platformFee = Math.round(totalBudget * PLATFORM_COMMISSION * 100) / 100
    const influencerAmount = Math.round((totalBudget - platformFee) * 100) / 100

    const now = new Date().toISOString()

    // 1. Mark collab COMPLETED
    await admin.from('collaborations').update({
      status: 'COMPLETED',
      deliverable_approved_at: now,
      completed_at: now,
      payment_amount: influencerAmount,
      platform_fee: platformFee,
    }).eq('id', collabId)

    // 2. Deduct from brand: credits_balance scade + credits_reserved scade (escrow eliberat)
    await admin.from('brands').update({
      credits_balance: Math.max(0, (brand.credits_balance || 0) - totalBudget),
      credits_reserved: Math.max(0, (brand.credits_reserved || 0) - totalBudget),
      total_spent: (brand.total_spent || 0) + totalBudget,
    }).eq('id', brand.id)

    // 3. Log brand SPEND (înlocuiește RESERVE)
    await admin.from('brand_transactions').insert({
      brand_id: brand.id,
      type: 'SPEND',
      amount: totalBudget,
      description: `Plată finalizată: "${collab.campaigns?.title}" → ${collab.influencers?.name}`,
      status: 'completed',
      platform_fee: platformFee,
      collab_id: collabId,
    })

    // 4. Credit influencer wallet (85%)
    if (collab.influencers?.id) {
      await admin.from('influencers').update({
        wallet_balance: (collab.influencers.wallet_balance || 0) + influencerAmount,
        total_earned: (collab.influencers.total_earned || 0) + influencerAmount,
      }).eq('id', collab.influencers.id)

      await admin.from('transactions').insert({
        user_id: collab.influencers.user_id,
        type: 'EARN',
        amount: influencerAmount,
        description: `Plată campanie: "${collab.campaigns?.title}"`,
        status: 'completed',
        collab_id: collabId,
      })
    }

    // 5. Log platform revenue
    try {
      await admin.from('platform_revenue').insert({
        collab_id: collabId,
        amount: platformFee,
        type: 'commission',
        description: `15% comision: "${collab.campaigns?.title}"`,
      })
    } catch (_) { }

    // 6. Notify influencer
    if (collab.influencers?.user_id) {
      await notify(admin, collab.influencers.user_id,
        '💸 Plata eliberată din escrow!',
        `Ai primit ${influencerAmount.toFixed(2)} RON în wallet pentru "${collab.campaigns?.title}". Poți retrage oricând.`,
        '/influencer/wallet'
      )
      if (collab.influencers?.email) {
        emailPaymentReleased(
          collab.influencers.email,
          collab.influencers.name || 'Influencer',
          influencerAmount,
          collab.campaigns?.title || 'Campaign'
        ).catch(() => { })
      }
    }

    // 7. Notify brand
    await notify(admin, user.id,
      '✅ Post aprobat! Escrow eliberat.',
      `Colaborare finalizată cu ${collab.influencers?.name}. ${influencerAmount.toFixed(2)} RON trimiși influencerului (comision AddFame: ${platformFee.toFixed(2)} RON).`,
      '/brand/collaborations'
    )

    return { success: true, influencerAmount, platformFee }
  } catch (e: any) { return { error: e.message } }
}

// ─── 3. Brand rejects deliverable → KEEP escrow (poate retrimite) ─────────────
export async function rejectDeliverable(collabId: string, reason: string) {
  try {
    const sb = await createClient()
    const admin = createAdminClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: brand } = await admin.from('brands').select('id, name').eq('user_id', user.id).single()
    if (!brand) return { error: 'Brand not found' }

    const { data: collab } = await admin
      .from('collaborations')
      .select('*, campaigns(title, brand_id), influencers(id, user_id, name)')
      .eq('id', collabId).single()

    if (!collab || collab.campaigns?.brand_id !== brand.id) return { error: 'Not authorized' }

    // Resetează deliverable dar PĂSTREAZĂ escrow-ul activ
    await admin.from('collaborations').update({
      deliverable_rejected_at: new Date().toISOString(),
      deliverable_rejection_reason: reason,
      deliverable_submitted_at: null,
      deliverable_url: null,
    }).eq('id', collabId)

    if (collab.influencers?.user_id) {
      await notify(admin, collab.influencers.user_id,
        '⚠️ Revizuire necesară',
        `${brand.name} a cerut modificări la "${collab.campaigns?.title}". Motiv: ${reason}. Plata (${(collab.reserved_amount || 0).toFixed(2)} RON) rămâne rezervată — retrimite dovada.`,
        '/influencer/collaborations'
      )
    }

    return { success: true }
  } catch (e: any) { return { error: e.message } }
}

// ─── 4. Brand cancels collaboration → refund escrow ──────────────────────────
export async function cancelCollaboration(collabId: string) {
  try {
    const sb = await createClient()
    const admin = createAdminClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: brand } = await admin
      .from('brands')
      .select('id, name, credits_reserved')
      .eq('user_id', user.id).single()
    if (!brand) return { error: 'Brand not found' }

    const { data: collab } = await admin
      .from('collaborations')
      .select('*, campaigns(title, brand_id), influencers(id, user_id, name)')
      .eq('id', collabId).single()

    if (!collab || collab.campaigns?.brand_id !== brand.id) return { error: 'Not authorized' }
    if (collab.status === 'COMPLETED') return { error: 'Cannot cancel a completed collaboration' }

    const reservedAmount = collab.reserved_amount || 0

    // 1. Mark cancelled
    await admin.from('collaborations').update({
      status: 'CANCELLED',
      reserved_amount: 0,
    }).eq('id', collabId)

    // 2. Eliberează escrow-ul înapoi la brand
    if (reservedAmount > 0) {
      await admin.from('brands').update({
        credits_reserved: Math.max(0, (brand.credits_reserved || 0) - reservedAmount),
      }).eq('id', brand.id)

      await admin.from('brand_transactions').insert({
        brand_id: brand.id,
        type: 'REFUND',
        amount: reservedAmount,
        description: `Escrow eliberat (anulare): "${collab.campaigns?.title}"`,
        status: 'completed',
        collab_id: collabId,
      })
    }

    // 3. Notify influencer
    if (collab.influencers?.user_id) {
      await notify(admin, collab.influencers.user_id,
        '❌ Colaborare anulată',
        `${brand.name} a anulat colaborarea pentru "${collab.campaigns?.title}". Ne pare rău.`,
        '/influencer/collaborations'
      )
    }

    return { success: true }
  } catch (e: any) { return { error: e.message } }
}

// ─── 5. Brand invites influencer ─────────────────────────────────────────────
export async function inviteInfluencer(influencerId: string, campaignId: string, message?: string) {
  try {
    const sb = await createClient()
    const admin = createAdminClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: brand } = await admin.from('brands').select('id, name').eq('user_id', user.id).single()
    if (!brand) return { error: 'Brand not found' }

    const { data: campaign } = await admin.from('campaigns').select('id, title, brand_id, budget_per_influencer').eq('id', campaignId).single()
    if (!campaign || campaign.brand_id !== brand.id) return { error: 'Campaign not found' }

    const { data: existing } = await admin.from('collaborations')
      .select('id').eq('influencer_id', influencerId).eq('campaign_id', campaignId).maybeSingle()
    if (existing) return { error: 'Already invited or applied' }

    const { data: inf } = await admin.from('influencers').select('id, user_id, name, email').eq('id', influencerId).single()
    if (!inf) return { error: 'Influencer not found' }

    await admin.from('collaborations').insert({
      influencer_id: influencerId,
      campaign_id: campaignId,
      status: 'INVITED',
      message: message || `${brand.name} te-a invitat să colaborezi pe campania "${campaign.title}".`,
    })

    await notify(admin, inf.user_id,
      `🎯 Invitație de la ${brand.name}`,
      `Ai primit o invitație pentru campania "${campaign.title}". Acceptă sau refuză din Colaborări.`,
      '/influencer/collaborations'
    )

    if (inf.email) {
      try { await emailInfluencerInvited(inf.email, inf.name || 'Influencer', brand.name, campaign.title, campaign.budget_per_influencer || undefined) }
      catch (e) { console.error('[Invite email failed]', e) }
    }

    return { success: true }
  } catch (e: any) { return { error: e.message } }
}

// ─── 6. Influencer requests withdrawal ───────────────────────────────────────
export async function requestWithdrawal(amount: number, methodId: string) {
  try {
    const sb = await createClient()
    const admin = createAdminClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    if (!amount || amount < 250) return { error: 'Suma minimă de retragere este 250 RON.' }

    const { data: inf } = await admin.from('influencers')
      .select('id, wallet_balance, pending_payout, name, last_payout_at')
      .eq('user_id', user.id).single()
    if (!inf) return { error: 'Influencer not found' }

    // Verificare ciclu 15 zile
    if (inf.last_payout_at) {
      const lastPayout = new Date(inf.last_payout_at)
      const daysSince = Math.floor((Date.now() - lastPayout.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSince < 15) {
        const nextAvailable = new Date(lastPayout.getTime() + 15 * 24 * 60 * 60 * 1000)
        const nextDate = nextAvailable.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
        return { error: `Poți retrage o dată la 15 zile. Următoarea retragere disponibilă: ${nextDate}.`, nextAvailableAt: nextAvailable.toISOString() }
      }
    }

    if (amount > (inf.wallet_balance || 0)) {
      return { error: `Sold insuficient. Disponibil: ${(inf.wallet_balance || 0).toLocaleString('ro-RO')} RON` }
    }

    const { data: method } = await admin.from('influencer_payment_methods')
      .select('id, type, label').eq('id', methodId).eq('user_id', user.id).single()
    if (!method) return { error: 'Metodă de plată invalidă.' }

    const fee = Math.round(amount * WITHDRAWAL_FEE * 100) / 100
    const netAmount = Math.round((amount - fee) * 100) / 100

    await admin.from('influencers').update({
      wallet_balance: (inf.wallet_balance || 0) - amount,
      pending_payout: (inf.pending_payout || 0) + amount,
      last_payout_at: new Date().toISOString(),
    }).eq('id', inf.id)

    await admin.from('transactions').insert({
      user_id: user.id,
      type: 'PAYOUT',
      amount: -amount,
      description: `Retragere via ${method.label || method.type} (net: ${netAmount.toFixed(2)} RON după 5% fee)`,
      status: 'pending',
      fee,
      payment_method_id: methodId,
    })

    try {
      await admin.from('platform_revenue').insert({
        amount: fee,
        type: 'withdrawal_fee',
        description: `5% fee retragere: ${inf.name}`,
      })
    } catch (_) { }

    await notify(admin, user.id,
      '📤 Cerere de retragere trimisă',
      `Cererea de ${amount.toFixed(2)} RON (net: ${netAmount.toFixed(2)} RON) a fost înregistrată. Procesare în 3-5 zile lucrătoare.`,
      '/influencer/wallet'
    )

    return { success: true, amount, fee, netAmount }
  } catch (e: any) { return { error: e.message } }
}


export async function applyToCampaign(campaignId: string, message?: string) {
  try {
    const sb = await createClient()
    const admin = createAdminClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: inf } = await admin
      .from('influencers')
      .select('id, identity_verified, approval_status')
      .eq('user_id', user.id)
      .single()

    if (!inf) return { error: 'Profil influencer negasit' }
    if (!inf.identity_verified) {
      return { error: 'Trebuie sa iti verifici identitatea inainte de a aplica.', requiresVerification: true }
    }

    const { data: campaign } = await admin
      .from('campaigns').select('id, status, brand_id').eq('id', campaignId).single()

    if (!campaign) return { error: 'Campania nu a fost gasita' }
    if (campaign.status !== 'ACTIVE') return { error: 'Campania nu mai este activa' }

    const { data: existing } = await admin
      .from('collaborations').select('id')
      .eq('campaign_id', campaignId).eq('influencer_id', inf.id).single()

    if (existing) return { error: 'Ai aplicat deja la aceasta campanie' }

    const { error } = await admin.from('collaborations').insert({
      campaign_id: campaignId,
      influencer_id: inf.id,
      brand_id: campaign.brand_id,
      status: 'PENDING',
      message: message || null,
    })

    if (error) return { error: error.message }
    return { success: true }
  } catch (e: any) {
    return { error: e.message || 'Eroare la aplicare' }
  }
}