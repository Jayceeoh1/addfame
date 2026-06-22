import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'
const FROM_EMAIL = process.env.FROM_EMAIL || 'AddFame <noreply@addfame.ro>'
const RESEND_API_KEY = process.env.RESEND_API_KEY!

async function getAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: adminRow } = await admin.from('admins').select('role').eq('user_id', user.id).single()
  if (!adminRow) return null
  return { admin, adminRow }
}

// ── Shared components ────────────────────────────────────────────────────────
const HEADER = (subtitle: string) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#f97316 0%,#ec4899 50%,#8b5cf6 100%);border-radius:20px 20px 0 0">
    <tr><td style="padding:24px 32px 12px">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle;padding-right:10px">
          <img src="${APP_URL}/logo.png" alt="AddFame" width="36" height="36" style="border-radius:10px;background:#ffffff30;padding:4px;display:block" />
        </td>
        <td style="vertical-align:middle">
          <span style="color:white;font-weight:900;font-size:20px">AddFame</span>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:8px 32px 28px">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff15;border-radius:16px;border:1px solid #ffffff25">
        <tr><td style="padding:20px 24px">
          <p style="color:#ffffffb0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 6px">Platforma #1 Influencer Marketing România</p>
          <p style="color:white;font-size:18px;font-weight:900;margin:0;line-height:1.3">${subtitle}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>`

const STATS_BRAND = () => `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1.5px solid #f0f0f0;border-radius:16px;overflow:hidden">
    <tr>
      <td width="33%" style="padding:16px 8px;text-align:center;background:#ffffff;border-right:1.5px solid #f0f0f0">
        <div style="font-size:20px;margin-bottom:4px">🌟</div>
        <div style="font-size:18px;font-weight:900;color:#111">500+</div>
        <div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase">Influenceri</div>
      </td>
      <td width="33%" style="padding:16px 8px;text-align:center;background:#fafafa;border-right:1.5px solid #f0f0f0">
        <div style="font-size:20px;margin-bottom:4px">💰</div>
        <div style="font-size:18px;font-weight:900;color:#111">15%</div>
        <div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase">Comision</div>
      </td>
      <td width="33%" style="padding:16px 8px;text-align:center;background:#ffffff">
        <div style="font-size:20px;margin-bottom:4px">🆓</div>
        <div style="font-size:18px;font-weight:900;color:#111">0 RON</div>
        <div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase">Înregistrare</div>
      </td>
    </tr>
  </table>`

const STATS_INF = () => `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1.5px solid #f0f0f0;border-radius:16px;overflow:hidden">
    <tr>
      <td width="33%" style="padding:16px 8px;text-align:center;background:#ffffff;border-right:1.5px solid #f0f0f0">
        <div style="font-size:20px;margin-bottom:4px">🏷️</div>
        <div style="font-size:18px;font-weight:900;color:#111">50+</div>
        <div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase">Branduri active</div>
      </td>
      <td width="33%" style="padding:16px 8px;text-align:center;background:#fafafa;border-right:1.5px solid #f0f0f0">
        <div style="font-size:20px;margin-bottom:4px">💸</div>
        <div style="font-size:18px;font-weight:900;color:#111">85%</div>
        <div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase">Câștigul tău</div>
      </td>
      <td width="33%" style="padding:16px 8px;text-align:center;background:#ffffff">
        <div style="font-size:20px;margin-bottom:4px">🆓</div>
        <div style="font-size:18px;font-weight:900;color:#111">0 RON</div>
        <div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase">Înregistrare</div>
      </td>
    </tr>
  </table>`

const SOCIAL_FOOTER = () => `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-top:1px solid #f0f0f0;border-radius:0 0 20px 20px">
    <tr><td style="padding:20px 32px;text-align:center">
      <p style="font-size:12px;color:#9ca3af;font-weight:600;margin:0 0 12px">Urmărește-ne pe</p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto"><tr>
        <td style="padding-right:10px">
          <a href="https://www.instagram.com/addfame.ro/" style="display:inline-block;padding:8px 18px;background:#f97316;border-radius:20px;text-decoration:none;color:white;font-size:12px;font-weight:700">📸 Instagram</a>
        </td>
        <td>
          <a href="https://www.tiktok.com/@addfame.ro" style="display:inline-block;padding:8px 18px;background:#111111;border-radius:20px;text-decoration:none;color:white;font-size:12px;font-weight:700">🎵 TikTok</a>
        </td>
      </tr></table>
      <p style="font-size:11px;color:#d1d5db;margin:14px 0 0">
        © ${new Date().getFullYear()} AddFame &nbsp;·&nbsp;
        <a href="${APP_URL}" style="color:#d1d5db;text-decoration:none">addfame.ro</a>
        &nbsp;·&nbsp;
        <a href="${APP_URL}/unsubscribe" style="color:#d1d5db;text-decoration:none">Dezabonare</a>
      </p>
    </td></tr>
  </table>`

const WRAPPER = (content: string) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="font-family:'Helvetica Neue',Arial,sans-serif;background:#f5f5f5;padding:40px 20px">
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1.5px solid #f0f0f0">
        <tr><td>${content}</td></tr>
      </table>
    </td></tr>
  </table>`

// ── Brand Templates ──────────────────────────────────────────────────────────
const BRAND_TEMPLATES: Record<string, Record<string, { subject: string; html: (d: any) => string }>> = {
  promo: {
    ro: {
      subject: `🎁 3 influenceri GRATUIT pentru {name} — ofertă de lansare AddFame`,
      html: (d) => WRAPPER(`
        ${HEADER('AddFame.ro — Platforma de influencer marketing din România 🚀')}
        <div style="padding:32px">
          <h1 style="font-size:22px;font-weight:900;margin:0 0 16px;color:#111">Bună ziua${d.contactName ? `, ${d.contactName}` : ''}! 👋</h1>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 14px">Mă numesc Ciprian și tocmai am lansat <strong>addfame.ro</strong> — o platformă românească de influencer marketing, proaspăt lansată în 2026. Am dat peste <strong>${d.companyName || 'compania voastră'}</strong> și ne-am gândit imediat că v-ar prinde bine o colaborare cu noi. 😊</p>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 14px">Avem deja peste <strong>700 de influenceri micro și macro</strong> înscriși în baza noastră de date, verificați și activi, din toate nișele — și asta în mai puțin de 3 luni de la lansare. Iar voi ați putea fi printre primele branduri cu care colaborăm — ceea ce înseamnă <strong>atenție maximă din partea noastră</strong> și o relație pe termen lung. 😎</p>

          <div style="background:linear-gradient(135deg,#fff7ed,#fdf2f8);border-radius:14px;padding:20px;margin:0 0 20px;border:1.5px solid #fed7aa">
            <p style="margin:0 0 10px;font-size:16px;font-weight:900;color:#111">Ce facem noi pentru voi, de la A la Z:</p>
            ${[
              ['🎯', 'Selectăm influencerii potriviți pentru brandul vostru'],
              ['📋', 'Ne ocupăm de brief, contracte și comunicare'],
              ['📊', 'Monitorizăm postările, engagement-ul și rezultatele'],
              ['✅', 'Voi nu faceți nimic — noi gestionăm tot procesul'],
            ].map(([icon, text]) => `
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                <span style="font-size:18px">${icon}</span>
                <span style="font-size:14px;color:#374151">${text}</span>
              </div>`).join('')}
          </div>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1.5px solid #f0f0f0;border-radius:16px;overflow:hidden">
            <tr>
              <td width="50%" style="padding:16px 8px;text-align:center;background:#ffffff;border-right:1.5px solid #f0f0f0">
                <div style="font-size:20px;margin-bottom:4px">🎁</div>
                <div style="font-size:13px;font-weight:900;color:#111">Campanii Barter</div>
                <div style="font-size:12px;color:#6b7280;margin-top:4px">Influencerii primesc produse de la voi. Fără costuri cash — doar produse.</div>
              </td>
              <td width="50%" style="padding:16px 8px;text-align:center;background:#fafafa">
                <div style="font-size:20px;margin-bottom:4px">💪</div>
                <div style="font-size:13px;font-weight:900;color:#111">Campanii Paid</div>
                <div style="font-size:12px;color:#6b7280;margin-top:4px">Campanii plătite pentru reach maxim și rezultate garantate.</div>
              </td>
            </tr>
          </table>

          <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:14px;padding:20px;margin:0 0 24px;border:1.5px solid #bbf7d0;text-align:center">
            <p style="margin:0;font-size:18px;font-weight:900;color:#111">🎉 Ofertă de lansare</p>
            <p style="margin:8px 0 0;font-size:14px;color:#374151">La prima campanie creată pe platformă, <strong>primii 3 influenceri sunt GRATUIT</strong> — nu plătiți comision de administrare pentru ei. Suportați doar eventualul produs pentru barter, dacă alegeți acest tip de campanie.</p>
          </div>

          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 24px;text-align:center;font-weight:700">Am fi super încântați să vă avem printre primii noștri parteneri și să construim împreună ceva mișto. 🙌</p>

          <div style="text-align:center;margin:0 0 16px">
            <a href="${APP_URL}/auth/register" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#f97316,#ec4899);color:white;text-decoration:none;border-radius:14px;font-weight:900;font-size:15px">📩 Înregistrează-te gratuit pe addfame.ro →</a>
          </div>
          <div style="text-align:center;margin:0 0 24px">
            <a href="https://calendly.com/ciprian-addfame/30min" style="display:inline-block;padding:14px 32px;background:#f0fdf4;color:#15803d;text-decoration:none;border-radius:14px;font-weight:900;font-size:14px;border:2px solid #bbf7d0">📅 Rezervă un call gratuit de 30 min →</a>
          </div>

          <div style="background:#f9fafb;border-radius:14px;padding:18px;border:1.5px solid #f0f0f0">
            <p style="margin:0 0 8px;font-size:13px;color:#555;text-align:center">Sau răspunde direct la acest email — suntem bucuroși să discutăm.</p>
            <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center">
              <a href="mailto:ciprian@addfame.ro" style="color:#f97316;font-weight:700">ciprian@addfame.ro</a>
            </p>
          </div>
          <p style="font-size:14px;color:#888;text-align:center;margin:20px 0 0">Cu drag,<br/><strong>Ciprian | AddFame.ro</strong><br/>
          <span style="font-size:12px">🌐 addfame.ro &nbsp;·&nbsp; ✉️ ciprian@addfame.ro</span></p>
        </div>
        ${SOCIAL_FOOTER()}`),
    },
    en: {
      subject: `\u{1F381} 3 FREE influencers for your next campaign`,
      html: (d) => WRAPPER(`
        ${HEADER('3 FREE influencers 🎁')}
        <div style="padding:32px">
          <h1 style="font-size:22px;font-weight:900;margin:0 0 16px;color:#111">Hi${d.contactName ? ` ${d.contactName}` : ''} from <strong>${d.companyName || 'your team'}</strong>!</h1>
          <div style="background:linear-gradient(135deg,#fff7ed,#fdf2f8);border-radius:14px;padding:20px;margin:0 0 20px;border:1.5px solid #fed7aa;text-align:center">
            <p style="margin:0;font-size:18px;font-weight:900;color:#111">🎁 We're offering <span style="color:#f97316">3 FREE influencers</span></p>
            <p style="margin:6px 0 0;font-size:14px;color:#555">for your next campaign!</p>
          </div>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 14px">We're <strong>AddFame.ro</strong>, a 100% Romanian influencer marketing agency. Our mission is to make influencer marketing the most affordable and effective promotion channel for Romanian brands.</p>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 20px">🚀 In our first 2 months we gathered over <strong>700 micro-influencers</strong> and successfully completed <strong>15 campaigns</strong>.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1.5px solid #f0f0f0;border-radius:16px;overflow:hidden">
            <tr>
              <td width="50%" style="padding:16px 8px;text-align:center;background:#ffffff;border-right:1.5px solid #f0f0f0">
                <div style="font-size:20px;margin-bottom:4px">🌟</div>
                <div style="font-size:18px;font-weight:900;color:#111">700+</div>
                <div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase">Influencers</div>
              </td>
              <td width="50%" style="padding:16px 8px;text-align:center;background:#fafafa">
                <div style="font-size:20px;margin-bottom:4px">🎯</div>
                <div style="font-size:18px;font-weight:900;color:#111">15</div>
                <div style="font-size:11px;color:#9ca3af;font-weight:600;text-transform:uppercase">Campaigns done</div>
              </td>
            </tr>
          </table>
          <div style="text-align:center;margin:20px 0 24px">
            <a href="${APP_URL}/auth/register" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#f97316,#ec4899);color:white;text-decoration:none;border-radius:14px;font-weight:900;font-size:15px">📩 Sign up on AddFame.ro →</a>
          </div>
          <div style="background:#f9fafb;border-radius:14px;padding:18px;border:1.5px solid #f0f0f0">
            <p style="margin:0 0 8px;font-size:13px;color:#555;text-align:center">Or just reply to this email — happy to set up a quick <strong>Teams call</strong> if you prefer.</p>
            <p style="margin:0;font-size:13px;color:#555;text-align:center">
              <a href="mailto:ciprian@addfame.ro" style="color:#f97316;font-weight:700">ciprian@addfame.ro</a>
              &nbsp;·&nbsp;
              <a href="mailto:cristiana@addfame.ro" style="color:#f97316;font-weight:700">cristiana@addfame.ro</a>
            </p>
          </div>
          <p style="font-size:14px;color:#888;text-align:center;margin:20px 0 0">Best,<br/><strong>The AddFame Team</strong></p>
        </div>
        ${SOCIAL_FOOTER()}`),
    },
  },
  invite: {
    ro: {
      subject: `O platformă românească vrea să îți aducă clienți noi prin influenceri`,
      html: (d) => WRAPPER(`
        ${HEADER('Bună ziua de la AddFame 👋')}
        <div style="padding:32px">
          <h1 style="font-size:22px;font-weight:900;margin:0 0 16px;color:#111">Bună${d.contactName ? `, ${d.contactName}` : ''}!</h1>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 14px">Suntem <strong>AddFame</strong> — o platformă românească la început de drum, construită special pentru branduri și influenceri din România.</p>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 14px">Nu suntem o corporație. Suntem o echipă mică, pasionată, care vrea să facă influencer marketing-ul <strong>accesibil, corect și transparent</strong> — de la branduri mici până la cele mari.</p>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 20px">Tocmai am lansat și vrem să creștem împreună cu primii noștri parteneri. De aceea îți oferim <strong>0% comision la primele 3 colaborări</strong> — vrem să demonstrăm că merităm încrederea ta înainte să cerem ceva în schimb.</p>
          ${STATS_BRAND()}
          <div style="background:#fff7ed;border-radius:14px;padding:20px;margin:0 0 24px;border:1.5px solid #fed7aa">
            <p style="font-weight:900;color:#111;margin:0 0 10px;font-size:14px">Pe AddFame găsești:</p>
            <p style="margin:0 0 7px;font-size:13px;color:#555">✅ <strong>Influenceri verificați</strong> — identitate și statistici reale, nu followeri cumpărați</p>
            <p style="margin:0 0 7px;font-size:13px;color:#555">✅ <strong>Escrow sigur</strong> — banii tăi sunt protejați, plătești doar când ești mulțumit</p>
            <p style="margin:0 0 7px;font-size:13px;color:#555">✅ <strong>Contracte digitale</strong> — totul legal, totul transparent</p>
            <p style="margin:0;font-size:13px;color:#555">✅ <strong>Suport real</strong> — nu vorbești cu un bot, vorbești cu noi</p>
          </div>
          <div style="text-align:center;margin:0 0 20px">
            <a href="${APP_URL}/auth/register" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#f97316,#ec4899);color:white;text-decoration:none;border-radius:14px;font-weight:900;font-size:15px">Hai să încercăm împreună →</a>
          </div>
          <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0">Răspunde direct la acest email — suntem bucuroși să discutăm. <a href="mailto:ciprian@addfame.ro" style="color:#f97316;font-weight:700">ciprian@addfame.ro</a></p>
        </div>
        ${SOCIAL_FOOTER()}`),
    },
    en: {
      subject: `A Romanian startup wants to help you grow through influencers`,
      html: (d) => WRAPPER(`
        ${HEADER('Hello from AddFame 👋')}
        <div style="padding:32px">
          <h1 style="font-size:22px;font-weight:900;margin:0 0 16px;color:#111">Hi${d.contactName ? ` ${d.contactName}` : ''}!</h1>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 14px">We're <strong>AddFame</strong> — a Romanian startup just launched, built specifically for brands and influencers in Romania.</p>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 14px">We're not a corporation. We're a small, passionate team that wants to make influencer marketing <strong>accessible, fair, and transparent</strong> for everyone.</p>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 20px">We just launched and want to grow together with our first partners. That's why we're offering <strong>0% commission on your first 3 collaborations</strong> — we want to earn your trust before asking anything in return.</p>
          ${STATS_BRAND()}
          <div style="text-align:center;margin:0 0 20px">
            <a href="${APP_URL}/auth/register" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#f97316,#ec4899);color:white;text-decoration:none;border-radius:14px;font-weight:900;font-size:15px">Let's grow together →</a>
          </div>
          <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0">Reply directly to this email — we'd love to chat. <a href="mailto:ciprian@addfame.ro" style="color:#f97316;font-weight:700">ciprian@addfame.ro</a></p>
        </div>
        ${SOCIAL_FOOTER()}`),
    },
  },
  presentation: {
    ro: {
      subject: `Cum funcționează AddFame — platformă românească de influencer marketing`,
      html: (d) => WRAPPER(`
        ${HEADER('AddFame — simplu, sigur, românesc 🇷🇴')}
        <div style="padding:32px">
          <h1 style="font-size:22px;font-weight:900;margin:0 0 16px;color:#111">Cum funcționează AddFame pentru <strong>${d.companyName}</strong></h1>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 14px">Suntem o platformă românească nouă și vrem să fim transparenți cu tine: nu avem sute de mii de utilizatori (încă). Dar avem ceva mai valoros — <strong>atenție personală și influenceri verificați real.</strong></p>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 20px">Iată cum funcționează în 4 pași simpli:</p>
          <div style="background:#f5f3ff;border-radius:14px;padding:20px;margin:0 0 20px;border:1.5px solid #e9d5ff">
            ${['Creezi o campanie în 5 minute — noi te ajutăm dacă ai nevoie','Influencerii relevanți aplică sau îi inviți tu direct','Aprobi conținutul înainte de publicare — controlul e al tău','Plătești doar după livrare — banii sunt în escrow până atunci'].map((s, i) => `
            <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:${i < 3 ? '12px' : '0'}">
              <div style="min-width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#f97316,#ec4899);color:white;font-weight:900;font-size:13px;text-align:center;line-height:26px">${i + 1}</div>
              <p style="margin:0;font-size:13px;color:#555;padding-top:4px">${s}</p>
            </div>`).join('')}
          </div>
          ${STATS_BRAND()}
          <div style="text-align:center;margin:0 0 20px">
            <a href="${APP_URL}/auth/register" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#f97316,#ec4899);color:white;text-decoration:none;border-radius:14px;font-weight:900;font-size:15px">Încearcă gratuit →</a>
          </div>
          <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0">Ai întrebări? Răspunde la acest email — suntem oameni reali. <a href="mailto:ciprian@addfame.ro" style="color:#f97316;font-weight:700">ciprian@addfame.ro</a></p>
        </div>
        ${SOCIAL_FOOTER()}`),
    },
    en: {
      subject: `How influencer marketing works through AddFame`,
      html: (d) => WRAPPER(`
        ${HEADER('AddFame Platform Presentation 📊')}
        <div style="padding:32px">
          <h1 style="font-size:22px;font-weight:900;margin:0 0 12px;color:#111">Presentation for <strong>${d.companyName}</strong></h1>
          ${STATS_BRAND()}
          <div style="text-align:center">
            <a href="${APP_URL}/auth/register" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#f97316,#ec4899);color:white;text-decoration:none;border-radius:14px;font-weight:900;font-size:15px">Start for free →</a>
          </div>
        </div>
        ${SOCIAL_FOOTER()}`),
    },
  },
  followup: {
    ro: {
      subject: `Te-ai înregistrat pe AddFame — mai faci un pas mic? 🙏`,
      html: (d) => WRAPPER(`
        ${HEADER('Un pas mic, rezultate reale 🎯')}
        <div style="padding:32px">
          <h1 style="font-size:22px;font-weight:900;margin:0 0 16px;color:#111">Bună${d.contactName ? `, ${d.contactName}` : ''}!</h1>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 14px">Ai creat cont pe AddFame — îți mulțumim că ne-ai acordat încredere! Știm că ești ocupat și poate nu ai găsit momentul potrivit să lansezi o campanie.</p>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 20px">Vrem să te ajutăm. <strong>Dacă îți trimiți brief-ul pe email</strong>, noi configurăm prima campanie pentru tine gratuit — îți luăm noi grija de setup.</p>
          <div style="background:#fff7ed;border-radius:14px;padding:16px 20px;margin:0 0 20px;border-left:4px solid #f97316">
            <p style="font-weight:900;color:#ea580c;margin:0 0 6px;font-size:14px">💡 Sfat de la noi:</p>
            <p style="margin:0;font-size:13px;color:#555">Începe cu un buget mic — <strong>500-1.000 RON</strong> și 2-3 micro-influenceri. Rezultatele vin și poți scala oricând.</p>
          </div>
          <div style="text-align:center;margin:0 0 12px">
            <a href="${APP_URL}/brand/campaigns/new" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#f97316,#ec4899);color:white;text-decoration:none;border-radius:14px;font-weight:900;font-size:15px">Lansez prima campanie →</a>
          </div>
          <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0">Sau răspunde la acest email și te ajutăm noi. Promitem că suntem rapizi 😊</p>
        </div>
        ${SOCIAL_FOOTER()}`),
    },
    en: {
      subject: `You haven't launched a campaign yet on AddFame 🚀`,
      html: (d) => WRAPPER(`
        ${HEADER('Your first campaign is waiting! 🎯')}
        <div style="padding:32px">
          <h1 style="font-size:22px;font-weight:900;margin:0 0 12px;color:#111">Hi${d.contactName ? ` ${d.contactName}` : ''}! 👋</h1>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 20px">You created an AddFame account but haven't launched a campaign yet. It only takes <strong>5 minutes</strong>!</p>
          <div style="text-align:center">
            <a href="${APP_URL}/brand/campaigns/new" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#f97316,#ec4899);color:white;text-decoration:none;border-radius:14px;font-weight:900;font-size:15px">Launch first campaign →</a>
          </div>
        </div>
        ${SOCIAL_FOOTER()}`),
    },
  },
}

// ── Influencer Templates ─────────────────────────────────────────────────────
const INF_TEMPLATES: Record<string, Record<string, { subject: string; html: (d: any) => string }>> = {
  invite_inf: {
    ro: {
      subject: `Bună ${'{name}'}, am văzut conținutul tău și vrem să colaborăm 🙌`,
      html: (d) => WRAPPER(`
        ${HEADER('Conținutul tău merită colaborări mai bune 🌟')}
        <div style="padding:32px">
          <h1 style="font-size:22px;font-weight:900;margin:0 0 16px;color:#111">Bună${d.contactName ? `, ${d.contactName}` : ''}!</h1>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 14px">Suntem <strong>AddFame</strong> — o platformă românească nouă care conectează influencerii cu branduri serioase din România.</p>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 14px">Am văzut conținutul tău și credem că meriți colaborări mai bune și <strong>plăți corecte</strong>. De aceea te contactăm direct, nu prin intermediari.</p>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 20px">Știm că există multe platforme care promit multe și livrează puțin. Noi suntem la început și tocmai de aceea îți putem promite: <strong>atenție personală, onestitate și plăți garantate prin escrow.</strong></p>
          ${STATS_INF()}
          <div style="background:#f0fdf4;border-radius:14px;padding:20px;margin:0 0 24px;border:1.5px solid #bbf7d0">
            <p style="font-weight:900;color:#111;margin:0 0 10px;font-size:14px">Ce e diferit la AddFame:</p>
            <p style="margin:0 0 7px;font-size:13px;color:#555">🎯 Primești doar campanii <strong>potrivite pentru nișa ta</strong> — nu spam</p>
            <p style="margin:0 0 7px;font-size:13px;color:#555">💰 <strong>Banii sunt garantați</strong> prin escrow — brandul plătește înainte</p>
            <p style="margin:0 0 7px;font-size:13px;color:#555">📄 <strong>Contract digital</strong> la fiecare colaborare — ești protejat legal</p>
            <p style="margin:0;font-size:13px;color:#555">🤝 <strong>Nu îți cerem nimic</strong> până nu câștigi ceva — înregistrare 100% gratuită</p>
          </div>
          <div style="text-align:center;margin:0 0 20px">
            <a href="${APP_URL}/auth/register" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#f97316,#ec4899);color:white;text-decoration:none;border-radius:14px;font-weight:900;font-size:15px">Hai să colaborăm →</a>
          </div>
          <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0">Răspunde direct la acest email cu orice întrebare. <a href="mailto:ciprian@addfame.ro" style="color:#f97316;font-weight:700">ciprian@addfame.ro</a></p>
        </div>
        ${SOCIAL_FOOTER()}`),
    },
    en: {
      subject: `${'{name}'}, brands are looking for you on AddFame 🌟`,
      html: (d) => WRAPPER(`
        ${HEADER('Earn money from your content 💸')}
        <div style="padding:32px">
          <h1 style="font-size:22px;font-weight:900;margin:0 0 12px;color:#111">Hi${d.contactName ? ` ${d.contactName}` : ''}! 👋</h1>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 14px">We're reaching out from <strong>AddFame</strong> — the platform connecting Romanian influencers with serious brands that pay fairly.</p>
          ${STATS_INF()}
          <div style="text-align:center;margin:0 0 20px">
            <a href="${APP_URL}/auth/register" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#f97316,#ec4899);color:white;text-decoration:none;border-radius:14px;font-weight:900;font-size:15px">Register for free →</a>
          </div>
        </div>
        ${SOCIAL_FOOTER()}`),
    },
  },
  tips_inf: {
    ro: {
      subject: `5 sfaturi să câștigi mai mult ca influencer în 2026 💡`,
      html: (d) => WRAPPER(`
        ${HEADER('Crește-ți veniturile ca creator 📈')}
        <div style="padding:32px">
          <h1 style="font-size:22px;font-weight:900;margin:0 0 12px;color:#111">Bună${d.contactName ? `, ${d.contactName}` : ''}! 💡</h1>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 20px">Influencer marketing-ul e în plină creștere în România. Iată 5 sfaturi practice să câștigi mai mult:</p>
          ${[
            ['🎯', 'Stabilește-ți prețurile clar', 'Story: 50-200 RON, Reel: 100-500 RON, Post: 80-300 RON — în funcție de followeri'],
            ['📊', 'Îmbunătățește-ți ER-ul', 'Engagement Rate > 3% te face mai atractiv pentru branduri decât numărul de followeri'],
            ['🤝', 'Construiește relații pe termen lung', 'Un brand mulțumit revine — tratează fiecare colaborare ca pe un interviu'],
            ['📸', 'Diversifică platformele', 'Prezență pe Instagram + TikTok dublează șansele de colaborare'],
            ['✅', 'Verifică-ți identitatea', 'Influencerii verificați pe AddFame primesc cu 40% mai multe oferte'],
          ].map(([icon, title, desc]) => `
            <div style="display:flex;gap:12px;margin-bottom:16px">
              <div style="font-size:24px;min-width:32px">${icon}</div>
              <div>
                <p style="font-weight:900;color:#111;margin:0 0 4px;font-size:14px">${title}</p>
                <p style="font-size:13px;color:#555;margin:0">${desc}</p>
              </div>
            </div>`).join('')}
          <div style="text-align:center;margin:20px 0">
            <a href="${APP_URL}/auth/register" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#f97316,#ec4899);color:white;text-decoration:none;border-radius:14px;font-weight:900;font-size:15px">Încearcă AddFame gratuit →</a>
          </div>
        </div>
        ${SOCIAL_FOOTER()}`),
    },
    en: {
      subject: `5 tips to earn more as an influencer in 2026 💡`,
      html: (d) => WRAPPER(`
        ${HEADER('Grow your creator income 📈')}
        <div style="padding:32px">
          <h1 style="font-size:22px;font-weight:900;margin:0 0 12px;color:#111">Hi${d.contactName ? ` ${d.contactName}` : ''}! 💡</h1>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 20px">Influencer marketing is booming in Romania. Here are 5 practical tips to earn more:</p>
          <div style="text-align:center;margin:20px 0">
            <a href="${APP_URL}/auth/register" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#f97316,#ec4899);color:white;text-decoration:none;border-radius:14px;font-weight:900;font-size:15px">Try AddFame for free →</a>
          </div>
        </div>
        ${SOCIAL_FOOTER()}`),
    },
  },
  followup_inf: {
    ro: {
      subject: `${'{name}'}, ești aproape — mai faci un mic pas pe AddFame? 🙏`,
      html: (d) => WRAPPER(`
        ${HEADER('Ești la un pas de prima colaborare! 🚀')}
        <div style="padding:32px">
          <h1 style="font-size:22px;font-weight:900;margin:0 0 16px;color:#111">Bună${d.contactName ? `, ${d.contactName}` : ''}!</h1>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 14px">Îți mulțumim că te-ai înregistrat pe AddFame! Dar am observat că profilul tău nu e complet încă.</p>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 20px">Înțelegem — ești ocupat și poate pare complicat. Dar îți promitem că <strong>durează maxim 5 minute</strong> și după aia brandurile te pot găsi și contacta direct.</p>
          <div style="background:#fff7ed;border-radius:14px;padding:16px 20px;margin:0 0 20px;border-left:4px solid #f97316">
            <p style="font-weight:900;color:#ea580c;margin:0 0 8px;font-size:14px">📋 Trei lucruri mici de făcut:</p>
            <p style="margin:0 0 6px;font-size:13px;color:#555">1. Adaugă linkul de Instagram sau TikTok</p>
            <p style="margin:0 0 6px;font-size:13px;color:#555">2. Bifează nișa ta (Fashion, Beauty, Food etc)</p>
            <p style="margin:0;font-size:13px;color:#555">3. Adaugă o poză și câteva rânduri despre tine</p>
          </div>
          <div style="text-align:center;margin:0 0 12px">
            <a href="${APP_URL}/influencer/profile" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#f97316,#ec4899);color:white;text-decoration:none;border-radius:14px;font-weight:900;font-size:15px">Completez acum →</a>
          </div>
          <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0">Dacă ai nevoie de ajutor, răspunde la acest email. Suntem bucuroși să te ajutăm 😊</p>
        </div>
        ${SOCIAL_FOOTER()}`),
    },
    en: {
      subject: `${'{name}'}, you registered on AddFame but your profile is incomplete`,
      html: (d) => WRAPPER(`
        ${HEADER('Complete your profile and get offers! 🚀')}
        <div style="padding:32px">
          <h1 style="font-size:22px;font-weight:900;margin:0 0 12px;color:#111">Hi${d.contactName ? ` ${d.contactName}` : ''}! 👋</h1>
          <p style="font-size:15px;line-height:1.6;color:#555;margin:0 0 20px">You registered on AddFame but your profile is incomplete. Brands can't find you without a complete profile!</p>
          <div style="text-align:center">
            <a href="${APP_URL}/influencer/profile" style="display:inline-block;padding:16px 36px;background:linear-gradient(135deg,#f97316,#ec4899);color:white;text-decoration:none;border-radius:14px;font-weight:900;font-size:15px">Complete profile →</a>
          </div>
        </div>
        ${SOCIAL_FOOTER()}`),
    },
  },
}

// ── Routes ───────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const ctx = await getAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const type = searchParams.get('type') || 'brand'
  const table = type === 'influencer' ? 'outreach_influencer_leads' : 'outreach_leads'

  let allData: any[] = []
  let from = 0
  const pageSize = 1000
  while (true) {
    let query = ctx.admin.from(table).select('*').order('created_at', { ascending: false }).range(from, from + pageSize - 1)
    if (status && status !== 'all') query = query.eq('status', status)
    const { data } = await query
    if (!data || data.length === 0) break
    allData = [...allData, ...data]
    if (data.length < pageSize) break
    from += pageSize
  }
  return NextResponse.json({ leads: allData })
}

export async function POST(req: NextRequest) {
  const ctx = await getAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const type = body.type || 'brand'
  const table = type === 'influencer' ? 'outreach_influencer_leads' : 'outreach_leads'
  const templates = type === 'influencer' ? INF_TEMPLATES : BRAND_TEMPLATES

  if (body.action === 'send') {
    const { lead_ids, template, language, custom_subject, custom_html } = body
    if (!lead_ids?.length) return NextResponse.json({ error: 'No leads selected' }, { status: 400 })
    const { data: leads } = await ctx.admin.from(table).select('*').in('id', lead_ids)
    if (!leads?.length) return NextResponse.json({ error: 'Leads not found' }, { status: 404 })

    const results = []
    for (const lead of leads) {
      const lang = language || lead.language || 'ro'
      const name = type === 'influencer' ? lead.full_name : lead.company_name
      const tmpl = template !== 'custom' ? templates[template]?.[lang] : null
      const subject = (custom_subject || tmpl?.subject || 'AddFame').replace('{name}', name || '')
      const html = custom_html || tmpl?.html({ companyName: name, contactName: lead.contact_name })
      if (!html) { results.push({ id: lead.id, ok: false, error: 'Invalid template' }); continue }

      try {
        // Add tracking pixel to email
        const pixelType = type === 'influencer' ? 'inf' : 'brand'
        const trackingPixel = `<img src="${APP_URL}/api/email/track?id=${lead.id}&t=${pixelType}" width="1" height="1" style="display:block;width:1px;height:1px;border:0" alt="" />`
        const htmlWithTracking = html.replace('</table>', `${trackingPixel}</table>`) || html + trackingPixel

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: FROM_EMAIL, to: lead.email, reply_to: 'ciprian@addfame.ro', subject, html: htmlWithTracking }),
        })
        const ok = res.ok
        results.push({ id: lead.id, ok })
        if (ok) {
          await ctx.admin.from(table).update({
            status: lead.status === 'new' ? 'contacted' : lead.status,
            last_contacted_at: new Date().toISOString(),
            last_template: template,
            emails_sent: (lead.emails_sent || 0) + 1,
            updated_at: new Date().toISOString(),
          }).eq('id', lead.id)
        }
      } catch (e: any) {
        results.push({ id: lead.id, ok: false, error: e.message })
      }
    }
    const sent = results.filter(r => r.ok).length
    return NextResponse.json({ success: true, sent, total: leads.length, results })
  }

  // Create lead
  if (type === 'influencer') {
    const { full_name, contact_name, email, niche, platform, followers, instagram_handle, tiktok_handle, website, language, notes } = body
    if (!full_name || !email) return NextResponse.json({ error: 'Nume și email obligatorii' }, { status: 400 })
    const { data, error } = await ctx.admin.from(table).insert({
      full_name, contact_name, email, niche, platform, followers, instagram_handle, tiktok_handle, website,
      language: language || 'ro', notes, status: 'new',
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ lead: data })
  } else {
    const { company_name, contact_name, email, industry, website, language, notes } = body
    if (!company_name || !email) return NextResponse.json({ error: 'Nume și email obligatorii' }, { status: 400 })
    const { data, error } = await ctx.admin.from(table).insert({
      company_name, contact_name, email, industry, website,
      language: language || 'ro', notes, status: 'new',
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ lead: data })
  }
}

export async function PATCH(req: NextRequest) {
  const ctx = await getAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, type, ...updates } = await req.json()
  const table = type === 'influencer' ? 'outreach_influencer_leads' : 'outreach_leads'
  await ctx.admin.from(table).update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const ctx = await getAdmin()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, type } = await req.json()
  const table = type === 'influencer' ? 'outreach_influencer_leads' : 'outreach_leads'
  await ctx.admin.from(table).delete().eq('id', id)
  return NextResponse.json({ success: true })
}