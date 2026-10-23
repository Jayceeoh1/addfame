'use server'

// Aprobare în masă a listei alese de brand: admin lipește handle-urile de Instagram, vede cine a aplicat (PENDING) și aprobă.
// Fiecare aprobare folosește același flux ca butonul normal (locuri, notificare), deci nu sare peste nimic.
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/supabase/verify-admin'
import { cleanHandle, igHandleOf } from '@/lib/dm-list'
import { adminApproveApplication } from '@/app/actions/admin'

const isId = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)

function parseHandles(text: string): string[] {
  const out = new Set<string>()
  for (const part of String(text || '').split(/[\s,;]+/)) {
    const h = cleanHandle(part)
    if (h) out.add(h.toLowerCase())
  }
  return [...out]
}

/** Cine din listă are cerere PENDING în campanie (fără să schimbe nimic). */
export async function adminBulkApprovePreview(campaignId: string, text: string) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  if (!isId(campaignId)) return { error: 'Alege o campanie.' }
  const handles = parseHandles(text)
  if (!handles.length) return { error: 'Lipește handle-urile sau linkurile de Instagram.' }
  const admin = createAdminClient()
  const { data, error } = await admin.from('collaborations')
    .select('id, status, influencers(id, name, instagram_handle, platforms)').eq('campaign_id', campaignId).limit(5000)
  if (error) return { error: error.message }
  const byHandle = new Map<string, { id: string; name: string; status: string }[]>()
  for (const c of data || []) {
    const inf: any = (c as any).influencers
    const h = inf ? igHandleOf(inf)?.toLowerCase() : null
    if (!h) continue
    byHandle.set(h, [...(byHandle.get(h) || []), { id: (c as any).id, name: inf.name || h, status: (c as any).status }])
  }
  const pending: { collabId: string; handle: string; name: string }[] = []
  const active: string[] = [], missing: string[] = [], ambiguous: string[] = []
  for (const h of handles) {
    const list = byHandle.get(h) || []
    const p = list.filter(x => x.status === 'PENDING')
    if (p.length === 1) pending.push({ collabId: p[0].id, handle: h, name: p[0].name })
    else if (p.length > 1) ambiguous.push(h)
    else if (list.some(x => x.status === 'ACTIVE')) active.push(h)
    else missing.push(h)
  }
  return { success: true as const, total: handles.length, pending, active, missing, ambiguous }
}

/** Aprobă cererile alese (max 15 pe apel; clientul apelează în bucle). */
export async function adminBulkApprove(campaignId: string, collabIds: string[]) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth
  if (!isId(campaignId)) return { error: 'Alege o campanie.' }
  const ids = (collabIds || []).filter(isId).slice(0, 15)
  const admin = createAdminClient()
  const { data } = await admin.from('collaborations').select('id, status, campaign_id').in('id', ids)
  const valid = new Set((data || []).filter((c: any) => c.campaign_id === campaignId && c.status === 'PENDING').map((c: any) => c.id))
  let ok = 0; const errors: string[] = []
  for (const id of ids) {
    if (!valid.has(id)) { errors.push('cerere negăsită sau deja procesată'); continue }
    const r: any = await adminApproveApplication(id)
    if (r?.error) { errors.push(r.error); if (/număr(ul)? maxim/i.test(r.error)) break } else ok++
  }
  return { success: true as const, ok, errors }
}
