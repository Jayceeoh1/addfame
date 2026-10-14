import { NextRequest, NextResponse } from 'next/server'
import { campaignName } from '@/lib/campaign-name'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { action, collaboration_id, signature_name } = await req.json()

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Fetch collab fara join cu brands (nu exista FK)
    const { data: collab, error: collabError } = await admin
      .from('collaborations')
      .select('*, campaigns(title, budget_per_influencer, budget, deadline, deliverables, platforms, brand_id, campaign_type, offer_name, offer_value, delivery_method, fee_per_influencer), influencers(id, user_id, name, email)')
      .eq('id', collaboration_id)
      .single()

    if (!collab) {
      return NextResponse.json({ 
        error: 'Collaboration not found',
      }, { status: 404 })
    }

    // Fetch brand separat
    const { data: brandData } = await admin
      .from('brands')
      .select('id, user_id, name')
      .eq('id', collab.brand_id)
      .single()

    const collabWithBrand = { ...collab, brands: brandData }

    const now = new Date().toISOString()
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

    if (action === 'generate') {
      const { data: brand } = await admin.from('brands').select('id').eq('user_id', user.id).single()
      if (!brand || collab.brand_id !== brand.id) {
        return NextResponse.json({ 
          error: 'Not authorized',
        }, { status: 403 })
      }

      // Barter: drepturile asupra clipului sunt reglementate DOAR de contractul de cesiune semnat cu AddFame.
      if (isBarterCampaign(collab.campaigns)) {
        return NextResponse.json({
          error: 'La campaniile barter nu se mai generează contract de colaborare: drepturile asupra conținutului sunt acoperite de contractul de cesiune semnat de creator cu AddFame (vezi „Drepturi de autor”).',
        }, { status: 409 })
      }

      const contractText = generateContractText(collabWithBrand)

      const { data: contract, error } = await admin
        .from('contracts')
        .insert({
          collaboration_id,
          brand_id: collabWithBrand.brands?.id,
          influencer_id: collab.influencers?.id,
          campaign_title: campaignName(collab.campaigns),
          amount: Number(collab.pay_reserved) || Number(collab.offer_price) || collab.campaigns?.budget_per_influencer || collab.campaigns?.budget || 0,
          deadline: collab.campaigns?.deadline,
          deliverables: collab.campaigns?.deliverables,
          platforms: collab.campaigns?.platforms,
          contract_text: contractText,
          status: 'pending_influencer',
          generated_at: now,
        })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      await admin.from('notifications').insert({
        user_id: collab.influencers?.user_id,
        title: '📄 Contract nou de semnat',
        body: `${collabWithBrand.brands?.name} ți-a trimis un contract pentru campania "${campaignName(collab.campaigns)}". Semnează pentru a începe colaborarea.`,
        link: `/influencer/collaborations`,
        read: false,
      })

      return NextResponse.json({ success: true, contract_id: contract.id })
    }

    if (action === 'sign_brand') {
      // Doar brandul care deține colaborarea poate semna în numele brandului
      if (!brandData || brandData.user_id !== user.id) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }

      const { data: contract } = await admin
        .from('contracts')
        .select('*')
        .eq('collaboration_id', collaboration_id)
        .single()

      if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

      await admin.from('contracts').update({
        brand_signed_at: now,
        brand_signed_ip: ip,
        brand_signature_name: signature_name,
        status: contract.influencer_signed_at ? 'fully_signed' : 'pending_influencer',
      }).eq('id', contract.id)

      if (contract.influencer_signed_at) {
        await activateCollaboration(admin, collabWithBrand, contract.id)
      }

      return NextResponse.json({ success: true })
    }

    if (action === 'sign_influencer') {
      if (collab.influencers?.user_id !== user.id) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }

      const { data: contract } = await admin
        .from('contracts')
        .select('*')
        .eq('collaboration_id', collaboration_id)
        .single()

      if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

      await admin.from('contracts').update({
        influencer_signed_at: now,
        influencer_signed_ip: ip,
        influencer_signature_name: signature_name,
        status: contract.brand_signed_at ? 'fully_signed' : 'pending_brand',
      }).eq('id', contract.id)

      if (contract.brand_signed_at) {
        await activateCollaboration(admin, collabWithBrand, contract.id)
      }

      await admin.from('notifications').insert({
        user_id: collabWithBrand.brands?.user_id,
        title: '✅ Contract semnat de influencer',
        body: `${collab.influencers?.name} a semnat contractul pentru "${collab.campaigns?.title}".`,
        link: `/brand/collaborations`,
        read: false,
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

async function activateCollaboration(admin: any, collab: any, contractId: string) {
  // Campaniile cu taxă per influencer nu au escrow per influencer
  const feeModel = collab.campaigns?.fee_per_influencer !== null && collab.campaigns?.fee_per_influencer !== undefined
  // Modelul cu taxă: păstrăm suma blocată pe colaborare (prețul propus, SQL 31), altfel 0 — nu o ștergem la semnare
  const budget = feeModel ? (Number(collab.pay_reserved) > 0 ? Number(collab.reserved_amount) || Number(collab.pay_reserved) : 0)
    : (collab.reserved_amount || collab.campaigns?.budget_per_influencer || collab.campaigns?.budget || 0)

  const { error: actErr } = await admin.from('collaborations').update({
    status: 'ACTIVE',
    reserved_amount: budget,
    contract_id: contractId,
    activated_at: new Date().toISOString(),
  }).eq('id', collab.id)
  // ex. campanie „Influencerii propun prețul” fără selecție plătită: baza de date refuză activarea (SQL 31)
  if (actErr) {
    console.error('[contracts] activare refuzată:', actErr.message)
    await admin.from('collaborations').update({ contract_id: contractId }).eq('id', collab.id)
    return
  }

  await admin.from('notifications').insert([
    {
      user_id: collab.influencers?.user_id,
      title: '🚀 Colaborare activată!',
      body: `Ambele semnături au fost primite. Poți începe să lucrezi la "${collab.campaigns?.title}".`,
      link: `/influencer/collaborations`,
      read: false,
    },
    {
      user_id: collab.brands?.user_id,
      title: '🚀 Colaborare activată!',
      body: `Contractul cu ${collab.influencers?.name} a fost semnat. Colaborarea e activă.`,
      link: `/brand/collaborations`,
      read: false,
    }
  ])
}

/** Campanie barter (după tip sau după titlul generat „[Barter] …”). */
function isBarterCampaign(c: any): boolean {
  return c?.campaign_type === 'BARTER' || /^\s*\[Barter\]/i.test(String(c?.title || ''))
}

function generateContractText(collab: any): string {
  const isBarter = collab.campaigns?.campaign_type === 'BARTER'
  // Campanii cu taxă fixă per influencer: fără comision procentual în contract
  const feeModel = collab.campaigns?.fee_per_influencer !== null && collab.campaigns?.fee_per_influencer !== undefined
  const deadline = collab.campaigns?.deadline ? new Date(collab.campaigns.deadline).toLocaleDateString('ro-RO') : '—'
  const platforms = (collab.campaigns?.platforms || []).join(', ')
  const today = new Date().toLocaleDateString('ro-RO')

  if (isBarter) {
    const offerName = collab.campaigns?.offer_name || 'Produs/serviciu gratuit'
    const offerValue = collab.campaigns?.offer_value ? `${collab.campaigns.offer_value} RON` : 'conform ofertei'
    const deliveryMethod = collab.campaigns?.delivery_method === 'delivery' ? 'Livrare la domiciliu' : 'Ridicare personală'

    return `CONTRACT DE COLABORARE BARTER

Încheiat astăzi, ${today}, între:

BRAND: ${collab.brands?.name}
INFLUENCER: ${collab.influencers?.name}
CAMPANIE: ${campaignName(collab.campaigns)}

1. OBIECTUL CONTRACTULUI
Prezentul contract reglementează o colaborare de tip BARTER între Brand și Influencer, fără implicarea unor sume de bani. Influencerul primește un produs/serviciu gratuit în schimbul creării și publicării de conținut promoțional.

2. OFERTA BRANDULUI
Produs/serviciu oferit: ${offerName}
Valoare estimată: ${offerValue}
Modalitate de livrare: ${deliveryMethod}

3. OBLIGAȚIILE INFLUENCERULUI
Influencerul se obligă să creeze și să publice următorul conținut:
${collab.campaigns?.deliverables || 'Conform briefului campaniei.'}

Conținutul va fi publicat pe: ${platforms || 'platformele specificate în campanie'}

4. TERMEN DE REALIZARE
Data limită pentru publicarea conținutului: ${deadline}

5. REMUNERAȚIE
Această colaborare este de tip BARTER. Nu există plăți monetare între părți.
Compensația Influencerului constă exclusiv în produsul/serviciul menționat la punctul 2.
AddFame nu percepe comision pentru colaborările de tip barter.

6. DREPTURI DE PROPRIETATE INTELECTUALĂ
Drepturile asupra conținutului creat sunt reglementate exclusiv prin contractul de cesiune a drepturilor de autor încheiat între Influencer și ADD FAME DIGITAL S.R.L. pentru această campanie.

7. AUTENTICITATE
Influencerul se obligă să creeze conținut autentic și să menționeze explicit că este vorba de o colaborare/parteneriat conform normelor legale în vigoare.

8. RĂSPUNDERE
Influencerul garantează că:
- Conținutul publicat respectă legislația în vigoare
- Respectă ghidurile platformelor sociale utilizate
- Menționează transparent natura colaborării

9. PLATFORMA INTERMEDIARĂ
Acest contract este mediat de AddFame (addfame.ro).
Disputele vor fi rezolvate conform politicii AddFame disponibile pe addfame.ro/termeni.

10. SEMNĂTURI ELECTRONICE
Prin bifarea acordului și introducerea numelui complet, ambele părți confirmă acceptarea termenilor contractuali.
Semnătura electronică are valoare juridică conform Legii nr. 455/2001 privind semnătura electronică.`
  }

  // Contract standard (paid campaigns)
  // Prețul propus de influencer (blocat la selecție) are prioritate față de suma fixă a campaniei
  const amount = Number(collab.pay_reserved) || Number(collab.offer_price) || collab.campaigns?.budget_per_influencer || collab.campaigns?.budget || 0
  const netAmount = Math.round(amount * 0.85 * 100) / 100

  return `CONTRACT DE COLABORARE PENTRU INFLUENCER MARKETING

Încheiat astăzi, ${today}, între:

BRAND: ${collab.brands?.name}
INFLUENCER: ${collab.influencers?.name}
CAMPANIE: ${campaignName(collab.campaigns)}

1. OBIECTUL CONTRACTULUI
Influencerul se obligă să creeze și să publice conținut promoțional pentru campania specificată, conform termenilor agreați pe platforma AddFame.

2. PLATFORME
Conținutul va fi publicat pe: ${platforms || 'platformele specificate în campanie'}

3. LIVRABILE
${collab.campaigns?.deliverables || 'Conform briefului campaniei disponibil pe platformă.'}

4. TERMEN DE REALIZARE
Data limită: ${deadline}

5. REMUNERAȚIE
${feeModel
  ? `Suma agreată pentru influencer: ${amount.toFixed(2)} RON
Plata se va efectua prin intermediul echipei AddFame, după aprobarea conținutului publicat.`
  : `Suma brută agreată: ${amount.toFixed(2)} RON
Comision platformă AddFame (15%): ${(amount * 0.15).toFixed(2)} RON
Suma netă primită de influencer: ${netAmount.toFixed(2)} RON
Plata se va efectua prin platforma AddFame, după aprobarea conținutului publicat.`}

6. DREPTURI DE PROPRIETATE INTELECTUALĂ
Drepturile asupra conținutului creat în cadrul acestei colaborări (folosire organică, publicitate plătită, transmiterea către partenerii Brandului) sunt reglementate exclusiv prin contractul de cesiune a drepturilor de autor încheiat între Influencer și ADD FAME DIGITAL S.R.L. pentru această campanie. Prezentul contract nu acordă drepturi suplimentare asupra conținutului.

7. CONFIDENȚIALITATE
Ambele părți se obligă să păstreze confidențialitatea termenilor financiari ai acestui contract.

8. RĂSPUNDERE
Influencerul garantează că conținutul publicat respectă legislația în vigoare și ghidurile platformelor sociale utilizate.

9. PLATFORMA INTERMEDIARĂ
Acest contract este mediat de AddFame (addfame.ro). Disputele vor fi rezolvate conform politicii AddFame.

10. SEMNĂTURI ELECTRONICE
Prin bifarea acordului și introducerea numelui complet, ambele părți confirmă acceptarea termenilor contractuali.
Semnătura electronică are valoare juridică conform Legii nr. 455/2001 privind semnătura electronică.`
}
