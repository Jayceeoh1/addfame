'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Upload, Calendar, MapPin, Users, FileText, Image as ImageIcon, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'

export default function NewOpenCallPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    event_date: '',
    event_location: '',
    min_followers: '1000',
    application_deadline: '',
    platforms: [] as string[],
  })

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const togglePlatform = (p: string) => {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(p)
        ? f.platforms.filter(x => x !== p)
        : [...f.platforms, p]
    }))
  }

  async function uploadBanner(file: File) {
    setUploadingBanner(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `banners/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('campaign-banners').upload(path, file, { upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('campaign-banners').getPublicUrl(path)
      setBannerUrl(data.publicUrl)
      setBannerPreview(URL.createObjectURL(file))
    } catch (e: any) {
      alert('Eroare upload banner: ' + e.message)
    } finally {
      setUploadingBanner(false)
    }
  }

  async function handleSubmit() {
    if (!form.title.trim()) return alert('Adaugă un titlu pentru campanie.')
    if (!form.description.trim()) return alert('Adaugă o descriere.')
    if (form.platforms.length === 0) return alert('Selectează cel puțin o platformă.')

    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: brand } = await supabase
        .from('brands')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (!brand) return

      const deadline = form.application_deadline
        ? new Date(form.application_deadline).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      const { data: camp, error } = await supabase.from('campaigns').insert({
        brand_id: brand.id,
        title: form.title,
        campaign_type: 'OPEN_CALL',
        status: 'ACTIVE',
        platforms: form.platforms,
        description: form.description,
        banner_url: bannerUrl,
        event_date: form.event_date || null,
        event_location: form.event_location || null,
        min_followers: parseInt(form.min_followers) || 0,
        application_deadline: deadline,
        max_influencers: 999,
        budget: 0,
        budget_per_influencer: 0,
        countries: ['Romania'],
      }).select().single()

      if (error) throw error
      router.push(`/brand/campaigns/${camp.id}`)
    } catch (e: any) {
      alert('Eroare: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const PLATFORMS = [
    { id: 'Instagram', icon: '📸', label: 'Instagram' },
    { id: 'TikTok', icon: '🎵', label: 'TikTok' },
    { id: 'YouTube', icon: '▶️', label: 'YouTube' },
  ]

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/brand/campaigns">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-black">🎤 Open Call / Casting</h1>
          <p className="text-sm text-muted-foreground">Influencerii se înscriu singuri la campania ta</p>
        </div>
      </div>

      <div className="space-y-6">

        {/* Banner */}
        <div className="space-y-2">
          <label className="text-sm font-bold flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Banner campanie</label>
          <div
            onClick={() => fileRef.current?.click()}
            className="relative w-full h-48 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer overflow-hidden transition bg-muted/30 flex items-center justify-center"
          >
            {bannerPreview ? (
              <img src={bannerPreview} alt="banner" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center text-muted-foreground">
                {uploadingBanner ? <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" /> : <Upload className="w-8 h-8 mx-auto mb-2" />}
                <p className="text-sm font-medium">{uploadingBanner ? 'Se uploadează...' : 'Click pentru a adăuga banner'}</p>
                <p className="text-xs">JPG, PNG — recomandat 1200×600px</p>
              </div>
            )}
            {bannerPreview && (
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition flex items-center justify-center">
                <p className="text-white text-sm font-bold">Schimbă banner</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files?.[0] && uploadBanner(e.target.files[0])}
          />
          {bannerUrl && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Banner uploadat</p>}
        </div>

        {/* Titlu */}
        <div className="space-y-2">
          <label className="text-sm font-bold">Titlu campanie *</label>
          <Input
            placeholder="ex: World of Digital — Casting influenceri"
            value={form.title}
            onChange={e => set('title', e.target.value)}
          />
        </div>

        {/* Descriere */}
        <div className="space-y-2">
          <label className="text-sm font-bold flex items-center gap-2"><FileText className="w-4 h-4" /> Descriere / Brief *</label>
          <Textarea
            placeholder="Descrie campania, ce aștepți de la influenceri, ce primesc în schimb..."
            value={form.description}
            onChange={e => set('description', e.target.value)}
            rows={8}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">{form.description.length} caractere</p>
        </div>

        {/* Platforme */}
        <div className="space-y-2">
          <label className="text-sm font-bold">Platforme *</label>
          <div className="flex gap-2">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                className={`flex-1 p-3 rounded-xl border-2 text-sm font-bold transition ${
                  form.platforms.includes(p.id)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/30'
                }`}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Event date + location */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2"><Calendar className="w-4 h-4" /> Data eveniment</label>
            <Input type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2"><MapPin className="w-4 h-4" /> Locație</label>
            <Input placeholder="ex: Hotel Caro, București" value={form.event_location} onChange={e => set('event_location', e.target.value)} />
          </div>
        </div>

        {/* Cerinte */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2"><Users className="w-4 h-4" /> Minim followers</label>
            <Input type="number" placeholder="1000" value={form.min_followers} onChange={e => set('min_followers', e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-2"><Calendar className="w-4 h-4" /> Deadline aplicare</label>
            <Input type="date" value={form.application_deadline} onChange={e => set('application_deadline', e.target.value)} />
          </div>
        </div>

        {/* Submit */}
        <Button
          className="w-full h-12 bg-gradient-to-r from-primary to-accent font-bold text-base"
          onClick={handleSubmit}
          disabled={saving || uploadingBanner}
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Se creează...</> : '🚀 Lansează Open Call'}
        </Button>
      </div>
    </div>
  )
}
