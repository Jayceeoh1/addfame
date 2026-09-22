'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, MapPin, Users, ArrowRight, Loader2, Megaphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type OpenCall = {
  id: string
  title: string
  description: string | null
  banner_url: string | null
  event_date: string | null
  event_location: string | null
  min_followers: number
  application_deadline: string | null
  platforms: string[]
  created_at: string
  brand: {
    name: string
    logo: string | null
    verified: boolean
  } | null
  // Dacă influencerul a aplicat deja
  my_application?: { status: string } | null
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtNum(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(0) + 'k'
  return String(n)
}

export default function CastinguriPage() {
  const [campaigns, setCampaigns] = useState<OpenCall[]>([])
  const [loading, setLoading] = useState(true)
  const [influencerId, setInfluencerId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Obținem influencer id
      const { data: inf } = await supabase
        .from('influencers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (inf) setInfluencerId(inf.id)

      // Campanii Open Call active
      const { data: camps } = await supabase
        .from('campaigns')
        .select(`
          id, title, description, banner_url, event_date, event_location,
          min_followers, application_deadline, platforms, created_at,
          brand:brands(name, logo, verification_status)
        `)
        .eq('campaign_type', 'OPEN_CALL')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false })

      if (!camps) { setLoading(false); return }

      // Verificăm aplicațiile existente ale influencerului
      if (inf) {
        const { data: apps } = await supabase
          .from('campaign_applications')
          .select('campaign_id, status')
          .eq('influencer_id', inf.id)

        const appMap = new Map(apps?.map(a => [a.campaign_id, a.status]) ?? [])

        setCampaigns(camps.map((c: any) => ({
          ...c,
          brand: Array.isArray(c.brand) ? c.brand[0] : c.brand,
          my_application: appMap.has(c.id) ? { status: appMap.get(c.id)! } : null,
        })))
      } else {
        setCampaigns(camps.map((c: any) => ({
          ...c,
          brand: Array.isArray(c.brand) ? c.brand[0] : c.brand,
        })))
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-black flex items-center gap-2">🎤 Evenimente & Open Call</h1>
        <p className="text-sm text-muted-foreground mt-1">Brandurile organizează evenimente. Aplică dacă vrei să participi!</p>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-16">
          <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-bold text-lg">Niciun eveniment activ momentan</p>
          <p className="text-sm text-muted-foreground mt-1">Revino în curând — brandurile postează constant evenimente și oportunități noi.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map(c => (
            <Link key={c.id} href={`/influencer/castinguri/${c.id}`}>
              <div className="rounded-2xl border border-border overflow-hidden hover:border-primary/40 hover:shadow-md transition cursor-pointer">
                {/* Banner */}
                {c.banner_url ? (
                  <img src={c.banner_url} alt={c.title} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <Megaphone className="w-12 h-12 text-primary/40" />
                  </div>
                )}

                <div className="p-4">
                  {/* Brand */}
                  <div className="flex items-center gap-2 mb-2">
                    {c.brand?.logo ? (
                      <img src={c.brand.logo} alt={c.brand.name} className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {c.brand?.name?.[0] || 'B'}
                      </div>
                    )}
                    <span className="text-xs font-bold text-muted-foreground">{c.brand?.name}</span>
                    {c.brand?.verification_status === 'verified' && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">✓ Verificat</span>}
                  </div>

                  <h2 className="font-black text-base mb-2 line-clamp-2">{c.title}</h2>

                  {/* Meta */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {c.event_date && (
                      <span className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                        <Calendar className="w-3 h-3" /> {fmt(c.event_date)}
                      </span>
                    )}
                    {c.event_location && (
                      <span className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                        <MapPin className="w-3 h-3" /> {c.event_location}
                      </span>
                    )}
                    {c.min_followers > 0 && (
                      <span className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                        <Users className="w-3 h-3" /> Min {fmtNum(c.min_followers)} followers
                      </span>
                    )}
                    {c.platforms.map(p => (
                      <span key={p} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-bold">{p}</span>
                    ))}
                  </div>

                  {/* Status aplicație */}
                  {c.my_application ? (
                    <div className={`text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1 ${
                      c.my_application.status === 'approved' ? 'bg-green-100 text-green-700' :
                      c.my_application.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {c.my_application.status === 'approved' ? '✅ Aprobat' :
                       c.my_application.status === 'rejected' ? '❌ Respins' :
                       '⏳ Aplicație trimisă'}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      {c.application_deadline && (
                        <p className="text-xs text-muted-foreground">Deadline: {fmt(c.application_deadline)}</p>
                      )}
                      <Button size="sm" className="ml-auto bg-gradient-to-r from-primary to-accent">
                        Aplică acum <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
