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
      .from('ugc_contracts')
      .select('*')
      .eq('token', token)
      .single()

    if (error || !c) return NextResponse.json({ error: 'Contract negasit' }, { status: 404 })
    if (c.status !== 'signed') return NextResponse.json({ error: 'Contractul nu este semnat' }, { status: 400 })

    const signedDate = new Date(c.signed_at).toLocaleDateString('ro-RO', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
    const createdDate = new Date(c.created_at).toLocaleDateString('ro-RO', {
      day: '2-digit', month: 'long', year: 'numeric'
    })

    const html = `<!DOCTYPE html>
<html lang="ro">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Acord Colaborare UGC - ${c.influencer_name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Georgia', serif;
    font-size: 11pt;
    color: #1a1a1a;
    background: #fff;
    padding: 40px;
    max-width: 800px;
    margin: 0 auto;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 3px solid #f97316;
    padding-bottom: 20px;
    margin-bottom: 28px;
  }
  .logo {
    font-family: Arial, sans-serif;
    font-size: 22pt;
    font-weight: 900;
    color: #1a1a1a;
  }
  .logo span { color: #f97316; }
  .doc-info { text-align: right; font-size: 9pt; color: #666; }
  .doc-info strong { color: #1a1a1a; }
  h1 {
    font-family: Arial, sans-serif;
    font-size: 16pt;
    font-weight: 900;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 6px;
  }
  .subtitle {
    text-align: center;
    font-size: 10pt;
    color: #666;
    margin-bottom: 28px;
  }
  .parties {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 28px;
  }
  .party {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 14px 16px;
  }
  .party.beneficiar { border-top: 3px solid #6366f1; }
  .party.creator { border-top: 3px solid #f97316; }
  .party-label {
    font-family: Arial, sans-serif;
    font-size: 8pt;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #9ca3af;
    margin-bottom: 8px;
  }
  .party p { font-size: 10pt; line-height: 1.7; }
  .party strong { font-weight: 700; }
  .articles { margin-bottom: 28px; }
  .article { margin-bottom: 16px; }
  .article h4 {
    font-family: Arial, sans-serif;
    font-size: 10pt;
    font-weight: 900;
    margin-bottom: 5px;
  }
  .article p { font-size: 10pt; line-height: 1.65; color: #374151; }
  .highlight {
    font-weight: 700;
    color: #4f46e5;
  }
  .signatures {
    margin-top: 32px;
    padding-top: 20px;
    border-top: 1px solid #e5e7eb;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }
  .sig-block { }
  .sig-label {
    font-family: Arial, sans-serif;
    font-size: 8pt;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #9ca3af;
    margin-bottom: 8px;
  }
  .sig-name { font-size: 11pt; font-weight: 700; margin-bottom: 12px; }
  .sig-canvas {
    border-bottom: 1.5px solid #374151;
    margin-bottom: 8px;
    min-height: 60px;
    display: flex;
    align-items: flex-end;
  }
  .sig-canvas img { max-height: 70px; max-width: 100%; }
  .sig-typed {
    font-family: 'Brush Script MT', cursive;
    font-size: 20pt;
    color: #1e293b;
    padding-bottom: 4px;
    border-bottom: 1.5px solid #374151;
    margin-bottom: 8px;
  }
  .sig-date { font-size: 9pt; color: #6b7280; }
  .footer {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8pt;
    color: #9ca3af;
  }
  .audit {
    background: #f8f9fb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 10px 14px;
    margin-top: 20px;
    font-size: 8pt;
    color: #6b7280;
    line-height: 1.7;
  }
  .audit strong { color: #374151; }
  @media print {
    body { padding: 20px; }
    @page { margin: 1.5cm; }
  }
</style>
</head>
<body>

<div class="header">
  <div class="logo">Add<span>Fame</span></div>
  <div class="doc-info">
    <div><strong>Acord de Colaborare UGC</strong></div>
    <div>Data: ${createdDate}</div>
    <div>ID: ${c.id.substring(0, 8).toUpperCase()}</div>
  </div>
</div>

<h1>Acord de Colaborare UGC</h1>
<p class="subtitle">Incheiat la data de: ${createdDate}</p>

<div class="parties">
  <div class="party beneficiar">
    <div class="party-label">Beneficiar</div>
    <p><strong>addfame.ro</strong></p>
    <p>denumit in continuare „Beneficiarul"</p>
    <p>contact@addfame.ro</p>
  </div>
  <div class="party creator">
    <div class="party-label">Creator</div>
    <p><strong>${c.influencer_name}</strong></p>
    ${c.influencer_address ? `<p>${c.influencer_address}</p>` : ''}
    ${c.influencer_phone ? `<p>${c.influencer_phone}</p>` : ''}
    <p>${c.influencer_email}</p>
    <p>denumit in continuare „Creatorul"</p>
  </div>
</div>

<div class="articles">

  <div class="article">
    <h4>1. Obiectul acordului</h4>
    <p>Creatorul se obliga sa realizeze si sa transmita catre Beneficiar un material video de tip UGC (User Generated Content) pentru promovarea produselor si/sau serviciilor comercializate de Plantica BioLabs.</p>
  </div>

  <div class="article">
    <h4>2. Livrarea materialului</h4>
    <p>Creatorul va transmite materialul video final in format digital, conform instructiunilor comunicate. Prin transmiterea materialului, Creatorul confirma ca acesta este original si ca detine toate drepturile necesare asupra continutului realizat.</p>
  </div>

  <div class="article">
    <h4>3. Dreptul de utilizare</h4>
    <p>Creatorul isi exprima acordul ca materialul transmis sa fie utilizat timp de 12 luni pe website-uri, Facebook, Instagram, TikTok, YouTube, alte canale oficiale si in campanii Meta Ads, TikTok Ads, Google Ads si platforme similare. Sunt permise editari tehnice sau de marketing, inclusiv decupare, redimensionare, subtitrari, texte, elemente grafice sau muzica.</p>
  </div>

  <div class="article">
    <h4>4. Remuneratia</h4>
    <p>Beneficiarul va achita Creatorului suma de <span class="highlight">${c.amount_lei.toLocaleString('ro-RO')} LEI</span>. Plata se va efectua in termen de <span class="highlight">${c.payment_days} zile</span> de la acceptarea materialului. Plata include realizarea materialului si drepturile de utilizare acordate.</p>
  </div>

  <div class="article">
    <h4>5. Declaratiile Creatorului</h4>
    <p>Creatorul garanteaza ca materialul este realizat de acesta, nu incalca drepturile unor terte persoane, poate fi utilizat conform prezentului acord si nu va solicita plati suplimentare pentru perioada de 12 luni.</p>
  </div>

  <div class="article">
    <h4>6. Dispozitii finale</h4>
    <p>Prezentul acord intra in vigoare la data semnarii. Orice modificare este valabila doar in forma scrisa. Prin semnare, Partile confirma ca au citit, inteles si acceptat toate prevederile acordului.</p>
  </div>

</div>

<div class="signatures">
  <div class="sig-block">
    <div class="sig-label">Beneficiar</div>
    <div class="sig-name">addfame.ro</div>
    <div class="sig-canvas"></div>
    <div class="sig-date">Data: ${createdDate}</div>
  </div>
  <div class="sig-block">
    <div class="sig-label">Creator</div>
    <div class="sig-name">${c.influencer_name}</div>
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
  Document generat de platforma AddFame (addfame.ro) — valabil conform Legii nr. 455/2001
</div>

<div class="footer">
  <span>addfame.ro — Platforma de Influencer Marketing</span>
  <span>Document #${c.id.substring(0, 8).toUpperCase()}</span>
</div>

<div style="position:fixed;top:16px;right:16px;display:flex;gap:8px;z-index:999;print-display:none">
  <button onclick="window.print()" style="background:#6366f1;color:white;border:none;padding:10px 18px;border-radius:10px;font-weight:900;font-size:13px;cursor:pointer;box-shadow:0 4px 14px rgba(99,102,241,0.4)">
    🖨️ Salvează ca PDF
  </button>
  <button onclick="window.close()" style="background:#f1f5f9;color:#374151;border:none;padding:10px 18px;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer">
    ✕ Închide
  </button>
</div>
<style>@media print { button { display:none !important; } }</style>
<script>
  window.onload = function() {
    if (window.location.search.includes('print=1')) {
      setTimeout(() => window.print(), 800)
    }
  }
</script>

</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="Contract-UGC-${c.influencer_name.replace(/\s+/g, '-')}-${new Date(c.signed_at).toLocaleDateString('ro-RO').replace(/\./g, '-')}.html"`,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
