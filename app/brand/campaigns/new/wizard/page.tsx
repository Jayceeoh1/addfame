'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Rocket, Eye, EyeOff, Target, ImagePlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { publishCampaignWithFee } from '@/app/actions/campaigns'
import { InfluencerSlotsSelector, type FeeInfo } from '@/components/brand/InfluencerSlotsSelector'

const STEPS = ['Tip', 'Produs', 'Brief', 'Audiență', 'Confirmare']


const NW_CSS = `
.nw-top { display:flex; align-items:center; gap:14px; min-width:0; }
.nw-back { width:44px; height:44px; flex:none; border-radius:12px; border:1.5px solid #e5e3f3; background:#fff; color:#4a4770; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; text-decoration:none; font-family:inherit; padding:0; }
.nw-back:hover { background:#f7f4ff; border-color:#c9b9fb; }
.nw-top .tt { min-width:0; flex:1; }
.nw-top .tt h1 { font-size:28px; }
.nw-top .tt p { margin:4px 0 0; color:#6a6690; font-size:14px; }
.nw-steps { display:flex; align-items:center; gap:0; padding:14px 18px; overflow:hidden; }
.nw-step { display:flex; align-items:center; gap:10px; flex:none; min-width:0; }
.nw-step .b { width:30px; height:30px; flex:none; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800; background:#f0eff7; color:#8783a8; font-family:var(--font-display,system-ui),system-ui,sans-serif; }
.nw-step.on .b { background:linear-gradient(135deg,#2f6fe0,#5a35e6); color:#fff; box-shadow:0 8px 16px -8px rgba(90,53,230,.8); }
.nw-step.done .b { background:#dcf5ec; color:#14532d; }
.nw-step .l { font-size:13px; font-weight:700; color:#8783a8; white-space:nowrap; }
.nw-step.on .l { color:#14123a; }
.nw-step.done .l { color:#14532d; }
.nw-line { flex:1; height:2px; min-width:14px; margin:0 10px; border-radius:2px; background:#eeecf7; }
.nw-line.done { background:#9fdcc3; }
.nw-layout { display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:20px; align-items:start; }
.nw-main { display:flex; flex-direction:column; gap:16px; min-width:0; }
.nw-card { padding:22px; display:flex; flex-direction:column; gap:18px; }
.nw-ch { display:flex; align-items:flex-start; gap:12px; }
.nw-ch .num { width:30px; height:30px; flex:none; border-radius:10px; background:#efeaff; color:#4423c4; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px; font-family:var(--font-display,system-ui),system-ui,sans-serif; }
.nw-ch p { margin:3px 0 0; font-size:13px; color:#6a6690; }
.nw-f { display:flex; flex-direction:column; gap:7px; min-width:0; }
.nw-f > label, .nw-lab { font-size:13px; font-weight:700; color:#14123a; }
.nw-f > label small, .nw-lab small { font-weight:500; color:#8783a8; font-size:12px; }
.nw-in { width:100%; height:44px; border:1.5px solid #e5e3f3; border-radius:12px; padding:0 14px; font:inherit; font-size:15px; background:#fff; color:#14123a; outline:none; box-sizing:border-box; min-width:0; }
textarea.nw-in { height:auto; padding:11px 14px; resize:vertical; line-height:1.5; }
.nw-in:focus { border-color:#5a35e6; box-shadow:0 0 0 3px rgba(90,53,230,.1); }
.nw-hint { font-size:12px; color:#8783a8; margin:0; }
.nw-g2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.nw-tiles { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:10px; }
.nw-tile { position:relative; display:flex; align-items:center; gap:12px; min-height:56px; padding:12px 14px; border-radius:14px; border:1.5px solid #e5e3f3; background:#fff; color:#14123a; text-align:left; cursor:pointer; font-family:inherit; font-size:14px; min-width:0; transition:border-color .15s, background .15s; }
.nw-tile:hover { border-color:#b9a5f5; background:#faf8ff; }
.nw-tile.on { border-color:#5a35e6; background:#f7f4ff; box-shadow:0 0 0 3px rgba(90,53,230,.08); }
.nw-tile .t { flex:1; min-width:0; display:flex; flex-direction:column; gap:1px; }
.nw-tile .t b { font-size:14px; font-weight:700; }
.nw-tile .t span { font-size:12px; color:#6a6690; line-height:1.35; }
.nw-tile .ck { width:22px; height:22px; flex:none; border-radius:50%; border:1.5px solid #d8d5ec; display:flex; align-items:center; justify-content:center; color:#fff; }
.nw-tile.on .ck { background:#5a35e6; border-color:#5a35e6; }
.nw-tile .ic { width:38px; height:38px; flex:none; border-radius:11px; background:#f0eff7; display:flex; align-items:center; justify-content:center; font-size:19px; }
.nw-tile.on .ic { background:#efeaff; }
.nw-tile .pop { position:absolute; top:-9px; right:12px; background:#5a35e6; color:#fff; font-size:10px; font-weight:800; letter-spacing:.06em; padding:2px 8px; border-radius:99px; }
.nw-tile.c { flex-direction:column; justify-content:center; text-align:center; gap:2px; }
.nw-chips { display:flex; flex-wrap:wrap; gap:8px; }
.nw-chipbtn { display:inline-flex; align-items:center; min-height:44px; padding:0 16px; border-radius:999px; border:1.5px solid #e5e3f3; background:#fff; color:#4a4770; font-weight:600; font-size:14px; cursor:pointer; font-family:inherit; }
.nw-chipbtn:hover { border-color:#b9a5f5; }
.nw-chipbtn.on { background:#14123a; border-color:#14123a; color:#fff; }
.nw-box { border-radius:14px; padding:14px 16px; background:#f6f6fc; border:1px solid #eeecf7; display:flex; flex-direction:column; gap:8px; font-size:14px; }
.nw-box .r { display:flex; justify-content:space-between; gap:12px; }
.nw-box .r span:first-child { color:#6a6690; }
.nw-box .r b { text-align:right; min-width:0; overflow-wrap:anywhere; }
.nw-note { display:flex; gap:10px; align-items:flex-start; padding:12px 14px; border-radius:14px; font-size:13px; line-height:1.5; }
.nw-note.blue { background:#e6f0ff; color:#1d4fb8; }
.nw-note.amber { background:#fff1c2; color:#854d0e; }
.nw-note.red { background:#fde8e6; color:#b42318; font-weight:600; }
.nw-note.violet { background:#efeaff; color:#4423c4; }
.nw-sum { position:sticky; top:20px; padding:20px; display:flex; flex-direction:column; gap:14px; }
.nw-sum h3 { display:flex; align-items:center; gap:8px; }
.nw-sum .row { display:flex; justify-content:space-between; gap:12px; font-size:14px; align-items:baseline; }
.nw-sum .row span { color:#6a6690; flex:none; }
.nw-sum .row b { text-align:right; min-width:0; overflow-wrap:anywhere; font-weight:700; }
.nw-sum .big { font-family:var(--font-display,system-ui),system-ui,sans-serif; font-size:26px; font-weight:800; letter-spacing:-.02em; }
.nw-bar { position:sticky; bottom:12px; z-index:10; display:flex; gap:10px; align-items:center; justify-content:space-between; padding:10px; background:rgba(255,255,255,.96); backdrop-filter:blur(6px); border:1px solid #e5e3f3; border-radius:16px; box-shadow:0 14px 34px -16px rgba(20,18,58,.35); }
.nw-bar .st { font-size:13px; color:#6a6690; padding-left:8px; min-width:0; }
.nw-bar .acts { display:flex; gap:10px; margin-left:auto; min-width:0; }
.nw-bar .bu-btn { height:46px; }
.nw-drop { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; min-height:140px; padding:18px; border:2px dashed #cfc8ee; border-radius:16px; background:rgba(247,244,255,.5); cursor:pointer; text-align:center; color:#5a35e6; position:relative; overflow:hidden; transition:background .15s; }
.nw-drop:hover { background:#f7f4ff; }
.nw-drop b { font-size:14px; color:#14123a; }
.nw-drop span { font-size:12px; color:#6a6690; }
.nw-spin { animation:nwSpin 1s linear infinite; }
@keyframes nwSpin { to { transform:rotate(360deg) } }
@media (max-width:900px) {
  .nw-layout { grid-template-columns:minmax(0,1fr); }
  .nw-sum { position:static; }
}
@media (max-width:767px) {
  .nw-top { flex-wrap:wrap; }
  .nw-top .tt { flex:1 1 calc(100% - 60px); }
  .nw-top .tt h1 { font-size:24px; }
  .nw-steps { padding:12px 14px; }
  .nw-step:not(.on) .l { display:none; }
  .nw-line { margin:0 6px; min-width:8px; }
  .nw-card { padding:16px; gap:16px; }
  .nw-g2 { grid-template-columns:1fr; }
  .nw-tiles { grid-template-columns:1fr; }
  .nw-bar { bottom:8px; padding:8px; }
  .nw-bar .st { display:none; }
  .nw-bar .acts { width:100%; }
  .nw-bar .acts .bu-btn { flex:1; height:50px; }
}

.nw-bar .bu-btn { white-space:normal; text-align:center; line-height:1.2; height:auto; min-height:46px; padding-top:8px; padding-bottom:8px; }
.nw-sr { position:absolute; opacity:0; width:1px; height:1px; pointer-events:none; }
.nw-tile:focus-within { border-color:#5a35e6; }
.nw-tog { display:none; }
.wz-side { min-width:0; position:sticky; top:20px; }
@media (max-width:900px) {
  .nw-tog { display:inline-flex; height:44px; }
  .wz-side { display:none; position:static; }
  .nw-layout.wz-prev .wz-side { display:block; }
  .nw-layout.wz-prev .wz-form { display:none; }
}
@media (max-width:767px) { .nw-bar .acts .bu-btn { min-height:50px; } }
`

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
            { label: data.campaign_type === 'BARTER' ? '🎁 Ofertă Barter' : '💰 Campanie Plătită', sub: data.campaign_type === 'BARTER' ? 'Produs gratuit' : (data.payment_mode === 'FIXED' ? (data.pay_amount ? `${data.pay_amount} RON` : 'Sumă fixă') : 'De discutat') },
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
          <div style={{ flex: 1, background: 'linear-gradient(135deg,#2f6fe0, #5a35e6)', borderRadius: 8, padding: '8px', textAlign: 'center' }}>
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
  const [feeInfo, setFeeInfo] = useState<FeeInfo | null>(null)
  const [draftNotice, setDraftNotice] = useState<{ message: string; campaignId: string } | null>(null)

  const [data, setData] = useState({
    campaign_type: 'BARTER',
    payment_mode: 'FIXED',
    pay_amount: '',
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

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('type')
    if (t === 'PAID' || t === 'BARTER') setData(d => ({ ...d, campaign_type: t }))
  }, [])

  const togglePlatform = (p: string) => setData(d => ({
    ...d, platforms: d.platforms.includes(p) ? d.platforms.filter(x => x !== p) : [...d.platforms, p]
  }))

  const pct = Math.round((step / 5) * 100)
  const hasContent = data.tasks_ig_reel || data.tasks_ig_post || data.tasks_tt_video || data.tasks_stories_count > 0

  async function publish() {
    // Validări înainte de submit
    const numInfluencers = parseInt(data.max_influencers) || 0
    if (numInfluencers < 1) { alert('Numărul de influenceri trebuie să fie cel puțin 1.'); return }
    if (data.campaign_type === 'PAID' && data.payment_mode === 'FIXED' && (!data.pay_amount || parseFloat(data.pay_amount) <= 0)) {
      alert('Te rugăm să introduci suma per influencer.'); return
    }
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
      const payload = {
        brand_id: brand.id,
        title: data.title || data.product_name || 'Campanie nouă',
        campaign_type: data.campaign_type,
        payment_mode: data.campaign_type === 'PAID' ? data.payment_mode : null,
        budget_per_influencer: data.campaign_type === 'PAID' && data.payment_mode === 'FIXED' ? (parseFloat(data.pay_amount) || 0) : 0,
        budget: 0, // modelul cu taxă per influencer: fără escrow, plata influencerilor se face separat
        status: 'DRAFT', // se trimite la aprobare după plata taxei (mai jos)
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
      }

      // Draft deja salvat (sold insuficient anterior) → actualizăm draft-ul cu ultimele
      // modificări și reîncercăm publicarea, fără să creăm un duplicat
      if (draftNotice) {
        const { status: _ignored, ...draftFields } = payload as any  // statusul nu se schimbă de aici
        const { error: upErr } = await sb.from('campaigns').update(draftFields)
          .eq('id', draftNotice.campaignId).in('status', ['DRAFT', 'REJECTED'])
        if (upErr) { alert(upErr.message); return }
        const retry = await publishCampaignWithFee(draftNotice.campaignId, numInfluencers) as any
        if (!retry?.success) { setDraftNotice({ ...draftNotice, message: retry?.error || draftNotice.message }); return }
        router.push(`/brand/campaigns/${draftNotice.campaignId}`)
        return
      }

      const { data: camp, error } = await sb.from('campaigns').insert(payload).select().single()
      if (error) { alert(error.message); return }

      // Plata taxei (nr. influenceri × preț) și trimitere la aprobare
      const res = await publishCampaignWithFee(camp.id, numInfluencers) as any
      if (!res?.success) {
        setDraftNotice({ message: res?.error || 'Campania a fost salvată ca draft.', campaignId: camp.id })
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      router.push(`/brand/campaigns/${camp.id}`)
    } finally { setSaving(false) }
  }

  const secHead = (n: number, title: string, desc: string) => (
    <div className="nw-ch">
      <span className="num">{n}</span>
      <div><h2>{title}</h2><p>{desc}</p></div>
    </div>
  )
  const feeTotal = feeInfo ? (parseInt(data.max_influencers) || 1) * feeInfo.price : null
  const typeLabel = data.campaign_type === 'BARTER' ? 'Barter' : 'Plătită'

  const renderStep = () => {
    if (step === 1) return (
      <>
        <div className="bu-card nw-card">
          {secHead(1, 'Ce tip de campanie?', 'Alege modelul potrivit pentru afacerea ta.')}
          <div className="nw-tiles" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))' }}>
            {[
              { type: 'BARTER', icon: '🎁', title: 'Barter — produs gratuit', desc: 'Oferi produse în schimbul conținutului.' },
              { type: 'PAID', icon: '💰', title: 'Plătită — cash', desc: 'Plătești influencerii per postare livrată.' },
            ].map(opt => (
              <button key={opt.type} type="button" onClick={() => set('campaign_type', opt.type)}
                className={`nw-tile ${data.campaign_type === opt.type ? 'on' : ''}`} style={{ minHeight: 76 }}>
                <span className="ic">{opt.icon}</span>
                <span className="t"><b>{opt.title}</b><span>{opt.desc}</span></span>
                <span className="ck">{data.campaign_type === opt.type && <Check size={13} strokeWidth={3} />}</span>
              </button>
            ))}
          </div>
        </div>

        {data.campaign_type === 'PAID' && (
          <div className="bu-card nw-card">
            <div className="nw-f"><span className="nw-lab">Mod de plată</span></div>
            <div className="nw-tiles" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))' }}>
              {[
                { mode: 'FIXED', icon: '💵', title: 'Sumă fixă', desc: 'Setezi cât primește fiecare influencer.' },
                { mode: 'NEGOTIABLE', icon: '💬', title: 'De discutat cu influencerul', desc: 'Fără sumă fixată — vă înțelegeți direct.' },
              ].map(opt => (
                <button key={opt.mode} type="button" onClick={() => set('payment_mode', opt.mode)}
                  className={`nw-tile ${data.payment_mode === opt.mode ? 'on' : ''}`} style={{ minHeight: 76 }}>
                  <span className="ic">{opt.icon}</span>
                  <span className="t"><b>{opt.title}</b><span>{opt.desc}</span></span>
                  <span className="ck">{data.payment_mode === opt.mode && <Check size={13} strokeWidth={3} />}</span>
                </button>
              ))}
            </div>
            {data.payment_mode === 'FIXED' && (
              <div className="nw-f">
                <label>Sumă per influencer (RON) *</label>
                <input type="number" min={1} value={data.pay_amount} onChange={e => set('pay_amount', e.target.value)} placeholder="ex. 200" className="nw-in" />
                <p className="nw-hint">Suma pe care o primește fiecare influencer. Taxa AddFame se calculează separat, per influencer, la pasul „Audiență”.</p>
              </div>
            )}
          </div>
        )}
      </>
    )

    if (step === 2) return (
      <>
        <div className="bu-card nw-card">
          {secHead(2, 'Despre produsul tău', 'Influencerii vor vedea aceste detalii când aplică.')}
          <div className="nw-f"><label>Titlu campanie *</label><input value={data.title} onChange={e => set('title', e.target.value)} placeholder="ex. Colaborare skincare hidratare" className="nw-in" /></div>
          <div className="nw-f"><label>Produs / ofertă *</label><input value={data.product_name} onChange={e => set('product_name', e.target.value)} placeholder="ex. Set skincare hidratare intensă" className="nw-in" /></div>
          <div className="nw-f"><label>Descriere</label><textarea value={data.product_description} onChange={e => set('product_description', e.target.value)} placeholder="Ce este produsul, beneficii, de ce e special..." rows={3} className="nw-in" /></div>
          <div className="nw-f"><label>Valoare produs (RON)</label><input type="number" value={data.offer_value} onChange={e => set('offer_value', e.target.value)} placeholder="150" className="nw-in" /></div>
        </div>
        <div className="bu-card nw-card">
          <div className="nw-f"><span className="nw-lab">Imagini produs</span></div>
          <label className="nw-drop">
            <span className="bu-ico" style={{ background: '#efeaff' }}><ImagePlus size={20} /></span>
            <b>Apasă pentru a adăuga imagini</b>
            <span>JPG, PNG, WEBP — max 5MB</span>
            <input type="file" accept="image/*" multiple style={{ display: 'none' }}
              onChange={async e => {
                const files = Array.from(e.target.files || [])
                if (!files.length) return
                const sb = (await import('@/lib/supabase/client')).createClient()
                const urls: string[] = []
                for (const file of files.slice(0, 5)) {
                  const ext = file.name.split('.').pop()
                  const path = `wizard/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
                  const { error } = await sb.storage.from('campaign-images').upload(path, file, { upsert: false })
                  if (!error) {
                    const { data: urlData } = sb.storage.from('campaign-images').getPublicUrl(path)
                    if (urlData?.publicUrl) urls.push(urlData.publicUrl)
                  }
                }
                if (urls.length) set('offer_images', [...(data.offer_images || []), ...urls])
              }} />
          </label>
          {data.offer_images?.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {data.offer_images.map((url: string, i: number) => (
                <div key={i} style={{ position: 'relative', width: 76, height: 76 }}>
                  <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12, border: '1px solid #e5e3f3' }} alt="" />
                  <button type="button" aria-label="Șterge imaginea" onClick={() => set('offer_images', data.offer_images.filter((_: string, j: number) => j !== i))}
                    style={{ position: 'absolute', top: -8, right: -8, width: 26, height: 26, borderRadius: '50%', background: '#b42318', border: '2px solid #fff', color: 'white', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, padding: 0 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    )

    if (step === 3) return (
      <>
        <div className="bu-card nw-card">
          {secHead(3, 'Ce trebuie să posteze?', 'Cu cât ești mai specific, cu atât rezultatele sunt mai bune.')}
          <div className="nw-f">
            <label>Platforme *</label>
            <div className="nw-chips">
              {['Instagram', 'TikTok', 'YouTube', 'Facebook'].map(p => (
                <button key={p} type="button" onClick={() => togglePlatform(p)} className={`nw-chipbtn ${data.platforms.includes(p) ? 'on' : ''}`}>{p}</button>
              ))}
            </div>
          </div>
          <div className="nw-f">
            <label>Tip conținut *</label>
            <div className="nw-tiles">
              {[
                { key: 'tasks_ig_reel', label: '🎬 Reel Instagram' },
                { key: 'tasks_ig_post', label: '🖼️ Post feed Instagram' },
                { key: 'tasks_tt_video', label: '🎵 Video TikTok' },
              ].map(t => (
                <label key={t.key} className={`nw-tile ${(data as any)[t.key] ? 'on' : ''}`}>
                  <input type="checkbox" className="nw-sr" checked={(data as any)[t.key]} onChange={e => set(t.key, e.target.checked)} />
                  <span className="t"><b>{t.label}</b></span>
                  <span className="ck">{(data as any)[t.key] && <Check size={13} strokeWidth={3} />}</span>
                </label>
              ))}
              <label className={`nw-tile ${data.tasks_stories_count > 0 ? 'on' : ''}`}>
                <input type="checkbox" className="nw-sr" checked={data.tasks_stories_count > 0} onChange={e => set('tasks_stories_count', e.target.checked ? 2 : 0)} />
                <span className="t"><b>📱 Stories Instagram</b></span>
                {data.tasks_stories_count > 0 && (
                  <input type="number" min={1} max={10} value={data.tasks_stories_count}
                    onChange={e => set('tasks_stories_count', parseInt(e.target.value))}
                    onClick={e => e.stopPropagation()}
                    className="nw-in" style={{ width: 64, height: 44, padding: '0 8px', textAlign: 'center', flex: 'none' }} />
                )}
                <span className="ck">{data.tasks_stories_count > 0 && <Check size={13} strokeWidth={3} />}</span>
              </label>
            </div>
          </div>
        </div>
        <div className="bu-card nw-card">
          <div className="nw-f"><label>Instrucțiuni postare</label><textarea value={data.story_instructions} onChange={e => set('story_instructions', e.target.value)} placeholder="ex. Filmează-te folosind produsul dimineața, menționează că hidratează 24h..." rows={3} className="nw-in" /></div>
          <div className="nw-g2">
            <div className="nw-f"><label>Hashtag-uri obligatorii</label><input value={data.required_hashtags} onChange={e => set('required_hashtags', e.target.value)} placeholder="#brand #colaborare #ad" className="nw-in" /></div>
            <div className="nw-f"><label>Link de promovat</label><input value={data.promotion_link} onChange={e => set('promotion_link', e.target.value)} placeholder="https://brand.ro/produs" className="nw-in" /></div>
          </div>
        </div>
      </>
    )

    if (step === 4) return (
      <>
        <div className="bu-card nw-card">
          {secHead(4, 'Audiență și deadline', 'Câți influenceri vrei și când se termină campania.')}
          <InfluencerSlotsSelector
            value={parseInt(data.max_influencers) || 1}
            onChange={v => set('max_influencers', String(v))}
            onInfo={setFeeInfo}
          />
        </div>
        <div className="bu-card nw-card">
          <div className="nw-g2">
            <div className="nw-f"><label>Deadline *</label><input type="date" value={data.deadline} onChange={e => set('deadline', e.target.value)} className="nw-in" /></div>
            <div className="nw-f">
              <label>Followeri minimi</label>
              <select value={data.min_followers} onChange={e => set('min_followers', e.target.value)} className="nw-in">
                <option value="">Orice dimensiune</option>
                <option value="1000">1.000+</option>
                <option value="5000">5.000+</option>
                <option value="10000">10.000+</option>
                <option value="50000">50.000+</option>
              </select>
            </div>
          </div>
        </div>
      </>
    )

    // Step 5 — Confirmare
    return (
      <>
        <div className="bu-card nw-card">
          {secHead(5, 'Totul arată bine?', 'Verifică înainte să trimiți campania la aprobare.')}
          <div style={{ border: '1px solid #eeecf7', borderRadius: 14, overflow: 'hidden' }}>
            {[
              { label: 'Tip', value: data.campaign_type === 'BARTER' ? '🎁 Barter' : '💰 Plătită', ok: true },
              ...(data.campaign_type === 'PAID' ? [{ label: 'Plată', value: data.payment_mode === 'FIXED' ? `${data.pay_amount || '—'} RON / influencer` : 'De discutat cu influencerul', ok: data.payment_mode === 'NEGOTIABLE' || !!data.pay_amount }] : []),
              { label: 'Titlu', value: data.title || data.product_name, ok: !!(data.title || data.product_name) },
              { label: 'Produs', value: data.product_name || null, ok: !!data.product_name },
              { label: 'Platforme', value: data.platforms.join(', '), ok: data.platforms.length > 0 },
              { label: 'Conținut', value: [data.tasks_ig_reel && 'Reel', data.tasks_ig_post && 'Post', data.tasks_tt_video && 'TikTok', data.tasks_stories_count > 0 && `${data.tasks_stories_count} Stories`].filter(Boolean).join(', ') || null, ok: hasContent },
              { label: 'Instrucțiuni', value: data.story_instructions ? data.story_instructions.substring(0, 50) + '...' : null, ok: !!data.story_instructions, optional: true },
              { label: 'Influenceri', value: `${data.max_influencers} persoane`, ok: true },
              { label: 'Taxă AddFame', value: feeInfo ? `${((parseInt(data.max_influencers) || 1) * feeInfo.price).toLocaleString('ro-RO')} RON (${data.max_influencers} × ${feeInfo.price.toLocaleString('ro-RO')} RON)` : null, ok: !feeInfo || feeInfo.enough, optional: true },
              { label: 'Deadline', value: data.deadline ? new Date(data.deadline).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' }) : 'Automat 30 zile', ok: true },
            ].map((row, i, arr) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', minHeight: 44, borderBottom: i < arr.length - 1 ? '1px solid #eeecf7' : 'none' }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: row.ok ? '#dcf5ec' : row.optional ? '#fff1c2' : '#fde8e6', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                  {row.ok ? <Check size={11} color="#14532d" strokeWidth={3} /> : <span style={{ fontSize: 10, fontWeight: 800, color: row.optional ? '#854d0e' : '#b42318' }}>{row.optional ? '!' : '×'}</span>}
                </span>
                <span className="bu-sm bu-muted" style={{ flex: 'none', minWidth: 84 }}>{row.label}</span>
                <b style={{ fontSize: 14, minWidth: 0, overflowWrap: 'anywhere', color: row.ok ? '#14123a' : row.optional ? '#854d0e' : '#b42318' }}>
                  {row.value || (row.optional ? 'Necompletat' : 'Lipsă')}
                </b>
              </div>
            ))}
          </div>
        </div>
        {feeInfo && !feeInfo.enough && (
          <div className="nw-note violet">
            <span>
              Sold insuficient pentru taxa de {((parseInt(data.max_influencers) || 1) * feeInfo.price).toLocaleString('ro-RO')} RON.
              Campania se va salva ca <strong>draft</strong> — o publici după ce <a href="/brand/wallet" style={{ color: '#4423c4', fontWeight: 800 }}>adaugi credite</a>.
            </span>
          </div>
        )}
        {!data.story_instructions && (
          <div className="nw-note amber"><span>Instrucțiunile lipsesc. Poți adăuga mai târziu din Admin.</span></div>
        )}
      </>
    )
  }

  return (
    <div className="bu">
      <style>{NW_CSS}</style>

      {/* Header */}
      <div className="nw-top">
        <button type="button" className="nw-back" aria-label="Înapoi" onClick={() => step > 1 ? setStep(s => s - 1) : router.back()}>
          <ArrowLeft size={18} />
        </button>
        <div className="tt">
          <h1>Campanie nouă</h1>
          <p>Pasul {step} din 5 — {['Tip campanie', 'Detalii produs', 'Brief', 'Audiență', 'Confirmare'][step - 1]}</p>
        </div>
        <button type="button" onClick={() => setShowPreview(p => !p)} className="bu-btn nw-tog">
          {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
          {showPreview ? 'Editare' : 'Previzualizare'}
        </button>
        <b style={{ color: '#5a35e6', fontFamily: 'var(--font-display,system-ui)' }}>{pct}%</b>
      </div>

      {/* Stepper */}
      <div className="bu-card nw-steps">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`nw-step ${i + 1 === step ? 'on' : i + 1 < step ? 'done' : ''}`}>
              <span className="b">{i + 1 < step ? <Check size={15} strokeWidth={3} /> : i + 1}</span>
              <span className="l">{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`nw-line ${i + 1 < step ? 'done' : ''}`} />}
          </React.Fragment>
        ))}
      </div>

      {draftNotice && (
        <div className="nw-note violet" style={{ flexDirection: 'column', gap: 8 }}>
          <b style={{ fontSize: 14 }}>Campania a fost salvată ca draft</b>
          <span>{draftNotice.message}</span>
          <div className="bu-row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <a href="/brand/wallet" className="bu-btn p">Adaugă credite</a>
            <a href={`/brand/campaigns/${draftNotice.campaignId}`} className="bu-btn">Deschide draft-ul</a>
          </div>
        </div>
      )}

      <div className={`nw-layout ${showPreview ? 'wz-prev' : ''}`}>
        {/* Formular */}
        <div className="nw-main wz-form">
          {renderStep()}
        </div>

        {/* Rezumat + previzualizare */}
        <div className="wz-side">
          <div className="bu-card nw-sum" style={{ position: 'static' }}>
            <h3><Target size={17} color="#5a35e6" /> Rezumat</h3>
            <div className="row"><span>Tip</span><b>{typeLabel}</b></div>
            {data.campaign_type === 'PAID' && (
              <div className="row"><span>Plată</span><b>{data.payment_mode === 'FIXED' ? (data.pay_amount ? `${data.pay_amount} RON / infl.` : '—') : 'De discutat'}</b></div>
            )}
            {data.campaign_type === 'BARTER' && (
              <div className="row"><span>Valoare produs</span><b>{data.offer_value ? `${data.offer_value} RON` : '—'}</b></div>
            )}
            <div className="row"><span>Platforme</span><b>{data.platforms.length ? data.platforms.join(', ') : '—'}</b></div>
            <div className="row"><span>Locuri</span><b>{data.max_influencers || '—'}</b></div>
            <div className="bu-div" />
            <div className="row"><span>{data.campaign_type === 'BARTER' ? 'Taxă publicare' : 'Taxă AddFame'}</span><b className="big">{feeTotal !== null ? `${feeTotal.toLocaleString('ro-RO')} RON` : '—'}</b></div>
            {feeInfo && !feeInfo.enough && <div className="nw-note amber">Sold insuficient — se salvează ca draft.</div>}
          </div>
          <p className="bu-label" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '18px 0 8px' }}><Eye size={12} /> Cum vede influencerul</p>
          <LivePreview data={data} />
        </div>
      </div>

      {/* Bară de acțiuni */}
      <div className="nw-bar">
        <span className="st">Pasul {step} din 5 — {STEPS[step - 1]}</span>
        <div className="acts">
          {step > 1 && (
            <button type="button" onClick={() => setStep(s => s - 1)} className="bu-btn big"><ArrowLeft size={16} /> Înapoi</button>
          )}
          {step < 5 ? (
            <button type="button" onClick={() => setStep(s => s + 1)} className="bu-btn p big">Continuă <ArrowRight size={16} /></button>
          ) : (
            <button type="button" onClick={publish} disabled={saving} className="bu-btn p big">
              <Rocket size={16} /> {saving ? 'Se trimite...' : feeInfo && !feeInfo.enough ? 'Salvează ca draft' : feeInfo ? `Plătește ${((parseInt(data.max_influencers) || 1) * feeInfo.price).toLocaleString('ro-RO')} RON și trimite` : 'Trimite la aprobare'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
