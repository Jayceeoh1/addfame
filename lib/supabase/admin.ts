import { createClient as createServerClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client with service role access for admin operations
 * This bypasses RLS policies and should only be used for authorized server operations
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration for admin client')
  }

  return createServerClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
