'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type AdminRole = 'super_admin' | 'admin'

export interface AdminSession {
  userId: string
  role: AdminRole
  permissions: string[]
  isSuperAdmin: boolean
}

/**
 * Verifies the current user is an active admin.
 * Throws or returns null if not authorized.
 * Use at the top of every admin Server Action.
 */
export async function verifyAdminSession(): Promise<AdminSession | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return null

    const admin = createAdminClient()
    const { data: adminRow } = await admin
      .from('admins')
      .select('role, permissions, is_active')
      .eq('user_id', user.id)
      .single()

    if (!adminRow || adminRow.is_active === false) return null

    return {
      userId: user.id,
      role: adminRow.role as AdminRole,
      permissions: adminRow.permissions || [],
      isSuperAdmin: adminRow.role === 'super_admin',
    }
  } catch {
    return null
  }
}

/**
 * Requires admin session — returns error object if not authorized.
 * Usage: const auth = await requireAdmin(); if ('error' in auth) return auth;
 */
export async function requireAdmin() {
  const session = await verifyAdminSession()
  if (!session) return { error: 'Unauthorized — admin access required' }
  return session
}

/**
 * Requires super_admin role.
 */
export async function requireSuperAdmin() {
  const session = await verifyAdminSession()
  if (!session) return { error: 'Unauthorized' }
  if (!session.isSuperAdmin) return { error: 'Forbidden — super admin required' }
  return session
}