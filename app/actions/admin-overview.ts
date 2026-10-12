'use server'

// Date pentru panoul de admin: ce e de rezolvat (cozi) și cifrele platformei.
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/verify-admin'
import { lastMonths, sumByMonth, heldForInfluencers } from '@/lib/admin-overview'

export type AdminQueue = {
  topups: number          // încărcări de confirmat
  withdrawals: number     // retrageri de plătit
  influencers: number     // influenceri de aprobat
  identity: number        // acte de identitate de verificat
  brands: number          // branduri de verificat
  proofs: number          // dovezi (postări) de aprobat
  shipments: number       // colete de trimis
  flags: number           // mesaje semnalate necitite
  disputes: number        // litigii deschise
}

const EMPTY_QUEUE: AdminQueue = { topups: 0, withdrawals: 0, influencers: 0, identity: 0, brands: 0, proofs: 0, shipments: 0, flags: 0, disputes: 0 }

/** Câte lucruri așteaptă un admin — doar numărători (rapid, pentru meniul lateral). */
export async function getAdminQueue(): Promise<{ success: true; queue: AdminQueue } | { error: string }> {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return { error: String(auth.error) }
    const sb = createAdminClient()
    const head = { count: 'exact' as const, head: true }
    const safe = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
      try { const r = await q; return r.error ? 0 : r.count ?? 0 } catch { return 0 }
    }
    const [topups, withdrawals, influencers, identity, brands, proofs, shipments, flags, disputes] = await Promise.all([
      safe(sb.from('brand_transactions').select('id', head).eq('type', 'TOPUP').eq('status', 'pending')),
      safe(sb.from('transactions').select('id', head).eq('type', 'PAYOUT').eq('status', 'pending')),
      safe(sb.from('influencers').select('id', head).eq('approval_status', 'pending')),
      safe(sb.from('influencers').select('id', head).eq('verification_status', 'pending').not('verification_doc_url', 'is', null)),
      safe(sb.from('brands').select('id', head).eq('verification_status', 'pending')),
      safe(sb.from('collaborations').select('id', head)
        .not('deliverable_submitted_at', 'is', null).is('deliverable_approved_at', null)
        .is('deliverable_rejected_at', null).neq('status', 'COMPLETED')),
      safe(sb.from('collaborations').select('id', head)
        .not('delivery_name', 'is', null).eq('status', 'ACTIVE').is('package_sent_at', null)),
      safe(sb.from('message_flags').select('id', head).eq('reviewed', false)),
      safe(sb.from('disputes').select('id', head).neq('status', 'resolved')),
    ])
    return { success: true, queue: { topups, withdrawals, influencers, identity, brands, proofs, shipments, flags, disputes } }
  } catch (e: any) {
    return { error: e?.message || 'Eroare' }
  }
}

export type AdminOverview = {
  queue: AdminQueue
  people: { influencers: number; approved: number; brands: number; verifiedBrands: number }
  campaigns: { active: number; draft: number; completed: number; total: number }
  money: {
    feesNet: number          // venit AddFame: taxe de management încasate − returnate
    topupsConfirmed: number  // bani încasați de la branduri (încărcări confirmate)
    topupsPending: number    // încărcări care așteaptă confirmarea
    walletBalances: number   // credite în conturile brandurilor
    heldForInfluencers: number // blocați până la aprobarea postărilor
    payoutsPending: number   // retrageri cerute de influenceri, de plătit
  }
  months: { key: string; label: string }[]
  series: { fees: number[]; topups: number[]; influencers: number[]; brands: number[] }
  topCampaigns: { id: string; title: string; status: string; collabs: number; completed: number }[]
  recentTopups: { id: string; brand: string; amount: number; status: string; created_at: string; invoice: string | null }[]
}

/** Tot ce arată pagina principală de admin. */
export async function getAdminOverview(): Promise<({ success: true } & AdminOverview) | { error: string }> {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return { error: String(auth.error) }
    const sb = createAdminClient()
    const months = lastMonths(6)
    const since = `${months[0].key}-01T00:00:00Z`
    const rows = async <T,>(q: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> => {
      try { const r = await q; return r.error ? [] : (r.data ?? []) } catch { return [] }
    }

    const [queueRes, infs, brands, camps, txs, collabs, offerCollabs, payouts, recent] = await Promise.all([
      getAdminQueue(),
      rows<any>(sb.from('influencers').select('approval_status, created_at')),
      rows<any>(sb.from('brands').select('id, name, verification_status, credits_balance, created_at')),
      rows<any>(sb.from('campaigns').select('*')),
      rows<any>(sb.from('brand_transactions').select('type, amount, status, created_at').in('type', ['TOPUP', 'CAMPAIGN_FEE']).gte('created_at', since)),
      rows<any>(sb.from('collaborations').select('campaign_id, status')),
      rows<any>(sb.from('collaborations').select('pay_reserved, pay_refunded, payment_amount').gt('pay_reserved', 0)),
      rows<any>(sb.from('transactions').select('amount').eq('type', 'PAYOUT').eq('status', 'pending')),
      rows<any>(sb.from('brand_transactions').select('id, brand_id, amount, status, created_at, smartbill_invoice_number').eq('type', 'TOPUP').order('created_at', { ascending: false }).limit(6)),
    ])
    // totalurile de încărcări (din toată istoria, nu doar 6 luni)
    const allTopups = await rows<any>(sb.from('brand_transactions').select('amount, status').eq('type', 'TOPUP').in('status', ['completed', 'pending']))

    const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)
    const sum = (a: any[], f: (x: any) => number) => Math.round(a.reduce((s, x) => s + f(x), 0) * 100) / 100

    const collabCount: Record<string, number> = {}, doneCount: Record<string, number> = {}
    for (const c of collabs) {
      collabCount[c.campaign_id] = (collabCount[c.campaign_id] || 0) + 1
      if (c.status === 'COMPLETED') doneCount[c.campaign_id] = (doneCount[c.campaign_id] || 0) + 1
    }
    const brandName = new Map(brands.map((b: any) => [b.id, b.name || 'Brand']))

    return {
      success: true,
      queue: 'queue' in queueRes ? queueRes.queue : EMPTY_QUEUE,
      people: {
        influencers: infs.length,
        approved: infs.filter(i => i.approval_status === 'approved').length,
        brands: brands.length,
        verifiedBrands: brands.filter((b: any) => b.verification_status === 'verified').length,
      },
      campaigns: {
        total: camps.length,
        active: camps.filter(c => c.status === 'ACTIVE').length,
        draft: camps.filter(c => c.status === 'DRAFT').length,
        completed: camps.filter(c => c.status === 'COMPLETED').length,
      },
      money: {
        feesNet: sum(camps, c => num(c.fee_paid) - num(c.fee_refunded)),
        topupsConfirmed: sum(allTopups.filter(t => t.status === 'completed'), t => num(t.amount)),
        topupsPending: sum(allTopups.filter(t => t.status === 'pending'), t => num(t.amount)),
        walletBalances: sum(brands, b => num(b.credits_balance)),
        heldForInfluencers: heldForInfluencers(camps, offerCollabs),
        payoutsPending: sum(payouts, p => Math.abs(num(p.amount))),
      },
      months,
      series: {
        fees: sumByMonth(txs.filter(t => t.type === 'CAMPAIGN_FEE' && t.status !== 'failed'), months, t => Math.abs(num(t.amount))),
        topups: sumByMonth(txs.filter(t => t.type === 'TOPUP' && t.status === 'completed'), months, t => num(t.amount)),
        influencers: sumByMonth(infs, months),
        brands: sumByMonth(brands, months),
      },
      topCampaigns: camps
        .filter(c => c.status !== 'DRAFT')
        .map(c => ({ id: c.id, title: c.title || 'Fără titlu', status: c.status, collabs: collabCount[c.id] || 0, completed: doneCount[c.id] || 0 }))
        .sort((a, b) => b.collabs - a.collabs)
        .slice(0, 5),
      recentTopups: recent.map(t => ({
        id: t.id, brand: brandName.get(t.brand_id) || 'Brand', amount: num(t.amount), status: t.status,
        created_at: t.created_at, invoice: t.smartbill_invoice_number && t.smartbill_invoice_number !== 'EMITERE' ? t.smartbill_invoice_number : null,
      })),
    }
  } catch (e: any) {
    return { error: e?.message || 'Eroare' }
  }
}
