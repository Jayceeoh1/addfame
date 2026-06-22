/**
 * Email notifications via Resend API
 * Set RESEND_API_KEY in .env.local
 * Set NEXT_PUBLIC_APP_URL to your domain
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const FROM_EMAIL = process.env.FROM_EMAIL || 'AddFame <noreply@addfame.ro>'

export async function sendEmail(to: string, subject: string, html: string) {
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

function baseTemplate(content: string, unsubEmail?: string) {
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
        <div class="footer">
          © ${new Date().getFullYear()} AddFame · <a href="${APP_URL}" style="color:#9ca3af">addfame.ro</a>
          <br><br>
          <a href="${APP_URL}/api/unsubscribe?email=${unsubEmail || ''}" style="color:#9ca3af;font-size:11px;text-decoration:underline;">Dezabonează-te de la aceste emailuri</a>
          &nbsp;·&nbsp;
          <a href="mailto:contact@addfame.ro" style="color:#9ca3af;font-size:11px;">contact@addfame.ro</a>
        </div>
      </div>
    </body></html>
  `
}

// ── Email templates ────────────────────────────────────────────────────────────

export function sendPasswordResetEmail(to: string, resetLink: string) {
  return sendEmail(to, '🔐 Resetează parola — AddFame', baseTemplate(`
    <h1>Resetare parolă 🔐</h1>
    <p>Ai solicitat resetarea parolei pentru contul tău <strong>AddFame</strong>.</p>
    <p>Apasă butonul de mai jos pentru a seta o parolă nouă:</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${resetLink}" class="btn" style="font-size:16px;padding:16px 36px">🔑 Resetează parola</a>
    </div>
    <div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:12px;padding:14px 18px;margin:16px 0">
      <p style="margin:0;font-size:13px;color:#92400e">
        ⏰ <strong>Link-ul expiră în 1 oră.</strong><br>
        Dacă nu ai cerut resetarea parolei, ignoră acest email — contul tău este în siguranță.
      </p>
    </div>
    <p style="font-size:13px;color:#9ca3af">
      Dacă butonul nu funcționează, copiază și lipește acest link în browser:<br>
      <a href="${resetLink}" style="color:#f97316;word-break:break-all;font-size:12px">${resetLink}</a>
    </p>
  `))
}

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

export async function emailInfluencerInvited(to: string, influencerName: string, brandName: string, campaignTitle: string, budgetPerInfluencer?: number) {
  return sendEmail(to, `${brandName} te-a invitat să colaborezi`, baseTemplate(`
    <h1>Ai primit o invitație! 🚀</h1>
    <p>Salut ${influencerName}, <strong>${brandName}</strong> te-a invitat să colaborezi pe campania <strong>"${campaignTitle}"</strong>.</p>
    ${budgetPerInfluencer ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:16px 0;text-align:center">
      <p style="margin:0;font-size:13px;color:#16a34a;font-weight:700">💰 Buget per influencer</p>
      <p style="margin:6px 0 0;font-size:24px;font-weight:900;color:#15803d">${budgetPerInfluencer} RON</p>
    </div>
    ` : ''}
    <a href="${APP_URL}/influencer/collaborations" class="btn">Vezi invitația →</a>
  `))
}

export async function emailCollaborationApproved(to: string, influencerName: string, brandName: string, campaignTitle: string) {
  return sendEmail(to, `✅ Aplicația ta a fost aprobată de ${brandName}`, baseTemplate(`
    <h1>Aplicație aprobată! ✅</h1>
    <p>Salut ${influencerName}, <strong>${brandName}</strong> a aprobat aplicația ta pentru <strong>"${campaignTitle}"</strong>.</p>
    <p>Ești acum colaborator activ. Publică postul conform briefului și trimite dovada pentru a primi plata.</p>
    <a href="${APP_URL}/influencer/collaborations" class="btn">Vezi colaborarea →</a>
  `))
}

export async function emailDeliverableSubmitted(to: string, brandName: string, influencerName: string, campaignTitle: string, campaignId: string) {
  return sendEmail(to, `📦 ${influencerName} a trimis dovada postului`, baseTemplate(`
    <h1>Dovadă trimisă spre aprobare</h1>
    <p><strong>${influencerName}</strong> a trimis dovada postului pentru <strong>"${campaignTitle}"</strong>. Verifică și aprobă pentru a elibera plata.</p>
    <a href="${APP_URL}/brand/campaigns/${campaignId}" class="btn">Verifică deliverable →</a>
  `))
}

export async function emailPaymentReleased(to: string, influencerName: string, amount: number, campaignTitle: string) {
  return sendEmail(to, `💸 Ai primit ${amount} RON în wallet`, baseTemplate(`
    <h1>Plată primită! 💸</h1>
    <p>Salut ${influencerName}, <strong>${amount} RON</strong> au fost adăugați în wallet-ul tău AddFame pentru finalizarea campaniei <strong>"${campaignTitle}"</strong>.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:16px 0;text-align:center">
      <p style="margin:0;font-size:13px;color:#16a34a;font-weight:700">Sumă primită</p>
      <p style="margin:6px 0 0;font-size:28px;font-weight:900;color:#15803d">${amount} RON</p>
    </div>
    <a href="${APP_URL}/influencer/wallet" class="btn">Vezi wallet-ul →</a>
    <p style="font-size:13px;color:#9ca3af;margin-top:12px">Poți retrage oricând suma minimă de 250 RON în contul tău bancar.</p>
  `))
}

export async function emailNewMessage(to: string, recipientName: string, senderName: string, preview: string, link: string) {
  return sendEmail(to, `💬 Mesaj nou de la ${senderName}`, baseTemplate(`
    <h1>Mesaj nou</h1>
    <p>Salut ${recipientName}, ai primit un mesaj de la <strong>${senderName}</strong>:</p>
    <div style="background:#f9fafb;border-left:4px solid #f97316;border-radius:0 12px 12px 0;padding:16px;margin:16px 0">
      <p style="margin:0;font-style:italic;color:#555">"${preview.length > 120 ? preview.slice(0, 120) + '…' : preview}"</p>
    </div>
    <a href="${APP_URL}${link}" class="btn">Răspunde →</a>
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
  `, to))
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAILURI NOI
// ─────────────────────────────────────────────────────────────────────────────

// ── Top-up confirmat (brand) ──────────────────────────────────────────────────
export async function emailTopupConfirmed(to: string, brandName: string, amount: number, newBalance: number) {
  return sendEmail(to, `✅ Top-up confirmat — ${amount} RON adăugați`, baseTemplate(`
    <h1>Top-up confirmat! ✅</h1>
    <p>Salut <strong>${brandName}</strong>, am primit și confirmat plata ta.</p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:20px;margin:20px 0;text-align:center">
      <p style="margin:0;font-size:13px;color:#16a34a;font-weight:700">Sumă adăugată</p>
      <p style="margin:6px 0 4px;font-size:32px;font-weight:900;color:#15803d">+${amount} RON</p>
      <p style="margin:0;font-size:13px;color:#16a34a">Sold nou: <strong>${newBalance} RON</strong></p>
    </div>

    <p>Creditele sunt disponibile imediat în wallet-ul tău. Poți lansa campanii sau aproba colaborări.</p>
    <a href="${APP_URL}/brand/campaigns" class="btn">Mergi la Campanii →</a>

    <p style="font-size:13px;color:#9ca3af;margin-top:16px">Factura pentru această tranzacție este disponibilă în secțiunea Wallet → Tranzacții.</p>
  `))
}

// ── Campanie expirată — notificare brand ──────────────────────────────────────
export async function emailCampaignExpired(to: string, brandName: string, campaignTitle: string, escrowReturned: number, completedCollabs: number) {
  return sendEmail(to, `⏰ Campania "${campaignTitle}" a expirat`, baseTemplate(`
    <h1>Campanie închisă automat ⏰</h1>
    <p>Salut <strong>${brandName}</strong>, campania <strong>"${campaignTitle}"</strong> a ajuns la deadline și a fost închisă automat.</p>

    <div style="background:#f9fafb;border:1.5px solid #f0f0f0;border-radius:16px;padding:20px;margin:20px 0">
      <p style="margin:0 0 12px;font-weight:800;font-size:14px;color:#111">📊 Rezumat campanie:</p>
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:120px;text-align:center;background:white;border-radius:12px;padding:12px;border:1px solid #f0f0f0">
          <p style="margin:0;font-size:22px;font-weight:900;color:#111">${completedCollabs}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;font-weight:600">Colaborări finalizate</p>
        </div>
        ${escrowReturned > 0 ? `
        <div style="flex:1;min-width:120px;text-align:center;background:#f0fdf4;border-radius:12px;padding:12px;border:1px solid #bbf7d0">
          <p style="margin:0;font-size:22px;font-weight:900;color:#15803d">${escrowReturned} RON</p>
          <p style="margin:4px 0 0;font-size:12px;color:#16a34a;font-weight:600">Escrow returnat</p>
        </div>
        ` : ''}
      </div>
    </div>

    ${escrowReturned > 0 ? `<p>Suma de <strong>${escrowReturned} RON</strong> din escrow neutilizat a fost returnată automat în credite.</p>` : ''}

    <a href="${APP_URL}/brand/campaigns" class="btn">Creează o nouă campanie →</a>
  `))
}

// ── Retragere aprobată (influencer) ───────────────────────────────────────────
export async function emailWithdrawalApproved(to: string, influencerName: string, amount: number, netAmount: number, method: string) {
  return sendEmail(to, `✅ Retragere aprobată — ${netAmount} RON în drum spre tine`, baseTemplate(`
    <h1>Retragerea a fost aprobată! ✅</h1>
    <p>Salut ${influencerName}, cererea ta de retragere a fost procesată cu succes.</p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:20px;margin:20px 0;text-align:center">
      <p style="margin:0;font-size:13px;color:#16a34a;font-weight:700">Sumă în procesare</p>
      <p style="margin:6px 0 4px;font-size:32px;font-weight:900;color:#15803d">${netAmount} RON</p>
      <p style="margin:0;font-size:12px;color:#6b7280">Din ${amount} RON solicitați (după taxă 5%)</p>
    </div>

    <div style="background:#f9fafb;border-radius:12px;padding:16px;margin:16px 0">
      <p style="margin:0 0 6px;font-size:13px;color:#6b7280">Metodă de plată: <strong>${method}</strong></p>
      <p style="margin:0;font-size:13px;color:#6b7280">Timp estimat: <strong>1-3 zile lucrătoare</strong></p>
    </div>

    <a href="${APP_URL}/influencer/wallet" class="btn">Vezi wallet-ul →</a>
    <p style="font-size:13px;color:#9ca3af;margin-top:12px">Dacă nu primești plata în 3 zile lucrătoare, contactează-ne la <a href="mailto:contact@addfame.ro" style="color:#f97316">contact@addfame.ro</a></p>
  `))
}

// ── Retragere respinsă (influencer) ───────────────────────────────────────────
export async function emailWithdrawalRejected(to: string, influencerName: string, amount: number, reason: string) {
  return sendEmail(to, `❌ Cerere de retragere respinsă`, baseTemplate(`
    <h1>Cerere de retragere respinsă</h1>
    <p>Salut ${influencerName}, din păcate cererea ta de retragere de <strong>${amount} RON</strong> nu a putut fi procesată.</p>

    <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:12px;padding:16px;margin:16px 0">
      <p style="margin:0;font-weight:700;color:#dc2626;font-size:13px">Motiv:</p>
      <p style="margin:8px 0 0;color:#dc2626;font-size:14px">${reason}</p>
    </div>

    <p>Suma a fost returnată în wallet-ul tău și poți face o nouă cerere după ce rezolvi problema menționată.</p>
    <a href="${APP_URL}/influencer/wallet" class="btn">Mergi la Wallet →</a>
    <p style="font-size:13px;color:#9ca3af;margin-top:12px">Ai întrebări? Contactează-ne la <a href="mailto:contact@addfame.ro" style="color:#f97316">contact@addfame.ro</a></p>
  `))
}

// ── Reminder deadline post (influencer) ───────────────────────────────────────
export async function emailDeadlineReminder(to: string, influencerName: string, campaignTitle: string, brandName: string, deadlineDate: string, daysLeft: number, reservedAmount: number) {
  const urgencyColor = daysLeft <= 1 ? '#dc2626' : daysLeft <= 3 ? '#ea580c' : '#d97706'
  const urgencyBg = daysLeft <= 1 ? '#fff5f5' : daysLeft <= 3 ? '#fff7ed' : '#fffbeb'
  const urgencyBorder = daysLeft <= 1 ? '#fecaca' : daysLeft <= 3 ? '#fed7aa' : '#fde68a'

  return sendEmail(to, `⏰ ${daysLeft === 0 ? 'Azi e ultimia zi' : `Mai ai ${daysLeft} ${daysLeft === 1 ? 'zi' : 'zile'}`} să trimiți postul — "${campaignTitle}"`, baseTemplate(`
    <h1>${daysLeft === 0 ? '⚠️ Deadline azi!' : `⏰ ${daysLeft} ${daysLeft === 1 ? 'zi rămasă' : 'zile rămase'}`}</h1>
    <p>Salut ${influencerName}, campania <strong>"${campaignTitle}"</strong> a brandului <strong>${brandName}</strong> se apropie de deadline.</p>

    <div style="background:${urgencyBg};border:1px solid ${urgencyBorder};border-radius:12px;padding:16px;margin:16px 0;text-align:center">
      <p style="margin:0;font-size:13px;font-weight:700;color:${urgencyColor}">Deadline: ${deadlineDate}</p>
      <p style="margin:6px 0 0;font-size:22px;font-weight:900;color:${urgencyColor}">${daysLeft === 0 ? 'Azi!' : `${daysLeft} ${daysLeft === 1 ? 'zi' : 'zile'}`}</p>
    </div>

    <p>Nu uita că ai <strong>${reservedAmount} RON</strong> rezervați în escrow pentru această colaborare. Publică postul și trimite dovada pentru a primi plata!</p>

    <a href="${APP_URL}/influencer/collaborations" class="btn">Trimite dovada acum →</a>

    <p style="font-size:13px;color:#9ca3af;margin-top:12px">Dacă nu trimiți dovada înainte de deadline, colaborarea poate fi anulată și plata pierdută.</p>
  `))
}

// ── Review primit (influencer — brandul l-a evaluat) ─────────────────────────
export async function emailReviewReceived(to: string, influencerName: string, brandName: string, campaignTitle: string, rating: number, comment?: string) {
  const stars = '⭐'.repeat(Math.min(5, Math.max(1, rating)))
  return sendEmail(to, `${stars} Ai primit un review de la ${brandName}`, baseTemplate(`
    <h1>Review nou primit! ${stars}</h1>
    <p>Salut ${influencerName}, <strong>${brandName}</strong> a lăsat un review pentru colaborarea pe <strong>"${campaignTitle}"</strong>.</p>

    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:16px;padding:20px;margin:20px 0;text-align:center">
      <p style="margin:0;font-size:32px">${stars}</p>
      <p style="margin:8px 0 0;font-size:18px;font-weight:900;color:#92400e">${rating}/5</p>
    </div>

    ${comment ? `
    <div style="background:#f9fafb;border-left:4px solid #f97316;border-radius:0 12px 12px 0;padding:16px;margin:16px 0">
      <p style="margin:0;font-style:italic;color:#555">"${comment}"</p>
      <p style="margin:8px 0 0;font-size:12px;color:#9ca3af">— ${brandName}</p>
    </div>
    ` : ''}

    <p>Rating-ul tău este vizibil pe profilul public și ajută brandurile să te aleagă.</p>
    <a href="${APP_URL}/influencer/profile" class="btn">Vezi profilul tău →</a>
  `))
}

// ── Review primit (brand — influencerul l-a evaluat) ─────────────────────────
export async function emailBrandReviewReceived(to: string, brandName: string, influencerName: string, campaignTitle: string, rating: number, comment?: string) {
  const stars = '⭐'.repeat(Math.min(5, Math.max(1, rating)))
  return sendEmail(to, `${stars} ${influencerName} a lăsat un review`, baseTemplate(`
    <h1>Review nou de la ${influencerName}! ${stars}</h1>
    <p>Salut <strong>${brandName}</strong>, <strong>${influencerName}</strong> a lăsat un review pentru colaborarea pe <strong>"${campaignTitle}"</strong>.</p>

    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:16px;padding:20px;margin:20px 0;text-align:center">
      <p style="margin:0;font-size:32px">${stars}</p>
      <p style="margin:8px 0 0;font-size:18px;font-weight:900;color:#92400e">${rating}/5</p>
    </div>

    ${comment ? `
    <div style="background:#f9fafb;border-left:4px solid #f97316;border-radius:0 12px 12px 0;padding:16px;margin:16px 0">
      <p style="margin:0;font-style:italic;color:#555">"${comment}"</p>
      <p style="margin:8px 0 0;font-size:12px;color:#9ca3af">— ${influencerName}</p>
    </div>
    ` : ''}

    <a href="${APP_URL}/brand/collaborations" class="btn">Vezi colaborările →</a>
  `))
}

// ── Dispută deschisă — notificare admin ───────────────────────────────────────
export async function emailDisputeOpenedAdmin(adminEmail: string, reporterName: string, reporterRole: 'brand' | 'influencer', campaignTitle: string, collabId: string, reason: string) {
  return sendEmail(adminEmail, `⚠️ Dispută nouă — ${campaignTitle}`, baseTemplate(`
    <h1>⚠️ Dispută nouă deschisă</h1>
    <p><strong>${reporterName}</strong> (${reporterRole === 'brand' ? 'Brand' : 'Influencer'}) a deschis o dispută pentru colaborarea pe <strong>"${campaignTitle}"</strong>.</p>

    <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:12px;padding:16px;margin:16px 0">
      <p style="margin:0;font-weight:700;color:#dc2626;font-size:13px">Motiv reclamat:</p>
      <p style="margin:8px 0 0;color:#dc2626;font-size:14px">${reason}</p>
    </div>

    <a href="${APP_URL}/admin/collaborations?id=${collabId}" class="btn">Gestionează disputa →</a>
  `))
}

// ── Dispută deschisă — confirmare pentru reclamant ────────────────────────────
export async function emailDisputeConfirmed(to: string, name: string, campaignTitle: string) {
  return sendEmail(to, `📋 Disputa ta a fost înregistrată`, baseTemplate(`
    <h1>Dispută înregistrată 📋</h1>
    <p>Salut ${name}, disputa ta pentru colaborarea pe <strong>"${campaignTitle}"</strong> a fost înregistrată și va fi analizată de echipa AddFame în maximum 48 de ore.</p>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;margin:16px 0">
      <p style="margin:0;font-size:14px;color:#1d4ed8">⏳ Ce urmează:</p>
      <p style="margin:8px 0 0;font-size:13px;color:#374151">1. Echipa noastră analizează situația în max 48h</p>
      <p style="margin:4px 0 0;font-size:13px;color:#374151">2. Vei fi contactat prin email cu decizia finală</p>
      <p style="margin:4px 0 0;font-size:13px;color:#374151">3. Plata rămâne blocată în escrow până la rezolvare</p>
    </div>

    <p style="font-size:13px;color:#9ca3af">Ai întrebări urgente? Scrie-ne la <a href="mailto:contact@addfame.ro" style="color:#f97316">contact@addfame.ro</a></p>
  `))
}

// ── Dispută rezolvată ─────────────────────────────────────────────────────────
export async function emailDisputeResolved(to: string, name: string, campaignTitle: string, decision: string, inFavorOf: boolean) {
  return sendEmail(to, `✅ Disputa pentru "${campaignTitle}" a fost rezolvată`, baseTemplate(`
    <h1>${inFavorOf ? '✅ Dispută rezolvată în favoarea ta' : 'ℹ️ Dispută rezolvată'}</h1>
    <p>Salut ${name}, echipa AddFame a finalizat analiza disputei pentru <strong>"${campaignTitle}"</strong>.</p>

    <div style="background:${inFavorOf ? '#f0fdf4' : '#f9fafb'};border:1px solid ${inFavorOf ? '#bbf7d0' : '#f0f0f0'};border-radius:12px;padding:16px;margin:16px 0">
      <p style="margin:0;font-weight:700;font-size:13px;color:${inFavorOf ? '#15803d' : '#111'}">Decizie:</p>
      <p style="margin:8px 0 0;font-size:14px;color:#374151">${decision}</p>
    </div>

    <a href="${APP_URL}/influencer/wallet" class="btn">Mergi la Wallet →</a>
    <p style="font-size:13px;color:#9ca3af;margin-top:12px">Dacă ai nelămuriri, contactează-ne la <a href="mailto:contact@addfame.ro" style="color:#f97316">contact@addfame.ro</a></p>
  `))
}

// ── Identity verificată (influencer) ─────────────────────────────────────────
export async function emailIdentityVerified(to: string, name: string) {
  return sendEmail(to, '🛡️ Identitatea ta a fost verificată', baseTemplate(`
    <h1>Identitate verificată! 🛡️</h1>
    <p>Salut ${name}, identitatea ta a fost verificată cu succes pe AddFame.</p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:20px;margin:20px 0">
      <p style="margin:0 0 8px;font-weight:800;color:#16a34a;font-size:14px">✅ Ce ai deblocat:</p>
      <p style="margin:0 0 6px;font-size:14px;color:#374151">🚀 Poți aplica la orice campanie pe platformă</p>
      <p style="margin:0 0 6px;font-size:14px;color:#374151">🛡️ Insigna "Verificat" apare pe profilul tău public</p>
      <p style="margin:0;font-size:14px;color:#374151">💰 Plățile sunt procesate fără restricții</p>
    </div>

    <a href="${APP_URL}/influencer/campaigns" class="btn">Caută campanii →</a>
  `))
}

// ── Identity respinsă (influencer) ───────────────────────────────────────────
export async function emailIdentityRejected(to: string, name: string, reason: string) {
  return sendEmail(to, '❌ Verificarea identității nu a putut fi finalizată', baseTemplate(`
    <h1>Verificare identitate respinsă</h1>
    <p>Salut ${name}, din păcate nu am putut verifica identitatea ta pe baza documentelor trimise.</p>

    <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:12px;padding:16px;margin:16px 0">
      <p style="margin:0;font-weight:700;color:#dc2626;font-size:13px">Motiv:</p>
      <p style="margin:8px 0 0;color:#dc2626;font-size:14px">${reason}</p>
    </div>

    <p>Poți reîncerca oricând din secțiunea Setări → Verificare identitate.</p>
    <a href="${APP_URL}/influencer/verify" class="btn">Reîncearcă verificarea →</a>
  `))
}
