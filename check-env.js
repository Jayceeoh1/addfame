require('@next/env').loadEnvConfig(process.cwd())
const { createClient } = require('@supabase/supabase-js')

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

;(async () => {
  const p = await admin.from('profiles').select('id', { count: 'exact', head: true })
  console.log('profiles:', p.error ? 'EROARE: ' + p.error.message : 'OK, ' + p.count + ' randuri')

  const a = await admin.from('admins').select('user_id', { count: 'exact', head: true })
  console.log('admins:  ', a.error ? 'EROARE: ' + a.error.message : 'OK, ' + a.count + ' randuri')

  const w = await admin.from('influencers').select('id, wallet_balance').limit(1)
  console.log('acces complet (service):', w.error ? 'EROARE: ' + w.error.message : 'OK')
})()