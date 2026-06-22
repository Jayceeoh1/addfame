import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'
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

export async function POST(req: NextRequest) {
  try {
    const session = await verifyAdminSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { action, influencer_id, collaboration_id, reason, strike_id, days } = body
    const admin = createAdminClient()

    // ── Fetch influencer ────────────────────────────────────────────────────
    const { data: inf } = await admin
      .from('influencers')
      .select('id, name, email, strikes, blacklisted, user_id')
      .eq('id', influencer_id)
      .single()

    if (!inf) return NextResponse.json({ error: 'Influencer not found' }, { status: 404 })

    // ── ADD STRIKE ──────────────────────────────────────────────────────────
    if (action === 'add') {
      const newStrikes = (inf.strikes || 0) + 1
      const shouldBlacklist = newStrikes >= 2

      // Insert strike record
      await admin.from('influencer_strikes').insert({
        influencer_id,
        collaboration_id: collaboration_id || null,
        reason: reason || 'Nu a postat în termenul limită',
        given_by: session.userId,
      })

      // Update influencer
      await admin.from('influencers').update({
        strikes: newStrikes,
        blacklisted: shouldBlacklist,
        blacklisted_at: shouldBlacklist ? new Date().toISOString() : null,
        blacklisted_reason: shouldBlacklist ? `Blacklisted automat după ${newStrikes} strike-uri` : null,
      }).eq('id', influencer_id)

      // Email influencer
      if (inf.email) {
        const isBlacklisted = shouldBlacklist
        await sendEmail(inf.email,
          isBlacklisted ? '🚫 Contul tău AddFame a fost suspendat' : `⚠️ Strike ${newStrikes}/2 pe AddFame`,
          `<!DOCTYPE html><html lang="ro"><body style="margin:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
<div style="background:white;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden">
<div style="background:${isBlacklisted ? '#dc2626' : '#f97316'};padding:24px;text-align:center">
  <div style="font-size:24px;font-weight:900;color:white">AddFame</div>
</div>
<div style="padding:24px">
  <div style="text-align:center;margin-bottom:20px">
    <div style="font-size:40px">${isBlacklisted ? '🚫' : '⚠️'}</div>
    <h1 style="font-size:18px;font-weight:800;color:#111827;margin:8px 0">
      ${isBlacklisted ? 'Cont suspendat' : `Strike ${newStrikes} din 2`}
    </h1>
  </div>
  <p style="font-size:14px;color:#374151;line-height:1.7">
    Bună, <strong>${inf.name}</strong>!<br><br>
    ${isBlacklisted
      ? `Contul tău a fost <strong>suspendat</strong> deoarece ai acumulat ${newStrikes} strike-uri fără a livra conținutul promis brandurilor.<br><br>Nu mai poți aplica la campanii noi. Contactează-ne la <a href="mailto:contact@addfame.ro">contact@addfame.ro</a> pentru a discuta situația.`
      : `Ai primit un <strong>strike</strong> deoarece nu ai postat conținutul în termenul limită pentru campania angajată.<br><br><strong>Motiv:</strong> ${reason || 'Nu ai postat în termenul limită'}<br><br>⚠️ La <strong>2 strike-uri</strong> contul tău va fi suspendat automat. Te rugăm să respecți termenele pentru campaniile viitoare.`
    }
  </p>
  ${!isBlacklisted ? `<div style="text-align:center;margin-top:20px">
    <a href="${APP_URL}/influencer/collaborations" style="background:#7c3aed;color:white;text-decoration:none;font-size:14px;font-weight:700;padding:12px 24px;border-radius:10px;display:inline-block">
      Vezi colaborările →
    </a>
  </div>` : ''}
</div></div></div></body></html>`
        )
      }

      return NextResponse.json({ ok: true, strikes: newStrikes, blacklisted: shouldBlacklist })
    }

    // ── REMOVE STRIKE ───────────────────────────────────────────────────────
    if (action === 'remove') {
      if (!strike_id) return NextResponse.json({ error: 'strike_id required' }, { status: 400 })

      await admin.from('influencer_strikes').update({
        removed_by: session.userId,
        removed_at: new Date().toISOString(),
      }).eq('id', strike_id)

      const newStrikes = Math.max(0, (inf.strikes || 0) - 1)
      await admin.from('influencers').update({
        strikes: newStrikes,
        blacklisted: newStrikes >= 2,
      }).eq('id', influencer_id)

      return NextResponse.json({ ok: true, strikes: newStrikes })
    }

    // ── EXTEND DEADLINE ─────────────────────────────────────────────────────
    if (action === 'extend') {
      if (!collaboration_id) return NextResponse.json({ error: 'collaboration_id required' }, { status: 400 })
      const extraDays = days || 2

      const { data: collab } = await admin
        .from('collaborations')
        .select('id, post_deadline_days, package_sent_at, created_at, campaigns(title)')
        .eq('id', collaboration_id)
        .single()

      if (!collab) return NextResponse.json({ error: 'Collaboration not found' }, { status: 404 })

      const newDeadlineDays = (collab.post_deadline_days || 14) + extraDays
      await admin.from('collaborations').update({
        post_deadline_days: newDeadlineDays,
      }).eq('id', collaboration_id)

      // Email influencer
      if (inf.email) {
        await sendEmail(inf.email,
          `⏰ Termen extins cu ${extraDays} zile — ${(collab.campaigns as any)?.title}`,
          `<!DOCTYPE html><html lang="ro"><body style="margin:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
<div style="background:white;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden">
<div style="background:linear-gradient(135deg,#7c3aed,#06b6d4);padding:24px;text-align:center">
  <div style="font-size:24px;font-weight:900;color:white">AddFame</div>
</div>
<div style="padding:24px">
  <div style="text-align:center;margin-bottom:16px">
    <div style="font-size:40px">⏰</div>
    <h1 style="font-size:18px;font-weight:800;color:#111827;margin:8px 0">Termen extins!</h1>
  </div>
  <p style="font-size:14px;color:#374151;line-height:1.7">
    Bună, <strong>${inf.name}</strong>!<br><br>
    Termenul de postare pentru campania <strong>"${(collab.campaigns as any)?.title}"</strong> a fost extins cu <strong>${extraDays} zile</strong>.<br><br>
    Te rugăm să postezi conținutul cât mai curând. Respectarea termenelor este importantă pentru relația cu brandul.
  </p>
  <div style="text-align:center;margin-top:20px">
    <a href="${APP_URL}/influencer/collaborations" style="background:#7c3aed;color:white;text-decoration:none;font-size:14px;font-weight:700;padding:12px 24px;border-radius:10px;display:inline-block">
      Mergi la colaborări →
    </a>
  </div>
</div></div></div></body></html>`
        )
      }

      return NextResponse.json({ ok: true, new_deadline_days: newDeadlineDays })
    }

    // ── TOGGLE BLACKLIST ────────────────────────────────────────────────────
    if (action === 'toggle_blacklist') {
      const newBlacklisted = !inf.blacklisted
      await admin.from('influencers').update({
        blacklisted: newBlacklisted,
        blacklisted_at: newBlacklisted ? new Date().toISOString() : null,
        blacklisted_reason: newBlacklisted ? (reason || 'Suspendat de admin') : null,
      }).eq('id', influencer_id)

      return NextResponse.json({ ok: true, blacklisted: newBlacklisted })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    console.error('[admin/strikes]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// GET — fetch strikes for an influencer
export async function GET(req: NextRequest) {
  try {
    const session = await verifyAdminSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const influencer_id = searchParams.get('influencer_id')
    if (!influencer_id) return NextResponse.json({ error: 'influencer_id required' }, { status: 400 })

    const admin = createAdminClient()
    const { data } = await admin
      .from('influencer_strikes')
      .select('*, collaborations(id, campaigns(title))')
      .eq('influencer_id', influencer_id)
      .is('removed_at', null)
      .order('created_at', { ascending: false })

    return NextResponse.json({ strikes: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
