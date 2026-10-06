'use client'
// @ts-nocheck
// Secțiuni comune pentru vizualizarea unei campanii de către influencer
// (folosite de foaia de detalii din /influencer/campaigns și de /influencer/campaigns/[id]).
import React from 'react'
import { Copy, ExternalLink, FileText, Ban, Truck, MapPin, CalendarCheck, Check } from 'lucide-react'
import { InstagramIcon, TikTokIcon, YoutubeIcon, TwitterXIcon, LinkedInIcon } from '@/components/shared/platform-icons'

export const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 864e5)
export const fmtDate = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })

export const CAMPAIGN_CSS = `
.cp-hero { position:relative; overflow:hidden; border-radius:20px; min-height:200px; display:flex; align-items:flex-end; background:linear-gradient(135deg,#2a1466,#5b2fd0 60%,#9030f0); color:#fff; }
.cp-hero.barter { background:linear-gradient(135deg,#17306b,#2f6fe0 60%,#5a35e6); }
.cp-hero img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
.cp-hero::before { content:''; position:absolute; inset:0; background:linear-gradient(to bottom, rgba(20,18,58,.05) 15%, rgba(20,18,58,.78)); z-index:1; }
.cp-hero::after { content:''; position:absolute; right:-40px; top:-60px; width:200px; height:200px; border-radius:50%; background:rgba(255,255,255,.1); z-index:1; pointer-events:none; }
.cp-hero-in { position:relative; z-index:2; padding:22px 24px; display:flex; flex-direction:column; gap:10px; width:100%; box-sizing:border-box; }
.cp-hero h1 { color:#fff; font-size:30px; overflow-wrap:anywhere; }
.cp-brand { font-size:12px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:rgba(255,255,255,.78); }
.cp-stats { display:grid; grid-template-columns:repeat(3,1fr); }
.cp-stat { padding:16px 18px; display:flex; flex-direction:column; gap:2px; min-width:0; }
.cp-stat + .cp-stat { border-left:1px solid #eeecf7; }
.cp-stat b { font-family:var(--font-display,system-ui),system-ui,sans-serif; font-size:22px; letter-spacing:-.02em; line-height:1.15; overflow-wrap:anywhere; }
.cp-sec { padding:20px; display:flex; flex-direction:column; gap:12px; }
.cp-sec-h { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }
.cp-txt { margin:0; font-size:14px; line-height:1.75; color:#2a2850; white-space:pre-wrap; overflow-wrap:anywhere; }
.cp-note { border-radius:16px; padding:14px 16px; display:flex; flex-direction:column; gap:8px; border:1px solid transparent; }
.cp-tasks { display:flex; flex-direction:column; gap:10px; }
.cp-task { display:flex; align-items:center; gap:12px; padding:12px; border:1px solid #e5e3f3; border-radius:14px; background:#fff; min-width:0; }
.cp-task-n { width:28px; height:28px; border-radius:50%; background:#efeaff; color:#5b2fd0; display:flex; align-items:center; justify-content:center; flex:none; font-size:12px; font-weight:800; }
.cp-pico { width:36px; height:36px; border-radius:10px; background:#f6f6fc; border:1px solid #eeecf7; display:flex; align-items:center; justify-content:center; flex:none; color:#4a4770; }
.cp-pico svg { width:20px; height:20px; }
.cp-task-t { flex:1; min-width:0; display:flex; flex-direction:column; }
.cp-task-t b { font-size:14px; overflow-wrap:anywhere; }
.cp-chk { display:flex; align-items:flex-start; gap:10px; padding:9px 0; border-bottom:1px solid #f1f0f8; }
.cp-chk:last-child { border-bottom:0; }
.cp-chk p { margin:0; font-size:14px; color:#2a2850; overflow-wrap:anywhere; }
.cp-tick { width:20px; height:20px; border-radius:50%; background:#dcf5ec; color:#16a34a; display:flex; align-items:center; justify-content:center; flex:none; margin-top:1px; }
.cp-num { width:22px; height:22px; border-radius:50%; background:#efeaff; color:#5b2fd0; display:flex; align-items:center; justify-content:center; flex:none; margin-top:1px; font-size:11px; font-weight:800; }
.cp-step { display:flex; gap:12px; align-items:flex-start; position:relative; }
.cp-step-n { width:28px; height:28px; border-radius:50%; background:#efeaff; color:#5b2fd0; display:flex; align-items:center; justify-content:center; flex:none; font-size:12px; font-weight:800; z-index:1; }
.cp-two { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.cp-cta { display:flex; align-items:center; gap:12px; padding:14px 16px; min-width:0; }
.cp-copy { height:34px; padding:0 12px; font-size:12px; border-radius:10px; }
.cp-quote { border-left:3px solid #cdb8ff; padding-left:12px; }
.cp-kv { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.cp-kv > div { background:#f6f6fc; border-radius:12px; padding:10px 12px; min-width:0; display:flex; flex-direction:column; gap:2px; }
.cp-kv b { font-size:14px; overflow-wrap:anywhere; }
.cp-tags { display:flex; flex-wrap:wrap; gap:6px; }
.cp-tags .iu-chip svg { width:16px; height:16px; }
@media (max-width:767px) {
  .cp-hero { min-height:170px; border-radius:16px; }
  .cp-hero-in { padding:16px; }
  .cp-hero h1 { font-size:24px; }
  .cp-stat { padding:12px 10px; }
  .cp-stat b { font-size:16px; }
  .cp-two { grid-template-columns:1fr; }
  .cp-sec { padding:16px; }
  .cp-copy { min-height:44px; }
  .cp-cta { flex-wrap:wrap; }
  .cp-cta .iu-btn { width:100%; min-height:44px; }
}
`

function FbIcon() {
  return <svg viewBox="0 0 24 24" fill="#2563eb"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
}

function PlatIco({ p }: { p: string }) {
  const k = (p || '').toLowerCase()
  if (k === 'instagram') return <InstagramIcon />
  if (k === 'tiktok') return <TikTokIcon />
  if (k === 'youtube') return <YoutubeIcon />
  if (k === 'facebook') return <FbIcon />
  if (k === 'x' || k === 'twitter') return <TwitterXIcon />
  if (k === 'linkedin') return <LinkedInIcon />
  return <FileText size={18} />
}

const PLAT_LABEL: Record<string, string> = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', facebook: 'Facebook', x: 'X', twitter: 'X', linkedin: 'LinkedIn' }

export function buildTasks(s: any) {
  const t: { plat: string; label: string; sub?: string }[] = []
  const igDays = s.tasks_ig_days_online ? `online minim ${s.tasks_ig_days_online} zile` : undefined
  if ((s.tasks_stories_count ?? 0) > 0) t.push({ plat: 'instagram', label: `${s.tasks_stories_count} Instagram ${s.tasks_stories_count === 1 ? 'Story' : 'Stories'}` })
  if (s.tasks_ig_reel) t.push({ plat: 'instagram', label: 'Instagram Reel', sub: [s.tasks_ig_reel_duration ? `minim ${s.tasks_ig_reel_duration} secunde` : '', igDays || ''].filter(Boolean).join(' · ') || undefined })
  if (s.tasks_ig_post || s.tasks_include_post) t.push({ plat: 'instagram', label: 'Post Feed Instagram', sub: ['foto sau carousel', igDays || ''].filter(Boolean).join(' · ') })
  if (s.tasks_ig_live) t.push({ plat: 'instagram', label: 'Instagram Live' })
  if (s.tasks_tt_video) t.push({ plat: 'tiktok', label: 'TikTok Video', sub: [s.tasks_tt_video_duration ? `minim ${s.tasks_tt_video_duration} sec` : '', s.tasks_tt_days_online ? `online minim ${s.tasks_tt_days_online === 9999 ? 'permanent' : s.tasks_tt_days_online + ' zile'}` : ''].filter(Boolean).join(' · ') || undefined })
  if (s.tasks_tt_live) t.push({ plat: 'tiktok', label: 'TikTok Live' })
  if (s.tasks_tt_duet) t.push({ plat: 'tiktok', label: 'TikTok Duet / Stitch' })
  if (s.tasks_yt_short) t.push({ plat: 'youtube', label: 'YouTube Short', sub: s.tasks_yt_short_duration ? `minim ${s.tasks_yt_short_duration} sec` : undefined })
  if (s.tasks_yt_video) t.push({ plat: 'youtube', label: 'Video YouTube', sub: s.tasks_yt_video_duration ? `minim ${s.tasks_yt_video_duration} min` : undefined })
  if (s.tasks_yt_mention) t.push({ plat: 'youtube', label: 'Mențiune YouTube' })
  if (s.tasks_yt_link_in_desc) t.push({ plat: 'youtube', label: 'Link în descrierea video' })
  if (s.tasks_fb_post) t.push({ plat: 'facebook', label: 'Facebook Post' })
  if (s.tasks_fb_story) t.push({ plat: 'facebook', label: 'Facebook Story' })
  if (s.tasks_fb_reel) t.push({ plat: 'facebook', label: 'Facebook Reel' })
  if (s.tasks_fb_share) t.push({ plat: 'facebook', label: 'Share postare Facebook' })
  return t
}

const arr = (v: any): string[] => Array.isArray(v) ? v : []

/** Hero: tip, brand, titlu (+ imagine de fundal opțională). */
export function CampaignHero({ c, applied, imageUrl }: { c: any; applied?: boolean; imageUrl?: string }) {
  const barter = c.campaign_type?.toUpperCase() === 'BARTER'
  const days = c.deadline ? daysLeft(c.deadline) : 999
  const expired = days < 0
  const urgent = !expired && days <= 3
  const spots = (c.max_influencers || 0) - (c.current_influencers || 0)
  const title = (c.title || '').replace(/^(\[(Barter|Managed|Paid)\]\s*)+/i, '') || c.brand_name
  return (
    <div className={`cp-hero ${barter ? 'barter' : ''}`}>
      {imageUrl && <img src={imageUrl} alt={title} />}
      <div className="cp-hero-in">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="iu-chip" style={barter ? { background: '#e6f0ff', color: '#1d4fb8' } : { background: '#efeaff', color: '#5b2fd0' }}>{barter ? 'Barter' : 'Plătită'}</span>
          {applied && <span className="iu-chip" style={{ background: '#dcf5ec', color: '#14532d' }}><Check size={12} /> Aplicat</span>}
          {urgent && !applied && <span className="iu-chip" style={{ background: '#fff1e6', color: '#9a4206' }}>Urgent</span>}
          {!expired && spots > 0 && c.max_influencers && <span className="iu-chip" style={{ background: '#dcf5ec', color: '#14532d' }}>{spots} {spots === 1 ? 'loc rămas' : 'locuri rămase'}</span>}
        </div>
        <span className="cp-brand">{c.brand_name}</span>
        <h1>{title}</h1>
      </div>
    </div>
  )
}

/** Banda de statistici: recompensă, deadline, locuri. */
export function CampaignStats({ c, collabAmount }: { c: any; collabAmount?: number }) {
  const barter = c.campaign_type?.toUpperCase() === 'BARTER'
  const has = !!c.deadline
  const days = has ? daysLeft(c.deadline) : 999
  const expired = has && days < 0
  const urgent = !expired && days <= 3
  const amt = collabAmount || c.budget_per_influencer || c.budget
  const negotiable = c.payment_mode === 'NEGOTIABLE' || !amt
  return (
    <div className="iu-card cp-stats">
      <div className="cp-stat">
        <span className="iu-label">{barter ? 'Primești' : 'Câștig'}</span>
        <b style={{ color: '#5b2fd0' }}>{barter ? (c.offer_name || 'Produs gratuit') : negotiable ? 'De discutat' : `${amt} RON`}</b>
        <span className="iu-xs iu-muted">{barter ? 'gratuit' : negotiable ? 'preț negociat' : 'recompensă'}</span>
      </div>
      <div className="cp-stat">
        <span className="iu-label">Deadline</span>
        <b style={{ color: expired ? '#b42318' : urgent ? '#9a4206' : '#14123a' }}>{!has ? '—' : expired ? 'Expirat' : `${days} zile`}</b>
        <span className="iu-xs iu-muted">{has ? fmtDate(c.deadline) : ''}</span>
      </div>
      <div className="cp-stat">
        <span className="iu-label">Locuri</span>
        <b>{c.current_influencers || 0}/{c.max_influencers || '∞'}</b>
        <span className="iu-xs iu-muted">ocupate</span>
      </div>
    </div>
  )
}

function Chk({ children }: { children: React.ReactNode }) {
  return (
    <div className="cp-chk">
      <div className="cp-tick"><Check size={11} strokeWidth={3} /></div>
      <p>{children}</p>
    </div>
  )
}

function CopyBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return <button type="button" className="iu-btn cp-copy" onClick={onClick}><Copy size={13} />{children}</button>
}

const PROOF: Record<string, string> = { screenshot_post: 'Screenshot postare', link_post: 'Link postare', screenshot_insights: 'Screenshot insights', video_proof: 'Video dovadă' }
const PLACEMENT: Record<string, string> = { bio: 'Adaugă în bio pe durata campaniei', swipeup: 'Swipe-up în Stories', verbal: 'Menționat verbal în video', description: 'Link în descrierea video (YouTube)' }

/** Toate cardurile de conținut ale campaniei. */
export function CampaignSections({ c, onCopy }: { c: any; onCopy?: (text: string, msg: string) => void }) {
  const barter = c.campaign_type?.toUpperCase() === 'BARTER'
  const delivery = c.delivery_method === 'delivery'
  const needsAddress = barter && delivery
  const tasks = buildTasks(c)
  const hashtags: string[] = typeof c.required_hashtags === 'string' ? c.required_hashtags.split(/\s+/).filter(Boolean) : arr(c.required_hashtags)
  const keyMessages = arr(c.key_messages)
  const forbiddenMentions = arr(c.forbidden_mentions)
  const contentTone = arr(c.content_tone)
  const contentType = arr(c.content_type)
  const proof = arr(c.proof_requirements)
  const linkPlacements = arr(c.promotion_link_placement)
  const storyIncludes = [
    c.story_include_instagram && 'Instagram-ul brandului (menționează @handle)',
    c.story_include_atmosphere && 'Atmosfera și ambianța locului',
    c.story_include_product && (barter ? 'Produsul/serviciul primit gratuit' : 'Produsul promovat'),
  ].filter(Boolean) as string[]
  const copy = (t: string, m: string) => onCopy && onCopy(t, m)
  const url = c.brief_pdf_url as string | undefined
  const isImg = url ? /\.(png|jpe?g|webp)$/i.test(url) : false
  const hasCreate = contentType.length > 0 || c.min_duration || contentTone.length > 0 || c.product_in_frame || c.mention_price || c.link_in_bio || c.discount_code || storyIncludes.length > 0
  const platforms: string[] = arr(c.platforms)
  const niches: string[] = arr(c.niches)
  const countries: string[] = arr(c.countries)
  const minDays = c.min_days_online > 0 ? c.min_days_online : 0
  const finishSteps = [
    { title: 'Aplică la campanie', sub: needsAddress ? 'Completează adresa de livrare' : 'Trimite aplicația ta' },
    barter && delivery && { title: 'Primești produsul acasă', sub: 'Bifează în AddFame că l-ai primit' },
    barter && !delivery && { title: 'Ridică de la locație', sub: c.pickup_location_name ? `Locație: ${c.pickup_location_name}` : 'Conform detaliilor brandului' },
    { title: `Postează în ${c.post_deadline_days || 5} zile${barter ? ' de la primire' : ''}`, sub: 'Respectă instrucțiunile și hashtag-urile' },
    { title: 'Trimite dovada în AddFame', sub: 'Link postare + screenshot obligatoriu' },
  ].filter(Boolean) as any[]

  return (
    <>
      {/* Brief PDF / imagine */}
      {url && (
        <div className="iu-card cp-cta" style={{ borderColor: '#cdb8ff', background: '#faf8ff' }}>
          <div className="iu-ico" style={{ background: '#efeaff', color: '#5b2fd0' }}><FileText size={20} /></div>
          <div className="iu-col" style={{ flex: 1, minWidth: 0 }}>
            <b className="iu-sm">Citește brieful campaniei</b>
            <span className="iu-xs iu-muted">Document obligatoriu înainte de a posta</span>
          </div>
          <a href={url} target="_blank" rel="noopener noreferrer" className="iu-btn p">{isImg ? 'Deschide' : 'Deschide PDF'} <ExternalLink size={14} /></a>
        </div>
      )}

      {/* Ce trebuie să faci */}
      {(tasks.length > 0 || c.deliverables || c.story_instructions) && (
        <div className="iu-card cp-sec">
          <div className="cp-sec-h">
            <h3>Ce trebuie să faci</h3>
            {tasks.length > 0 && <span className="iu-chip" style={{ background: '#efeaff', color: '#5b2fd0' }}>{tasks.length} {tasks.length === 1 ? 'task' : 'task-uri'}</span>}
          </div>
          {c.deliverables && <p className="iu-sm iu-muted" style={{ margin: 0, fontWeight: 600 }}>{c.deliverables}</p>}
          {tasks.length > 0 && (
            <div className="cp-tasks">
              {tasks.map((t, i) => (
                <div key={i} className="cp-task">
                  <span className="cp-task-n">{i + 1}</span>
                  <span className="cp-pico" title={PLAT_LABEL[t.plat]}><PlatIco p={t.plat} /></span>
                  <div className="cp-task-t">
                    <b>{t.label}</b>
                    {t.sub && <span className="iu-xs iu-muted">{t.sub}</span>}
                  </div>
                  <span className="iu-chip" style={{ background: '#f0eff7', color: '#4a4770' }}>obligatoriu</span>
                </div>
              ))}
            </div>
          )}
          {tasks.length > 1 && (
            <div className="cp-note" style={{ background: '#fffaeb', borderColor: '#f5e2a0' }}>
              <p className="iu-sm" style={{ margin: 0, color: '#854d0e', fontWeight: 600 }}>Toate cele <strong>{tasks.length} task-uri sunt obligatorii</strong> — trimite link dovadă pentru fiecare postare.</p>
            </div>
          )}
          {minDays > 0 && !c.tasks_ig_days_online && !c.tasks_tt_days_online && (
            <p className="iu-sm iu-muted" style={{ margin: 0 }}>Postarea rămâne online minim <strong>{minDays} zile</strong></p>
          )}
          {c.story_instructions && (
            <div className="iu-col" style={{ gap: 6, paddingTop: 12, borderTop: '1px solid #eeecf7' }}>
              <span className="iu-label">Instrucțiuni complete</span>
              <p className="cp-txt">{c.story_instructions}</p>
            </div>
          )}
        </div>
      )}

      {/* Descriere / Brief */}
      {c.description && (
        <div className="iu-card cp-sec">
          <h3>Descriere</h3>
          <p className="cp-txt">{c.description}</p>
        </div>
      )}

      {/* Oferta (barter) */}
      {barter && (c.offer_name || c.offer_description) && (
        <div className="iu-card cp-sec">
          <span className="iu-label">Despre ofertă</span>
          {c.offer_name && <h3>{c.offer_name}</h3>}
          {c.offer_description && <p className="cp-txt">{c.offer_description}</p>}
        </div>
      )}

      {/* Produs de promovat */}
      {(c.product_name || c.product_description) && (
        <div className="iu-card cp-sec">
          <span className="iu-label">Produs de promovat</span>
          {c.product_name && <h3>{c.product_name}</h3>}
          {c.product_url && <a href={c.product_url} target="_blank" rel="noopener noreferrer" className="iu-sm" style={{ color: '#5b2fd0', fontWeight: 700, wordBreak: 'break-all' }}>{c.product_url}</a>}
          {c.product_description && <p className="cp-txt">{c.product_description}</p>}
        </div>
      )}

      {/* Ce trebuie să creezi */}
      {hasCreate && (
        <div className="iu-card cp-sec">
          <h3>Ce trebuie să creezi</h3>
          {contentType.length > 0 && (
            <div className="cp-tags">{contentType.map(t => <span key={t} className="iu-chip" style={{ background: '#efeaff', color: '#5b2fd0', textTransform: 'capitalize' }}>{t}</span>)}</div>
          )}
          {contentTone.length > 0 && (
            <div className="iu-col" style={{ gap: 6 }}>
              <span className="iu-label">Ton dorit</span>
              <div className="cp-tags">{contentTone.map(t => <span key={t} className="iu-chip" style={{ background: '#fff1c2', color: '#854d0e' }}>{t}</span>)}</div>
            </div>
          )}
          <div>
            {c.min_duration && <Chk>Durată minimă: <strong>{c.min_duration} secunde</strong></Chk>}
            {c.product_in_frame && <Chk>Produsul trebuie să apară vizibil în cadru</Chk>}
            {c.mention_price && <Chk>Menționează prețul</Chk>}
            {c.link_in_bio && <Chk>Link în bio / swipe up obligatoriu</Chk>}
            {c.discount_code && <Chk>Cod discount de menționat: <strong style={{ color: '#5b2fd0' }}>{c.discount_code}</strong></Chk>}
            {storyIncludes.map((s, i) => <Chk key={i}>{s}</Chk>)}
          </div>
        </div>
      )}

      {/* Mesaje cheie */}
      {keyMessages.length > 0 && (
        <div className="iu-card cp-sec" style={{ gap: 4 }}>
          <h3 style={{ marginBottom: 6 }}>Ce trebuie să menționezi</h3>
          {keyMessages.map((m, i) => (
            <div key={i} className="cp-chk"><span className="cp-num">{i + 1}</span><p>{m}</p></div>
          ))}
        </div>
      )}

      {/* Caption & hashtag */}
      {(c.required_caption || hashtags.length > 0) && (
        <div className="iu-card cp-sec">
          <h3>Caption &amp; hashtag-uri</h3>
          {c.required_caption && (
            <div className="iu-col" style={{ gap: 8 }}>
              <div className="cp-sec-h">
                <span className="iu-label">Caption obligatoriu</span>
                {onCopy && <CopyBtn onClick={() => copy(c.required_caption, 'Caption copiat!')}>Copiază</CopyBtn>}
              </div>
              <div className="cp-quote"><p className="cp-txt" style={{ fontStyle: 'italic' }}>{c.required_caption}</p></div>
            </div>
          )}
          {hashtags.length > 0 && (
            <div className="iu-col" style={{ gap: 8 }}>
              <div className="cp-sec-h">
                <span className="iu-label">Hashtag-uri obligatorii</span>
                {onCopy && <CopyBtn onClick={() => copy(hashtags.map(h => '#' + h.replace(/^#/, '')).join(' '), 'Hashtag-uri copiate!')}>Copiază toate</CopyBtn>}
              </div>
              <div className="cp-tags">{hashtags.map(h => <span key={h} className="iu-chip" style={{ background: '#efeaff', color: '#5b2fd0', height: 28 }}>#{h.replace(/^#/, '')}</span>)}</div>
            </div>
          )}
        </div>
      )}

      {/* Link de promovat */}
      {c.promotion_link && (
        <div className="iu-card cp-sec">
          <div className="cp-sec-h">
            <h3>Link de promovat</h3>
            {onCopy && <CopyBtn onClick={() => copy(c.promotion_link, 'Link copiat!')}>Copiază</CopyBtn>}
          </div>
          <a href={c.promotion_link} target="_blank" rel="noopener noreferrer" className="iu-sm" style={{ color: '#5b2fd0', fontWeight: 700, wordBreak: 'break-all', background: '#f6f6fc', borderRadius: 12, padding: '10px 12px', display: 'block' }}>{c.promotion_link}</a>
          {linkPlacements.length > 0 && (
            <div>
              <span className="iu-label">Unde trebuie inclus</span>
              {linkPlacements.map(pl => <Chk key={pl}>{PLACEMENT[pl] || pl}</Chk>)}
            </div>
          )}
        </div>
      )}

      {/* Interzis */}
      {(forbiddenMentions.length > 0 || c.forbidden_content) && (
        <div className="cp-note" style={{ background: '#fff4f2', borderColor: '#f3c9c4', gap: 10 }}>
          <div className="iu-row" style={{ gap: 8, color: '#b42318' }}><Ban size={16} /><b style={{ fontFamily: 'var(--font-display,system-ui),system-ui,sans-serif', fontSize: 17 }}>Interzis</b></div>
          {forbiddenMentions.length > 0 && (
            <div className="cp-tags">{forbiddenMentions.map(m => <span key={m} className="iu-chip" style={{ background: '#fff', color: '#b42318', border: '1px solid #f3c9c4' }}>{m}</span>)}</div>
          )}
          {c.forbidden_content && <p className="iu-sm" style={{ margin: 0, color: '#b42318', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{c.forbidden_content}</p>}
        </div>
      )}

      {/* Dovadă */}
      {proof.length > 0 && (
        <div className="iu-card cp-sec">
          <h3>Ce trimiți ca dovadă</h3>
          <div className="cp-tags">{proof.map(p => <span key={p} className="iu-chip" style={{ background: '#f0eff7', color: '#4a4770' }}>{PROOF[p] || p}</span>)}</div>
          <span className="iu-xs iu-muted">Plata se eliberează după ce brandul verifică și aprobă dovezile.</span>
        </div>
      )}

      {/* Livrare / ridicare (barter) */}
      {(barter || c.delivery_method) && (c.delivery_method || c.offer_type || c.reservation_required) && (
        <div className="iu-card cp-sec">
          <h3>Livrare și ridicare</h3>
          <div className="cp-kv">
            {c.offer_type && <div><span className="iu-label">Tip ofertă</span><b>{c.offer_type === 'product' ? 'Produs' : 'Serviciu'}</b></div>}
            {c.delivery_method && (
              <div><span className="iu-label">{delivery ? 'Livrare' : 'Ridicare'}</span>
                <b className="iu-row" style={{ gap: 6 }}>{delivery ? <><Truck size={14} /> Curier la adresă</> : <><MapPin size={14} /> Din locație</>}</b></div>
            )}
          </div>
          {!delivery && (c.pickup_location_name || c.pickup_location_address) && (
            <div className="iu-col" style={{ gap: 2 }}>
              {c.pickup_location_name && <b className="iu-sm">{c.pickup_location_name}</b>}
              {c.pickup_location_address && <span className="iu-xs iu-muted">{c.pickup_location_address}</span>}
            </div>
          )}
          {c.reservation_required && (
            <div className="cp-note" style={{ background: '#efeaff', borderColor: '#ddd2ff', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <CalendarCheck size={18} color="#5b2fd0" style={{ flex: 'none' }} />
              <div className="iu-col">
                <b className="iu-sm" style={{ color: '#5b2fd0' }}>Rezervare necesară</b>
                <span className="iu-xs" style={{ color: '#5b2fd0' }}>Contactează brandul înainte de vizită</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cum finalizezi */}
      <div className="iu-card cp-sec">
        <h3>Cum finalizezi colaborarea</h3>
        <div className="iu-col">
          {finishSteps.map((step, i) => (
            <div key={i} className="cp-step" style={{ paddingBottom: i < finishSteps.length - 1 ? 16 : 0 }}>
              {i < finishSteps.length - 1 && <div style={{ position: 'absolute', left: 13, top: 28, bottom: 0, width: 1, background: '#e5e3f3' }} />}
              <div className="cp-step-n">{i + 1}</div>
              <div style={{ paddingTop: 3, minWidth: 0 }}>
                <b className="iu-sm" style={{ display: 'block' }}>{step.title}</b>
                <span className="iu-xs iu-muted">{step.sub}</span>
              </div>
            </div>
          ))}
          <div className="cp-step" style={{ paddingTop: 16, borderTop: '1px dashed #e5e3f3', marginTop: 16 }}>
            <div className="cp-step-n" style={{ background: '#dcf5ec', color: '#14532d' }}><Check size={13} strokeWidth={3} /></div>
            <div style={{ paddingTop: 3 }}>
              <b className="iu-sm" style={{ display: 'block', color: '#14532d' }}>Colaborare finalizată</b>
              <span className="iu-xs iu-muted">Brandul aprobă → primești rating și recenzie</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cui se adresează */}
      {(platforms.length > 0 || niches.length > 0 || countries.length > 0) && (
        <div className="iu-card cp-sec">
          <h3>Cui se adresează</h3>
          {platforms.length > 0 && (
            <div className="iu-col" style={{ gap: 8 }}>
              <span className="iu-label">Platforme</span>
              <div className="cp-tags">
                {platforms.map(p => (
                  <span key={p} className="iu-chip" style={{ background: '#f6f6fc', color: '#14123a', border: '1px solid #e5e3f3', height: 28 }}>
                    <span style={{ width: 16, height: 16, display: 'inline-flex' }}><PlatIco p={p} /></span>{PLAT_LABEL[p.toLowerCase()] || p}
                  </span>
                ))}
              </div>
            </div>
          )}
          {niches.length > 0 && (
            <div className="iu-col" style={{ gap: 8 }}>
              <span className="iu-label">Nișe țintă</span>
              <div className="cp-tags">{niches.map(n => <span key={n} className="iu-chip" style={{ background: '#efeaff', color: '#5b2fd0' }}>{n}</span>)}</div>
            </div>
          )}
          {countries.length > 0 && (
            <div className="iu-col" style={{ gap: 8 }}>
              <span className="iu-label">Țări țintă</span>
              <div className="cp-tags">{countries.map(x => <span key={x} className="iu-chip" style={{ background: '#f0eff7', color: '#4a4770' }}>{x}</span>)}</div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
