import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createServiceClient } from '@supabase/supabase-js'

async function getCallerAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: adminRow } = await admin
    .from('admins')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return { user, adminRow, admin }
}

// GET — list all admins (super_admin only)
export async function GET() {
  try {
    const ctx = await getCallerAdmin()
    if (!ctx || !ctx.adminRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (ctx.adminRow.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: admins } = await ctx.admin
      .from('admins')
      .select('id, user_id, email, role, permissions, is_active, created_at')
      .order('created_at', { ascending: true })

    return NextResponse.json({ admins: admins || [], current: ctx.adminRow })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — create new admin (super_admin only)
export async function POST(req: NextRequest) {
  try {
    const ctx = await getCallerAdmin()
    if (!ctx || !ctx.adminRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (ctx.adminRow.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { email, role, permissions } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email obligatoriu' }, { status: 400 })

    // Find user by email
    const { data: users } = await ctx.admin.auth.admin.listUsers()
    const targetUser = users?.users?.find((u: any) => u.email === email)
    if (!targetUser) return NextResponse.json({ error: `Nu există cont cu emailul ${email}. Utilizatorul trebuie să aibă deja un cont pe platformă.` }, { status: 404 })

    // Check not already admin
    const { data: existing } = await ctx.admin
      .from('admins')
      .select('id')
      .eq('user_id', targetUser.id)
      .single()
    if (existing) return NextResponse.json({ error: 'Acest utilizator este deja admin' }, { status: 400 })

    // Create admin
    const { error } = await ctx.admin.from('admins').insert({
      user_id: targetUser.id,
      email: email,
      role: role || 'admin',
      permissions: role === 'super_admin' ? [] : (permissions || []),
      is_active: true,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH — update admin (toggle active, change permissions)
export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getCallerAdmin()
    if (!ctx || !ctx.adminRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (ctx.adminRow.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { admin_id, is_active, permissions } = await req.json()

    const updates: any = {}
    if (is_active !== undefined) updates.is_active = is_active
    if (permissions !== undefined) updates.permissions = permissions

    await ctx.admin.from('admins').update(updates).eq('id', admin_id)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE — remove admin
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await getCallerAdmin()
    if (!ctx || !ctx.adminRow) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (ctx.adminRow.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { admin_id } = await req.json()

    // Can't delete super_admins
    const { data: target } = await ctx.admin.from('admins').select('role').eq('id', admin_id).single()
    if (target?.role === 'super_admin') return NextResponse.json({ error: 'Nu poți șterge un Super Admin' }, { status: 400 })

    await ctx.admin.from('admins').delete().eq('id', admin_id)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
