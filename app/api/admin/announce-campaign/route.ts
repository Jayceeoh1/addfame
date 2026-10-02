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

    const { campaign_id, extra_message, filter_cities, filter_niches, influencer_ids } = await req.json()
    if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })

    const admin = createAdminClient()

    const { data: camp } = await admin
      .from('campaigns')
      .select('id, title, brand_name, deadline, campaign_type, offer_name, offer_value, offer_description, offer_image_url, budget_per_influencer, max_influencers, deliverables, content_type, required_hashtags, required_caption, min_days_online, platforms, niches')
      .eq('id', campaign_id)
      .single()

    if (!camp) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    // Fetch influenceri aprobați care nu sunt deja în campanie
    const { data: existing } = await admin
      .from('collaborations')
      .select('influencer_id')
      .eq('campaign_id', campaign_id)

    const existingIds = (existing || []).map((c: any) => c.influencer_id)

    let query = admin
      .from('influencers')
      .select('id, user_id, name, email, platforms, city, niches')
      .eq('approval_status', 'approved')
      .or('email_reminders_enabled.is.null,email_reminders_enabled.eq.true')

    // PRIORITATE 1: dacă admin a specificat ID-uri exacte (din selecție), folosim doar pe ei
    if (Array.isArray(influencer_ids) && influencer_ids.length > 0) {
      query = query.in('id', influencer_ids)
    }
    // PRIORITATE 2: altfel, aplicăm filtrul de orașe dacă există
    else if (Array.isArray(filter_cities) && filter_cities.length > 0) {
      query = query.in('city', filter_cities)
    }

    const { data: allInfs } = await query
    let influencers = (allInfs || []).filter((i: any) => !existingIds.includes(i.id))

    // Filtru nișe — aplicat ÎN JS (pentru că niches e array)
    // Sărim peste asta dacă a specificat influencer_ids exact
    if (!influencer_ids?.length && Array.isArray(filter_niches) && filter_niches.length > 0) {
      const nichesLower = filter_niches.map((n: string) => n.toLowerCase())
      influencers = influencers.filter((i: any) =>
        Array.isArray(i.niches) && i.niches.some((n: string) => nichesLower.includes(n.toLowerCase()))
      )
    }

    if (!influencers.length) return NextResponse.json({ ok: true, sent: 0 })

    const isBarter = camp.campaign_type === 'barter'
    const rewardText = isBarter ? camp.offer_name || 'produs gratuit' : `${camp.budget_per_influencer} RON`
    const deadlineStr = camp.deadline
      ? new Date(camp.deadline).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
      : null
    const deliverables = camp.deliverables || ''
    const hashtags = camp.required_hashtags?.length ? '#' + camp.required_hashtags.join(' #') : null
    const minDays = camp.min_days_online || 30

    let sent = 0

    for (const inf of influencers) {
      if (!inf.email) continue

      const html = `<!DOCTYPE html>
<html lang="ro">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin:0; background:#f3f4f6; font-family:'Segoe UI',Arial,sans-serif; }
  .wrap { max-width:580px; margin:0 auto; padding:32px 16px; }
  .card { background:white; border-radius:20px; overflow:hidden; border:1px solid #e5e7eb; }
  .header { background:linear-gradient(135deg,#7c3aed,#ec4899); padding:32px 28px; text-align:center; }
  .logo { font-size:28px; font-weight:900; color:white; letter-spacing:-0.5px; }
  .logo-sub { font-size:12px; color:rgba(255,255,255,0.8); margin-top:4px; }
  .body { padding:28px; }
  .hero { text-align:center; margin-bottom:24px; }
  .hero-icon { font-size:52px; margin-bottom:8px; }
  .hero-title { font-size:22px; font-weight:900; color:#111827; margin:0 0 6px; }
  .hero-sub { font-size:14px; color:#6b7280; margin:0; }
  .camp-card { background:linear-gradient(135deg,#faf5ff,#fdf2f8); border:1.5px solid #e9d5ff; border-radius:14px; padding:20px; margin-bottom:22px; }
  .camp-badge { font-size:10px; font-weight:700; color:#7c3aed; text-transform:uppercase; letter-spacing:.06em; margin:0 0 8px; }
  .camp-title { font-size:20px; font-weight:900; color:#111827; margin:0 0 3px; }
  .camp-brand { font-size:13px; color:#6b7280; margin:0 0 16px; }
  .stats { display:flex; gap:8px; margin-bottom:12px; }
  .stat { flex:1; background:white; border-radius:10px; padding:10px; text-align:center; border:1px solid #e9d5ff; }
  .stat-val { font-size:16px; font-weight:900; color:#7c3aed; margin:0 0 2px; }
  .stat-lbl { font-size:10px; color:#9ca3af; margin:0; }
  .deadline-box { background:#fee2e2; border-radius:8px; padding:8px 12px; }
  .deadline-txt { font-size:12px; color:#b91c1c; font-weight:700; margin:0; }
  .camp-img { width:100%; border-radius:10px; object-fit:cover; max-height:200px; display:block; margin-bottom:14px; }
  .brief { background:#f9fafb; border-radius:12px; padding:16px; margin-bottom:20px; }
  .brief-title { font-size:11px; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:.05em; margin:0 0 10px; }
  .brief-row { display:flex; align-items:flex-start; gap:8px; margin-bottom:8px; }
  .brief-dot { width:6px; height:6px; background:#7c3aed; border-radius:50%; flex-shrink:0; margin-top:5px; }
  .brief-text { font-size:13px; color:#374151; margin:0; line-height:1.5; }
  .extra { background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:14px; margin-bottom:20px; }
  .extra-text { font-size:13px; color:#92400e; line-height:1.7; margin:0; }
  .greeting { font-size:14px; color:#374151; line-height:1.7; margin-bottom:20px; }
  .cta-wrap { text-align:center; margin:24px 0; }
  .cta { display:inline-block; background:linear-gradient(135deg,#7c3aed,#ec4899); color:white; text-decoration:none; font-size:15px; font-weight:800; padding:14px 36px; border-radius:12px; }
  .footer { padding:16px 28px; border-top:1px solid #f3f4f6; text-align:center; }
  .footer-txt { font-size:11px; color:#9ca3af; margin:0; }
  .footer-link { color:#9ca3af; }
</style>
</head>
<body>
<div class="wrap">
<div class="card">
  <div class="header">
    <div class="logo">AddFame</div>
    <div class="logo-sub">platforma ta de influencer marketing</div>
  </div>
  <div class="body">
    <div class="hero">
      <div class="hero-icon">🚀</div>
      <h1 class="hero-title">Campanie nouă disponibilă!</h1>
      <p class="hero-sub">O oportunitate nouă te așteaptă pe AddFame</p>
    </div>

    <div class="camp-card">
      <p class="camp-badge">${isBarter ? '🎁 Campanie barter' : '💰 Campanie plătită'}</p>
      <p class="camp-title">${camp.title}</p>
      <p class="camp-brand">de la <strong>${camp.brand_name}</strong></p>

      ${camp.offer_image_url ? `<img src="${camp.offer_image_url}" class="camp-img" alt="Produs campanie" />` : ''}

      <div class="stats">
        <div class="stat">
          <p class="stat-val">${rewardText}</p>
          <p class="stat-lbl">${isBarter ? 'produs gratuit' : 'câștiguri'}</p>
        </div>
        ${camp.max_influencers ? `<div class="stat">
          <p class="stat-val">${camp.max_influencers}</p>
          <p class="stat-lbl">locuri disponibile</p>
        </div>` : ''}
        ${minDays ? `<div class="stat">
          <p class="stat-val">${minDays}+ zile</p>
          <p class="stat-lbl">postarea online</p>
        </div>` : ''}
      </div>

      ${deadlineStr ? `<div class="deadline-box">
        <p class="deadline-txt">⏰ Deadline campanie: ${deadlineStr}</p>
      </div>` : ''}
    </div>

    ${(deliverables || hashtags || camp.offer_description) ? `
    <div class="brief">
      <p class="brief-title">📋 Ce trebuie să faci</p>
      ${deliverables ? `<div class="brief-row"><div class="brief-dot"></div><p class="brief-text"><strong>${deliverables}</strong></p></div>` : ''}
      ${camp.offer_description ? `<div class="brief-row"><div class="brief-dot"></div><p class="brief-text">${camp.offer_description}</p></div>` : ''}
      ${hashtags ? `<div class="brief-row"><div class="brief-dot"></div><p class="brief-text">Hashtag-uri: <strong style="color:#7c3aed">${hashtags}</strong></p></div>` : ''}
      ${camp.required_caption ? `<div class="brief-row"><div class="brief-dot"></div><p class="brief-text">Caption: <em>"${camp.required_caption}"</em></p></div>` : ''}
    </div>` : ''}

    ${extra_message ? `<div class="extra">
      <p class="extra-text">${extra_message}</p>
    </div>` : ''}

    <p class="greeting">
      Bună, <strong>${inf.name}</strong>! 👋<br><br>
      O campanie nouă se potrivește profilului tău. <strong>Locurile se ocupă rapid</strong> — aplică acum înainte să se termine!
    </p>

    <div class="cta-wrap">
      <a href="${APP_URL}/influencer/campaigns/${camp.id}" class="cta">
        Vezi campania și aplică →
      </a>
    </div>
  </div>
  <div class="footer">
    <p class="footer-txt">© 2026 AddFame · addfame.ro · <a href="${APP_URL}/unsubscribe" class="footer-link">Dezabonează-te</a></p>
  </div>
</div>
</div>
</body>
</html>`

      await sendEmail(inf.email, `🚀 Campanie nouă: "${camp.title}" de la ${camp.brand_name}`, html)

      if (inf.user_id) {
        await admin.from('notifications').insert({
          user_id: inf.user_id,
          title: '🚀 Campanie nouă disponibilă!',
          body: `"${camp.title}" de la ${camp.brand_name} — ${rewardText}. Aplică acum!`,
          link: `/influencer/campaigns/${camp.id}`,
          read: false,
        })
      }

      sent++
      if (sent % 50 === 0) await new Promise(r => setTimeout(r, 1000))
    }

    return NextResponse.json({ ok: true, sent, total: influencers.length })
  } catch (e: any) {
    console.error('[admin/announce-campaign]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
