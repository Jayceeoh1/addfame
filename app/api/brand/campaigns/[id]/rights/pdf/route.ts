import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionUser, verifyAdminSession } from '@/lib/api-auth'
import { loadCampaignRights, canSeeCampaignRights } from '@/lib/campaign-rights'
import { RIGHTS_LABEL } from '@/lib/rights'
import { isUuid } from '@/lib/drafts'

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const ro = (iso: string) => new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' })

// Atestare de drepturi (document AddFame), gata de salvat ca PDF din browser.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) return new NextResponse('Campanie inexistentă', { status: 404 })
  const user = await getSessionUser()
  if (!user) return NextResponse.redirect(new URL('/auth/login', _req.url))
  const db = createAdminClient()
  if (!(await canSeeCampaignRights(db, user.id, id, !!(await verifyAdminSession())))) return new NextResponse('Acces interzis', { status: 403 })
  const r = await loadCampaignRights(db, id)
  if (!r) return new NextResponse('Campanie inexistentă', { status: 404 })

  const today = ro(new Date().toISOString())
  const docNo = `AD-${id.slice(0, 6).toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`
  const anyV1 = r.items.some(i => i.rights.version === 1)
  const rows = r.items.map((i, n) => `
    <tr>
      <td>${n + 1}</td>
      <td><strong>${esc(i.creator)}</strong><br><span class="muted">${esc(i.ref)}${i.product ? ` · ${esc(i.product)}` : ''}</span></td>
      <td>${ro(i.rights.signedAt)}</td>
      <td>${i.rights.organicUntil ? `până la ${ro(i.rights.organicUntil)}` : 'fără limită de timp'}</td>
      <td>${ro(i.rights.adsUntil)}</td>
      <td><span class="st st-${i.rights.state}">${RIGHTS_LABEL[i.rights.state]}</span></td>
    </tr>`).join('')

  const html = `<!DOCTYPE html><html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Atestare drepturi — ${esc(r.campaign.name)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,serif;font-size:10.5pt;color:#1a1a1a;background:#fff;padding:40px;max-width:900px;margin:0 auto}
  .header{display:flex;justify-content:space-between;gap:16px;border-bottom:3px solid #5a35e6;padding-bottom:14px;margin-bottom:22px}
  .company{font-size:9pt;color:#444;line-height:1.6}.company .name{font-family:Arial,sans-serif;font-size:13pt;font-weight:900;color:#1a1a1a}
  .doc{text-align:right;font-size:9pt;color:#666}.doc strong{color:#1a1a1a}
  h1{font-family:Arial,sans-serif;font-size:17pt;font-weight:900;margin-bottom:4px}
  .sub{font-size:10.5pt;color:#444;margin-bottom:18px}
  p{line-height:1.6;text-align:justify;margin-bottom:10px}
  .box{background:#f6f3ff;border:1px solid #ddd3fb;border-radius:8px;padding:10px 14px;margin:14px 0}
  .box .l{font-family:Arial,sans-serif;font-size:8pt;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#5a35e6;margin-bottom:4px}
  table{width:100%;border-collapse:collapse;margin:14px 0;font-size:9.5pt}
  th{font-family:Arial,sans-serif;font-size:8pt;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;text-align:left;border-bottom:1.5px solid #d1d5db;padding:6px 6px}
  td{border-bottom:1px solid #eee;padding:7px 6px;vertical-align:top}
  .muted{color:#6b7280;font-size:8.5pt}
  .st{font-family:Arial,sans-serif;font-size:8pt;font-weight:900;padding:2px 7px;border-radius:99px;white-space:nowrap}
  .st-ads{background:#dcfce7;color:#166534}.st-organic{background:#eef2ff;color:#3730a3}.st-expired{background:#f3f4f6;color:#6b7280}
  h4{font-family:Arial,sans-serif;font-size:10pt;font-weight:900;margin:16px 0 6px}
  .sign{margin-top:28px;display:flex;justify-content:space-between;gap:24px;font-size:9.5pt}
  .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:8pt;color:#9ca3af}
  .bar{position:fixed;top:16px;right:16px;display:flex;gap:8px}
  .bar button{border:none;padding:10px 16px;border-radius:10px;font-weight:800;font-size:13px;cursor:pointer}
  @media print{body{padding:16px}.bar{display:none}@page{margin:1.4cm}}
</style></head><body>
<div class="bar"><button onclick="window.print()" style="background:#5a35e6;color:#fff">Salvează ca PDF</button><button onclick="window.close()" style="background:#f1f5f9;color:#374151">Închide</button></div>
<div class="header">
  <div class="company"><div class="name">ADD FAME DIGITAL S.R.L.</div>
    <div>CUI: 54992560 · Reg. Com.: J2026040984009</div><div>Web: addfame.ro · Email: support@addfame.ro</div></div>
  <div class="doc"><div><strong>Atestare drepturi de utilizare</strong></div><div>Nr. ${esc(docNo)} / ${today}</div></div>
</div>
<h1>ATESTARE PRIVIND DREPTURILE DE UTILIZARE A ÎNREGISTRĂRILOR</h1>
<div class="sub">Campania: <strong>${esc(r.campaign.name)}</strong></div>

<div class="box"><div class="l">Beneficiarul atestării (brandul partener)</div>
  <strong>${esc(r.campaign.brand)}</strong>${r.campaign.brandCui ? ` — CUI ${esc(r.campaign.brandCui)}` : ''}${r.campaign.brandRegCom ? `, Reg. Com. ${esc(r.campaign.brandRegCom)}` : ''}</div>

<p>ADD FAME DIGITAL S.R.L., în calitate de cesionar al drepturilor patrimoniale de autor asupra înregistrărilor audio-video realizate de creatorii de conținut enumerați mai jos, în baza contractelor de cesiune semnate electronic pe platforma AddFame, atestă că <strong>${esc(r.campaign.brand)}</strong> și partenerii acestuia (distribuitori, rețele de magazine, agenții de publicitate și alte entități care promovează sau comercializează produsele brandului) pot utiliza aceste înregistrări exclusiv pentru promovarea brandului și a produselor sale, în limitele și pe duratele de mai jos.</p>

<table><thead><tr><th>#</th><th>Creator · contract</th><th>Semnat la</th><th>Folosire organică</th><th>Reclame plătite (ads) până la</th><th>Situația azi</th></tr></thead>
<tbody>${rows || '<tr><td colspan="6" class="muted">Niciun contract semnat încă pentru această campanie.</td></tr>'}</tbody></table>

<h4>Ce înseamnă</h4>
<p><strong>Folosire organică</strong> — postări pe paginile și conturile proprii ale brandului și ale partenerilor, site, newsletter, materiale de prezentare, fără promovare contra cost.</p>
<p><strong>Reclame plătite (ads)</strong> — reclame sponsorizate sau promovate contra cost pe Meta (Facebook, Instagram), TikTok, YouTube, Google sau alte platforme. După data indicată, înregistrarea nu mai poate fi promovată contra cost. Prelungirea perioadei de reclame se poate face numai prin act adițional, prin AddFame.</p>
${anyV1 ? '<p class="muted">Pentru contractele marcate „Drepturi expirate”, cesiunea a fost încheiată pe 6 luni; după această dată înregistrarea nu mai poate fi folosită în niciun mod.</p>' : ''}
<p>Creatorii își păstrează drepturile morale (calitatea de autor). Datele personale ale creatorilor nu fac obiectul acestei atestări; contractele originale sunt păstrate de ADD FAME DIGITAL S.R.L.${r.pending ? ` La data emiterii, ${r.pending} ${r.pending === 1 ? 'contract este' : 'contracte sunt'} trimise spre semnare și nu sunt incluse.` : ''}</p>

<div class="sign"><div><strong>ADD FAME DIGITAL S.R.L.</strong><br>prin Stancu Marius Ciprian, Administrator</div><div style="text-align:right">Data emiterii: ${today}<br><span class="muted">Document generat de platforma AddFame</span></div></div>
<div class="footer"><span>ADD FAME DIGITAL S.R.L. — addfame.ro</span><span>${esc(docNo)}</span></div>
</body></html>`
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}
