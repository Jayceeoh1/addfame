import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const { data: c, error } = await admin()
      .from('cesiune_contracts')
      .select('*')
      .eq('token', token)
      .single()

    if (error || !c) return NextResponse.json({ error: 'Contract negăsit' }, { status: 404 })
    if (c.status !== 'signed') return NextResponse.json({ error: 'Contractul nu este semnat' }, { status: 400 })

    const signedDate = new Date(c.signed_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    const createdDate = new Date(c.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' })
    const nr = c.contract_number ? c.contract_number : c.id.substring(0, 8).toUpperCase()

    // Bloc Autor
    const autorLine = [
      c.influencer_cnp ? `CNP ${c.influencer_cnp}` : null,
      (c.influencer_ci_serie || c.influencer_ci_numar) ? `C.I. seria ${c.influencer_ci_serie || '—'} nr. ${c.influencer_ci_numar || '—'}` : null,
    ].filter(Boolean).join(', ')

    // Bloc Brand partener (opțional)
    const brandBlock = c.brand_name ? `
<div class="campaign-box">
  <div class="label">Brand partener (advertiser)</div>
  <p><strong>${c.brand_name}</strong>${c.brand_cui ? ` — CUI ${c.brand_cui}` : ''}${c.brand_reg_com ? `, ${c.brand_reg_com}` : ''}</p>
  ${c.brand_address ? `<p>${c.brand_address}</p>` : ''}
  ${c.brand_website ? `<p>${c.brand_website}</p>` : ''}
</div>` : ''

    // Detalii campanie / produs (opțional)
    const campaignBlock = (c.campaign_title || c.product_name || c.product_value_lei) ? `
<div class="campaign-box">
  <div class="label">Detalii campanie</div>
  ${c.campaign_title ? `<p><strong>Campanie:</strong> ${c.campaign_title}</p>` : ''}
  ${c.product_name ? `<p><strong>Produs (remunerație în natură):</strong> ${c.product_name}</p>` : ''}
  ${c.product_value_lei ? `<p><strong>Valoare produs:</strong> ${Number(c.product_value_lei).toLocaleString('ro-RO')} LEI</p>` : ''}
</div>` : ''

    const brandName = c.brand_name || '[brandul partener al campaniei]'

    const html = `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8" />
<title>Contract Cesiune Drepturi de Autor - ${c.influencer_name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Georgia', serif; font-size: 11pt; color: #1a1a1a; background: #fff; padding: 40px; max-width: 820px; margin: 0 auto; }
  .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #f97316; padding-bottom: 16px; margin-bottom: 24px; }
  .company { font-size: 9pt; color: #444; line-height: 1.6; }
  .company .name { font-family: Arial, sans-serif; font-size: 13pt; font-weight: 900; color: #1a1a1a; }
  .doc-info { text-align: right; font-size: 9pt; color: #666; }
  .doc-info strong { color: #1a1a1a; }
  h1 { font-family: Arial, sans-serif; font-size: 18pt; font-weight: 900; margin-bottom: 2px; }
  .subtitle { font-size: 11pt; font-weight: 700; color: #333; margin-bottom: 22px; }
  .article { margin-bottom: 14px; }
  .article h4 { font-family: Arial, sans-serif; font-size: 10.5pt; font-weight: 900; margin-bottom: 4px; }
  .article p { font-size: 10pt; line-height: 1.6; color: #222; text-align: justify; }
  .article .sub { margin-top: 4px; padding-left: 14px; }
  .highlight { font-weight: 700; color: #f97316; }
  .campaign-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 10px 14px; margin: 14px 0; }
  .campaign-box .label { font-family: Arial, sans-serif; font-size: 8pt; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #f97316; margin-bottom: 5px; }
  .campaign-box p { font-size: 9.5pt; line-height: 1.6; }
  .signatures { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .sig-label { font-family: Arial, sans-serif; font-size: 8pt; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 6px; }
  .sig-name { font-size: 11pt; font-weight: 700; margin-bottom: 10px; }
  .sig-role { font-size: 9pt; color: #555; margin-bottom: 10px; }
  .sig-canvas { border-bottom: 1.5px solid #374151; margin-bottom: 8px; min-height: 60px; display: flex; align-items: flex-end; }
  .sig-canvas img { max-height: 70px; max-width: 100%; }
  .sig-typed { font-family: 'Brush Script MT', cursive; font-size: 20pt; color: #1e293b; padding-bottom: 4px; border-bottom: 1.5px solid #374151; margin-bottom: 8px; }
  .sig-date { font-size: 9pt; color: #6b7280; }
  .audit { background: #f8f9fb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; margin-top: 20px; font-size: 8pt; color: #6b7280; line-height: 1.7; }
  .audit strong { color: #374151; }
  .footer { margin-top: 24px; padding-top: 14px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 8pt; color: #9ca3af; }
  @media print { body { padding: 20px; } @page { margin: 1.4cm; } button { display: none !important; } }
</style>
</head>
<body>

<div class="header">
  <div class="company">
    <div class="name">ADD FAME DIGITAL S.R.L.</div>
    <div>Sediu social: Municipiul Pitești, Jud. Argeș, Bulevardul Nicolae Bălcescu, Bl. C5, Scara B, Etaj 2, Ap. 9</div>
    <div>CUI: 54992560 · Reg. Com.: J2026040984009</div>
    <div>Web: addfame.ro · Email: ciprian@addfame.ro</div>
  </div>
  <div class="doc-info">
    <div><strong>Contract cesiune drepturi de autor</strong></div>
    <div>Nr. ${nr} / ${createdDate}</div>
  </div>
</div>

<h1>CONTRACT</h1>
<div class="subtitle">DE CESIUNE A DREPTURILOR DE AUTOR NR. ${nr} / ${createdDate}</div>

<div class="article">
  <h4>Art. 1  Cedentul și Cesionarul</h4>
  <p><strong>(1)</strong> D-na / D-nul <strong>${c.influencer_name}</strong>${autorLine ? `, ${autorLine}` : ''}${c.influencer_address ? `, domiciliat(ă) în ${c.influencer_address}` : ''}, e-mail ${c.influencer_email}, în calitate de <strong>AUTOR – CEDENT</strong>, denumit în continuare în prezentul contract <strong>Autor</strong>,</p>
  <p><strong>(2)</strong> <strong>ADD FAME DIGITAL S.R.L.</strong>, cu sediul social în Municipiul Pitești, Jud. Argeș, Bulevardul Nicolae Bălcescu, Bl. C5, Scara B, Etaj 2, Ap. 9, CUI 54992560, J2026040984009, email ciprian@addfame.ro, reprezentată de Stancu Marius Ciprian, cu funcția de administrator, în calitate de <strong>BENEFICIAR – CESIONAR</strong>, denumită în continuare în prezentul contract <strong>Beneficiar</strong>,</p>
  <p>dețin calitatea de Părți ale prezentului Contract.</p>
</div>

${brandBlock}
${campaignBlock}

<div class="article">
  <h4>Art. 2  Obiectul contractului</h4>
  <p><strong>(1)</strong> Beneficiarul este o societate comercială care are ca obiect de activitate servicii de marketing de influență și publicitate (cod CAEN 7311), conectând branduri cu creatori de conținut. Anterior încheierii prezentului contract, Beneficiarul, direct sau prin intermediul brandului partener din cadrul campaniei, a oferit Autorului produsul indicat, în scopul prezentării, testării și evaluării acestuia, produs ce constituie remunerația în natură datorată Autorului pentru cesiunea drepturilor de autor ce face obiectul prezentului contract. Primirea produsului este confirmată de Autor prin semnarea prezentului contract.</p>
  <p><strong>(2)</strong> Autorul are capacitatea de a crea, de a prezenta publicului și de a înregistra o operă audio-vizuală viitoare (denumită în continuare <em>Înregistrarea</em>) constând în înregistrarea audio-video a desigilării, examinării și utilizării efective a produsului furnizat de Beneficiar.</p>
  <p><strong>(3)</strong> Obiectul prezentului contract îl reprezintă:</p>
  <p class="sub">– realizarea de către Autor a unei opere audio-vizuale constând în înregistrarea audio-video a desigilării, examinării și a utilizării efective a produsului primit anterior de la Beneficiar;</p>
  <p class="sub">– cesiunea de către Autor către Beneficiar a următoarelor drepturi patrimoniale asupra operei audio-vizuale: dreptul de reproducere; dreptul de distribuire; dreptul de comunicare publică, directă sau indirectă, a operei audio-vizuale; dreptul de realizare de opere derivate; dreptul de retransmisie a operei, toate în schimbul produsului primit anterior de la Beneficiar cu titlu de remunerație, conform celor prevăzute la Art. 6.</p>
  <p><strong>(4)</strong> Autorul garantează că opera audio-vizuală este originală.</p>
</div>

<div class="article">
  <h4>Art. 3  Modalități de exploatare</h4>
  <p><strong>(1)</strong> Beneficiarul va difuza și utiliza Înregistrarea în scop publicitar, inclusiv în campanii de <span class="highlight">publicitate plătită (ads)</span> pe platforme precum Meta (Facebook și Instagram), TikTok, YouTube și Google, cu respectarea legislației și a prezentului contract.</p>
  <p><strong>(2)</strong> Conform convenției Părților: Beneficiarul a furnizat Autorului, anterior încheierii prezentului contract și cu titlu de remunerație pentru cesiunea drepturilor de autor, un produs; Autorul va realiza o înregistrare audio-video de tip „prezentare".</p>
  <p><strong>(3)</strong> În vederea promovării Înregistrării, Beneficiarul poate uzita de toate formele de publicitate pe care le consideră necesare, pe cheltuiala proprie, fără consultare prealabilă cu Autorul despre modul de publicitate ales.</p>
  <p><strong>(4)</strong> Brandul partener în cadrul campaniei căruia este creată Înregistrarea este <strong>${brandName}</strong>. Acesta va utiliza Înregistrarea în scop publicitar, inclusiv în campanii de publicitate plătită (ads), Beneficiarul putând pune Înregistrarea la dispoziția sa în acest scop.</p>
</div>

<div class="article">
  <h4>Art. 4  Teritorialitatea</h4>
  <p><strong>(1)</strong> Conform convenției părților, Beneficiarul poate reproduce Înregistrarea în orice limbă considerată necesară din punct de vedere comercial și în orice teritoriu, cu respectarea legislației relevante din fiecare țară.</p>
</div>

<div class="article">
  <h4>Art. 5  Exclusivitatea sau neexclusivitatea cesiunii</h4>
  <p><strong>(1)</strong> Cesiunea drepturilor prevăzute în prezentul contract este exclusivă.</p>
</div>

<div class="article">
  <h4>Art. 6  Remunerația Autorului</h4>
  <p><strong>(1)</strong> Conform voinței Părților, remunerația datorată de Beneficiar Autorului pentru cesiunea drepturilor de autor ce face obiectul prezentului contract este o remunerație în natură, constând în produsul furnizat de Beneficiar Autorului anterior încheierii prezentului contract. Valoarea remunerației este reprezentată de prețul de vânzare al produsului, astfel cum este menționat în avizul de expediție / factura care a însoțit produsul. Autorul declară și confirmă prin semnarea prezentului contract că a primit produsul, că acesta a intrat în proprietatea sa și că remunerația în natură astfel achitată reprezintă echivalentul integral și suficient al drepturilor cedate prin prezentul contract, neputând pretinde de la Beneficiar nicio altă sumă de bani sau altă contraprestație. Eventualele obligații fiscale aferente acestei remunerații vor fi îndeplinite conform legii aplicabile.</p>
</div>

<div class="article">
  <h4>Art. 7  Durata și întinderea cesiunii</h4>
  <p><strong>(1)</strong> Autorul cedează drepturile sus menționate pe o durată de <span class="highlight">6 luni</span>, începând cu data semnării prezentului contract.</p>
</div>

<div class="article">
  <h4>Art. 8  Modificarea contractului</h4>
  <p><strong>(1)</strong> Contractul poate fi modificat, cu acordul ambelor Părți, prin act adițional și va fi modificat conform evoluției legislative ulterioare.</p>
</div>

<div class="article">
  <h4>Art. 9  Încetarea contractului</h4>
  <p><strong>(1)</strong> Acest contract încetează la împlinirea duratei contractuale prevăzute la Art. 7 sau prin acordul scris al ambelor Părți. Niciuna dintre Părți nu are dreptul de a denunța sau rezilia unilateral prezentul contract.</p>
</div>

<div class="article">
  <h4>Art. 10  Garanții și clauze finale privind cesiunea</h4>
  <p><strong>(1)</strong> Autorul declară și garantează că Înregistrarea este o operă originală creată în întregime de el, că este unicul titular al drepturilor patrimoniale cedate, că acestea sunt libere de orice sarcini, licențe sau cesiuni anterioare către terți și că nu va greva sau ceda aceste drepturi unor terți pe durata cesiunii.</p>
  <p><strong>(2)</strong> Cesiunea exclusivă către Beneficiar prevăzută în prezentul contract acoperă toate modalitățile de exploatare cunoscute la data semnării sau dezvoltate ulterior, în limita drepturilor patrimoniale prevăzute de Legea nr. 8/1996 privind dreptul de autor și drepturile conexe, incluzând expres dreptul de a transforma, adapta și modifica Înregistrarea, dreptul de a crea opere derivate, dreptul de închiriere și împrumut și dreptul de înregistrare a operei la autoritățile competente. Beneficiarul exploatează aceste drepturi fără consultarea prealabilă a Autorului.</p>
  <p><strong>(3)</strong> Autorul se obligă să nu împiedice utilizarea, editarea sau adaptarea Înregistrării de către Beneficiar conform prezentului contract și să nu solicite retragerea acesteia din circulație după publicare.</p>
  <p><strong>(4)</strong> Părțile convin că remunerația în natură prevăzută la Art. 6 reprezintă, în sensul art. 41 alin. (2) din Legea nr. 8/1996, o contraprestație proporțională cu exploatarea preconizată și suficientă pentru cesiunea exclusivă convenită prin prezentul contract.</p>
</div>

<div class="article">
  <h4>Art. 11  Notificări între părți</h4>
  <p><strong>(1)</strong> Orice notificare adresată de una dintre Părți celeilalte este valabil îndeplinită dacă este transmisă la adresa/sediul prevăzut în partea introductivă a prezentului contract.</p>
</div>

<div class="signatures">
  <div class="sig-block">
    <div class="sig-label">Beneficiar – Cesionar</div>
    <div class="sig-name">ADD FAME DIGITAL S.R.L.</div>
    <div class="sig-role">prin Stancu Marius Ciprian, Administrator</div>
    <div class="sig-canvas"></div>
    <div class="sig-date">Data: ${createdDate}</div>
  </div>
  <div class="sig-block">
    <div class="sig-label">Autor – Cedent</div>
    <div class="sig-name">${c.influencer_name}</div>
    <div class="sig-role">&nbsp;</div>
    ${c.signature_image
      ? `<div class="sig-canvas"><img src="${c.signature_image}" alt="Semnatura" /></div>`
      : c.signature_name
      ? `<div class="sig-typed">${c.signature_name}</div>`
      : `<div class="sig-canvas"></div>`
    }
    <div class="sig-date">Semnat la: ${signedDate}</div>
  </div>
</div>

<div class="audit">
  <strong>Audit electronic:</strong><br/>
  Semnat digital la: ${signedDate}<br/>
  IP semnatar: ${c.signer_ip || 'nedisponibil'}<br/>
  Document generat de platforma AddFame (addfame.ro) — valabil conform Legii nr. 455/2001 privind semnătura electronică.
</div>

<div class="footer">
  <span>ADD FAME DIGITAL S.R.L. — addfame.ro</span>
  <span>Contract #${nr}</span>
</div>

<div style="position:fixed;top:16px;right:16px;display:flex;gap:8px;z-index:999">
  <button onclick="window.print()" style="background:#f97316;color:white;border:none;padding:10px 18px;border-radius:10px;font-weight:900;font-size:13px;cursor:pointer;box-shadow:0 4px 14px rgba(249,115,22,0.4)">
    🖨️ Salvează ca PDF
  </button>
  <button onclick="window.close()" style="background:#f1f5f9;color:#374151;border:none;padding:10px 18px;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer">
    ✕ Închide
  </button>
</div>
<script>
  window.onload = function() {
    if (window.location.search.includes('print=1')) {
      setTimeout(function () { window.print() }, 800)
    }
  }
</script>

</body>
</html>`

    const safeName = c.influencer_name
      .replace(/[ăâ]/g, 'a').replace(/[îi]/g, 'i')
      .replace(/[șş]/g, 's').replace(/[țţ]/g, 't')
      .replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-')

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="Contract-Cesiune-${safeName}.html"`,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
