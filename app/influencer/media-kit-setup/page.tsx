'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, ArrowLeft, ArrowRight, Save, Eye } from 'lucide-react'

const STEPS = [
  { id: 1, label: 'Prezentare', icon: '💼' },
  { id: 2, label: 'Tarife', icon: '💰' },
  { id: 3, label: 'Conținut', icon: '📸' },
  { id: 4, label: 'Preview', icon: '👁️' },
]

export default function MediaKitSetup() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [slug, setSlug] = useState('')
  const [inf, setInf] = useState<any>(null)

  // Pas 1 - Prezentare
  const [brandBio, setBrandBio] = useState('')
  const [whyChooseMe, setWhyChooseMe] = useState(['', '', '', ''])

  // Pas 2 - Tarife
  const [priceStory, setPriceStory] = useState('')
  const [priceReel, setPriceReel] = useState('')
  const [pricePost, setPricePost] = useState('')
  const [priceYoutube, setPriceYoutube] = useState('')
  const [priceMin, setPriceMin] = useState('')

  // Pas 3 - Conținut
  const [recentPosts, setRecentPosts] = useState(['', '', '', '', '', ''])
  const [portfolio, setPortfolio] = useState(['', '', '', '', ''])

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }

      const { data } = await sb.from('influencers').select('*').eq('user_id', user.id).single()
      if (!data) { router.replace('/influencer/profile'); return }

      setInf(data)
      setSlug(data.slug || '')
      setBrandBio(data.brand_bio || '')
      if (Array.isArray(data.why_choose_me)) {
        const w = [...data.why_choose_me]
        while (w.length < 4) w.push('')
        setWhyChooseMe(w)
      }
      setPriceStory(data.price_story?.toString() || '')
      setPriceReel(data.price_reel?.toString() || '')
      setPricePost(data.price_post?.toString() || '')
      setPriceYoutube(data.price_youtube?.toString() || '')
      setPriceMin(data.price_min?.toString() || '')
      if (Array.isArray(data.recent_posts_urls)) {
        const p = [...data.recent_posts_urls]
        while (p.length < 6) p.push('')
        setRecentPosts(p)
      }
      if (Array.isArray(data.portfolio_urls)) {
        const p = [...data.portfolio_urls]
        while (p.length < 5) p.push('')
        setPortfolio(p)
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function handleSave() {
    setSaving(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return

      await sb.from('influencers').update({
        brand_bio: brandBio.trim(),
        why_choose_me: whyChooseMe.filter(w => w.trim()),
        price_story: priceStory ? parseInt(priceStory) : null,
        price_reel: priceReel ? parseInt(priceReel) : null,
        price_post: pricePost ? parseInt(pricePost) : null,
        price_youtube: priceYoutube ? parseInt(priceYoutube) : null,
        price_min: priceMin ? parseInt(priceMin) : null,
        recent_posts_urls: recentPosts.filter(u => u.trim()),
        portfolio_urls: portfolio.filter(u => u.trim()),
      }).eq('user_id', user.id)

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '3px solid #ede9fe', borderTopColor: '#8b5cf6' }} />
    </div>
  )

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#f8f7ff', minHeight: '100vh', paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #ede9fe', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', top: 0, zIndex: 10, flexWrap: 'nowrap' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 13, fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>
          <ArrowLeft size={16} /> Înapoi
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 900, color: '#111', margin: 0 }}>Setup Media Kit</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none', background: saved ? '#16a34a' : 'linear-gradient(135deg,#8b5cf6,#ec4899)', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}
        >
          {saved ? <><Check size={14} /> Salvat!</> : saving ? 'Se salvează...' : <><Save size={14} /> Salvează</>}
        </button>
      </div>

      {/* Progress steps */}
      <div style={{ background: 'white', borderBottom: '1px solid #ede9fe', padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 4, maxWidth: 500, margin: '0 auto' }}>
          {STEPS.map((s, i) => (
            <button key={s.id} onClick={() => setStep(s.id)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 4px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: step === s.id ? '#f5f3ff' : 'transparent',
                opacity: step === s.id ? 1 : 0.5 }}>
              <span style={{ fontSize: 18 }}>{s.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: step === s.id ? '#7c3aed' : '#6b7280' }}>{s.label}</span>
              {step === s.id && <div style={{ width: 24, height: 2, borderRadius: 2, background: '#7c3aed' }} />}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>

        {/* PAS 1 — Prezentare */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid #ede9fe' }}>
              <p style={{ fontSize: 13, fontWeight: 900, color: '#4c1d95', margin: '0 0 4px' }}>💼 Bio pentru branduri</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 12px' }}>Prezintă-te brandurilor — cine ești, ce creezi, cui te adresezi.</p>
              <textarea
                value={brandBio}
                onChange={e => setBrandBio(e.target.value)}
                maxLength={600}
                rows={5}
                placeholder="Ex: Sunt creator de conținut beauty & lifestyle cu o audiență activă în România. Creez conținut autentic și estetic, potrivit pentru branduri care valorează calitatea..."
                style={{ width: '100%', fontSize: 13, border: '1.5px solid #ede9fe', borderRadius: 12, padding: '10px 12px', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '4px 0 0', textAlign: 'right' }}>{brandBio.length}/600</p>
            </div>

            <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid #ede9fe' }}>
              <p style={{ fontSize: 13, fontWeight: 900, color: '#4c1d95', margin: '0 0 4px' }}>⭐ De ce să colaboreze cu mine?</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 12px' }}>Adaugă minim 2 motive — vor apărea în media kit-ul tău.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {whyChooseMe.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: item.trim() ? '#f0fdf4' : '#f9fafb', border: `1.5px solid ${item.trim() ? '#22c55e' : '#e5e7eb'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={12} color={item.trim() ? '#22c55e' : '#d1d5db'} />
                    </div>
                    <input
                      type="text"
                      value={item}
                      onChange={e => { const u = [...whyChooseMe]; u[i] = e.target.value; setWhyChooseMe(u) }}
                      maxLength={120}
                      placeholder={['Conținut autentic și estetic', 'Livrare în termen, profesionalism', 'Audiență activă în România', 'Experiență cu branduri din nișa ta'][i]}
                      style={{ flex: 1, fontSize: 13, border: '1.5px solid #ede9fe', borderRadius: 10, padding: '8px 12px', outline: 'none', fontFamily: 'inherit' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PAS 2 — Tarife */}
        {step === 2 && (
          <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid #ede9fe' }}>
            <p style={{ fontSize: 13, fontWeight: 900, color: '#4c1d95', margin: '0 0 4px' }}>💰 Tarifele mele</p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 16px' }}>Prețuri orientative — brandurile le văd pe profilul tău și în media kit.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Story Instagram', value: priceStory, set: setPriceStory, placeholder: 'ex. 150' },
                { label: 'Reel / TikTok Video', value: priceReel, set: setPriceReel, placeholder: 'ex. 300' },
                { label: 'Post feed', value: pricePost, set: setPricePost, placeholder: 'ex. 200' },
                { label: 'Video YouTube', value: priceYoutube, set: setPriceYoutube, placeholder: 'ex. 500' },
                { label: 'Minim per campanie', value: priceMin, set: setPriceMin, placeholder: 'ex. 100' },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 14px', background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0' }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#374151' }}>{f.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="number"
                      min={0}
                      value={f.value}
                      onChange={e => f.set(e.target.value)}
                      placeholder={f.placeholder}
                      style={{ width: 80, fontSize: 13, fontWeight: 700, border: '1.5px solid #ede9fe', borderRadius: 8, padding: '6px 10px', outline: 'none', textAlign: 'right', fontFamily: 'inherit' }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#6b7280' }}>RON</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PAS 3 — Conținut */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid #ede9fe' }}>
              <p style={{ fontSize: 13, fontWeight: 900, color: '#4c1d95', margin: '0 0 4px' }}>📸 Postări recente</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 12px' }}>Adaugă 3–6 linkuri la postările tale recente de pe Instagram sau TikTok.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentPosts.map((url, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', width: 16, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                    <input
                      type="url"
                      value={url}
                      onChange={e => { const u = [...recentPosts]; u[i] = e.target.value; setRecentPosts(u) }}
                      placeholder={i === 0 ? 'https://www.instagram.com/p/...' : 'Link Instagram sau TikTok...'}
                      style={{ flex: 1, fontSize: 13, border: '1.5px solid #ede9fe', borderRadius: 10, padding: '8px 12px', outline: 'none', fontFamily: 'inherit' }}
                    />
                    {url && <button onClick={() => { const u = [...recentPosts]; u[i] = ''; setRecentPosts(u) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 16, padding: 0, lineHeight: 1 }}>✕</button>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid #ede9fe' }}>
              <p style={{ fontSize: 13, fontWeight: 900, color: '#4c1d95', margin: '0 0 4px' }}>🎬 Portfolio clipuri</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 12px' }}>Adaugă 3–5 clipuri reprezentative — cele mai bune colaborări ale tale.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {portfolio.map((url, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', width: 16, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                    <input
                      type="url"
                      value={url}
                      onChange={e => { const u = [...portfolio]; u[i] = e.target.value; setPortfolio(u) }}
                      placeholder={i === 0 ? 'https://www.tiktok.com/@user/video/...' : 'Link TikTok sau Instagram Reel...'}
                      style={{ flex: 1, fontSize: 13, border: '1.5px solid #ede9fe', borderRadius: 10, padding: '8px 12px', outline: 'none', fontFamily: 'inherit' }}
                    />
                    {url && <button onClick={() => { const u = [...portfolio]; u[i] = ''; setPortfolio(u) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 16, padding: 0, lineHeight: 1 }}>✕</button>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PAS 4 — Preview */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid #ede9fe', textAlign: 'center' }}>
              <p style={{ fontSize: 32, margin: '0 0 8px' }}>🎉</p>
              <p style={{ fontSize: 16, fontWeight: 900, color: '#111', margin: '0 0 6px' }}>Media kit-ul tău e gata!</p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', lineHeight: 1.6 }}>
                Salvează și previzualizează cum îl văd brandurile.
                Îl poți actualiza oricând.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={async () => { await handleSave(); if (slug) window.open(`/influencer/media-kit/${slug}`, '_blank') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <Eye size={16} /> Salvează și previzualizează
                </button>
              </div>
            </div>

            {/* Sumar ce a completat */}
            <div style={{ background: 'white', borderRadius: 16, padding: 20, border: '1px solid #ede9fe' }}>
              <p style={{ fontSize: 13, fontWeight: 900, color: '#4c1d95', margin: '0 0 12px' }}>Rezumat completare</p>
              {[
                { label: 'Bio pentru branduri', done: !!brandBio.trim() },
                { label: 'Motive colaborare', done: whyChooseMe.filter(w => w.trim()).length >= 2 },
                { label: 'Tarife setate', done: !!(priceReel || priceStory || pricePost) },
                { label: 'Postări recente', done: recentPosts.filter(u => u.trim()).length >= 1 },
                { label: 'Portfolio clipuri', done: portfolio.filter(u => u.trim()).length >= 1 },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: item.done ? '#f0fdf4' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={12} color={item.done ? '#22c55e' : '#fca5a5'} />
                  </div>
                  <span style={{ fontSize: 13, color: item.done ? '#374151' : '#9ca3af', flex: 1 }}>{item.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: item.done ? '#22c55e' : '#f87171' }}>{item.done ? '✓ Completat' : '✗ Lipsă'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          {step > 1
            ? <button onClick={() => setStep(s => s - 1)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 12, border: '1.5px solid #ede9fe', background: 'white', color: '#6b7280', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                <ArrowLeft size={14} /> Înapoi
              </button>
            : <div />
          }
          {step < 4
            ? <button onClick={async () => { await handleSave(); setStep(s => s + 1) }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                Salvează și continuă <ArrowRight size={14} />
              </button>
            : null
          }
        </div>
      </div>
    </div>
  )
}
