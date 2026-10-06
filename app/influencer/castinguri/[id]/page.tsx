'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Calendar, MapPin, Users, ArrowLeft, Loader2, CheckCircle, Send, Instagram, Youtube } from 'lucide-react'
import Link from 'next/link'

function fmt(date: string) {
  return new Date(date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtNum(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'k'
  return String(n)
}

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" />
  </svg>
)

export default function CastingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [campaign, setCampaign] = useState<any>(null)
  const [influencer, setInfluencer] = useState<any>(null)
  const [application, setApplication] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [success, setSuccess] = useState(false)
  const [registrationCount, setRegistrationCount] = useState(0)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const [{ data: camp }, { data: inf }] = await Promise.all([
        supabase.from('campaigns').select(`
          id, title, description, banner_url, event_date, event_location,
          min_followers, application_deadline, registration_link, manual_registrations, platforms, created_at, status, brand_id,
          brand:brands(id, name, logo, verification_status, website)
        `).eq('id', id).single(),
        supabase.from('influencers').select('id, name, avatar, ig_followers, tt_followers, instagram_handle, niches').eq('user_id', user.id).single(),
      ])

      if (!camp) { router.push('/influencer/castinguri'); return }

      let brand = Array.isArray(camp.brand) ? camp.brand[0] : camp.brand
      if (camp.brand_id) {
        const { data: pubBrand } = await supabase.from('brands_public').select('id, name, logo, verification_status, website, instagram_connected, instagram_handle, ig_followers').eq('id', camp.brand_id).maybeSingle()
        if (pubBrand) brand = pubBrand
      }
      setCampaign({ ...camp, brand })
      setInfluencer(inf)

      if (inf) {
        const { data: app } = await supabase
          .from('campaign_applications')
          .select('id, status, message, created_at')
          .eq('campaign_id', id)
          .eq('influencer_id', inf.id)
          .maybeSingle()
        setApplication(app)
      }

      // Număr înscrieri
      const { count } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', id)
      setRegistrationCount((count || 0) + (camp.manual_registrations || 0))

      setLoading(false)
    }
    load()
  }, [id])

  async function handleApply() {
    if (!influencer) return
    setApplying(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('campaign_applications').insert({
        campaign_id: id,
        influencer_id: influencer.id,
        message: message.trim() || null,
        status: 'pending',
      })
      if (error) throw error
      setSuccess(true)
      setApplication({ status: 'pending', created_at: new Date().toISOString() })
    } catch (e: any) {
      alert('Eroare: ' + e.message)
    } finally {
      setApplying(false)
    }
  }

  if (loading) return (
    <div className="iu" style={{ alignItems: 'center', justifyContent: 'center', minHeight: 260 }}>
      <Loader2 className="animate-spin" size={30} color="#7040f0" />
    </div>
  )

  if (!campaign) return null

  const hasApplied = !!application
  const isApproved = application?.status === 'approved'
  const isRejected = application?.status === 'rejected'
  const grey = { background: '#f0eff7', color: '#4a4770' }

  return (
    <div className="iu cd" style={{ maxWidth: 760 }}>
      <style>{`
        .cd-hero { height: 240px; border-radius: 20px; overflow: hidden; background: linear-gradient(135deg,#efeaff,#f6f1ff); }
        .cd-hero img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .cd-meta { display: flex; flex-wrap: wrap; gap: 8px; }
        .cd-meta .iu-chip { height: 30px; padding: 0 12px; font-size: 13px; }
        .cd-desc { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.75; font-size: 15px; margin: 0; }
        .cd-hot { position: relative; overflow: hidden; border-radius: 20px; padding: 16px 18px; background: linear-gradient(135deg,#7040f0,#9030f0); color: #fff; display: flex; align-items: center; gap: 12px; }
        .cd-hot::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent); transform: translateX(-100%); animation: cdshimmer 2.4s infinite; }
        @keyframes cdshimmer { 100% { transform: translateX(200%); } }
        .cd-state { text-align: center; padding: 28px 20px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .cd-ta { width: 100%; min-height: 100px; padding: 12px 14px; height: auto; resize: none; line-height: 1.5; font-size: 16px; }
        .cd-cta { width: 100%; height: 52px; font-size: 16px; border-radius: 14px; }
        @media (max-width: 767px) { .cd-hero { height: 190px; border-radius: 16px; } }
      `}</style>

      <div>
        <Link href="/influencer/castinguri" className="iu-btn"><ArrowLeft size={16} /> Înapoi</Link>
      </div>

      <div className="cd-hero">
        {campaign.banner_url && <img src={campaign.banner_url} alt={campaign.title} />}
      </div>

      <div className="iu-row" style={{ gap: 12 }}>
        {campaign.brand?.logo ? (
          <img src={campaign.brand.logo} alt={campaign.brand.name} style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', border: '1px solid #e5e3f3', flex: 'none' }} />
        ) : (
          <span className="iu-face" style={{ width: 44, height: 44, borderRadius: 12, background: '#efeaff', color: '#5b2fd0', fontSize: 18 }}>{campaign.brand?.name?.[0]}</span>
        )}
        <div className="iu-col" style={{ minWidth: 0, flex: 1 }}>
          <b style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{campaign.brand?.name}</b>
          {campaign.brand?.website && <span className="iu-xs iu-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{campaign.brand.website}</span>}
          {campaign.brand?.instagram_connected && campaign.brand?.instagram_handle && (
            <a href={`https://www.instagram.com/${campaign.brand.instagram_handle}/`} target="_blank" rel="noopener noreferrer" className="iu-xs iu-muted" style={{ textDecoration: 'none' }}>
              @{campaign.brand.instagram_handle}{campaign.brand.ig_followers ? ` · ${Number(campaign.brand.ig_followers).toLocaleString('ro-RO')} urmăritori` : ''}
            </a>
          )}
        </div>
        {campaign.brand?.verification_status === 'verified' && (
          <span className="iu-chip" style={{ background: '#e6f0ff', color: '#1d4fb8' }}>✓ Brand verificat</span>
        )}
      </div>

      <h1>{campaign.title}</h1>

      <div className="cd-meta">
        {campaign.event_date && (
          <span className="iu-chip" style={{ background: '#efeaff', color: '#5b2fd0' }}><Calendar size={14} /> {fmt(campaign.event_date)}</span>
        )}
        {campaign.event_location && (
          <span className="iu-chip" style={grey}><MapPin size={14} /> {campaign.event_location}</span>
        )}
        {campaign.min_followers > 0 && (
          <span className="iu-chip" style={grey}><Users size={14} /> Min {fmtNum(campaign.min_followers)} followeri</span>
        )}
        {campaign.platforms?.map((p: string) => (
          <span key={p} className="iu-chip" style={grey}>
            {p === 'Instagram' && <Instagram size={14} color="#db2777" />}
            {p === 'TikTok' && <TikTokIcon />}
            {p === 'YouTube' && <Youtube size={14} color="#dc2626" />}
            {p}
          </span>
        ))}
      </div>

      {campaign.description && (
        <div className="iu-card iu-card-pad iu-col" style={{ gap: 10 }}>
          <span className="iu-label">Despre eveniment</span>
          <p className="cd-desc">{campaign.description}</p>
        </div>
      )}

      {campaign.application_deadline && (
        <div className="iu-row" style={{ gap: 10, padding: '12px 16px', borderRadius: 14, background: '#fff1c2', color: '#854d0e', fontSize: 14 }}>
          <Calendar size={16} style={{ flex: 'none' }} />
          <span>Deadline aplicare: <strong>{fmt(campaign.application_deadline)}</strong></span>
        </div>
      )}

      {registrationCount > 0 && (
        <div className="cd-hot">
          <div style={{ display: 'flex', position: 'relative', zIndex: 1 }}>
            {[...Array(Math.min(3, registrationCount))].map((_, i) => (
              <div key={i} style={{ width: 32, height: 32, marginLeft: i ? -8 : 0, borderRadius: '50%', background: 'rgba(255,255,255,.28)', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                {['🌟', '✨', '🔥'][i]}
              </div>
            ))}
          </div>
          <div style={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
            <b style={{ display: 'block', fontSize: 14 }}>
              {registrationCount} {registrationCount === 1 ? 'influencer s-a înscris' : 'influenceri s-au înscris'} deja!
            </b>
            <span style={{ fontSize: 12, opacity: .85 }}>Nu rata ocazia — locurile sunt limitate!</span>
          </div>
        </div>
      )}

      {/* Buton înscriere extern SAU formular intern */}
      {campaign.registration_link ? (
        <a
          href={campaign.registration_link}
          target="_blank"
          rel="noopener noreferrer"
          className="iu-btn p big cd-cta"
          onClick={async () => {
            if (!influencer) return
            const supabase = createClient()
            await supabase.from('event_registrations').upsert({
              campaign_id: id,
              influencer_id: influencer.id,
            }, { onConflict: 'campaign_id,influencer_id' })
            setRegistrationCount(c => c + 1)
          }}
        >
          🎤 Înscrie-te acum
        </a>
      ) : success || (hasApplied && !isRejected) ? (
        <div className="iu-card cd-state" style={{ background: isApproved ? '#f1fbf6' : '#fffaeb', borderColor: isApproved ? '#bfe8d4' : '#f5e2a0' }}>
          <CheckCircle size={40} color={isApproved ? '#16a34a' : '#d97706'} />
          <h3 style={{ marginTop: 6 }}>
            {isApproved ? 'Felicitări! Ai fost selectat!' : 'Aplicație trimisă'}
          </h3>
          <p className="iu-muted iu-sm" style={{ margin: 0, maxWidth: 420 }}>
            {isApproved ? 'Brandul te-a aprobat. Verifică mesajele pentru detalii.' : 'Aplicația ta este în curs de revizuire. Te vom notifica când brandul răspunde.'}
          </p>
        </div>
      ) : isRejected ? (
        <div className="iu-card cd-state" style={{ background: '#fff4f2', borderColor: '#f3c9c4' }}>
          <h3 style={{ color: '#b42318' }}>Aplicație respinsă</h3>
          <p className="iu-muted iu-sm" style={{ margin: 0 }}>Din păcate nu ai fost selectat pentru această campanie.</p>
        </div>
      ) : (
        <div className="iu-card iu-card-pad iu-col" style={{ gap: 16 }}>
          <div className="iu-col" style={{ gap: 4 }}>
            <h2>Aplică la acest casting</h2>
            <span className="iu-muted iu-sm">Datele tale de profil vor fi trimise automat brandului.</span>
          </div>

          {influencer && (
            <div className="iu-row" style={{ gap: 12, padding: 12, borderRadius: 14, background: '#f7f4ff' }}>
              {influencer.avatar ? (
                <img src={influencer.avatar} alt={influencer.name} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flex: 'none' }} />
              ) : (
                <span className="iu-face" style={{ width: 42, height: 42, background: '#efeaff', color: '#5b2fd0', fontSize: 16 }}>{influencer.name?.[0]}</span>
              )}
              <div className="iu-col" style={{ minWidth: 0 }}>
                <b>{influencer.name}</b>
                <span className="iu-xs iu-muted">
                  {influencer.ig_followers ? `${fmtNum(influencer.ig_followers)} followeri IG` : ''}
                  {influencer.tt_followers ? ` · ${fmtNum(influencer.tt_followers)} TikTok` : ''}
                </span>
              </div>
            </div>
          )}

          <div className="iu-col" style={{ gap: 8 }}>
            <label className="iu-sm" style={{ fontWeight: 700 }}>Mesaj pentru brand <span className="iu-muted" style={{ fontWeight: 400 }}>(opțional)</span></label>
            <textarea
              className="iu-input cd-ta"
              placeholder="De ce vrei să participi? Ce valoare aduci campaniei?"
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
            />
          </div>

          <button className="iu-btn p big cd-cta" onClick={handleApply} disabled={applying}>
            {applying
              ? <><Loader2 size={16} className="animate-spin" /> Se trimite...</>
              : <><Send size={16} /> Trimite aplicația</>
            }
          </button>
          <p className="iu-xs iu-muted" style={{ textAlign: 'center', margin: 0 }}>
            Prin aplicare, datele tale de profil vor fi vizibile pentru brand.
          </p>
        </div>
      )}
    </div>
  )
}
