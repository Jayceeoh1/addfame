'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { haversineDistance, normalizeCity, extractCityFromAddress } from '@/lib/geo-utils'

export interface CreateBarterCampaignInput {
  offer_type: 'product' | 'service'
  offer_name: string
  offer_value: number
  offer_description?: string
  reservation_required: boolean
  offer_image_url?: string
  offer_count: number
  delivery_method: 'pickup' | 'delivery'
  pickup_location_name?: string
  pickup_location_address?: string
  pickup_lat?: number
  pickup_lon?: number
  story_include_instagram: boolean
  story_include_atmosphere: boolean
  story_include_product: boolean
  story_instructions?: string
  auto_accept_influencers: boolean
  // Tasks Instagram
  tasks_stories_count: number
  tasks_include_post: boolean
  // Tasks TikTok
  tasks_tiktok_video?: boolean
  tasks_tiktok_count?: number
  // Tasks YouTube
  tasks_youtube_short?: boolean
  tasks_youtube_video?: boolean
  // Tasks Facebook
  tasks_facebook_post?: boolean
  tasks_facebook_story?: boolean
  min_followers_target: number
  platforms: string[]
  deadline?: string
}

// Generează textul deliverables din toate platformele selectate
function buildDeliverables(data: CreateBarterCampaignInput): string {
  const parts: string[] = []
  if (data.tasks_stories_count > 0)
    parts.push(`${data.tasks_stories_count} Instagram Stor${data.tasks_stories_count > 1 ? 'ies' : 'y'}`)
  if (data.tasks_include_post)
    parts.push('1 Instagram Post')
  if (data.tasks_tiktok_video)
    parts.push(`${data.tasks_tiktok_count || 1} TikTok Video${(data.tasks_tiktok_count || 1) > 1 ? 's' : ''}`)
  if (data.tasks_youtube_short)
    parts.push('1 YouTube Short')
  if (data.tasks_youtube_video)
    parts.push('1 YouTube Video')
  if (data.tasks_facebook_post)
    parts.push('1 Facebook Post')
  if (data.tasks_facebook_story)
    parts.push('1 Facebook Story')
  return parts.join(' + ') || 'Conținut creat de influencer'
}

export async function createBarterCampaign(data: CreateBarterCampaignInput) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Sesiune expirată. Te rugăm să te autentifici din nou.')

    const { data: brand, error: brandError } = await supabase
      .from('brands').select('id, name, city').eq('user_id', user.id).single()
    if (brandError || !brand) throw new Error('Profilul brandului nu a fost găsit.')

    if (!data.offer_name?.trim()) throw new Error('Numele ofertei este obligatoriu.')
    if (!data.offer_value || data.offer_value <= 0) throw new Error('Valoarea ofertei trebuie să fie mai mare de 0.')
    if (!data.offer_count || data.offer_count < 1) throw new Error('Numărul de influenceri trebuie să fie minim 1.')
    if (!data.delivery_method) throw new Error('Selectează modul de ridicare a ofertei.')
    if (data.delivery_method === 'pickup' && !data.pickup_location_name) throw new Error('Selectează locația de ridicare.')

    // Validare conținut — acceptă orice platformă
    const hasContent = data.tasks_stories_count > 0 || data.tasks_include_post ||
      data.tasks_tiktok_video || data.tasks_youtube_short || data.tasks_youtube_video ||
      data.tasks_facebook_post || data.tasks_facebook_story
    if (!hasContent) throw new Error('Selectează cel puțin un tip de conținut.')

    let campaignCity = ''
    if (data.delivery_method === 'pickup' && data.pickup_location_address) {
      campaignCity = extractCityFromAddress(data.pickup_location_address)
    }
    if (!campaignCity && brand.city) campaignCity = brand.city

    const deadline = data.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const offerTypeLabel = data.offer_type === 'product' ? 'Produs gratuit' : 'Serviciu gratuit'
    const title = `[Barter] ${data.offer_name} — ${offerTypeLabel}`

    const { data: campaign, error } = await supabase.from('campaigns').insert({
      brand_id: brand.id, brand_name: brand.name, title,
      description: data.offer_description || `${offerTypeLabel}: ${data.offer_name}`,
      budget: 0, budget_per_influencer: 0, max_influencers: data.offer_count,
      current_influencers: 0,
      platforms: data.platforms?.length ? data.platforms : ['INSTAGRAM'],
      deliverables: buildDeliverables(data),
      deadline, countries: [], niches: [], status: 'PENDING_REVIEW',
      invited_influencers: [], accepted_influencers: [], declined_influencers: [],
      campaign_type: 'BARTER', offer_type: data.offer_type,
      offer_name: data.offer_name.trim(), offer_value: data.offer_value,
      offer_description: data.offer_description?.trim() || null,
      offer_image_url: data.offer_image_url || null, offer_count: data.offer_count,
      delivery_method: data.delivery_method,
      pickup_location_name: data.pickup_location_name || null,
      pickup_location_address: data.pickup_location_address || null,
      reservation_required: data.reservation_required,
      auto_accept_influencers: data.auto_accept_influencers,
      story_include_instagram: data.story_include_instagram,
      story_include_atmosphere: data.story_include_atmosphere,
      story_include_product: data.story_include_product,
      story_instructions: data.story_instructions?.trim() || null,
      min_followers_target: data.min_followers_target || 0,
      tasks_stories_count: data.tasks_stories_count,
      tasks_include_post: data.tasks_include_post,
      city: campaignCity || null,
      latitude: data.pickup_lat || null,
      longitude: data.pickup_lon || null,
    }).select().single()

    if (error) throw new Error(`Eroare la salvare: ${error.message}`)
    revalidatePath('/brand/campaigns')
    return { success: true, campaign }
  } catch (err: any) {
    return { success: false, error: err.message || 'Eroare necunoscută. Încearcă din nou.' }
  }
}

export async function getBarterCampaignsForInfluencer() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { campaigns: [], city: null }

    const { data: influencer } = await supabase
      .from('influencers')
      .select('city, latitude, longitude, ig_followers, tt_followers')
      .eq('user_id', user.id).single()

    const followerCount = (influencer?.ig_followers || 0) + (influencer?.tt_followers || 0)
    const infLat = influencer?.latitude
    const infLon = influencer?.longitude
    const influencerCity = influencer?.city ? normalizeCity(influencer.city) : null

    const { data: campaigns, error } = await supabase
      .from('campaigns').select('*')
      .eq('campaign_type', 'BARTER').eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
    if (error) throw error

    const MAX_KM = 50

    const filtered = (campaigns || []).filter(c => {
      if (c.min_followers_target > 0 && followerCount < c.min_followers_target) return false
      if (!influencerCity && !infLat) return false
      if (!c.city && !c.latitude) return true
      if (infLat && infLon && c.latitude && c.longitude) {
        return haversineDistance(infLat, infLon, c.latitude, c.longitude) <= MAX_KM
      }
      if (influencerCity && c.city) {
        const campCity = normalizeCity(c.city)
        return campCity.includes(influencerCity) || influencerCity.includes(campCity)
      }
      return false
    })

    if (infLat && infLon) {
      filtered.sort((a, b) => {
        const dA = (a.latitude && a.longitude) ? haversineDistance(infLat, infLon, a.latitude, a.longitude) : 9999
        const dB = (b.latitude && b.longitude) ? haversineDistance(infLat, infLon, b.latitude, b.longitude) : 9999
        return dA - dB
      })
    }

    return { campaigns: filtered, city: influencer?.city || null }
  } catch (err: any) {
    return { campaigns: [], city: null, error: err.message }
  }
}
