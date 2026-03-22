'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const BADGE_MONTHLY_PRICE = 50 // RON/lună

export async function getInfluencerStats(influencerId: string) {
  try {
    const admin = createAdminClient()
    const { data: collabs } = await admin
      .from('collaborations')
      .select('status, payment_amount, created_at, completed_at')
      .eq('influencer_id', influencerId)

    if (!collabs) return { total: 0, completed: 0, successRate: 0, totalEarned: 0, avgDays: 0 }

    const total = collabs.length
    const completed = collabs.filter(c => c.status === 'COMPLETED').length
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0
    const totalEarned = collabs
      .filter(c => c.status === 'COMPLETED')
      .reduce((s, c) => s + (c.payment_amount || 0), 0)

    const completedWithDates = collabs.filter(c => c.status === 'COMPLETED' && c.created_at && c.completed_at)
    const avgDays = completedWithDates.length > 0
      ? Math.round(
        completedWithDates.reduce((s, c) => {
          const days = (new Date(c.completed_at).getTime() - new Date(c.created_at).getTime()) / 86400000
          return s + days
        }, 0) / completedWithDates.length
      )
      : 0

    return { total, completed, successRate, totalEarned, avgDays }
  } catch (e: any) {
    return { total: 0, completed: 0, successRate: 0, totalEarned: 0, avgDays: 0 }
  }
}

// ─── Helper: verifică dacă badge-ul e activ (nu expirat) ─────────────────────
export async function checkBadgeActive(influencerId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data: inf } = await admin
    .from('influencers')
    .select('is_verified, badge_expires_at')
    .eq('id', influencerId)
    .single()

  if (!inf?.is_verified) return false
  if (!inf.badge_expires_at) return false
  return new Date(inf.badge_expires_at) > new Date()
}

// ─── Plată abonament lunar din wallet ────────────────────────────────────────
export async function purchaseVerifiedBadgeWallet() {
  try {
    const sb = await createClient()
    const admin = createAdminClient()

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: inf } = await admin
      .from('influencers')
      .select('id, name, wallet_balance, is_verified, badge_expires_at')
      .eq('user_id', user.id)
      .single()

    if (!inf) return { error: 'Influencer not found' }

    // Dacă e deja activ și nu a expirat, refuză
    const isActive = inf.is_verified && inf.badge_expires_at && new Date(inf.badge_expires_at) > new Date()
    if (isActive) return { error: 'Abonamentul tău este deja activ.' }

    if ((inf.wallet_balance || 0) < BADGE_MONTHLY_PRICE) {
      return {
        error: `Sold insuficient. Ai ${(inf.wallet_balance || 0).toFixed(2)} RON, necesar ${BADGE_MONTHLY_PRICE} RON.`,
        insufficientFunds: true,
      }
    }

    // Calculează noua dată expirare: dacă a expirat recent, pornește de azi; altfel extinde
    const now = new Date()
    const currentExpiry = inf.badge_expires_at ? new Date(inf.badge_expires_at) : now
    const baseDate = currentExpiry > now ? currentExpiry : now
    const newExpiry = new Date(baseDate)
    newExpiry.setMonth(newExpiry.getMonth() + 1)

    await admin.from('influencers').update({
      is_verified: true,
      verified_at: inf.badge_expires_at ? inf.verified_at : now.toISOString(),
      badge_expires_at: newExpiry.toISOString(),
      wallet_balance: (inf.wallet_balance || 0) - BADGE_MONTHLY_PRICE,
    }).eq('id', inf.id)

    await admin.from('transactions').insert({
      user_id: user.id,
      type: 'SPEND',
      amount: -BADGE_MONTHLY_PRICE,
      description: `Verified Creator — abonament lunar (expiră ${newExpiry.toLocaleDateString('ro-RO')})`,
      status: 'completed',
    })

    try {
      await admin.from('platform_revenue').insert({
        amount: BADGE_MONTHLY_PRICE,
        type: 'badge_subscription',
        description: `Verified Creator abonament: ${inf.name}`,
      })
    } catch (_) { }

    await admin.from('notifications').insert({
      user_id: user.id,
      title: '⭐ Verified Creator activ!',
      body: `Profilul tău apare primul la branduri până pe ${newExpiry.toLocaleDateString('ro-RO')}.`,
      link: '/influencer/settings',
      read: false,
    })

    revalidatePath('/influencer/settings')
    revalidatePath('/brand/influencers')
    return { success: true, expiresAt: newExpiry.toISOString() }
  } catch (e: any) {
    return { error: e.message || 'Purchase failed' }
  }
}

// ─── Inițiază transfer bancar pentru abonament ────────────────────────────────
export async function initiateBadgeBankTransfer(billingName: string, billingAddress?: string) {
  try {
    const sb = await createClient()
    const admin = createAdminClient()

    const { data: { user } } = await sb.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: inf } = await admin
      .from('influencers')
      .select('id, name, email, is_verified, badge_expires_at')
      .eq('user_id', user.id)
      .single()

    if (!inf) return { error: 'Influencer not found' }

    const isActive = inf.is_verified && inf.badge_expires_at && new Date(inf.badge_expires_at) > new Date()
    if (isActive) return { error: 'Abonamentul tău este deja activ.' }

    const now = new Date()
    const prefix = `BADGE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const { count } = await admin
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('type', 'BADGE_PENDING')

    const invoiceNumber = `${prefix}-${String((count ?? 0) + 1).padStart(4, '0')}`

    await admin.from('transactions').insert({
      user_id: user.id,
      type: 'BADGE_PENDING',
      amount: -BADGE_MONTHLY_PRICE,
      description: `Verified Creator abonament lunar — transfer bancar (${invoiceNumber})`,
      status: 'pending',
      billing_details: { name: billingName, address: billingAddress || '' },
    })

    return { success: true, invoiceNumber, amount: BADGE_MONTHLY_PRICE }
  } catch (e: any) {
    return { error: e.message || 'Failed to initiate transfer' }
  }
}

// ─── Admin confirmă plata transfer bancar ─────────────────────────────────────
export async function confirmBadgePayment(userId: string) {
  try {
    const admin = createAdminClient()

    const { data: inf } = await admin
      .from('influencers')
      .select('id, name, badge_expires_at, verified_at')
      .eq('user_id', userId)
      .single()

    if (!inf) return { error: 'Influencer not found' }

    const now = new Date()
    const currentExpiry = inf.badge_expires_at ? new Date(inf.badge_expires_at) : now
    const baseDate = currentExpiry > now ? currentExpiry : now
    const newExpiry = new Date(baseDate)
    newExpiry.setMonth(newExpiry.getMonth() + 1)

    await admin.from('influencers').update({
      is_verified: true,
      verified_at: inf.verified_at || now.toISOString(),
      badge_expires_at: newExpiry.toISOString(),
    }).eq('id', inf.id)

    await admin.from('transactions')
      .update({ status: 'completed' })
      .eq('user_id', userId)
      .eq('type', 'BADGE_PENDING')
      .eq('status', 'pending')

    try {
      await admin.from('platform_revenue').insert({
        amount: BADGE_MONTHLY_PRICE,
        type: 'badge_subscription',
        description: `Verified Creator abonament (transfer): ${inf.name}`,
      })
    } catch (_) { }

    await admin.from('notifications').insert({
      user_id: userId,
      title: '⭐ Plata confirmată! Verified Creator activ!',
      body: `Transferul a fost confirmat. Profilul tău apare primul până pe ${newExpiry.toLocaleDateString('ro-RO')}.`,
      link: '/influencer/settings',
      read: false,
    })

    revalidatePath('/influencer/settings')
    revalidatePath('/brand/influencers')
    return { success: true, expiresAt: newExpiry.toISOString() }
  } catch (e: any) {
    return { error: e.message || 'Failed to confirm payment' }
  }
}

// ─── Cron job: dezactivează badge-urile expirate ──────────────────────────────
// Apelat din /api/cron/expire-badges (protejat cu CRON_SECRET)
export async function expireOverdueBadges() {
  try {
    const admin = createAdminClient()
    const now = new Date().toISOString()

    // Găsește toți influencerii cu badge expirat dar is_verified = true
    const { data: expired } = await admin
      .from('influencers')
      .select('id, user_id, name, badge_expires_at')
      .eq('is_verified', true)
      .lt('badge_expires_at', now)

    if (!expired || expired.length === 0) return { success: true, expired: 0 }

    for (const inf of expired) {
      await admin.from('influencers').update({
        is_verified: false,
      }).eq('id', inf.id)

      // Notificare expirare
      await admin.from('notifications').insert({
        user_id: inf.user_id,
        title: '⚠️ Abonamentul Verified Creator a expirat',
        body: 'Badge-ul tău auriu a expirat. Reînnoiește din Settings pentru a apărea primul la branduri.',
        link: '/influencer/settings',
        read: false,
      })
    }

    revalidatePath('/brand/influencers')
    return { success: true, expired: expired.length }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function getAllInfluencerStats() {
  try {
    const admin = createAdminClient()
    const { data: collabs } = await admin
      .from('collaborations')
      .select('influencer_id, status, payment_amount')
      .in('status', ['COMPLETED', 'ACTIVE', 'PENDING', 'CANCELLED'])

    if (!collabs) return {}

    const statsMap: Record<string, { total: number; completed: number; successRate: number; totalEarned: number }> = {}

    for (const c of collabs) {
      if (!statsMap[c.influencer_id]) {
        statsMap[c.influencer_id] = { total: 0, completed: 0, successRate: 0, totalEarned: 0 }
      }
      statsMap[c.influencer_id].total++
      if (c.status === 'COMPLETED') {
        statsMap[c.influencer_id].completed++
        statsMap[c.influencer_id].totalEarned += c.payment_amount || 0
      }
    }

    for (const id in statsMap) {
      const s = statsMap[id]
      s.successRate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0
    }

    return statsMap
  } catch (e: any) {
    return {}
  }
}