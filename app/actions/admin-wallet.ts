'use server'
// Plată manuală în wallet-ul creatorului, pentru o colaborare (campanii plătite pe factură, ex. Intimax).
// Banii intră atomic (SQL 50), se scrie tranzacția în istoric, se actualizează „plătit” pe colaborare
// și creatorul primește notificare.
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/verify-admin'
import { isUuid, notify } from '@/lib/drafts'
import { campaignName } from '@/lib/campaign-name'

export async function adminPayToWallet(collabId: string, amountRaw: number | string, note?: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return { error: auth.error as string }
  if (!isUuid(collabId)) return { error: 'Colaborare invalidă.' }
  const amount = Math.round(Number(String(amountRaw).replace(',', '.')) * 100) / 100
  if (!Number.isFinite(amount) || amount <= 0 || amount > 20000) return { error: 'Sumă invalidă (între 1 și 20.000 lei).' }

  const admin = createAdminClient()
  const { data: c } = await admin.from('collaborations')
    .select('id, status, payment_amount, influencer_id, campaign_id, influencers(id, user_id, name), campaigns(*)')
    .eq('id', collabId).maybeSingle()
  if (!c) return { error: 'Colaborarea nu există.' }
  if (!['ACTIVE', 'COMPLETED'].includes(String(c.status))) return { error: 'Se poate plăti doar o colaborare activă sau finalizată.' }
  const inf: any = (c as any).influencers
  if (!inf?.id) return { error: 'Creatorul nu mai există.' }

  const { data: balance, error: rpcErr } = await admin.rpc('admin_credit_influencer', { p_influencer: inf.id, p_amount: amount })
  if (rpcErr) {
    return { error: /admin_credit_influencer/.test(rpcErr.message || '') ? 'Rulează întâi SQL 50 (plata manuală în wallet).' : rpcErr.message }
  }

  const title = campaignName((c as any).campaigns || {}, (c as any).campaigns?.title || 'Campanie')
  const cleanNote = String(note || '').trim().slice(0, 160)
  await admin.from('transactions').insert({
    user_id: inf.user_id, type: 'EARN', amount, status: 'completed', collab_id: c.id,
    description: `Plată campanie: "${title}"${cleanNote ? ` · ${cleanNote}` : ''}`,
  })
  const paid = Math.round((Number(c.payment_amount) || 0) * 100 + amount * 100) / 100
  await admin.from('collaborations').update({ payment_amount: paid }).eq('id', c.id)
  await notify(admin, inf.user_id, 'Ai primit bani în wallet', `${amount.toLocaleString('ro-RO')} RON pentru „${title}”.`, '/influencer/wallet')
  return { ok: true, paid, balance: Number(balance) || null }
}
