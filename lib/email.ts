/**
 * Email notifications via Resend API
 * Set RESEND_API_KEY in .env.local
 * Set NEXT_PUBLIC_APP_URL to your domain
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const FROM_EMAIL = process.env.FROM_EMAIL || 'AddFame <noreply@addfame.ro>'

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.log('[Email skipped - no RESEND_API_KEY]', { to, subject })
    return { ok: true, skipped: true }
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[Email failed]', err)
      return { ok: false, error: err }
    }
    return { ok: true }
  } catch (e: any) {
    console.error('[Email error]', e.message)
    return { ok: false, error: e.message }
  }
}

function baseTemplate(content: string) {
  return `
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      body{margin:0;padding:0;background:#f9fafb;font-family:'Helvetica Neue',Arial,sans-serif;color:#111}
      .wrap{max-width:520px;margin:40px auto;background:white;border-radius:20px;overflow:hidden;border:1.5px solid #f0f0f0}
      .header{background:linear-gradient(135deg,#f97316,#ec4899);padding:28px 32px}
      .logo{color:white;font-weight:900;font-size:20px;letter-spacing:-0.5px}
      .body{padding:32px}
      h1{font-size:22px;font-weight:900;margin:0 0 8px;color:#111}
      p{font-size:15px;line-height:1.6;color:#555;margin:0 0 16px}
      .btn{display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#f97316,#ec4899);color:white;text-decoration:none;border-radius:12px;font-weight:800;font-size:14px;margin:8px 0}
      .footer{background:#f9fafb;padding:20px 32px;font-size:12px;color:#9ca3af;border-top:1px solid #f0f0f0}
      .badge{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:99px;font-size:12px;font-weight:700}
      .badge-green{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0}
      .badge-orange{background:#fff7ed;color:#ea580c;border:1px solid #fed7aa}
      .badge-blue{background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe}
    </style></head>
    <body>
      <div class="wrap">
        <div class="header"><div class="logo">AddFame</div></div>
        <div class="body">${content}</div>
        <div class="footer">© ${new Date().getFullYear()} AddFame · <a href="${APP_URL}" style="color:#9ca3af">addfame.ro</a></div>
      </div>
    </body></html>
  `
}

// ── Email templates ────────────────────────────────────────────────────────────

export async function emailInfluencerApproved(to: string, name: string) {
  return sendEmail(to, '🎉 You\'re approved on AddFame!', baseTemplate(`
    <h1>Welcome to AddFame, ${name}! 🎉</h1>
    <p>Great news — your profile has been reviewed and <strong>approved</strong>. You can now browse campaigns, apply to collaborations, and start earning.</p>
    <a href="${APP_URL}/influencer/dashboard" class="btn">Go to Dashboard →</a>
    <p style="margin-top:20px;font-size:13px;color:#9ca3af">Start by completing your profile and connecting your social accounts to attract more brands.</p>
  `))
}

export async function emailInfluencerRejected(to: string, name: string, reason: string) {
  return sendEmail(to, 'Update on your AddFame application', baseTemplate(`
    <h1>Application update</h1>
    <p>Hi ${name}, thank you for applying to AddFame. After reviewing your profile, we weren't able to approve your account at this time.</p>
    <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:12px;padding:16px;margin:16px 0">
      <p style="margin:0;font-weight:700;color:#dc2626;font-size:13px">Reason:</p>
      <p style="margin:8px 0 0;color:#dc2626;font-size:14px">${reason}</p>
    </div>
    <p>You're welcome to update your profile and reapply. If you have any questions, reply to this email.</p>
  `))
}

export async function emailBrandVerified(to: string, brandName: string) {
  return sendEmail(to, '✅ Brand verified — you can now publish campaigns', baseTemplate(`
    <h1>${brandName} is now verified ✅</h1>
    <p>Your brand has been verified on AddFame. You can now publish campaigns and connect with influencers.</p>
    <a href="${APP_URL}/brand/campaigns" class="btn">Create a Campaign →</a>
  `))
}

export async function emailBrandVerificationRejected(to: string, brandName: string, reason: string) {
  return sendEmail(to, 'Update on your AddFame verification', baseTemplate(`
    <h1>Verification update</h1>
    <p>Hi, we reviewed the verification for <strong>${brandName}</strong> and weren't able to approve it at this time.</p>
    <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:12px;padding:16px;margin:16px 0">
      <p style="margin:0;font-weight:700;color:#dc2626;font-size:13px">Reason:</p>
      <p style="margin:8px 0 0;color:#dc2626;font-size:14px">${reason}</p>
    </div>
    <a href="${APP_URL}/brand/verify" class="btn">Resubmit Verification →</a>
  `))
}

export async function emailInfluencerApplied(to: string, brandName: string, influencerName: string, campaignTitle: string, campaignId: string) {
  return sendEmail(to, `New application — ${influencerName} wants to collaborate`, baseTemplate(`
    <h1>New application on "${campaignTitle}"</h1>
    <p><strong>${influencerName}</strong> has applied to collaborate on your campaign.</p>
    <a href="${APP_URL}/brand/campaigns/${campaignId}" class="btn">Review Application →</a>
  `))
}

export async function emailInfluencerInvited(to: string, influencerName: string, brandName: string, campaignTitle: string) {
  return sendEmail(to, `${brandName} invited you to collaborate`, baseTemplate(`
    <h1>You've been invited! 🚀</h1>
    <p>Hi ${influencerName}, <strong>${brandName}</strong> has invited you to collaborate on <strong>"${campaignTitle}"</strong>.</p>
    <a href="${APP_URL}/influencer/collaborations" class="btn">View Invitation →</a>
  `))
}

export async function emailCollaborationApproved(to: string, influencerName: string, brandName: string, campaignTitle: string) {
  return sendEmail(to, `✅ Your application was approved by ${brandName}`, baseTemplate(`
    <h1>Application approved! ✅</h1>
    <p>Hi ${influencerName}, <strong>${brandName}</strong> approved your application for <strong>"${campaignTitle}"</strong>.</p>
    <p>You're now an active collaborator. Submit your deliverable when ready.</p>
    <a href="${APP_URL}/influencer/collaborations" class="btn">View Collaboration →</a>
  `))
}

export async function emailDeliverableSubmitted(to: string, brandName: string, influencerName: string, campaignTitle: string, campaignId: string) {
  return sendEmail(to, `📦 ${influencerName} submitted a deliverable`, baseTemplate(`
    <h1>Deliverable submitted</h1>
    <p><strong>${influencerName}</strong> submitted their deliverable for <strong>"${campaignTitle}"</strong>. Review it and mark complete to release payment.</p>
    <a href="${APP_URL}/brand/campaigns/${campaignId}" class="btn">Review Deliverable →</a>
  `))
}

export async function emailPaymentReleased(to: string, influencerName: string, amount: number, campaignTitle: string) {
  return sendEmail(to, `💸 Payment released — €${amount}`, baseTemplate(`
    <h1>Payment received! 💸</h1>
    <p>Hi ${influencerName}, <strong>€${amount}</strong> has been added to your AddFame wallet for completing <strong>"${campaignTitle}"</strong>.</p>
    <a href="${APP_URL}/influencer/wallet" class="btn">View Wallet →</a>
  `))
}

export async function emailNewMessage(to: string, recipientName: string, senderName: string, preview: string, link: string) {
  return sendEmail(to, `💬 New message from ${senderName}`, baseTemplate(`
    <h1>New message</h1>
    <p>Hi ${recipientName}, you have a new message from <strong>${senderName}</strong>:</p>
    <div style="background:#f9fafb;border-left:4px solid #f97316;border-radius:0 12px 12px 0;padding:16px;margin:16px 0">
      <p style="margin:0;font-style:italic;color:#555">"${preview.length > 120 ? preview.slice(0, 120) + '…' : preview}"</p>
    </div>
    <a href="${APP_URL}${link}" class="btn">Reply →</a>
  `))
}

// ── Email verificare cont (înlocuiește template-ul default Supabase) ────────────
export async function emailVerifyAccount(to: string, name: string, confirmUrl: string) {
  return sendEmail(to, '👋 Confirmă-ți contul AddFame', baseTemplate(`
    <h1>Bun venit pe AddFame, ${name}! 🎉</h1>
    <p>Ești aproape gata. Confirmă-ți adresa de email pentru a-ți activa contul și a începe să colaborezi cu branduri și influenceri din România.</p>
    <div style="text-align:center;margin:32px 0">
      <a href="${confirmUrl}" class="btn" style="font-size:16px;padding:16px 36px">✅ Confirmă contul meu</a>
    </div>
    <p style="font-size:13px;color:#9ca3af">Dacă nu te-ai înregistrat pe AddFame, poți ignora acest email în siguranță.</p>
    <p style="font-size:13px;color:#9ca3af">Link-ul expiră în 24 de ore.</p>
  `))
}

// ── Bun venit influencer (după înregistrare, aprobare automată) ───────────────
export async function emailWelcomeInfluencer(to: string, name: string) {
  return sendEmail(to, '🚀 Contul tău AddFame e activ — începe să câștigi!', baseTemplate(`
    <h1>Salut, ${name}! Ești gata de colaborări 🚀</h1>
    <p>Contul tău de influencer a fost <strong>activat automat</strong>. Poți începe imediat să aplici la campanii și să colaborezi cu branduri.</p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:20px;margin:20px 0">
      <p style="margin:0 0 12px;font-weight:800;color:#16a34a;font-size:14px">✅ Ce poți face acum:</p>
      <p style="margin:0 0 8px;font-size:14px;color:#374151">📋 <strong>Completează-ți profilul</strong> — brandurile aleg influencerii cu profiluri complete</p>
      <p style="margin:0 0 8px;font-size:14px;color:#374151">🔍 <strong>Caută campanii</strong> potrivite nișei tale</p>
      <p style="margin:0 0 8px;font-size:14px;color:#374151">💰 <strong>Aplică și câștigă</strong> — plata e garantată prin sistemul nostru escrow</p>
      <p style="margin:0;font-size:14px;color:#374151">💳 <strong>Retrage banii</strong> oricând în contul tău bancar</p>
    </div>

    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:16px;margin:20px 0">
      <p style="margin:0;font-size:13px;color:#92400e">💡 <strong>Sfat:</strong> Influencerii cu bio complet, nișe selectate și rețele sociale conectate primesc de 3x mai multe invitații de la branduri.</p>
    </div>

    <a href="${APP_URL}/influencer/dashboard" class="btn">Mergi la Dashboard →</a>
  `))
}

// ── Bun venit brand (după înregistrare, în așteptare review) ──────────────────
export async function emailWelcomeBrand(to: string, brandName: string) {
  return sendEmail(to, '👋 Contul AddFame a fost creat — urmează verificarea', baseTemplate(`
    <h1>Salut, ${brandName}! 👋</h1>
    <p>Contul tău de brand a fost creat cu succes pe AddFame. Echipa noastră va <strong>verifica profilul în maximum 24 de ore</strong>.</p>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:16px;padding:20px;margin:20px 0">
      <p style="margin:0 0 12px;font-weight:800;color:#1d4ed8;font-size:14px">⏳ Ce se întâmplă acum:</p>
      <p style="margin:0 0 8px;font-size:14px;color:#374151">1️⃣ Echipa AddFame verifică profilul brandului tău</p>
      <p style="margin:0 0 8px;font-size:14px;color:#374151">2️⃣ Primești email de confirmare în max 24h</p>
      <p style="margin:0 0 8px;font-size:14px;color:#374151">3️⃣ Adaugi credite în wallet</p>
      <p style="margin:0;font-size:14px;color:#374151">4️⃣ Creezi prima campanie și contactezi influenceri</p>
    </div>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:16px;padding:16px;margin:20px 0">
      <p style="margin:0 0 8px;font-weight:700;font-size:14px">📊 De ce AddFame?</p>
      <p style="margin:0 0 6px;font-size:13px;color:#6b7280">✅ Plată garantată prin escrow — influencerul primește banii doar după aprobare</p>
      <p style="margin:0 0 6px;font-size:13px;color:#6b7280">✅ Influenceri verificați din România și Europa</p>
      <p style="margin:0;font-size:13px;color:#6b7280">✅ Comision transparent de doar 15%</p>
    </div>

    <p style="font-size:13px;color:#9ca3af">Ai întrebări? Răspunde la acest email sau scrie-ne la <a href="mailto:contact@addfame.ro" style="color:#f97316">contact@addfame.ro</a></p>
    <a href="${APP_URL}/brand/dashboard" class="btn">Mergi la Dashboard →</a>
  `))
}

// ── Profile completion reminder ────────────────────────────────────────────────
export async function emailProfileReminder(
  to: string,
  name: string,
  missingItems: string[],
  customMessage?: string
) {
  const missingHtml = missingItems.map(item =>
    `<li style="margin:6px 0;font-size:14px;color:#555;">● ${item}</li>`
  ).join('')

  return sendEmail(to, `${name}, completează-ți profilul pe AddFame 🚀`, baseTemplate(`
    <h1>Bună, ${name}! 👋</h1>
    <p>Profilul tău pe <strong>AddFame</strong> este ${missingItems.length > 0 ? 'incomplet' : 'aproape gata'}. Brandurile caută influenceri activi — cu un profil complet îți crești șansele de colaborare!</p>

    ${customMessage ? `
    <div style="background:#f5f3ff;border-left:4px solid #8b5cf6;border-radius:0 12px 12px 0;padding:16px 20px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#6b7280;font-style:italic;">"${customMessage}"</p>
      <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">— Echipa AddFame</p>
    </div>
    ` : ''}

    ${missingItems.length > 0 ? `
    <div style="background:#fafafa;border-radius:12px;padding:16px 20px;margin:16px 0;border:1.5px solid #f0f0f0;">
      <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#111;">Ce mai lipsește din profilul tău:</p>
      <ul style="margin:0;padding-left:0;list-style:none;">
        ${missingHtml}
      </ul>
    </div>
    ` : ''}

    <div style="background:linear-gradient(135deg,#f5f3ff,#ede9fe);border-radius:12px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#7c3aed;">💡 De ce contează un profil complet?</p>
      <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">✅ Brandurile te găsesc mai ușor în căutări</p>
      <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">✅ Crești șansele de a primi invitații directe</p>
      <p style="margin:0;font-size:13px;color:#6b7280;">✅ Poți aplica la campanii mai bine plătite</p>
    </div>

    <a href="${APP_URL}/influencer/profile" class="btn">Completează profilul acum →</a>

    <p style="font-size:13px;color:#6b7280;margin-top:16px;background:#f0fdf4;border-radius:10px;padding:12px 16px;border-left:4px solid #22c55e;">
      📍 <strong>Important:</strong> Asigură-te că ai completat și <strong>Orașul/Comuna</strong> din Settings → Account. Fără acesta nu vei vedea ofertele barter disponibile în zona ta!
    </p>

    <p style="font-size:13px;color:#9ca3af;margin-top:16px;">Ai întrebări? Scrie-ne la <a href="mailto:contact@addfame.ro" style="color:#8b5cf6">contact@addfame.ro</a></p>
  `))
}