import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { limitRequest } from '@/lib/rate-limit'
import { validateApplication, isSignupOpen, brandDisplay, type SignupFormConfig } from '@/lib/creator-signups'
import { logError, logDbError } from '@/lib/log-error'

// POST /api/inscriere — multipart: „data” (JSON cu formularul) + opțional „insights” (captură, max 5 MB).
// O a doua trimitere cu același email pe aceeași pagină actualizează înscrierea, nu creează alta.
const MAX_IMG = 5 * 1024 * 1024
const IMG_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' }
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'
const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

async function sendConfirmation(to: string, name: string, c: SignupFormConfig, updated: boolean) {
  const key = process.env.RESEND_API_KEY
  if (!key) return
  const html = `<!DOCTYPE html><html lang="ro"><body style="margin:0;background:#f4f3fa;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:28px 16px"><div style="background:#fff;border:1px solid #e6e3f3;border-radius:16px;padding:26px 24px">
<div style="font-size:24px;font-weight:900;color:#14123a;margin-bottom:16px">AddFame</div>
<p style="font-size:15px;color:#14123a;margin:0 0 12px">Bună, <strong>${esc(name)}</strong>!</p>
<p style="font-size:14px;color:#3d3a63;line-height:1.6;margin:0 0 12px">${updated ? 'Ți-am actualizat înscrierea' : 'Am primit înscrierea ta'} în comunitatea de creatori AddFame (<strong>${esc(c.title)}</strong>).</p>
<p style="font-size:14px;color:#3d3a63;line-height:1.6;margin:0 0 12px">Îți verificăm profilul și revenim în maximum 5 ore. Când apare o campanie potrivită (prima: cu ${esc(brandDisplay(c))}), te contactăm cu detaliile și contractul.</p>
<p style="font-size:14px;color:#3d3a63;line-height:1.6;margin:0 0 18px">Contul AddFame e opțional: îl poți face oricând, ca să primești și alte campanii.</p>
<a href="${APP_URL}/auth/register?type=influencer&email=${encodeURIComponent(to)}" style="background:#5a35e6;color:#fff;text-decoration:none;font-weight:800;padding:12px 22px;border-radius:12px;display:inline-block">Creează-ți contul</a>
</div></div></body></html>`
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.FROM_EMAIL || 'AddFame <noreply@addfame.ro>', to, subject: 'Am primit înscrierea ta pe AddFame', html }),
  }).catch(() => {})
}

export async function POST(req: NextRequest) {
  { const limited = await limitRequest(req, 'inscriere-creatori', { maxRequests: 10, windowMs: 60 * 60 * 1000, blockMs: 30 * 60 * 1000 }); if (limited) return limited }

  let raw: any, file: File | null = null, slug = ''
  try {
    const fd = await req.formData()
    raw = JSON.parse(String(fd.get('data') || '{}'))
    slug = String(fd.get('slug') || raw?.slug || '')
    const f = fd.get('insights')
    if (f && typeof f !== 'string' && f.size > 0) file = f
  } catch {
    return NextResponse.json({ error: 'Formular invalid.' }, { status: 400 })
  }
  // capcană pentru boți: câmp ascuns pe care oamenii nu-l completează
  if (raw?.website) return NextResponse.json({ ok: true })

  const admin = createAdminClient()
  const { data: form } = await admin.from('signup_forms').select('*').eq('slug', slug).maybeSingle()
  if (!form) return NextResponse.json({ error: 'Pagina nu există.' }, { status: 404 })
  if (!isSignupOpen(form as SignupFormConfig)) return NextResponse.json({ error: 'Înscrierile pe această pagină s-au închis.' }, { status: 410 })

  const v = validateApplication(raw)
  if (!v.ok) return NextResponse.json({ error: 'Verifică câmpurile marcate.', errors: v.errors }, { status: 422 })
  const data = v.data!

  let insights_path: string | null = null
  if (file) {
    const ext = IMG_TYPES[file.type]
    if (!ext) return NextResponse.json({ error: 'Captura trebuie să fie o imagine (JPG, PNG, WebP).', errors: { insights: 'Format neacceptat.' } }, { status: 422 })
    if (file.size > MAX_IMG) return NextResponse.json({ error: 'Captura e prea mare (maxim 5 MB).', errors: { insights: 'Maxim 5 MB.' } }, { status: 422 })
    const path = `${form.id}/${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await admin.storage.from('inscrieri').upload(path, file, { contentType: file.type, upsert: false })
    if (upErr) await logError(new Error('inscriere upload: ' + upErr.message), { source: 'server', url: '/api/inscriere' })
    else insights_path = path
  }

  try {
    const { data: existing } = await admin.from('signup_entries')
      .select('id, insights_path').eq('form_id', form.id).eq('email', data.email).maybeSingle()
    let row: Record<string, unknown> = { ...data, form_id: form.id, updated_at: new Date().toISOString(), ...(insights_path ? { insights_path } : {}) }
    const write = () => existing
      ? admin.from('signup_entries').update(row).eq('id', existing.id)
      : admin.from('signup_entries').insert(row)
    let { error } = await write()
    // SQL 28 (genul) încă nerulat: salvăm fără coloanele noi, ca înscrierea să nu se piardă
    if (error && /gender/.test(error.message || '')) {
      const { gender, audience_gender, ...rest } = row as any
      row = rest
      ;({ error } = await write())
    }
    if (error) throw error
    if (existing && insights_path && existing.insights_path) await admin.storage.from('inscrieri').remove([existing.insights_path])
    await sendConfirmation(data.email, data.first_name, form as SignupFormConfig, !!existing)
    return NextResponse.json({ ok: true, updated: !!existing, firstName: data.first_name })
  } catch (e: any) {
    if (insights_path) await admin.storage.from('inscrieri').remove([insights_path])
    await logDbError('inscriere', e, { slug })
    return NextResponse.json({ error: 'Nu am putut salva înscrierea. Încearcă din nou în câteva minute.' }, { status: 500 })
  }
}
