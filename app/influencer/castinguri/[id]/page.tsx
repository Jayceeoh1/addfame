'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Calendar, MapPin, Users, ArrowLeft, Loader2, CheckCircle, Send, Instagram, Youtube } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
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

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const [{ data: camp }, { data: inf }] = await Promise.all([
        supabase.from('campaigns').select(`
          id, title, description, banner_url, event_date, event_location,
          min_followers, application_deadline, registration_link, platforms, created_at, status,
          brand:brands(id, name, logo, verified, website)
        `).eq('id', id).single(),
        supabase.from('influencers').select('id, name, avatar, ig_followers, tt_followers, instagram_handle, niches').eq('user_id', user.id).single(),
      ])

      if (!camp) { router.push('/influencer/castinguri'); return }

      const brand = Array.isArray(camp.brand) ? camp.brand[0] : camp.brand
      setCampaign({ ...camp, brand })
      setInfluencer(inf)

      if (inf) {
        const { data: app } = await supabase
          .from('campaign_applications')
          .select('id, status, message, created_at')
          .eq('campaign_id', id)
          .eq('influencer_id', inf.id)
          .single()
        setApplication(app)
      }

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
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  )

  if (!campaign) return null

  const hasApplied = !!application
  const isApproved = application?.status === 'approved'
  const isRejected = application?.status === 'rejected'

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20">
      {/* Back */}
      <Link href="/influencer/castinguri">
        <Button variant="ghost" size="sm" className="mb-4"><ArrowLeft className="w-4 h-4 mr-1" /> Înapoi</Button>
      </Link>

      {/* Banner */}
      {campaign.banner_url ? (
        <img src={campaign.banner_url} alt={campaign.title} className="w-full h-52 object-cover rounded-2xl mb-4" />
      ) : (
        <div className="w-full h-52 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 mb-4" />
      )}

      {/* Brand */}
      <div className="flex items-center gap-3 mb-4">
        {campaign.brand?.logo ? (
          <img src={campaign.brand.logo} alt={campaign.brand.name} className="w-10 h-10 rounded-full object-cover border" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-black text-primary">
            {campaign.brand?.name?.[0]}
          </div>
        )}
        <div>
          <p className="font-black">{campaign.brand?.name}</p>
          {campaign.brand?.website && <p className="text-xs text-muted-foreground">{campaign.brand.website}</p>}
        </div>
        {campaign.brand?.verified && (
          <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">✓ Brand Verificat</span>
        )}
      </div>

      {/* Title */}
      <h1 className="text-2xl font-black mb-3">{campaign.title}</h1>

      {/* Meta badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {campaign.event_date && (
          <span className="flex items-center gap-1.5 text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-full font-bold">
            <Calendar className="w-3.5 h-3.5" /> {fmt(campaign.event_date)}
          </span>
        )}
        {campaign.event_location && (
          <span className="flex items-center gap-1.5 text-sm bg-muted px-3 py-1.5 rounded-full font-bold">
            <MapPin className="w-3.5 h-3.5" /> {campaign.event_location}
          </span>
        )}
        {campaign.min_followers > 0 && (
          <span className="flex items-center gap-1.5 text-sm bg-muted px-3 py-1.5 rounded-full font-bold">
            <Users className="w-3.5 h-3.5" /> Min {fmtNum(campaign.min_followers)} followers
          </span>
        )}
        {campaign.platforms?.map((p: string) => (
          <span key={p} className="flex items-center gap-1 text-sm bg-muted px-3 py-1.5 rounded-full font-bold">
            {p === 'Instagram' && <Instagram className="w-3.5 h-3.5 text-pink-500" />}
            {p === 'TikTok' && <TikTokIcon />}
            {p === 'YouTube' && <Youtube className="w-3.5 h-3.5 text-red-500" />}
            {p}
          </span>
        ))}
      </div>

      {/* Description */}
      <div className="bg-muted/30 rounded-2xl p-5 mb-6">
        <h2 className="font-black mb-3 text-sm uppercase tracking-wide text-muted-foreground">Brief</h2>
        <div className="text-sm leading-relaxed whitespace-pre-wrap">{campaign.description}</div>
      </div>

      {/* Deadline */}
      {campaign.application_deadline && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span>Deadline aplicare: <strong>{fmt(campaign.application_deadline)}</strong></span>
        </div>
      )}

      {/* Buton înscriere extern SAU formular intern */}
      {campaign.registration_link ? (
        <a href={campaign.registration_link} target="_blank" rel="noopener noreferrer" className="block w-full">
          <div className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-accent flex items-center justify-center gap-2 text-white font-black text-base hover:opacity-90 transition cursor-pointer">
            🎤 Înscrie-te acum
          </div>
        </a>
      ) : success || (hasApplied && !isRejected) ? (
        <div className={`rounded-2xl p-6 text-center border ${isApproved ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
          <CheckCircle className={`w-10 h-10 mx-auto mb-3 ${isApproved ? 'text-green-600' : 'text-amber-500'}`} />
          <p className="font-black text-lg mb-1">
            {isApproved ? '🎉 Felicitări! Ai fost selectat!' : '⏳ Aplicație trimisă'}
          </p>
          <p className="text-sm text-muted-foreground">
            {isApproved ? 'Brandul te-a aprobat. Verifică mesajele pentru detalii.' : 'Aplicația ta este în curs de revizuire. Te vom notifica când brandul răspunde.'}
          </p>
        </div>
      ) : isRejected ? (
        <div className="rounded-2xl p-6 text-center border border-red-200 bg-red-50">
          <p className="font-black text-lg mb-1">❌ Aplicație respinsă</p>
          <p className="text-sm text-muted-foreground">Din păcate nu ai fost selectat pentru această campanie.</p>
        </div>
      ) : (
        <div className="border border-border rounded-2xl p-5">
          <h2 className="font-black mb-1">Aplică la acest casting</h2>
          <p className="text-sm text-muted-foreground mb-4">Datele tale de profil vor fi trimise automat brandului.</p>

          {/* Influencer preview */}
          {influencer && (
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl mb-4">
              {influencer.avatar ? (
                <img src={influencer.avatar} alt={influencer.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-black text-primary text-sm">
                  {influencer.name?.[0]}
                </div>
              )}
              <div>
                <p className="font-bold text-sm">{influencer.name}</p>
                <p className="text-xs text-muted-foreground">
                  {influencer.ig_followers ? `${fmtNum(influencer.ig_followers)} followers IG` : ''}
                  {influencer.tt_followers ? ` · ${fmtNum(influencer.tt_followers)} TikTok` : ''}
                </p>
              </div>
            </div>
          )}

          {/* Message */}
          <div className="space-y-2 mb-4">
            <label className="text-sm font-bold">Mesaj pentru brand <span className="text-muted-foreground font-normal">(opțional)</span></label>
            <Textarea
              placeholder="De ce vrei să participi? Ce valoare aduci campaniei?"
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <Button
            className="w-full h-12 bg-gradient-to-r from-primary to-accent font-bold"
            onClick={handleApply}
            disabled={applying}
          >
            {applying
              ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Se trimite...</>
              : <><Send className="w-4 h-4 mr-2" /> Trimite aplicația</>
            }
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Prin aplicare, datele tale de profil vor fi vizibile pentru brand.
          </p>
        </div>
      )}
    </div>
  )
}
