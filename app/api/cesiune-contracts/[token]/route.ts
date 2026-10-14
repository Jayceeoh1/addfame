import { CESIUNE_CLAUSES_VERSION } from '@/lib/cesiune-clauses'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const COLS = 'id, token, contract_number, influencer_name, influencer_email, influencer_phone, influencer_cnp, influencer_ci_serie, influencer_ci_numar, influencer_address, campaign_title, product_name, product_value_lei, brand_name, brand_cui, brand_reg_com, brand_address, brand_website, status, signed_at, created_at'
    let { data, error } = await admin().from('cesiune_contracts').select(`${COLS}, clauses_version`).eq('token', token).single()
    if (error && /clauses_version/.test(error.message || '')) {
      // SQL 37 încă nerulat
      ;({ data, error } = await admin().from('cesiune_contracts').select(COLS).eq('token', token).single() as any)
    }
    if (error || !data) return NextResponse.json({ error: 'Contract negăsit' }, { status: 404 })
    return NextResponse.json({ contract: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const ua = req.headers.get('user-agent') || 'unknown'

    const { data: contract } = await admin()
      .from('cesiune_contracts')
      .select('*')
      .eq('token', token)
      .single()

    if (!contract) return NextResponse.json({ error: 'Contract negăsit' }, { status: 404 })
    if (contract.status === 'signed') return NextResponse.json({ error: 'Contract deja semnat' }, { status: 400 })

    const body = await req.json()
    const {
      signature_image, signature_name,
      influencer_name, influencer_email, influencer_phone,
      influencer_cnp, influencer_ci_serie, influencer_ci_numar, influencer_address,
    } = body

    if (!signature_image && !signature_name) return NextResponse.json({ error: 'Semnătura este obligatorie' }, { status: 400 })

    const now = new Date().toISOString()
    // Versiunea textului pe care creatorul l-a văzut pe pagină la semnare (pagini vechi, din cache → 1)
    const seen = Number(body.clauses_version)
    const clauses_version = Number.isInteger(seen) && seen >= 1 && seen <= CESIUNE_CLAUSES_VERSION ? seen : 1
    const update: Record<string, unknown> = {
        status: 'signed',
        signature_image: signature_image || null,
        signature_name: signature_name || null,
        influencer_name: influencer_name || contract.influencer_name,
        influencer_email: influencer_email || contract.influencer_email,
        influencer_phone: influencer_phone || contract.influencer_phone,
        influencer_cnp: influencer_cnp || contract.influencer_cnp,
        influencer_ci_serie: influencer_ci_serie || contract.influencer_ci_serie,
        influencer_ci_numar: influencer_ci_numar || contract.influencer_ci_numar,
        influencer_address: influencer_address || contract.influencer_address,
        signed_at: now,
        signer_ip: ip,
        signer_user_agent: ua,
        updated_at: now,
      clauses_version,
    }
    let { error: updateError } = await admin().from('cesiune_contracts').update(update).eq('token', token).neq('status', 'signed')
    if (updateError && /clauses_version/.test(updateError.message || '')) {
      // SQL 37 încă nerulat: semnăm fără versiune (PDF-ul va arăta textul v1)
      delete update.clauses_version
      ;({ error: updateError } = await admin().from('cesiune_contracts').update(update).eq('token', token).neq('status', 'signed'))
    }

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    return NextResponse.json({ success: true, signed_at: now })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
