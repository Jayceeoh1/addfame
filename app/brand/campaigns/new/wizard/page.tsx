'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Rocket, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const STEPS = ['Tip', 'Produs', 'Brief', 'Audiență', 'Confirmare']

const INP: React.CSSProperties = {
  width: '100%', borderRadius: 10, border: '1.5px solid #e5e7eb',
  padding: '10px 13px', fontSize: 14, boxSizing: 'border-box', outline: 'none', background: 'white',
}
const LBL: React.CSSProperties = {
  margin: '0 0 5px', fontSize: 11, fontWeight: 700, color: '#6b7280',
  textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block',
}

// ── Live Preview ──────────────────────────────────────────────────
function LivePreview({ data }: { data: any }) {
  const tasks = [
    data.tasks_ig_reel && '🎬 Reel Instagram',
    data.tasks_ig_post && '🖼️ Post feed Instagram',
    data.tasks_tt_video && '🎵 Video TikTok',
    data.tasks_stories_count > 0 && `📱 ${data.tasks_stories_count} Stories`,
  ].filter(Boolean) as string[]

  const hashtags = data.required_hashtags
    ? data.required_hashtags.split(/\s+/).map((h: string) => h.startsWith('#') ? h : `#${h}`).filter(Boolean)
    : []

  return (
    <div style={{ background: '#f8f9fb', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', fontSize: 13 }}>
      {/* Header preview */}
      <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81)', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
            {data.campaign_type === 'BARTER' ? '🎁' : '💰'}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: 'white', lineHeight: 1.2 }}>
              {data.title || data.product_name || 'Titlu campanie...'}
            </p>
            <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
              {data.campaign_type === 'BARTER' ? 'Barter' : 'Plătită'} · {data.platforms.join(', ') || 'Platforme'}
            </p>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, background: '#22c55e', color: 'white', padding: '2px 8px', borderRadius: 20 }}>Activ</span>
        </div>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {[
            { label: data.campaign_type === 'BARTER' ? '🎁 Ofertă Barter' : '💰 Campanie Plătită', sub: data.campaign_type === 'BARTER' ? 'Produs gratuit' : 'Cash per postare' },
            { label: data.deadline ? new Date(data.deadline).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' }) : '— iul', sub: 'Deadline' },
            { label: `0/${data.max_influencers || '5'}`, sub: 'Locuri' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 8px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: 'white' }}>{s.label}</p>
              <p style={{ margin: 0, fontSize: 9, color: 'rgba(255,255,255,0.45)' }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Imagini produs */}
        {data.offer_images?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {data.offer_images.slice(0, 3).map((url: string, i: number) => (
              <img key={i} src={url} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} alt="" />
            ))}
            {data.offer_images.length > 3 && (
              <div style={{ width: 64, height: 64, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#6b7280' }}>+{data.offer_images.length - 3}</div>
            )}
          </div>
        )}

        {/* Produs */}
        {(data.product_name || data.product_description) && (
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🎁 Produs / ofertă</p>
            {data.product_name && <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111' }}>{data.product_name}</p>}
            {data.product_description && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>{data.product_description.substring(0, 100)}{data.product_description.length > 100 ? '...' : ''}</p>}
          </div>
        )}

        {/* Tasks */}
        {tasks.length > 0 && (
          <div style={{ background: '#eef2ff', border: '1.5px solid #c7d2fe', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ background: '#4f46e5', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📋 Ce trebuie să postezi</span>
              <span style={{ marginLeft: 'auto', fontSize: 9, background: 'rgba(255,255,255,0.2)', color: 'white', padding: '1px 6px', borderRadius: 20, fontWeight: 700 }}>{tasks.length} task{tasks.length > 1 ? 'uri' : ''}</span>
            </div>
            <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {tasks.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'white', borderRadius: 7, padding: '5px 8px', border: '1px solid #c7d2fe' }}>
                  <Check size={10} color="#4f46e5" strokeWidth={3} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#3730a3' }}>{t}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 9, background: '#4f46e5', color: 'white', padding: '1px 5px', borderRadius: 20, fontWeight: 700, flexShrink: 0 }}>obligatoriu</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instrucțiuni */}
        {data.story_instructions && (
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📱 Instrucțiuni</p>
            <p style={{ margin: 0, fontSize: 12, color: '#374151', lineHeight: 1.5, background: '#f3f4f6', borderRadius: 8, padding: '7px 10px' }}>
              {data.story_instructions.substring(0, 120)}{data.story_instructions.length > 120 ? '...' : ''}
            </p>
          </div>
        )}

        {/* Link */}
        {data.promotion_link && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '7px 10px' }}>
            <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: '#16a34a' }}>🔗 Link de promovat</p>
            <p style={{ margin: 0, fontSize: 11, color: '#15803d', wordBreak: 'break-all' }}>{data.promotion_link}</p>
          </div>
        )}

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {hashtags.map((h: string, i: number) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: 20 }}>{h}</span>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!data.product_name && tasks.length === 0 && !data.story_instructions && (
          <div style={{ textAlign: 'center', padding: '16px 0', color: '#9ca3af' }}>
            <p style={{ margin: 0, fontSize: 12 }}>Completează pașii din stânga</p>
            <p style={{ margin: '2px 0 0', fontSize: 11 }}>pentru a vedea previzualizarea</p>
          </div>
        )}

        {/* CTA preview */}
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 10, display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: 'linear-gradient(135deg,#f97316,#ec4899)', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'white' }}>Aplică acum</p>
          </div>
          <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#6b7280' }}>Salvează</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function WizardPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const [data, setData] = useState({
    campaign_type: 'BARTER',
    title: '',
    product_name: '',
    product_description: '',
    offer_value: '',
    platforms: ['Instagram'] as string[],
    tasks_ig_reel: false,
    tasks_stories_count: 0,
    tasks_ig_post: false,
    tasks_tt_video: false,
    story_instructions: '',
    required_hashtags: '',
    promotion_link: '',
    max_influencers: '5',
    min_followers: '',
    deadline: '',
    offer_images: [] as string[],
  })

  const set = (key: string, val: any) => setData(d => ({ ...d, [key]: val }))
  const togglePlatform = (p: string) => setData(d => ({
    ...d, platforms: d.platforms.includes(p) ? d.platforms.filter(x => x !== p) : [...d.platforms, p]
  }))

  const pct = Math.round((step / 5) * 100)
  const hasContent = data.tasks_ig_reel || data.tasks_ig_post || data.tasks_tt_video || data.tasks_stories_count > 0

  async function publish() {
    setSaving(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: brand } = await sb.from('brands').select('id').eq('user_id', user.id).single()
      if (!brand) return
      const deadline = data.deadline
        ? new Date(data.deadline).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const { data: camp, error } = await sb.from('campaigns').insert({
        brand_id: brand.id,
        title: data.title || data.product_name || 'Campanie nouă',
        campaign_type: data.campaign_type,
        status: 'ACTIVE',
        platforms: data.platforms,
        offer_name: data.product_name || null,
        offer_value: parseFloat(data.offer_value) || 0,
        description: data.product_description || null,
        story_instructions: data.story_instructions || null,
        required_hashtags: data.required_hashtags
          ? data.required_hashtags.split(/\s+/).map((h: string) => h.replace(/^#/, '').trim()).filter(Boolean)
          : [],
        promotion_link: data.promotion_link || null,
        tasks_ig_reel: data.tasks_ig_reel,
        tasks_stories_count: data.tasks_stories_count,
        tasks_ig_post: data.tasks_ig_post,
        tasks_tt_video: data.tasks_tt_video,
        max_influencers: parseInt(data.max_influencers) || 5,
        min_followers: parseInt(data.min_followers) || 0,
        deadline,
        offer_images: data.offer_images?.length ? data.offer_images : null,
        countries: ['Romania'],
      }).select().single()
      if (error) { alert(error.message); return }
      router.push(`/brand/campaigns/${camp.id}`)
    } finally { setSaving(false) }
  }

  const renderStep = () => {
    if (step === 1) return (
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 900, color: '#111', margin: '0 0 4px' }}>Ce tip de campanie?</h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>Alege modelul potrivit pentru afacerea ta.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { type: 'BARTER', icon: '🎁', title: 'Barter — produs gratuit', desc: 'Oferi produse în schimbul conținutului. Fără costuri cash.' },
            { type: 'PAID', icon: '💰', title: 'Plătită — cash', desc: 'Plătești influencerii per postare livrată.' },
          ].map(opt => (
            <button key={opt.type} onClick={() => set('campaign_type', opt.type)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 12, border: data.campaign_type === opt.type ? '2px solid #f97316' : '1.5px solid #e5e7eb', background: data.campaign_type === opt.type ? '#fff7ed' : 'white', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: data.campaign_type === opt.type ? '#fed7aa' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{opt.icon}</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#111' }}>{opt.title}</p>
                <p style={{ margin: '1px 0 0', fontSize: 12, color: '#6b7280' }}>{opt.desc}</p>
              </div>
              {data.campaign_type === opt.type && <Check size={15} color="#f97316" />}
            </button>
          ))}
        </div>
      </div>
    )

    if (step === 2) return (
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 900, color: '#111', margin: '0 0 4px' }}>Despre produsul tău</h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>Influencerii vor vedea aceste detalii când aplică.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div><label style={LBL}>Titlu campanie *</label><input value={data.title} onChange={e => set('title', e.target.value)} placeholder="ex. Colaborare skincare hidratare" style={INP} /></div>
          <div><label style={LBL}>Produs / ofertă *</label><input value={data.product_name} onChange={e => set('product_name', e.target.value)} placeholder="ex. Set skincare hidratare intensă" style={INP} /></div>
          <div><label style={LBL}>Descriere</label><textarea value={data.product_description} onChange={e => set('product_description', e.target.value)} placeholder="Ce este produsul, beneficii, de ce e special..." rows={3} style={{ ...INP, resize: 'none' } as any} /></div>
          <div><label style={LBL}>Valoare produs (RON)</label><input type="number" value={data.offer_value} onChange={e => set('offer_value', e.target.value)} placeholder="150" style={INP} /></div>
          <div>
            <label style={LBL}>Imagini produs</label>
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1.5px dashed #d1d5db', borderRadius: 10, padding: '18px', cursor: 'pointer', background: '#f9fafb' }}>
              <span style={{ fontSize: 22 }}>🖼️</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Apasă pentru a adăuga imagini</span>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>JPG, PNG, WEBP — max 5MB</span>
              <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                onChange={async e => {
                  const files = Array.from(e.target.files || [])
                  if (!files.length) return
                  const sb = (await import('@/lib/supabase/client')).createClient()
                  const urls: string[] = []
                  for (const file of files.slice(0, 5)) {
                    const ext = file.name.split('.').pop()
                    const path = `campaign-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
                    const { error } = await sb.storage.from('uploads').upload(path, file, { upsert: true })
                    if (!error) {
                      const { data: urlData } = sb.storage.from('uploads').getPublicUrl(path)
                      if (urlData?.publicUrl) urls.push(urlData.publicUrl)
                    }
                  }
                  if (urls.length) set('offer_images', [...(data.offer_images || []), ...urls])
                }} />
            </label>
            {data.offer_images?.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {data.offer_images.map((url: string, i: number) => (
                  <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
                    <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }} alt="" />
                    <button onClick={() => set('offer_images', data.offer_images.filter((_: string, j: number) => j !== i))}
                      style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', border: 'none', color: 'white', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )

    if (step === 3) return (
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 900, color: '#111', margin: '0 0 4px' }}>Ce trebuie să posteze?</h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>Cu cât ești mai specific, cu atât rezultatele sunt mai bune.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={LBL}>Platforme *</label>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {['Instagram', 'TikTok', 'YouTube', 'Facebook'].map(p => (
                <button key={p} onClick={() => togglePlatform(p)}
                  style={{ padding: '6px 13px', borderRadius: 20, border: data.platforms.includes(p) ? '2px solid #f97316' : '1.5px solid #e5e7eb', background: data.platforms.includes(p) ? '#fff7ed' : 'white', fontSize: 12, fontWeight: 700, color: data.platforms.includes(p) ? '#f97316' : '#6b7280', cursor: 'pointer' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={LBL}>Tip conținut *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { key: 'tasks_ig_reel', label: '🎬 Reel Instagram' },
                { key: 'tasks_ig_post', label: '🖼️ Post feed Instagram' },
                { key: 'tasks_tt_video', label: '🎵 Video TikTok' },
              ].map(t => (
                <label key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderRadius: 10, border: (data as any)[t.key] ? '2px solid #f97316' : '1.5px solid #e5e7eb', background: (data as any)[t.key] ? '#fff7ed' : 'white', cursor: 'pointer' }}>
                  <input type="checkbox" checked={(data as any)[t.key]} onChange={e => set(t.key, e.target.checked)} style={{ accentColor: '#f97316', width: 15, height: 15 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{t.label}</span>
                </label>
              ))}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', borderRadius: 10, border: data.tasks_stories_count > 0 ? '2px solid #f97316' : '1.5px solid #e5e7eb', background: data.tasks_stories_count > 0 ? '#fff7ed' : 'white', cursor: 'pointer' }}>
                <input type="checkbox" checked={data.tasks_stories_count > 0} onChange={e => set('tasks_stories_count', e.target.checked ? 2 : 0)} style={{ accentColor: '#f97316', width: 15, height: 15 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111', flex: 1 }}>📱 Stories Instagram</span>
                {data.tasks_stories_count > 0 && (
                  <input type="number" min={1} max={10} value={data.tasks_stories_count}
                    onChange={e => set('tasks_stories_count', parseInt(e.target.value))}
                    onClick={e => e.stopPropagation()}
                    style={{ width: 48, borderRadius: 7, border: '1px solid #e5e7eb', padding: '3px 7px', fontSize: 13, textAlign: 'center' }} />
                )}
              </label>
            </div>
          </div>
          <div><label style={LBL}>Instrucțiuni postare</label><textarea value={data.story_instructions} onChange={e => set('story_instructions', e.target.value)} placeholder="ex. Filmează-te folosind produsul dimineața, menționează că hidratează 24h..." rows={3} style={{ ...INP, resize: 'none' } as any} /></div>
          <div><label style={LBL}>Hashtag-uri obligatorii</label><input value={data.required_hashtags} onChange={e => set('required_hashtags', e.target.value)} placeholder="#brand #colaborare #ad" style={INP} /></div>
          <div><label style={LBL}>Link de promovat</label><input value={data.promotion_link} onChange={e => set('promotion_link', e.target.value)} placeholder="https://brand.ro/produs" style={INP} /></div>
        </div>
      </div>
    )

    if (step === 4) return (
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 900, color: '#111', margin: '0 0 4px' }}>Audiență și deadline</h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>Câți influenceri vrei și când se termină campania.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={LBL}>Nr. influenceri *</label><input type="number" value={data.max_influencers} onChange={e => set('max_influencers', e.target.value)} placeholder="5" style={INP} /></div>
            <div><label style={LBL}>Deadline *</label><input type="date" value={data.deadline} onChange={e => set('deadline', e.target.value)} style={INP} /></div>
          </div>
          <div>
            <label style={LBL}>Followeri minimi</label>
            <select value={data.min_followers} onChange={e => set('min_followers', e.target.value)} style={INP}>
              <option value="">Orice dimensiune</option>
              <option value="1000">1.000+</option>
              <option value="5000">5.000+</option>
              <option value="10000">10.000+</option>
              <option value="50000">50.000+</option>
            </select>
          </div>
        </div>
      </div>
    )

    // Step 5 — Confirmare
    return (
      <div>
        <h2 style={{ fontSize: 17, fontWeight: 900, color: '#111', margin: '0 0 4px' }}>Totul arată bine?</h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>Verifică înainte să activezi campania.</p>
        <div style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
          {[
            { label: 'Tip', value: data.campaign_type === 'BARTER' ? '🎁 Barter' : '💰 Plătită', ok: true },
            { label: 'Titlu', value: data.title || data.product_name, ok: !!(data.title || data.product_name) },
            { label: 'Produs', value: data.product_name || null, ok: !!data.product_name },
            { label: 'Platforme', value: data.platforms.join(', '), ok: data.platforms.length > 0 },
            { label: 'Conținut', value: [data.tasks_ig_reel && 'Reel', data.tasks_ig_post && 'Post', data.tasks_tt_video && 'TikTok', data.tasks_stories_count > 0 && `${data.tasks_stories_count} Stories`].filter(Boolean).join(', ') || null, ok: hasContent },
            { label: 'Instrucțiuni', value: data.story_instructions ? data.story_instructions.substring(0, 50) + '...' : null, ok: !!data.story_instructions, optional: true },
            { label: 'Influenceri', value: `${data.max_influencers} persoane`, ok: true },
            { label: 'Deadline', value: data.deadline ? new Date(data.deadline).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' }) : 'Automat 30 zile', ok: true },
          ].map((row, i, arr) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 13px', borderBottom: i < arr.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: row.ok ? '#dcfce7' : row.optional ? '#fef9c3' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {row.ok ? <Check size={10} color="#16a34a" strokeWidth={3} /> : <span style={{ fontSize: 9, color: row.optional ? '#92400e' : '#dc2626' }}>{row.optional ? '!' : '×'}</span>}
              </div>
              <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, flexShrink: 0 }}>{row.label}: </span>
              <span style={{ fontSize: 12, color: row.ok ? '#111' : row.optional ? '#92400e' : '#dc2626', fontWeight: 600 }}>
                {row.value || (row.optional ? 'Necompletat' : 'Lipsă')}
              </span>
            </div>
          ))}
        </div>
        {!data.story_instructions && (
          <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, padding: '9px 12px', display: 'flex', gap: 7 }}>
            <span style={{ flexShrink: 0 }}>⚠️</span>
            <p style={{ margin: 0, fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>Instrucțiunile lipsesc. Poți adăuga mai târziu din Admin.</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#f8f9fb' }}>

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #f0f0f0', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 20 }}>
        <button onClick={() => step > 1 ? setStep(s => s - 1) : router.back()}
          style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid #e5e7eb', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <ArrowLeft size={14} color="#6b7280" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#111' }}>Campanie nouă — Wizard</p>
          <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>Pasul {step} din 5 — {['Tip campanie','Detalii produs','Brief','Audiență','Confirmare'][step-1]}</p>
        </div>
        {/* Toggle preview pe mobil */}
        <button onClick={() => setShowPreview(p => !p)}
          className="lg:hidden"
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, border: '1px solid #e5e7eb', background: showPreview ? '#fff7ed' : 'white', fontSize: 11, fontWeight: 700, color: showPreview ? '#f97316' : '#6b7280', cursor: 'pointer' }}>
          {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
          {showPreview ? 'Editare' : 'Preview'}
        </button>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#f97316' }}>{pct}%</span>
      </div>

      {/* Progress */}
      <div style={{ height: 3, background: '#f0f0f0' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#f97316,#ec4899)', transition: 'width 0.3s' }} />
      </div>

      {/* Step dots */}
      <div style={{ background: 'white', borderBottom: '1px solid #f0f0f0', padding: '8px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: 380, margin: '0 auto' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: i + 1 < step ? '#f97316' : i + 1 === step ? '#111' : '#e5e7eb', transition: 'background 0.2s' }}>
                  {i + 1 < step ? <Check size={11} color="white" strokeWidth={3} /> : <span style={{ fontSize: 10, fontWeight: 800, color: i + 1 === step ? 'white' : '#9ca3af' }}>{i + 1}</span>}
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: i + 1 <= step ? '#111' : '#9ca3af', whiteSpace: 'nowrap' }}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: 1.5, background: i + 1 < step ? '#f97316' : '#e5e7eb', margin: '0 3px', marginBottom: 14, transition: 'background 0.2s' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Body — desktop: 2 coloane, mobil: 1 coloană cu toggle */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 16px 100px' }}>
        <div className="lg:grid lg:grid-cols-2 lg:gap-6">

          {/* Form — ascuns pe mobil când e preview activ */}
          <div style={{ display: showPreview ? 'none' : 'block' }} className="lg:!block">
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e5e7eb', padding: '20px 18px' }}>
              {renderStep()}
            </div>
          </div>

          {/* Preview — ascuns pe mobil când e form activ */}
          <div style={{ display: showPreview ? 'block' : 'none', marginTop: 0 }} className="lg:!block">
            <div style={{ position: 'sticky', top: 80 }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Eye size={12} /> Cum vede influencerul
              </p>
              <LivePreview data={data} />
            </div>
          </div>

        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderTop: '1px solid #f0f0f0', padding: '10px 16px', paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', gap: 8 }}>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              style={{ padding: '11px 18px', borderRadius: 11, border: '1.5px solid #e5e7eb', background: 'white', fontSize: 14, fontWeight: 700, color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeft size={15} /> Înapoi
            </button>
          )}
          {step < 5 ? (
            <button onClick={() => setStep(s => s + 1)}
              style={{ flex: 1, padding: '11px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#f97316,#ec4899)', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              Continuă <ArrowRight size={16} />
            </button>
          ) : (
            <button onClick={publish} disabled={saving}
              style={{ flex: 1, padding: '11px', borderRadius: 11, border: 'none', background: saving ? '#9ca3af' : 'linear-gradient(135deg,#16a34a,#15803d)', color: 'white', fontSize: 14, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <Rocket size={16} /> {saving ? 'Se publică...' : 'Activează campania'}
            </button>
          )}
        </div>
      </div>

    </div>
  )
}
