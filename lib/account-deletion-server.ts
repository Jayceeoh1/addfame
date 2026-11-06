// Înregistrarea și procesarea unei cereri de ștergere cont.
// Nu șterge rânduri legate de bani (portofel, tranzacții, escrow, retrageri, facturi, colaborări).
// Când nu există blocaje, anonimizează datele personale și dezactivează autentificarea.
import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { wipeInstagram } from '@/lib/instagram'
import { escapeHtml } from '@/lib/api-auth'
import {
  anonymizePatch,
  deletionBlockers,
  deletedEmail,
  isMissingDeletionTable,
  type Blocker,
  type CampaignRow,
  type CollabRow,
} from '@/lib/account-deletion'

export type DeletionStatus = 'unverified' | 'pending' | 'blocked' | 'completed'

export type DeletionResult = {
  http: number
  body: {
    ok: boolean
    status?: DeletionStatus
    message: string
    blockers?: Blocker[]
    confirmationCode?: string
    signOut?: boolean
    error?: string
  }
}

type AuthUser = { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }

const MANUAL_MSG = 'Cererea a fost înregistrată. O finalizăm manual în cel mult 30 de zile și îți scriem pe email. Până atunci contul rămâne activ.'
const BLOCKED_MSG = 'Cererea a fost înregistrată, dar contul nu poate fi închis acum. Rezolvă situațiile de mai jos și trimite din nou cererea. Nu am șters date și nu am închis autentificarea.'
const COMPLETED_MSG = 'Contul a fost închis. Datele personale au fost anonimizate și nu te mai poți autentifica cu acest email. Evidențele contabile (tranzacții, facturi, contracte, escrow) rămân păstrate conform legii.'
const TABLE_MSG = 'Ștergerea contului nu este disponibilă momentan. Scrie-ne la privacy@addfame.ro și o înregistrăm manual.'

function code(): string {
  return crypto.randomBytes(9).toString('base64url')
}

function result(http: number, message: string, extra: Partial<DeletionResult['body']> = {}): DeletionResult {
  const ok = http < 400
  return {
    http,
    body: {
      ok,
      message,
      error: ok ? undefined : message,
      ...extra,
    },
  }
}

async function notifyOwner(subject: string, html: string) {
  try {
    await sendEmail('privacy@addfame.ro', subject, html)
  } catch (e) {
    console.error('[deletion] email owner', e)
  }
}

async function notifyUser(to: string | null | undefined, subject: string, html: string) {
  if (!to || !to.includes('@')) return
  try {
    await sendEmail(to, subject, html)
  } catch (e) {
    console.error('[deletion] email user', e)
  }
}

async function applyPatch(admin: SupabaseClient, table: string, id: string, patch: Record<string, unknown>) {
  const failed: string[] = []
  for (const [key, value] of Object.entries(patch)) {
    const { error } = await admin.from(table).update({ [key]: value }).eq('id', id)
    if (error) failed.push(key)
  }
  return failed
}

function identityFailed(failed: string[], patch: Record<string, unknown>): boolean {
  return ['name', 'email'].some(k => k in patch && failed.includes(k))
}

async function selectCampaigns(admin: SupabaseClient, brandId: string): Promise<{ data: CampaignRow[] | null; error: { message?: string } | null }> {
  const full = await admin.from('campaigns').select('id, status, pay_reserved, pay_released, pay_refunded, escrow_amount').eq('brand_id', brandId)
  if (full.error && /escrow_amount/i.test(full.error.message || '')) {
    const fallback = await admin.from('campaigns').select('id, status, pay_reserved, pay_released, pay_refunded').eq('brand_id', brandId)
    return { data: (fallback.data || null) as CampaignRow[] | null, error: fallback.error }
  }
  return { data: (full.data || null) as CampaignRow[] | null, error: full.error }
}

async function brandCollabs(admin: SupabaseClient, brandId: string, campaignIds: string[]) {
  const cols = 'id, status, pay_reserved, pay_refunded, payment_amount'
  const byBrand = await admin.from('collaborations').select(cols).eq('brand_id', brandId)
  if (!byBrand.error) return byBrand
  if (!campaignIds.length) return { data: [] as CollabRow[], error: null }
  return admin.from('collaborations').select(cols).in('campaign_id', campaignIds)
}

async function disputesFor(admin: SupabaseClient, collabIds: string[]) {
  if (!collabIds.length) return { data: [] as { status?: string | null }[], error: null }
  return admin.from('disputes').select('status, collaboration_id').in('collaboration_id', collabIds)
}

export async function submitUnauthenticatedDeletion(emailRaw: string, source: 'app' | 'web'): Promise<DeletionResult> {
  const email = String(emailRaw || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return result(400, 'Introdu o adresă de email validă.')
  }
  let admin: SupabaseClient
  try {
    admin = createAdminClient()
  } catch {
    return result(503, TABLE_MSG)
  }
  const confirmationCode = code()
  const { error } = await admin.from('account_deletion_requests').insert({
    email,
    role: 'unknown',
    status: 'unverified',
    source,
    blockers: [],
    confirmation_code: confirmationCode,
    note: 'Fără sesiune. Nu se procesează până la autentificare.',
  })
  if (error) {
    console.error('[deletion] unverified insert', error.message)
    if (isMissingDeletionTable(error)) return result(503, TABLE_MSG)
    return result(500, 'Nu am putut înregistra cererea. Scrie-ne la privacy@addfame.ro.')
  }
  await notifyOwner(
    'Cerere ștergere cont (neconfirmată)',
    `<p>Cineva a cerut ștergerea fără să fie autentificat.</p><p>Email: ${escapeHtml(email)}<br>Cod: ${escapeHtml(confirmationCode)}</p><p>Nu am modificat niciun cont. Confirmarea se face doar după autentificare sau prin email de pe aceeași adresă.</p>`,
  )
  return result(200, 'Dacă există un cont AddFame cu această adresă, cererea a fost notată. Ca să o confirmăm, autentifică-te și trimite cererea din această pagină, sau scrie-ne de pe aceeași adresă la privacy@addfame.ro. Nu închidem contul doar pe baza unui email, ca să nu poată altcineva să ți-l închidă.', {
    status: 'unverified',
    confirmationCode,
    signOut: false,
  })
}

export async function getOwnDeletionStatus(user: AuthUser) {
  let admin: SupabaseClient
  try {
    admin = createAdminClient()
  } catch {
    return result(503, TABLE_MSG)
  }
  const { data, error } = await admin
    .from('account_deletion_requests')
    .select('status, blockers, confirmation_code, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    if (isMissingDeletionTable(error)) return result(503, TABLE_MSG)
    console.error('[deletion] status', error.message)
    return result(200, '', { status: undefined })
  }
  return {
    http: 200,
    body: {
      ok: true,
      message: '',
      status: (data?.status as DeletionStatus | undefined) || undefined,
      blockers: (data?.blockers as Blocker[] | null) || [],
      confirmationCode: data?.confirmation_code || undefined,
    },
  }
}

export async function submitAuthenticatedDeletion(user: AuthUser, source: 'app' | 'web'): Promise<DeletionResult> {
  let admin: SupabaseClient
  try {
    admin = createAdminClient()
  } catch {
    return result(503, TABLE_MSG)
  }

  const originalEmail = String(user.email || '').trim().toLowerCase()
  const confirmationCode = code()

  const { data: existingDone } = await admin
    .from('account_deletion_requests')
    .select('confirmation_code')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const open = await admin
    .from('account_deletion_requests')
    .select('id, confirmation_code')
    .eq('user_id', user.id)
    .in('status', ['pending', 'blocked'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (open.error && isMissingDeletionTable(open.error)) return result(503, TABLE_MSG)
  if (open.error) {
    console.error('[deletion] open lookup', open.error.message)
    return result(500, 'Nu am putut înregistra cererea. Scrie-ne la privacy@addfame.ro.')
  }

  if (existingDone && !open.data) {
    return result(200, 'Contul a fost deja închis. Dacă încă te poți autentifica, scrie-ne la privacy@addfame.ro.', {
      status: 'completed',
      confirmationCode: existingDone.confirmation_code,
      signOut: true,
    })
  }

  let requestId = open.data?.id as string | undefined
  let publicCode = (open.data?.confirmation_code as string | undefined) || confirmationCode
  if (!requestId) {
    const ins = await admin.from('account_deletion_requests').insert({
      user_id: user.id,
      email: originalEmail || null,
      role: 'unknown',
      status: 'pending',
      source,
      blockers: [],
      confirmation_code: confirmationCode,
    }).select('id').single()
    if (ins.error) {
      console.error('[deletion] insert', ins.error.message)
      if (isMissingDeletionTable(ins.error)) return result(503, TABLE_MSG)
      return result(500, 'Nu am putut înregistra cererea. Scrie-ne la privacy@addfame.ro.')
    }
    requestId = ins.data.id
    publicCode = confirmationCode
  }

  const finish = async (
    status: DeletionStatus,
    blockers: Blocker[],
    message: string,
    note: string | null,
    signOut: boolean,
    role: string,
  ): Promise<DeletionResult> => {
    await admin.from('account_deletion_requests').update({
      status,
      blockers,
      note,
      role,
      email: originalEmail || null,
      source,
      updated_at: new Date().toISOString(),
      processed_at: status === 'completed' ? new Date().toISOString() : null,
    }).eq('id', requestId)
    const blockerText = blockers.map(b => `<li>${escapeHtml(b.message)}</li>`).join('')
    await notifyOwner(
      `Cerere ștergere cont — ${status}`,
      `<p>Utilizator: ${escapeHtml(user.id)}<br>Email: ${escapeHtml(originalEmail || '—')}<br>Rol: ${escapeHtml(role)}<br>Status: ${escapeHtml(status)}<br>Cod: ${escapeHtml(publicCode)}</p>${blockerText ? `<ul>${blockerText}</ul>` : ''}${note ? `<p>Notă: ${escapeHtml(note)}</p>` : ''}`,
    )
    if (originalEmail) {
      await notifyUser(
        originalEmail,
        status === 'completed' ? 'Contul tău AddFame a fost închis' : 'Am primit cererea de ștergere a contului AddFame',
        `<p>${escapeHtml(message)}</p>${blockerText ? `<ul>${blockerText}</ul>` : ''}<p>Cod de referință: <strong>${escapeHtml(publicCode)}</strong></p><p>Pentru întrebări: privacy@addfame.ro</p>`,
      )
    }
    return result(status === 'blocked' ? 409 : 200, message, {
      status,
      blockers,
      confirmationCode: publicCode,
      signOut,
    })
  }

  const adminRow = await admin.from('admins').select('is_active').eq('user_id', user.id).maybeSingle()
  if (adminRow.error) {
    console.error('[deletion] admin check', adminRow.error.message)
    return finish('pending', [], MANUAL_MSG, 'admin_check_failed', false, 'unknown')
  }
  if (adminRow.data && adminRow.data.is_active !== false) {
    return finish('pending', [], 'Cererea a fost înregistrată. Pentru conturile de administrator o confirmăm manual, în cel mult 30 de zile. Contul rămâne activ până atunci.', 'admin_manual', false, 'admin')
  }

  const infRes = await admin.from('influencers').select('*').eq('user_id', user.id).maybeSingle()
  const brandRes = await admin.from('brands').select('*').eq('user_id', user.id).maybeSingle()
  if (infRes.error || brandRes.error) {
    console.error('[deletion] profile', infRes.error?.message, brandRes.error?.message)
    return finish('pending', [], MANUAL_MSG, 'profile_read_failed', false, 'unknown')
  }
  const inf = infRes.data
  const brand = brandRes.data

  let collabs: CollabRow[] = []
  let campaigns: CampaignRow[] = []
  const disputes: { status?: string | null }[] = []
  const disputeSeen = new Set<string>()
  let checkFailed = false

  const addDisputes = (rows: { status?: string | null; collaboration_id?: string }[] | null) => {
    for (const d of rows || []) {
      const key = String(d.collaboration_id || '')
      if (key && disputeSeen.has(key)) continue
      if (key) disputeSeen.add(key)
      disputes.push(d)
    }
  }

  if (inf?.id) {
    const c = await admin.from('collaborations').select('id, status, pay_reserved, pay_refunded, payment_amount').eq('influencer_id', inf.id)
    if (c.error) checkFailed = true
    else {
      collabs = collabs.concat(c.data || [])
      const d = await disputesFor(admin, (c.data || []).map((r: { id: string }) => r.id))
      if (d.error) checkFailed = true
      else addDisputes(d.data || [])
    }
  }

  if (brand?.id) {
    const camps = await selectCampaigns(admin, brand.id)
    if (camps.error) checkFailed = true
    else {
      campaigns = camps.data || []
      const ids = campaigns.map(c => String((c as { id?: string }).id || '')).filter(Boolean)
      const c = await brandCollabs(admin, brand.id, ids)
      if (c.error) checkFailed = true
      else {
        const seen = new Set(collabs.map(x => String((x as { id?: string }).id || '')))
        for (const row of c.data || []) {
          const id = String((row as { id?: string }).id || '')
          if (id && seen.has(id)) continue
          collabs.push(row as CollabRow)
        }
        const d = await disputesFor(admin, (c.data || []).map((r: { id: string }) => r.id))
        if (d.error) checkFailed = true
        else addDisputes(d.data || [])
      }
    }
  }

  const role = inf && brand ? 'influencer' : inf ? 'influencer' : brand ? 'brand' : 'unknown'

  if (checkFailed) {
    return finish('pending', [], MANUAL_MSG, 'checks_failed', false, role)
  }

  const blockers = deletionBlockers({
    walletBalance: inf?.wallet_balance,
    pendingPayout: inf?.pending_payout,
    creditsBalance: brand?.credits_balance,
    creditsReserved: brand?.credits_reserved,
    collaborations: collabs,
    campaigns,
    disputes,
  })
  if (blockers.length) {
    return finish('blocked', blockers, BLOCKED_MSG, null, false, role)
  }

  const failed: string[] = []
  try {
    if (inf?.id) {
      const patch = anonymizePatch(inf, user.id)
      const infFailed = await applyPatch(admin, 'influencers', inf.id, patch)
      failed.push(...infFailed.map(k => `influencers.${k}`))
      if (identityFailed(infFailed, patch)) {
        return finish('pending', [], MANUAL_MSG, `anonymize_failed:${failed.join(',')}`, false, role)
      }
      try { await wipeInstagram(admin, { kind: 'influencer', id: inf.id }) } catch (e) {
        console.error('[deletion] wipe ig influencer', e)
      }
    }
    if (brand?.id) {
      const patch = anonymizePatch(brand, user.id)
      const brandFailed = await applyPatch(admin, 'brands', brand.id, patch)
      failed.push(...brandFailed.map(k => `brands.${k}`))
      if (identityFailed(brandFailed, patch)) {
        return finish('pending', [], MANUAL_MSG, `anonymize_failed:${failed.join(',')}`, false, role)
      }
      try { await wipeInstagram(admin, { kind: 'brand', id: brand.id }) } catch (e) {
        console.error('[deletion] wipe ig brand', e)
      }
    }
  } catch (e) {
    console.error('[deletion] anonymize', e)
    return finish('pending', [], MANUAL_MSG, 'anonymize_threw', false, role)
  }

  try {
    const methods = await admin.from('influencer_payment_methods').select('*').eq('user_id', user.id)
    if (!methods.error) {
      for (const row of methods.data || []) {
        if (!row?.id) continue
        const patch = anonymizePatch(row, user.id)
        await applyPatch(admin, 'influencer_payment_methods', row.id, patch)
      }
    }
  } catch (e) {
    console.error('[deletion] payment methods', e)
  }

  try {
    const profile = await admin.from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (!profile.error && profile.data?.id) {
      await applyPatch(admin, 'profiles', profile.data.id, anonymizePatch(profile.data, user.id))
    }
  } catch (e) {
    console.error('[deletion] profiles', e)
  }

  const meta = { ...(user.user_metadata || {}) }
  delete meta.name
  delete meta.full_name
  delete meta.phone
  const ban = await admin.auth.admin.updateUserById(user.id, {
    ban_duration: '876000h',
    email: deletedEmail(user.id),
    email_confirm: true,
    user_metadata: { ...meta, account_deleted_at: new Date().toISOString() },
  })
  if (ban.error) {
    console.error('[deletion] ban', ban.error.message)
    return finish('pending', [], 'Datele personale au fost anonimizate. Închiderea autentificării se finalizează în cel mult 30 de zile. Poți să te deloghezi; dacă intrarea încă funcționează, scrie-ne la privacy@addfame.ro.', `ban_failed:${ban.error.message}`, false, role)
  }

  return finish('completed', [], COMPLETED_MSG, failed.length ? `partial:${failed.join(',')}` : null, true, role)
}
