import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createServiceClient } from '@supabase/supabase-js'

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

    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: collab } = await admin
      .from('collaborations')
      .select('*, campaigns(title, budget_per_influencer, budget, deadline, deliverables, platforms, brand_id), influencers(id, user_id, name, email), brands(id, user_id, name)')
      .eq('id', collaboration_id)
      .single()

    if (!collab) return NextResponse.json({ error: 'Collaboration not found' }, { status: 404 })

    const now = new Date().toISOString()
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'

    if (action === 'generate') {
      // Brand generates contract after approving application
      if (collab.campaigns?.brand_id !== collab.brands?.id) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }

      const contractText = generateContractText(collab)

      const { data: contract, error } = await admin
        .from('contracts')
        .insert({
          collaboration_id,
          brand_id: collab.brands?.id,
          influencer_id: collab.influencers?.id,
          campaign_title: collab.campaigns?.title,
          amount: collab.campaigns?.budget_per_influencer || collab.campaigns?.budget || 0,
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

      // Notify influencer
      await admin.from('notifications').insert({
        user_id: collab.influencers?.user_id,
        title: '📄 Contract nou de semnat',
        body: `${collab.brands?.name} ți-a trimis un contract pentru campania "${collab.campaigns?.title}". Semnează pentru a începe colaborarea.`,
        link: `/influencer/collaborations`,
        read: false,
      })

      return NextResponse.json({ success: true, contract_id: contract.id })
    }

    if (action === 'sign_brand') {
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
        // Both signed — activate collaboration
        await activateCollaboration(admin, collab, contract.id)
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
        await activateCollaboration(admin, collab, contract.id)
      }

      // Notify brand
      await admin.from('notifications').insert({
        user_id: collab.brands?.user_id || collab.campaigns?.brand_id,
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
  const budget = collab.reserved_amount || collab.campaigns?.budget_per_influencer || collab.campaigns?.budget || 0

  await admin.from('collaborations').update({
    status: 'ACTIVE',
    reserved_amount: budget,
    contract_id: contractId,
    activated_at: new Date().toISOString(),
  }).eq('id', collab.id)

  // Reserve credits
  if (budget > 0) {
    await admin.from('brands').update({
      credits_reserved: admin.rpc('increment', { x: budget }),
    }).eq('id', collab.brands?.id)
  }

  // Notify both parties
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

function generateContractText(collab: any): string {
  const amount = collab.campaigns?.budget_per_influencer || collab.campaigns?.budget || 0
  const deadline = collab.campaigns?.deadline ? new Date(collab.campaigns.deadline).toLocaleDateString('ro-RO') : '—'
  const platforms = (collab.campaigns?.platforms || []).join(', ')

  return `CONTRACT DE COLABORARE PENTRU INFLUENCER MARKETING

Încheiat astăzi, ${new Date().toLocaleDateString('ro-RO')}, între:

BRAND: ${collab.brands?.name}
INFLUENCER: ${collab.influencers?.name}
CAMPANIE: ${collab.campaigns?.title}

1. OBIECTUL CONTRACTULUI
Influencerul se obligă să creeze și să publice conținut promoțional pentru campania specificată, conform termenilor agreați pe platforma AddFame.

2. PLATFORME
Conținutul va fi publicat pe: ${platforms || 'platformele specificate în campanie'}

3. LIVRABILE
${collab.campaigns?.deliverables || 'Conform briefului campaniei disponibil pe platformă.'}

4. TERMEN DE REALIZARE
Data limită: ${deadline}

5. REMUNERAȚIE
Suma agreată: €${amount.toFixed(2)}
Plata se va efectua prin platforma AddFame, după aprobarea conținutului publicat.
AddFame reține un comision de 15% din suma totală.

6. DREPTURI DE PROPRIETATE INTELECTUALĂ
Influencerul acordă Brandului dreptul neexclusiv de a redistribui conținutul creat timp de 12 luni.

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
