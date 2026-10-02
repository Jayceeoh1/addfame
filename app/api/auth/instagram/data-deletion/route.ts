import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET!

/**
 * Data Deletion Request URL — apelat de Meta când un user solicită ștergerea
 * datelor sale (GDPR). Trebuie să returnăm un URL unde utilizatorul poate
 * urmări statusul cererii + un cod de confirmare.
 *
 * URL: https://addfame.ro/api/auth/instagram/data-deletion
 * Configurat în Meta → App → Instagram → Setări avansate.
 */

function base64UrlDecode(input: string): Buffer {
  const pad = 4 - (input.length % 4)
  const padded = pad < 4 ? input + '='.repeat(pad) : input
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

function parseSignedRequest(signedRequest: string):
  | { user_id: string; issued_at: number }
  | null {
  const [encodedSig, encodedPayload] = signedRequest.split('.', 2)
  if (!encodedSig || !encodedPayload) return null

  const sig = base64UrlDecode(encodedSig)
  const payloadStr = base64UrlDecode(encodedPayload).toString('utf8')

  let payload: any
  try {
    payload = JSON.parse(payloadStr)
  } catch {
    return null
  }
  if (payload.algorithm !== 'HMAC-SHA256') return null

  const expected = crypto
    .createHmac('sha256', INSTAGRAM_APP_SECRET)
    .update(encodedPayload)
    .digest()

  if (sig.length !== expected.length || !crypto.timingSafeEqual(sig, expected)) {
    return null
  }
  return { user_id: String(payload.user_id), issued_at: payload.issued_at }
}

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const signedRequest = form.get('signed_request')

  if (typeof signedRequest !== 'string') {
    return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 })
  }

  const parsed = parseSignedRequest(signedRequest)
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const igUserId = parsed.user_id
  const confirmationCode = crypto.randomUUID()

  // Log cererea de ștergere într-un tabel dedicat (opțional — dacă nu ai
  // tabelul `data_deletion_requests`, comentează blocul).
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Șterge imediat datele Instagram din influencers
  const { error: updErr } = await admin
    .from('influencers')
    .update({
      instagram_connected: false,
      instagram_access_token: null,
      instagram_token_expires: null,
      instagram_handle: null,
      instagram_user_id: null,
      ig_followers: null,
      ig_following: null,
      ig_posts_count: null,
      ig_bio: null,
      ig_avatar: null,
      ig_engagement_rate: null,
      ig_account_type: null,
      ig_last_sync: null,
    })
    .eq('instagram_user_id', igUserId)

  if (updErr) {
    console.error('[IG DataDeletion] DB update failed', updErr)
  }

  // Log (best-effort — nu blocăm dacă tabelul nu există)
  try {
    await admin.from('data_deletion_requests').insert({
      provider: 'instagram',
      external_user_id: igUserId,
      confirmation_code: confirmationCode,
      status: 'completed',
      requested_at: new Date().toISOString(),
    })
  } catch {}

  return NextResponse.json({
    url: `https://addfame.ro/data-deletion-status?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  })
}

export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'instagram_data_deletion' })
}
