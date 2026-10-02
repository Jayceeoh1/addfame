import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'
const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'AddFame <noreply@addfame.ro>'

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000)
  let penalized = 0

  // Găsește conversații unde brandul a trimis ultimul mesaj
  // și influencerul nu a răspuns în 7+ zile
  const { data: conversations } = await admin
    .from('messages')
    .select(`
      conversation_id,
      sender_id,
      created_at,
      conversations!inner(
        id,
        influencer_id,
        brand_id,
        influencers!inner(id, name, email, strikes, blacklisted, user_id, creator_score)
      )
    `)
    .lte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })

  if (!conversations?.length) {
    return NextResponse.json({ ok: true, checked: 0, penalized: 0 })
  }

  // Grupează după conversation_id — ia ultimul mesaj per conversație
  const convMap = new Map<string, any>()
  for (const msg of conversations) {
    if (!convMap.has(msg.conversation_id)) {
      convMap.set(msg.conversation_id, msg)
    }
  }

  for (const [convId, lastMsg] of convMap) {
    const conv = lastMsg.conversations as any
    const inf = conv?.influencers as any

    if (!inf || inf.blacklisted) continue

    // Verifică că ultimul mesaj e de la brand (nu de la influencer)
    const infUserId = inf.user_id
    if (lastMsg.sender_id === infUserId) continue // Influencerul a răspuns

    // Verifică dacă am mai penalizat pentru această conversație recent (30 zile)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000)
    const { data: existing } = await admin
      .from('influencer_strikes')
      .select('id')
      .eq('influencer_id', inf.id)
      .ilike('reason', '%inbox%')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .limit(1)

    if (existing?.length) continue // Deja penalizat recent

    // Aplică -100 puncte
    await admin.rpc('update_creator_score', {
      p_influencer_id: inf.id,
      p_points: -100,
    })

    // 1 strike automat
    const newStrikes = (inf.strikes || 0) + 1
    const shouldBlacklist = newStrikes >= 2

    await admin.from('influencer_strikes').insert({
      influencer_id: inf.id,
      collaboration_id: null,
      reason: `Nu a răspuns la mesaje în inbox timp de 7 zile`,
      given_by: null,
    })

    await admin.from('influencers').update({
      strikes: newStrikes,
      ...(shouldBlacklist ? {
        blacklisted: true,
        blacklisted_at: now.toISOString(),
        blacklisted_reason: `Blacklisted automat — ${newStrikes} strike-uri (ignorare mesaje)`,
      } : {}),
    }).eq('id', inf.id)

    penalized++

    // Notificare în platformă
    if (inf.user_id) {
      await admin.from('notifications').insert({
        user_id: inf.user_id,
        title: shouldBlacklist ? '🚫 Contul tău a fost suspendat' : `⚠️ Strike ${newStrikes}/2 — mesaje ignorate`,
        body: shouldBlacklist
          ? 'Ai acumulat 2 strike-uri. Contul tău a fost suspendat.'
          : `Ai primit un strike și -100 puncte Creator Score pentru că nu ai răspuns la mesaje în ultimele 7 zile. Răspunde rapid pentru a evita penalizări viitoare.`,
        link: '/influencer/inbox',
        read: false,
      })
    }

    // Email influencer
    if (inf.email) {
      await sendEmail(
        inf.email,
        shouldBlacklist ? '🚫 Contul tău AddFame a fost suspendat' : `⚠️ Strike ${newStrikes}/2 — Nu ai răspuns la mesaje`,
        `<!DOCTYPE html><html lang="ro"><body style="margin:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
<div style="background:white;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden">
<div style="background:${shouldBlacklist ? '#dc2626' : '#f97316'};padding:24px;text-align:center">
  <div style="font-size:24px;font-weight:900;color:white">AddFame</div>
</div>
<div style="padding:24px">
  <div style="text-align:center;margin-bottom:20px">
    <div style="font-size:40px">${shouldBlacklist ? '🚫' : '⚠️'}</div>
    <h1 style="font-size:18px;font-weight:800;color:#111827;margin:8px 0">
      ${shouldBlacklist ? 'Cont suspendat' : `Strike ${newStrikes} din 2`}
    </h1>
  </div>
  <p style="font-size:14px;color:#374151;line-height:1.7">
    Bună, <strong>${inf.name}</strong>!<br><br>
    ${shouldBlacklist
      ? `Contul tău a fost <strong>suspendat</strong> deoarece nu ai răspuns la mesajele brandurilor timp de 7 zile și ai acumulat ${newStrikes} strike-uri.<br><br>Contactează-ne la <a href="mailto:contact@addfame.ro">contact@addfame.ro</a> pentru a discuta situația.`
      : `Ai primit un <strong>strike automat</strong> și <strong>-100 puncte Creator Score</strong> deoarece nu ai răspuns la mesajele primite în inbox timp de <strong>7 zile</strong>.<br><br>Brandurile așteaptă răspunsuri rapide. La 2 strike-uri contul tău va fi suspendat automat.`
    }
  </p>
  <div style="text-align:center;margin-top:20px">
    <a href="${APP_URL}/influencer/inbox" style="background:#7c3aed;color:white;text-decoration:none;font-size:14px;font-weight:700;padding:12px 24px;border-radius:10px;display:inline-block">
      Deschide inbox →
    </a>
  </div>
</div></div></div></body></html>`
      )
    }
  }

  // Email admin
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
  if (adminEmail && penalized > 0) {
    await sendEmail(
      adminEmail,
      `📊 Raport inbox inactiv — ${penalized} influenceri penalizați`,
      `<p>Influenceri penalizați pentru ignorare inbox: <strong>${penalized}</strong><br>
      <a href="${APP_URL}/admin/influencers">Vezi influencerii →</a></p>`
    )
  }

  return NextResponse.json({ ok: true, checked: convMap.size, penalized })
}
