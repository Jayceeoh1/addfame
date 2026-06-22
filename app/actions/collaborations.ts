'use server'

// ── Creator Score — puncte acordate ─────────────────────────────
const SCORE = {
  COLLAB_COMPLETED:     100,
  PROOF_24H_BONUS:       75,
  PROOF_48H_BONUS:       40,
  APPROVED_FIRST_TRY:    50,
  ER_ABOVE_15:           60,
  ER_ABOVE_10:           30,
  REJECTED:             -60,
  REJECTED_CONSECUTIVE: -120,
  CANCELLED_ABANDONED: -200,  // + 1 strike automat
}
import { notifyCollabApproved, notifyCollabRejected, notifyPaymentReceived, notifyNewCampaign } from '@/lib/telegram'

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
      .select('*, campaigns(id, title, budget, budget_per_influencer, max_influencers, current_influencers, brand_id, campaign_type), influencers(id, user_id, name, email, telegram_chat_id)')
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

    // Campaniile MANAGED nu necesită rezervare de fonduri la aprobare
    // Plata se face manual după livrarea conținutului
    const isManaged = (collab.campaigns as any)?.campaign_type === 'MANAGED'

    if (!isManaged) {
      // Rezervă fonduri atomic via RPC (fix race condition)
      const { data: reserveResult } = await admin.rpc('reserve_collab_funds', {
        p_brand_id: brand.id,
        p_amount: budget,
      })
      if (!reserveResult?.ok) {
        return {
          error: `Sold insuficient pentru a garanta plata. Disponibil: ${(reserveResult?.available || 0).toFixed(2)} RON, necesar: ${budget.toFixed(2)} RON.`,
          insufficientFunds: true,
          available: reserveResult?.available || 0,
          required: budget,
        }
      }
    }

    // 1. Marchează colaborarea ACTIVE + salvează suma rezervată
    await admin.from('collaborations').update({
      status: 'ACTIVE',
      reserved_amount: isManaged ? null : budget,
    }).eq('id', collabId)

    // 2. credits_reserved actualizat deja atomic de RPC de mai sus (doar Barter/Paid cu wallet)

    // 3. Incrementează current_influencers pe campanie
    await admin.from('campaigns').update({
      current_influencers: currentInf + 1,
    }).eq('id', collab.campaign_id)

    // 4. Log RESERVE în brand_transactions (doar non-MANAGED)
    if (!isManaged) {
      await admin.from('brand_transactions').insert({
        brand_id: brand.id,
        type: 'RESERVE',
        amount: budget,
        description: `Fonduri rezervate escrow: "${collab.campaigns?.title}" → ${collab.influencers?.name}`,
        status: 'completed',
        collab_id: collabId,
      })
    }

    // 5. Notifică influencer — IMPORTANT: arată suma garantată
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

    // FIX Bug #1: folosim `budget` calculat mai sus, NU redeclaram o noua variabila
    // care ar citi collab.reserved_amount (null in acest moment, inainte de re-fetch)
    if (collab.influencers?.telegram_chat_id) {
      notifyCollabApproved(
        collab.influencers.telegram_chat_id,
        collab.campaigns?.title || 'campanie',
        Math.round(budget * 0.85)
      ).catch(() => {})
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
      .select('*, campaigns(title, budget, budget_per_influencer, max_influencers, brand_id), influencers(id, user_id, name, email, wallet_balance, total_earned, telegram_chat_id)')
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

    // 2+4. Deduct from brand + credit influencer atomic via RPC (fix race condition)
    await admin.rpc('release_collab_escrow', {
      p_brand_id: brand.id,
      p_influencer_id: collab.influencers.id,
      p_total: totalBudget,
      p_influencer_amount: influencerAmount,
      p_platform_fee: platformFee,
    })

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

    // 4. Log influencer transaction (wallet actualizat deja de RPC)
    if (collab.influencers?.id) {

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

    // Telegram notification - plată primită
    if (collab.influencers?.telegram_chat_id) {
      notifyPaymentReceived(
        collab.influencers.telegram_chat_id,
        influencerAmount,
        collab.campaigns?.title || 'campanie'
      ).catch(() => {})
    }

    // 8. Referral bonus — 15 RON pentru ambii la PRIMA colaborare finalizată
    try {
      const REFERRAL_BONUS = 15

      const { data: infFull } = await admin
        .from('influencers')
        .select('id, user_id, referred_by, referral_bonus_paid, wallet_balance, total_earned')
        .eq('id', collab.influencers.id)
        .single()

      // Doar dacă influencerul a fost referit și nu a primit bonusul încă
      if (infFull?.referred_by && !infFull?.referral_bonus_paid) {

        // Găsim referitorul după referral_code
        const { data: referrer } = await admin
          .from('influencers')
          .select('id, user_id, wallet_balance, total_earned, total_referrals, total_referral_earnings, name')
          .eq('referral_code', infFull.referred_by)
          .single()

        if (referrer) {
          // Creditează ambii influenceri atomic via RPC (fix B6 race condition)
          // Verifică și setează referral_bonus_paid = true în aceeași tranzacție DB
          const { data: bonusResult } = await admin.rpc('pay_referral_bonus', {
            p_referred_id: infFull.id,
            p_referrer_id: referrer.id,
            p_amount: REFERRAL_BONUS,
          })

          // Dacă bonusul a fost deja plătit (race condition), skip silențios
          if (!bonusResult?.ok) return { success: true, influencerAmount, platformFee }

          await admin.from('transactions').insert({
            user_id: infFull.user_id,
            type: 'REFERRAL_BONUS',
            amount: REFERRAL_BONUS,
            description: `🎁 Bonus referral — prima colaborare finalizată!`,
            status: 'completed',
          })

          await admin.from('transactions').insert({
            user_id: referrer.user_id,
            type: 'REFERRAL_BONUS',
            amount: REFERRAL_BONUS,
            description: `🎁 Bonus referral — ${collab.influencers?.name} și-a finalizat prima colaborare!`,
            status: 'completed',
          })

          // Notificări pentru ambii
          await notify(admin, infFull.user_id,
            '🎁 Bonus referral primit!',
            `Ai primit ${REFERRAL_BONUS} RON bonus pentru prima ta colaborare finalizată!`,
            '/influencer/wallet'
          )
          await notify(admin, referrer.user_id,
            '🎁 Bonus referral primit!',
            `${collab.influencers?.name} și-a finalizat prima colaborare! Ai primit ${REFERRAL_BONUS} RON bonus în wallet.`,
            '/influencer/wallet'
          )
        }
      }
    } catch (e) { /* referral bonus fail silently */ }

    // ── Creator Score: colaborare finalizată ─────────────────────────────────
    try {
      if (collab.influencers?.id) {
        let scorePoints = SCORE.COLLAB_COMPLETED

        // Bonus viteză: cât timp a trecut de la acceptare până la submitere
        const acceptedAt = collab.created_at ? new Date(collab.created_at) : null
        const submittedAt = collab.deliverable_submitted_at ? new Date(collab.deliverable_submitted_at) : null
        if (acceptedAt && submittedAt) {
          const hoursElapsed = (submittedAt.getTime() - acceptedAt.getTime()) / 3_600_000
          if (hoursElapsed <= 24) scorePoints += SCORE.PROOF_24H_BONUS
          else if (hoursElapsed <= 48) scorePoints += SCORE.PROOF_48H_BONUS
        }

        // Bonus aprobare prima oară (fără respingeri anterioare)
        if (!collab.deliverable_rejected_at) scorePoints += SCORE.APPROVED_FIRST_TRY

        await admin.rpc('update_creator_score', {
          p_influencer_id: collab.influencers.id,
          p_points: scorePoints,
        })

        // Notifică influencerul despre puncte câștigate
        await notify(admin, collab.influencers.user_id,
          `⭐ +${scorePoints} puncte Creator Score!`,
          `Ai câștigat ${scorePoints} puncte pentru colaborarea finalizată cu "${collab.campaigns?.title}".`,
          '/influencer/dashboard'
        )
      }
    } catch (_) { /* score fail silently */ }

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
      .select('*, campaigns(title, brand_id), influencers(id, user_id, name, telegram_chat_id)')
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

    // Telegram notification - respins
    if (collab.influencers?.telegram_chat_id) {
      notifyCollabRejected(
        collab.influencers.telegram_chat_id,
        collab.campaigns?.title || 'campanie',
        reason
      ).catch(() => {})
    }

    // ── Creator Score: penalizare respingere ─────────────────────────────────
    try {
      if (collab.influencers?.id) {
        // Verifică dacă a mai fost respins înainte (respingere consecutivă)
        const wasRejectedBefore = !!collab.deliverable_rejected_at
        const penalty = wasRejectedBefore ? SCORE.REJECTED_CONSECUTIVE : SCORE.REJECTED
        await admin.rpc('update_creator_score', {
          p_influencer_id: collab.influencers.id,
          p_points: penalty,
        })
      }
    } catch (_) { /* score fail silently */ }

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
      .select('*, campaigns(id, title, brand_id, current_influencers), influencers(id, user_id, name, telegram_chat_id)')
      .eq('id', collabId).single()

    if (!collab || collab.campaigns?.brand_id !== brand.id) return { error: 'Not authorized' }
    if (collab.status === 'COMPLETED') return { error: 'Cannot cancel a completed collaboration' }

    const reservedAmount = collab.reserved_amount || 0
    const wasActive = collab.status === 'ACTIVE'

    // 1. Mark cancelled
    await admin.from('collaborations').update({
      status: 'CANCELLED',
      reserved_amount: 0,
    }).eq('id', collabId)

    // 2. Eliberează escrow-ul înapoi la brand atomic via RPC (fix race condition)
    if (reservedAmount > 0) {
      await admin.rpc('cancel_collab_escrow', {
        p_brand_id: brand.id,
        p_reserved_amount: reservedAmount,
      })

      await admin.from('brand_transactions').insert({
        brand_id: brand.id,
        type: 'REFUND',
        amount: reservedAmount,
        description: `Escrow eliberat (anulare): "${collab.campaigns?.title}"`,
        status: 'completed',
        collab_id: collabId,
      })
    }

    // FIX Bug #2: decrementează current_influencers dacă colaborarea era ACTIVE
    if (wasActive && collab.campaigns?.id) {
      const currentInf = collab.campaigns?.current_influencers || 0
      await admin.from('campaigns').update({
        current_influencers: Math.max(0, currentInf - 1),
      }).eq('id', collab.campaigns.id)
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

    // Debitează wallet atomic via RPC (fix B2 race condition)
    const { data: deductResult } = await admin.rpc('deduct_influencer_wallet', {
      p_influencer_id: inf.id,
      p_amount: amount,
    })
    if (!deductResult?.ok) {
      return { error: `Sold insuficient. Disponibil: ${(deductResult?.available || 0).toLocaleString('ro-RO')} RON` }
    }

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


export async function applyToCampaign(campaignId: string, message?: string, deliveryAddress?: { name: string; phone: string; address: string; city: string; county: string; postal: string }) {
  try {
    const sb = await createClient()
    const admin = createAdminClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return { error: 'Nu ești autentificat. Te rog să te loghezi din nou.' }

    const { data: inf, error: infErr } = await admin
      .from('influencers')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (infErr) {
      console.error('[applyToCampaign] influencer fetch error:', infErr)
      return { error: 'Eroare la încărcarea profilului tău: ' + infErr.message }
    }
    if (!inf) return { error: 'Profilul tău de influencer nu a fost găsit. Contactează suportul.' }
    // Verificarea identității dezactivată temporar
    // if (!inf.identity_verified) {
    //   return { error: 'Trebuie să îți verifici identitatea înainte de a aplica.', requiresVerification: true }
    // }

    const { data: campaign, error: campErr } = await admin
      .from('campaigns').select('id, status, brand_id, registrations_open, registration_opened_at, registration_deadline_days, auto_accept_influencers, budget_per_influencer, budget, max_influencers, current_influencers, campaign_type').eq('id', campaignId).single()

    if (campErr) {
      console.error('[applyToCampaign] campaign fetch error:', campErr)
      return { error: 'Eroare la încărcarea campaniei: ' + campErr.message }
    }
    if (!campaign) return { error: 'Campania nu a fost găsită' }
    if (campaign.status !== 'ACTIVE') return { error: 'Campania nu mai este activă (status: ' + campaign.status + ')' }

    if (campaign.registrations_open === false) {
      return { error: 'Înscrierile pentru această campanie sunt închise momentan.' }
    }

    if (campaign.registration_opened_at) {
      const days = campaign.registration_deadline_days || 30
      const expiry = new Date(new Date(campaign.registration_opened_at).getTime() + days * 86400000)
      if (expiry < new Date()) {
        return { error: 'Perioada de înscriere pentru această campanie a expirat.' }
      }
    }

    const { data: existing } = await admin
      .from('collaborations').select('id')
      .eq('campaign_id', campaignId).eq('influencer_id', inf.id).maybeSingle()

    if (existing) return { error: 'Ai aplicat deja la această campanie' }

    // Verifică dacă mai sunt locuri disponibile
    const maxSlots = campaign.max_influencers || 0
    const currentSlots = campaign.current_influencers || 0
    if (maxSlots > 0 && currentSlots >= maxSlots) {
      return { error: 'Campania nu mai are locuri disponibile. Toate sloturile sunt ocupate.' }
    }

    // Dacă auto_accept e activ → intră direct ACTIVE, altfel PENDING (aprobare manuală)
    // Campaniile MANAGED intră mereu PENDING — aprobarea e manuală + necesită call cu echipa
    const isManaged = campaign.campaign_type === 'MANAGED'
    const initialStatus = (!isManaged && campaign.auto_accept_influencers) ? 'ACTIVE' : 'PENDING'

    // ── Fix #4: auto_accept → rezervă escrow înainte de insert ──────────────
    // Campania barter (budget 0) nu necesită rezervare financiară
    const isBarter = campaign.campaign_type === 'BARTER'
    const budgetPerInf = campaign.budget_per_influencer
      || (campaign.budget && campaign.max_influencers
        ? Math.round((campaign.budget / campaign.max_influencers) * 100) / 100
        : 0)

    if (initialStatus === 'ACTIVE' && !isBarter && budgetPerInf > 0) {
      const { data: reserveResult } = await admin.rpc('reserve_collab_funds', {
        p_brand_id: campaign.brand_id,
        p_amount: budgetPerInf,
      })
      if (!reserveResult?.ok) {
        return {
          error: `Brandul nu mai are fonduri disponibile pentru această campanie. Încearcă mai târziu.`,
          insufficientFunds: true,
        }
      }
    }

    const { error, data: newCollab } = await admin.from('collaborations').insert({
      campaign_id: campaignId,
      influencer_id: inf.id,
      brand_id: campaign.brand_id,
      status: initialStatus,
      // Salvează suma rezervată dacă auto_accept a rezervat escrow
      reserved_amount: (initialStatus === 'ACTIVE' && !isBarter && budgetPerInf > 0) ? budgetPerInf : null,
      message: message || null,
      delivery_name: deliveryAddress?.name || null,
      delivery_phone: deliveryAddress?.phone || null,
      delivery_address: deliveryAddress?.address || null,
      delivery_city: deliveryAddress?.city || null,
      delivery_county: deliveryAddress?.county || null,
      delivery_postal_code: deliveryAddress?.postal || null,
    }).select('id').single()

    if (error) {
      console.error('[applyToCampaign] insert error:', error)
      // Dacă inserarea eșuează după rezervare, eliberăm fondurile înapoi
      if (initialStatus === 'ACTIVE' && !isBarter && budgetPerInf > 0) {
        await admin.rpc('cancel_collab_escrow', {
          p_brand_id: campaign.brand_id,
          p_reserved_amount: budgetPerInf,
        })
      }
      return { error: 'Nu s-a putut salva aplicația: ' + error.message }
    }
    return { success: true }
  } catch (e: any) {
    console.error('[applyToCampaign] unexpected error:', e)
    return { error: e.message || 'Eroare necunoscută la aplicare. Te rog încearcă din nou.' }
  }
}
// ─── CHECK-IN CU COD ─────────────────────────────────────────────────────────

export async function checkInWithCode(collaborationId: string, code: string) {
  try {
    const sb = await createClient()
    const admin = createAdminClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return { error: 'Nu ești autentificat.' }

    const { data: inf } = await admin.from('influencers').select('id').eq('user_id', user.id).single()
    if (!inf) return { error: 'Profil influencer negăsit.' }

    // Gaseste colaborarea
    const { data: collab } = await admin
      .from('collaborations')
      .select('id, campaign_id, status, checked_in_at')
      .eq('id', collaborationId)
      .eq('influencer_id', inf.id)
      .single()

    if (!collab) return { error: 'Colaborarea nu a fost găsită.' }
    if (collab.checked_in_at) return { error: 'Ai făcut deja check-in la această campanie.' }
    if (collab.status !== 'ACTIVE') return { error: 'Colaborarea nu este activă.' }

    // Verifica codul din campanie
    const { data: campaign } = await admin
      .from('campaigns')
      .select('checkin_code, delivery_method')
      .eq('id', collab.campaign_id)
      .single()

    if (!campaign) return { error: 'Campania nu a fost găsită.' }
    if (campaign.delivery_method !== 'pickup') return { error: 'Această campanie nu necesită check-in.' }
    if (!campaign.checkin_code) return { error: 'Codul de check-in nu a fost generat încă. Contactează brandul.' }

    const inputCode = code.trim().toUpperCase()
    const validCode = campaign.checkin_code.trim().toUpperCase()

    if (inputCode !== validCode) return { error: 'Cod incorect. Cere codul de la brand.' }

    // Salveaza check-in
    const { error: updateErr } = await admin
      .from('collaborations')
      .update({ checked_in_at: new Date().toISOString() })
      .eq('id', collaborationId)

    if (updateErr) return { error: 'Eroare la salvarea check-in-ului.' }

    return { success: true }
  } catch (e: any) {
    return { error: e.message || 'Eroare necunoscută.' }
  }
}

export async function generateCheckinCode(campaignId: string) {
  try {
    const sb = await createClient()
    const admin = createAdminClient()

    // Verifică că utilizatorul e brand-ul proprietar al campaniei (fix B5)
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return { error: 'Nu ești autentificat.' }

    const { data: brand } = await admin.from('brands').select('id').eq('user_id', user.id).single()
    if (!brand) return { error: 'Profil brand negăsit.' }

    const { data: campaign } = await admin.from('campaigns').select('brand_id').eq('id', campaignId).single()
    if (!campaign || campaign.brand_id !== brand.id) return { error: 'Nu ești autorizat pentru această campanie.' }

    // Cod de 6 caractere alfanumeric fara caractere confuze (0,O,I,1)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')

    const { error } = await admin
      .from('campaigns')
      .update({ checkin_code: code })
      .eq('id', campaignId)

    if (error) return { error: error.message }
    return { success: true, code }
  } catch (e: any) {
    return { error: e.message }
  }
}
