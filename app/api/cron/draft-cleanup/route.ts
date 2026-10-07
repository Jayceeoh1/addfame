import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidCronRequest } from '@/lib/api-auth'
import { DRAFT_BUCKET, notify } from '@/lib/drafts'
import { planRetention, fmtDeleteDate, RETENTION_DAYS, type RetentionCollab, type RetentionDraft } from '@/lib/draft-retention'
import { logError } from '@/lib/log-error'

// Zilnic: avertizează cu 3 zile înainte și șterge materialele video la 10 zile după terminarea colaborării.
export const maxDuration = 300

const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n))

export async function GET(req: NextRequest) {
  if (!isValidCronRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()
  const stats = { warned: 0, removedDrafts: 0, removedFiles: 0, staleUploads: 0, skippedDisputes: 0 }
  try {
    const { data: drafts, error } = await admin.from('deliverable_drafts')
      .select('id, collaboration_id, status, file_path, created_at, reviewed_at, cleanup_warned_at')
      .neq('status', 'deleted').order('created_at').limit(2000)
    if (error) {
      if (error.code === '42703') return NextResponse.json({ ok: false, error: 'Rulează SQL 25 (coloana cleanup_warned_at lipsește).' }, { status: 500 })
      throw new Error('deliverable_drafts: ' + error.message)
    }
    const list = (drafts || []) as RetentionDraft[]
    const collabIds = [...new Set(list.map(d => d.collaboration_id))]

    const collabs: RetentionCollab[] = []
    const openDisputes = new Set<string>()
    for (const ids of chunk(collabIds, 300)) {
      const { data } = await admin.from('collaborations').select('id, status, completed_at, deliverable_approved_at').in('id', ids)
      collabs.push(...((data || []) as RetentionCollab[]))
      const { data: disp, error: dErr } = await admin.from('disputes').select('collaboration_id').in('collaboration_id', ids).neq('status', 'resolved')
      if (!dErr) for (const d of disp || []) openDisputes.add((d as any).collaboration_id)
    }

    const plan = planRetention(collabs, list, openDisputes)
    stats.skippedDisputes = openDisputes.size

    // 1) Avertismente (o singură dată per colaborare)
    for (const w of plan.warn) {
      const { data: row } = await admin.from('collaborations')
        .select('campaigns(title, brand_id), influencers(user_id)').eq('id', w.collabId).maybeSingle()
      const title = (row as any)?.campaigns?.title || 'campanie'
      const brandId = (row as any)?.campaigns?.brand_id
      const { data: b } = brandId ? await admin.from('brands').select('user_id').eq('id', brandId).maybeSingle() : { data: null }
      const when = fmtDeleteDate(w.deleteOn)
      await notify(admin, (b as any)?.user_id ?? null, 'Materialul video se șterge curând',
        `Videoclipul pentru „${title}” se șterge automat pe ${when}. Dacă vrei să-l păstrezi, descarcă-l din colaborare.`, '/brand/collaborations')
      await notify(admin, (row as any)?.influencers?.user_id ?? null, 'Materialul video se șterge curând',
        `Draftul video pentru „${title}” se șterge automat pe ${when} (la ${RETENTION_DAYS} zile după încheiere).`, '/influencer/collaborations')
      await admin.from('deliverable_drafts').update({ cleanup_warned_at: new Date().toISOString() }).in('id', w.draftIds)
      stats.warned++
    }

    // 2) Ștergere: întâi fișierele, apoi marcajul (dacă Storage eșuează, se reîncearcă mâine)
    for (const part of chunk(plan.remove, 100)) {
      const { data: gone, error: sErr } = await admin.storage.from(DRAFT_BUCKET).remove(part.map(d => d.file_path))
      if (sErr) { await logError(new Error('draft-cleanup storage: ' + sErr.message), { source: 'cron' }); continue }
      stats.removedFiles += gone?.length || 0
      const { error: uErr } = await admin.from('deliverable_drafts')
        .update({ status: 'deleted', deleted_at: new Date().toISOString() }).in('id', part.map(d => d.id))
      if (uErr) await logError(new Error('draft-cleanup update: ' + uErr.message), { source: 'cron' })
      else stats.removedDrafts += part.length
    }

    // 3) Încărcări abandonate
    for (const part of chunk(plan.stale, 100)) {
      await admin.storage.from(DRAFT_BUCKET).remove(part.map(d => d.file_path))
      const { error: dErr } = await admin.from('deliverable_drafts').delete().in('id', part.map(d => d.id)).eq('status', 'uploading')
      if (!dErr) stats.staleUploads += part.length
    }

    return NextResponse.json({ ok: true, ...stats })
  } catch (e) {
    await logError(e, { source: 'cron', url: '/api/cron/draft-cleanup' })
    return NextResponse.json({ ok: false, error: 'Eroare cron' }, { status: 500 })
  }
}
