// Mementouri pentru înscrierile cu termen (campaniile cu registration_opened_at + registration_deadline_days):
//  - „mai sunt 2 zile”: creatorilor potriviți care încă n-au aplicat (o dată per campanie);
//  - „invitația expiră”: creatorilor invitați care n-au răspuns (o dată per invitație).
// Ferestrele au 24 h, ca o rulare zilnică să nu rateze nimic; marcajele (SQL 25) împiedică dublurile
// dacă ruta e apelată mai des (ex. orar din cron-job.org).

export const HOUR = 36e5

export interface RegCampaign {
  id: string
  registration_opened_at: string | null
  registration_deadline_days?: number | null
}

export function registrationExpiry(c: RegCampaign): Date | null {
  if (!c.registration_opened_at) return null
  const t = Date.parse(c.registration_opened_at)
  if (!Number.isFinite(t)) return null
  return new Date(t + (Number(c.registration_deadline_days) || 2) * 24 * HOUR)
}

/** Înscrierile se închid în (24h, 48h] → memento „mai sunt 2 zile”. */
export function inTwoDayWindow(c: RegCampaign, now = new Date()): boolean {
  const e = registrationExpiry(c)
  if (!e) return false
  const left = e.getTime() - now.getTime()
  return left > 24 * HOUR && left <= 48 * HOUR
}

/** Înscrierile se închid în următoarele 24h → memento pentru invitațiile fără răspuns. */
export function inLastDayWindow(c: RegCampaign, now = new Date()): boolean {
  const e = registrationExpiry(c)
  if (!e) return false
  const left = e.getTime() - now.getTime()
  return left > 0 && left <= 24 * HOUR
}

/** „azi la 18:00” / „mâine la 09:30” / „pe 12 octombrie, 18:00” (ora României). */
export function expiryLabel(e: Date, now = new Date()): string {
  const tz = 'Europe/Bucharest'
  const day = (d: Date) => d.toLocaleDateString('ro-RO', { timeZone: tz })
  const time = e.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', timeZone: tz })
  if (day(e) === day(now)) return `azi la ${time}`
  if (day(e) === day(new Date(now.getTime() + 24 * HOUR))) return `mâine la ${time}`
  return `pe ${e.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', timeZone: tz })}, ${time}`
}

const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function reminderEmailHtml(o: { name?: string | null; heading: string; text: string; campaignTitle: string; brandName?: string | null; when: string; ctaUrl: string; cta: string }): string {
  return `<!DOCTYPE html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f5fb;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:28px 16px">
 <div style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e7e5f3">
  <div style="background:linear-gradient(135deg,#7040f0,#e2458f);padding:24px;text-align:center"><div style="font-size:26px;font-weight:900;color:#fff">AddFame</div></div>
  <div style="padding:26px 24px">
   <h1 style="font-size:20px;color:#14123a;margin:0 0 12px">${esc(o.heading)}</h1>
   <p style="font-size:15px;color:#1f1d3a;margin:0 0 10px">Bună, <strong>${esc(o.name || 'creatorule')}</strong>!</p>
   <p style="font-size:14px;color:#4a4770;line-height:1.6;margin:0 0 18px">${esc(o.text)}</p>
   <div style="background:#f7f5ff;border:1.5px solid #e4dcff;border-radius:12px;padding:16px;margin-bottom:20px">
    <div style="font-size:17px;font-weight:900;color:#111827">${esc(o.campaignTitle)}</div>
    ${o.brandName ? `<div style="font-size:13px;color:#6b7280;margin-top:2px">de la <strong>${esc(o.brandName)}</strong></div>` : ''}
    <div style="font-size:13px;color:#b45309;font-weight:700;margin-top:10px">Se închide ${esc(o.when)}</div>
   </div>
   <div style="text-align:center;margin:22px 0"><a href="${o.ctaUrl}" style="background:#7040f0;color:#fff;text-decoration:none;font-size:15px;font-weight:800;padding:13px 28px;border-radius:12px;display:inline-block">${esc(o.cta)}</a></div>
   <p style="font-size:12px;color:#9ca3af;text-align:center;margin:18px 0 0">Poți opri aceste emailuri din Setări → Notificări.</p>
  </div>
 </div>
</div></body></html>`
}
