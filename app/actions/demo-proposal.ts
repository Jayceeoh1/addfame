'use server'

// Demo public (Google Ads): brandul își construiește campania fără cont, iar la final se înregistrează.
// Contul se creează minim (fără CUI/adresă), campania intră ca DRAFT cu source='demo_funnel',
// adminii primesc notificare + email. Influencerii nu o văd (doar ACTIVE se afișează).
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit, getClientIP } from '@/lib/rate-limit'
import { validateEmail, validatePassword, sanitizeText, validateBrandName } from '@/lib/constants/registration'
import { emailTypoError } from '@/lib/email-typos'
import { notify } from '@/lib/drafts'
import { sendEmail } from '@/lib/email'

export interface DemoProposalInput {
  firm: string; email: string; phone: string; password: string
  product: string; value: number; link?: string; description?: string
  creators: number; platforms: string[]; tasks: string[]; niches: string[]
  brief?: string
  website?: string // honeypot
}

const TASK_LABEL: Record<string, string> = {
  ig_reel: 'Reel Instagram', ig_stories: 'Stories Instagram', tt_video: 'Video TikTok', ig_post: 'Postare foto',
}

export async function submitDemoProposal(d: DemoProposalInput): Promise<{ success: true } | { error: string }> {
  try {
    if (d.website) return { success: true } // bot: răspundem „ok” fără să salvăm
    const ip = await getClientIP()
    const rl = await rateLimit(`demo-proposal:${ip}`, { maxRequests: 3, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 })
    if (!rl.ok) return { error: 'Prea multe încercări. Încearcă din nou peste o oră.' }

    const email = String(d.email || '').trim().toLowerCase()
    const firm = sanitizeText(String(d.firm || ''))
    const phone = sanitizeText(String(d.phone || '')).replace(/[^\d+\s()-]/g, '')
    const product = sanitizeText(String(d.product || ''))
    if (!validateBrandName(firm)) return { error: 'Numele firmei trebuie să aibă între 2 și 100 de caractere.' }
    if (!validateEmail(email)) return { error: 'Adresa de email nu este validă.' }
    { const typo = emailTypoError(email); if (typo) return { error: typo } }
    if (phone.replace(/\D/g, '').length < 9) return { error: 'Numărul de telefon pare invalid.' }
    const pw = validatePassword(d.password || '')
    if (!pw.valid) return { error: pw.errors.join(', ') }
    if (product.length < 2) return { error: 'Lipsește produsul campaniei.' }

    const admin = createAdminClient()
    const { data: existing } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
    if (existing?.id) return { error: 'Există deja un cont cu acest email. Intră în cont și creează campania de acolo.' }

    const supabase = await createClient()
    const { data: auth, error: authErr } = await supabase.auth.signUp({
      email, password: d.password,
      options: {
        data: { role: 'brand', email_verified: false },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
      },
    })
    if (authErr || !auth.user) return { error: authErr?.message || 'Nu am putut crea contul. Încearcă din nou.' }
    const userId = auth.user.id

    const { error: pErr } = await admin.from('profiles').upsert({ id: userId, email, role: 'brand' }, { onConflict: 'id' })
    if (pErr) return { error: `Nu am putut crea profilul: ${pErr.message}` }

    const { data: brand, error: bErr } = await admin.from('brands').upsert({
      user_id: userId, email, name: firm, phone, industry: 'Altele',
      credits_balance: 0, approval_status: 'pending', verification_status: 'unverified',
    }).select('id').single()
    if (bErr || !brand) return { error: `Nu am putut crea brandul: ${bErr?.message}` }

    const tasks = (d.tasks || []).filter(t => t in TASK_LABEL)
    const platforms = (d.platforms || []).map(p => p.toUpperCase()).filter(p => ['INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'FACEBOOK'].includes(p))
    const creators = Math.min(50, Math.max(1, Math.round(d.creators || 1)))
    const value = Math.max(0, Number(d.value) || 0)
    const deadline = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

    const { data: camp, error: cErr } = await admin.from('campaigns').insert({
      brand_id: brand.id, brand_name: firm,
      title: `[Barter] ${firm} — ${product}`,
      description: sanitizeText(d.description || '') || `Produs gratuit: ${product}`,
      budget: 0, budget_per_influencer: 0, max_influencers: creators, current_influencers: 0,
      platforms: platforms.length ? platforms : ['INSTAGRAM'],
      deliverables: tasks.map(t => TASK_LABEL[t]).join(' + ') || 'Conținut creat de influencer',
      deadline, countries: [], niches: (d.niches || []).slice(0, 10).map(n => sanitizeText(n)),
      status: 'DRAFT', source: 'demo_funnel', campaign_type: 'BARTER',
      offer_type: 'product', offer_name: product, offer_value: value,
      offer_description: sanitizeText(d.description || '') || null,
      offer_count: creators, delivery_method: 'delivery',
      story_instructions: sanitizeText(d.brief || '') || null,
      promotion_link: d.link ? sanitizeText(d.link) : null,
      tasks_stories_count: tasks.includes('ig_stories') ? 2 : 0,
      tasks_ig_reel: tasks.includes('ig_reel'), tasks_ig_post: tasks.includes('ig_post'),
      tasks_tt_video: tasks.includes('tt_video'),
      invited_influencers: [], accepted_influencers: [], declined_influencers: [],
    }).select('id').single()
    if (cErr || !camp) return { error: `Contul a fost creat, dar campania nu s-a salvat: ${cErr?.message}` }

    // Notificare adminilor (in-app + email)
    const summary = `${firm} · ${product} · ${creators} creatori · ${phone} · ${email}`
    try {
      const { data: admins } = await admin.from('admins').select('user_id').eq('is_active', true)
      for (const a of admins || []) await notify(admin, (a as any).user_id, 'Propunere nouă din demo', summary, '/admin/campaigns')
    } catch (e) { console.error('[demo-proposal] notify', e) }
    const to = process.env.ADMIN_NOTIFICATION_EMAIL
    if (to) await sendEmail(to, `Propunere nouă din demo: ${firm}`, `<p>${summary}</p><p>Campania e DRAFT în Admin → Campanii. Promisiune: contact în maximum 12 ore.</p>`)

    return { success: true }
  } catch (e: any) {
    console.error('[demo-proposal]', e)
    return { error: 'Ceva n-a mers. Încearcă din nou.' }
  }
}
