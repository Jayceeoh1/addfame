import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isValidCronRequest } from '@/lib/api-auth'
import { notify, planDeadlineActions, REVISION_REMIND_BEFORE_HOURS, type DeadlineDraft } from '@/lib/drafts'
import { openDispute, notifyAdmins } from '@/lib/disputes'
import { logError } from '@/lib/log-error'

// Rulează la fiecare oră (cron-job.org) sau măcar zilnic (vercel.json).
// 1) memento creator înainte de termen; 2) termen depășit → semnalare + litigiu automat;
// 3) brand reamintit după 48h / escaladare la 120h; 4) litigii fără răspuns trec la analiza adminului.
export async function GET(req: NextRequest) {
  if (!isValidCronRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()
  const stats = { revisionReminders: 0, revisionOverdue: 0, reviewReminders: 0, reviewOverdue: 0, disputesToReview: 0 }
  try {
    const { data, error } = await admin.from('deliverable_drafts')
      .select('id, collaboration_id, version, status, created_at, revision_due_at, reminder_sent_at, review_reminder_sent_at, overdue_notified_at')
      .in('status', ['pending', 'changes_requested'])
    if (error) throw new Error('draft-deadlines: ' + error.message)

    const actions = planDeadlineActions((data || []) as DeadlineDraft[])
    const stamp = (id: string, col: string) => admin.from('deliverable_drafts').update({ [col]: new Date().toISOString() }).eq('id', id)

    for (const a of actions) {
      const { data: c } = await admin.from('collaborations').select('status').eq('id', a.draft.collaboration_id).maybeSingle()
      if (c?.status !== 'ACTIVE') continue
      const { data: row } = await admin.from('collaborations')
        .select('campaigns(title, brand_id), influencers(user_id)').eq('id', a.draft.collaboration_id).maybeSingle()
      const title = (row as any)?.campaigns?.title || 'campanie'
      const creatorUser: string | null = (row as any)?.influencers?.user_id ?? null
      const brandId = (row as any)?.campaigns?.brand_id
      const { data: b } = brandId ? await admin.from('brands').select('user_id').eq('id', brandId).maybeSingle() : { data: null }
      const brandUser: string | null = b?.user_id ?? null

      if (a.kind === 'revision_reminder') {
        await notify(admin, creatorUser, 'Termen apropiat', `Mai ai sub ${REVISION_REMIND_BEFORE_HOURS} ore să trimiți versiunea nouă a draftului pentru „${title}”.`, '/influencer/collaborations')
        await stamp(a.draft.id, 'reminder_sent_at'); stats.revisionReminders++
      } else if (a.kind === 'revision_overdue') {
        await notify(admin, creatorUser, 'Termen depășit', `Termenul pentru versiunea nouă a draftului „${title}” a trecut. Trimite-o cât mai repede.`, '/influencer/collaborations')
        await notify(admin, brandUser, 'Creatorul a depășit termenul', `Creatorul nu a trimis încă versiunea nouă pentru „${title}”. Echipa AddFame a fost anunțată.`, '/brand/collaborations')
        await openDispute(admin, { collabId: a.draft.collaboration_id, role: 'system', userId: null, reason: 'revision_overdue',
          description: `Termenul de revizuire pentru draftul v${a.draft.version} a fost depășit (deschis automat).`, title, otherPartyUserId: creatorUser })
        await stamp(a.draft.id, 'overdue_notified_at'); stats.revisionOverdue++
      } else if (a.kind === 'review_reminder') {
        await notify(admin, brandUser, 'Draft de revizuit', `Draftul pentru „${title}” așteaptă răspunsul tău de peste 48 de ore. Aprobă-l sau cere modificări.`, '/brand/collaborations')
        await stamp(a.draft.id, 'review_reminder_sent_at'); stats.reviewReminders++
      } else if (a.kind === 'review_overdue') {
        await notify(admin, brandUser, 'Draft neevaluat', `Draftul pentru „${title}” așteaptă de peste 5 zile. Echipa AddFame a fost anunțată.`, '/brand/collaborations')
        await notify(admin, creatorUser, 'Draftul tău e în așteptare', `Brandul nu a răspuns încă la draftul pentru „${title}”. Am anunțat echipa AddFame.`, '/influencer/collaborations')
        await openDispute(admin, { collabId: a.draft.collaboration_id, role: 'system', userId: null, reason: 'review_overdue',
          description: `Draftul v${a.draft.version} nu a fost evaluat de brand în 5 zile (deschis automat).`, title, otherPartyUserId: brandUser })
        await stamp(a.draft.id, 'overdue_notified_at'); stats.reviewOverdue++
      }
    }

    // Litigii care au așteptat răspuns peste termen → analiza adminului
    const { data: late } = await admin.from('disputes').update({ status: 'under_review' })
      .eq('status', 'awaiting_response').lt('respond_by', new Date().toISOString()).select('id')
    stats.disputesToReview = late?.length ?? 0
    if (stats.disputesToReview) await notifyAdmins(admin, 'Litigii fără răspuns', `${stats.disputesToReview} litigii au depășit termenul de răspuns și așteaptă decizia ta.`)

    return NextResponse.json({ ok: true, ...stats })
  } catch (e) {
    await logError(e, { source: 'cron', url: '/api/cron/draft-deadlines' })
    return NextResponse.json({ ok: false, error: 'Eroare cron' }, { status: 500 })
  }
}
