import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/supabase/verify-admin'
import { createAdminClient } from '@/lib/supabase/admin'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.FROM_EMAIL || 'AddFame <noreply@addfame.ro>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'

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

    const { campaign_id, custom_message } = await req.json()
    if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })

    const admin = createAdminClient()

    const { data: camp } = await admin
      .from('campaigns')
      .select('id, title, brand_name, deadline, campaign_type, offer_name, budget_per_influencer, deliverables, content_type, required_hashtags, required_caption, min_days_online, story_instructions')
      .eq('id', campaign_id)
      .single()

    if (!camp) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    // Toți influencerii ACTIVE fără dovadă
    const { data: collabs } = await admin
      .from('collaborations')
      .select('id, influencer_id, package_received_at, package_sent_at, post_deadline_days, influencers(id, name, email, user_id)')
      .eq('campaign_id', campaign_id)
      .eq('status', 'ACTIVE')
      .is('deliverable_submitted_at', null)
      .is('deliverable_approved_at', null)

    if (!collabs?.length) {
      return NextResponse.json({ ok: true, sent: 0, message: 'Toți influencerii activi au trimis deja dovada' })
    }

    const isBarter = camp.campaign_type === 'barter'
    const rewardText = isBarter ? camp.offer_name || 'produs gratuit' : `${camp.budget_per_influencer} RON`
    const campaignEndStr = camp.deadline
      ? new Date(camp.deadline).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
      : null
    const postDeadlineDays = 5

    const deliverables = camp.deliverables || ''
    const contentTypes = camp.content_type?.join(', ') || ''
    const minDaysOnline = camp.min_days_online || 30
    const hashtags = camp.required_hashtags?.length ? '#' + camp.required_hashtags.join(' #') : null
    const caption = camp.required_caption || null

    let sent = 0

    for (const collab of collabs) {
      const inf = collab.influencers as any
      if (!inf?.email) continue

      const hasPackage = !!collab.package_received_at

      const html = `<!DOCTYPE html><html lang="ro"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">
<div style="background:white;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden">

  <div style="background:linear-gradient(135deg,#f59e0b,#f97316);padding:26px;text-align:center">
    <div style="font-size:22px;font-weight:900;color:white">AddFame</div>
    <div style="font-size:12px;color:rgba(255,255,255,0.85);margin-top:3px">platforma ta de influencer marketing</div>
  </div>

  <div style="padding:26px">

    <div style="text-align:center;margin-bottom:18px">
      <div style="font-size:42px;margin-bottom:6px">📦</div>
      <h1 style="font-size:18px;font-weight:800;color:#111827;margin:0 0 4px">Reamintire campanie activă</h1>
      <p style="font-size:13px;color:#6b7280;margin:0">Acțiunea ta este necesară pentru a finaliza colaborarea</p>
    </div>

    <div style="background:#fffbeb;border:1.5px solid #fde68a;border-radius:12px;padding:16px;margin-bottom:20px">
      <p style="font-size:10px;font-weight:700;color:#b45309;margin:0 0 5px;text-transform:uppercase;letter-spacing:.05em">Campanie activă</p>
      <p style="font-size:15px;font-weight:800;color:#111827;margin:0 0 2px">${camp.title}</p>
      <p style="font-size:12px;color:#6b7280;margin:0 0 12px">de la <strong>${camp.brand_name}</strong> · ${rewardText}</p>
      <div style="display:flex;gap:8px">
        <div style="flex:1;background:#fef3c7;border-radius:8px;padding:8px;text-align:center">
          <p style="font-size:15px;font-weight:800;color:#92400e;margin:0">${postDeadlineDays} zile</p>
          <p style="font-size:10px;color:#b45309;margin:0">de la primire să postezi</p>
        </div>
        ${campaignEndStr ? `<div style="flex:1;background:#fee2e2;border-radius:8px;padding:8px;text-align:center">
          <p style="font-size:13px;font-weight:800;color:#991b1b;margin:0">${campaignEndStr}</p>
          <p style="font-size:10px;color:#b91c1c;margin:0">campania se închide</p>
        </div>` : ''}
      </div>
    </div>

    <p style="font-size:14px;color:#374151;line-height:1.7;margin-bottom:16px">
      Bună, <strong>${inf.name}</strong>! 👋<br><br>
      ${custom_message || `Îți trimitem acest mesaj pentru că ai o colaborare activă în campania <strong>"${camp.title}"</strong> de la <strong>${camp.brand_name}</strong> și vrem să te asigurăm că totul merge bine.`}
    </p>

    ${!hasPackage ? `
    <div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:12px;padding:16px;margin-bottom:16px">
      <p style="font-size:13px;font-weight:800;color:#c2410c;margin:0 0 10px">📦 Pasul 1 — Ai primit coletul?</p>
      <p style="font-size:13px;color:#374151;line-height:1.6;margin:0 0 10px">
        Dacă ai primit coletul de la brand, <strong>bifează confirmarea în platformă</strong> cât mai curând. Termenul de postare de <strong>${postDeadlineDays} zile</strong> începe din momentul în care confirmi primirea.
      </p>
      <p style="font-size:12px;color:#92400e;font-weight:700;margin:0">→ Colaborări → "Am primit coletul"</p>
    </div>` : ''}

    <div style="background:#faf5ff;border:1.5px solid #e9d5ff;border-radius:12px;padding:16px;margin-bottom:16px">
      <p style="font-size:13px;font-weight:800;color:#7c3aed;margin:0 0 10px">📸 ${hasPackage ? 'Pasul 1' : 'Pasul 2'} — Postează și trimite dovada</p>
      <p style="font-size:13px;color:#374151;line-height:1.6;margin:0 0 12px">
        ${hasPackage
          ? `Ai confirmat primirea coletului — acum e momentul să postezi conținutul și să trimiți dovada în platformă.`
          : `După ce bifezi primirea, ai <strong>${postDeadlineDays} zile</strong> să postezi conținutul și să trimiți dovada.`
        }
      </p>

      ${deliverables || contentTypes ? `
      <div style="background:white;border-radius:8px;padding:12px;border:1px solid #e9d5ff">
        <p style="font-size:11px;font-weight:700;color:#7c3aed;margin:0 0 8px;text-transform:uppercase;letter-spacing:.04em">Ce trebuie postat</p>
        ${deliverables ? `<p style="font-size:13px;font-weight:700;color:#111827;margin:0 0 5px">${deliverables}</p>` : ''}
        ${contentTypes ? `<p style="font-size:12px;color:#6b7280;margin:0 0 4px">Tip conținut: ${contentTypes}</p>` : ''}
        ${minDaysOnline ? `<p style="font-size:12px;color:#6b7280;margin:0 0 4px">Postarea rămâne online minim <strong>${minDaysOnline} zile</strong></p>` : ''}
        ${hashtags ? `<p style="font-size:12px;color:#7c3aed;font-weight:700;margin:0 0 4px">${hashtags}</p>` : ''}
        ${caption ? `<p style="font-size:12px;color:#6b7280;margin:0;font-style:italic">"${caption}"</p>` : ''}
      </div>` : ''}
    </div>

    <div style="text-align:center;margin:22px 0">
      <a href="${APP_URL}/influencer/collaborations"
        style="background:linear-gradient(135deg,#f59e0b,#f97316);color:white;text-decoration:none;font-size:14px;font-weight:800;padding:14px 32px;border-radius:12px;display:inline-block">
        ${hasPackage ? '📤 Trimite dovada acum →' : '📦 Mergi la colaborări →'}
      </a>
    </div>

    <p style="font-size:12px;color:#9ca3af;text-align:center">
      Ai întrebări? <a href="mailto:contact@addfame.ro" style="color:#f59e0b;font-weight:700">contact@addfame.ro</a>
    </p>
  </div>

  <div style="padding:12px 26px;border-top:1px solid #f3f4f6;text-align:center">
    <p style="font-size:11px;color:#9ca3af;margin:0">© 2026 AddFame · addfame.ro</p>
  </div>
</div>
</div>
</body></html>`

      await sendEmail(
        inf.email,
        hasPackage
          ? `📸 Reamintire: trimite dovada pentru "${camp.title}"`
          : `📦 Ai primit coletul? Acționează acum pentru "${camp.title}"`,
        html
      )

      if (inf.user_id) {
        await admin.from('notifications').insert({
          user_id: inf.user_id,
          title: hasPackage ? '📸 Trimite dovada postului!' : '📦 Ai primit coletul? Bifează!',
          body: hasPackage
            ? `Nu uita să trimiți dovada pentru "${camp.title}". Campania se închide pe ${campaignEndStr || 'curând'}.`
            : `Bifează primirea coletului și postează în ${postDeadlineDays} zile. Campania se închide pe ${campaignEndStr || 'curând'}.`,
          link: '/influencer/collaborations',
          read: false,
        })
      }

      sent++
    }

    return NextResponse.json({ ok: true, sent, total: collabs.length })
  } catch (e: any) {
    console.error('[admin/campaign-reminder]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
