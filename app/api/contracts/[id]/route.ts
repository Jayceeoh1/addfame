import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Folosim select cu limit in loc de .single() - evita bug-ul cu null
    const { data, error } = await admin
      .from('contracts')
      .select('*')
      .eq('id', params.id)
      .limit(1)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    
    const contract = data?.[0]
    if (!contract) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(contract)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
