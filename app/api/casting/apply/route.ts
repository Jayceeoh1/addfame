import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { limitRequest } from '@/lib/rate-limit'
import { validateApplication, isCastingOpen, brandDisplay, type Casting } from '@/lib/castings'
import { logError, logDbError } from '@/lib/log-error'

// POST /api/casting/apply — multipart: „data” (JSON cu formularul) + opțional „insights” (captură, max 5 MB).
// O a doua trimitere cu același email la același casting actualizează înscrierea, nu creează alta.
const MAX_IMG = 5 * 1024 * 1024
const IMG_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' }
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'
const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

async function sendConfirmation(to: string, name: string, c: Casting, updated: boolean) {
  const key = process.env.RESEND_API_KEY
  if (!key) return
  const html = `<!DOCTYPE html><html lang="ro"><body style="margin:0;background:#f4f3fa;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:28px 16px"><div style="background:#fff;border:1px solid #e6e3f3;border-radius:16px;padding:26px 24px">
<div style="font-size:24px;font-weight:900;color:#14123a;margin-bottom:16px">AddFame</div>
<p style="font-size:15px;color:#14123a;margin:0 0 12px">Bună, <strong>${esc(name)}</strong>!</p>
<p style="font-size:14px;color:#3d3a63;line-height:1.6;margin:0 0 12px">${updated ? 'Ți-am actualizat înscrierea' : 'Am primit înscrierea ta'} la castingul <strong>${esc(c.title)}</strong> cu ${esc(brandDisplay(c))}.</p>
<p style="font-size:14px;color:#3d3a63;line-height:1.6;margin:0 0 12px">Verificăm profilul în 1–2 zile lucrătoare. Dacă brandul te alege, primești pe email detaliile campaniei și contractul.</p>
<p style="font-size:14px;color:#3d3a63;line-height:1.6;margin:0 0 18px">Între timp, poți să-ți faci cont pe AddFame ca să primești și alte campanii potrivite.</p>
<a href="${APP_URL}/auth/register?type=influencer&email=${encodeURIComponent(to)}" style="background:#5a35e6;color:#fff;text-decoration:none;font-weight:800;padding:12px 22px;border-radius:12px;display:inline-block">Creează-ți contul</a>
</div></div></body></html>`
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.FROM_EMAIL || 'AddFame <noreply@addfame.ro>', to, subject: `Înscrierea ta la „${c.title}”`, html }),
  }).catch(() => {})
}

export async function POST(req: NextRequest) {
  { const limited = await limitRequest(req, 'casting-apply', { maxRequests: 10, windowMs: 60 * 60 * 1000, blockMs: 30 * 60 * 1000 }); if (limited) return limited }

  let raw: any, file: File | null = null, slug = ''
  try {
    const form = await req.formData()
    raw = JSON.parse(String(form.get('data') || '{}'))
    slug = String(form.get('slug') || raw?.slug || '')
    const f = form.get('insights')
    if (f && typeof f !== 'string' && f.size > 0) file = f
  } catch {
    return NextResponse.json({ error: 'Formular invalid.' }, { status: 400 })
  }
  // capcană pentru boți: câmp ascuns pe care oamenii nu-l completează
  if (raw?.website) return NextResponse.json({ ok: true })

  const admin = createAdminClient()
  const { data: casting } = await admin.from('castings').select('*').eq('slug', slug).maybeSingle()
  if (!casting) return NextResponse.json({ error: 'Castingul nu există.' }, { status: 404 })
  if (!isCastingOpen(casting as Casting)) return NextResponse.json({ error: 'Înscrierile la acest casting s-au închis.' }, { status: 410 })

  const v = validateApplication(raw)
  if (!v.ok) return NextResponse.json({ error: 'Verifică câmpurile marcate.', errors: v.errors }, { status: 422 })
  const data = v.data!

  let insights_path: string | null = null
  if (file) {
    const ext = IMG_TYPES[file.type]
    if (!ext) return NextResponse.json({ error: 'Captura trebuie să fie o imagine (JPG, PNG, WebP).', errors: { insights: 'Format neacceptat.' } }, { status: 422 })
    if (file.size > MAX_IMG) return NextResponse.json({ error: 'Captura e prea mare (maxim 5 MB).', errors: { insights: 'Maxim 5 MB.' } }, { status: 422 })
    const path = `${casting.id}/${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await admin.storage.from('castinguri').upload(path, file, { contentType: file.type, upsert: false })
    if (upErr) await logError(new Error('casting upload: ' + upErr.message), { source: 'server', url: '/api/casting/apply' })
    else insights_path = path
  }

  try {
    const { data: existing } = await admin.from('casting_applications')
      .select('id, insights_path').eq('casting_id', casting.id).eq('email', data.email).maybeSingle()
    const row = { ...data, casting_id: casting.id, updated_at: new Date().toISOString(), ...(insights_path ? { insights_path } : {}) }
    if (existing) {
      const { error } = await admin.from('casting_applications').update(row).eq('id', existing.id)
      if (error) throw error
      if (insights_path && existing.insights_path) await admin.storage.from('castinguri').remove([existing.insights_path])
    } else {
      const { error } = await admin.from('casting_applications').insert(row)
      if (error) throw error
    }
    await sendConfirmation(data.email, data.first_name, casting as Casting, !!existing)
    return NextResponse.json({ ok: true, updated: !!existing, firstName: data.first_name })
  } catch (e: any) {
    if (insights_path) await admin.storage.from('castinguri').remove([insights_path])
    await logDbError('casting apply', e, { slug })
    return NextResponse.json({ error: 'Nu am putut salva înscrierea. Încearcă din nou în câteva minute.' }, { status: 500 })
  }
}
