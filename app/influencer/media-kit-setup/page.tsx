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
    <div className="iu" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '3px solid #efeaff', borderTopColor: '#7040f0' }} />
    </div>
  )

  const doneCount = [
    !!brandBio.trim(),
    whyChooseMe.filter(w => w.trim()).length >= 2,
    !!(priceReel || priceStory || pricePost),
    recentPosts.filter(u => u.trim()).length >= 1,
    portfolio.filter(u => u.trim()).length >= 1,
  ].filter(Boolean).length

  return (
    <div className="iu mk">
      <style>{`
        .mk { max-width: 760px; }
        .mk-in { width: 100%; height: 44px; border: 1.5px solid #e5e3f3; border-radius: 12px; padding: 0 14px; font: inherit; font-size: 14px; background: #fff; color: #14123a; outline: none; box-sizing: border-box; min-width: 0; }
        .mk-in:focus, .mk-ta:focus { border-color: #7040f0; box-shadow: 0 0 0 3px rgba(112,64,240,.1); }
        .mk-ta { width: 100%; border: 1.5px solid #e5e3f3; border-radius: 12px; padding: 12px 14px; font: inherit; font-size: 14px; color: #14123a; outline: none; resize: none; box-sizing: border-box; background: #fff; }
        .mk-in.num { text-align: right; font-weight: 700; }
        .mk-rate { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #f6f6fc; border: 1px solid #eeecf7; border-radius: 14px; flex-wrap: wrap; }
        .mk-rate > span { flex: 1; min-width: 140px; font-size: 14px; font-weight: 600; }
        .mk-rate .w { display: flex; align-items: center; gap: 8px; }
        .mk-rate .mk-in { width: 110px; }
        .mk-line { display: flex; align-items: center; gap: 10px; }
        .mk-n { width: 22px; flex: none; text-align: right; font-size: 12px; font-weight: 700; color: #8783a8; }
        .mk-dot { width: 26px; height: 26px; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1.5px solid #e5e3f3; background: #f6f6fc; color: #c4c1dc; }
        .mk-dot.ok { background: #dcf5ec; border-color: #86e0b8; color: #14532d; }
        .mk-x { width: 44px; height: 44px; flex: none; border: 0; background: transparent; color: #8783a8; cursor: pointer; font-size: 16px; border-radius: 10px; }
        .mk-x:hover { background: #f6f6fc; color: #b42318; }
        .mk-sum { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #eeecf7; }
        .mk-sum:last-child { border-bottom: 0; }
        .mk-nav { position: sticky; bottom: 0; z-index: 5; display: flex; justify-content: space-between; gap: 10px; padding: 12px 16px; margin: 0 -16px; background: rgba(246,246,252,.94); backdrop-filter: blur(6px); border-top: 1px solid #e5e3f3; }
        @media (max-width: 767px) { .mk-nav { bottom: 64px; } .mk-nav .iu-btn { flex: 1; } .mk-rate .mk-in { width: 100%; flex: 1; } .mk-rate .w { flex: 1; } }
      `}</style>

      <div className="iu-head">
        <div>
          <button onClick={() => router.back()} className="iu-btn" style={{ height: 34, padding: '0 12px', marginBottom: 12, fontSize: 13 }}>
            <ArrowLeft size={14} /> Înapoi
          </button>
          <div className="iu-label" style={{ marginBottom: 6 }}>Media kit · Pasul {step} din {STEPS.length}</div>
          <h1>Setup Media Kit</h1>
          <p className="iu-muted iu-sm" style={{ margin: '6px 0 0' }}>Completează informațiile pe care brandurile le văd în media kit-ul tău.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="iu-btn p" style={saved ? { background: '#16a34a', borderColor: '#16a34a' } : undefined}>
          {saved ? <><Check size={14} /> Salvat!</> : saving ? 'Se salvează...' : <><Save size={14} /> Salvează</>}
        </button>
      </div>

      <div className="iu-tabs">
        {STEPS.map(s => (
          <button key={s.id} onClick={() => setStep(s.id)} className={`iu-pill${step === s.id ? ' on' : ''}`} style={{ minHeight: 44 }}>
            <span>{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      {/* PAS 1 — Prezentare */}
      {step === 1 && (
        <>
          <div className="iu-card iu-card-pad">
            <h3>💼 Bio pentru branduri</h3>
            <p className="iu-muted iu-sm" style={{ margin: '4px 0 14px' }}>Prezintă-te brandurilor — cine ești, ce creezi, cui te adresezi.</p>
            <textarea
              className="mk-ta"
              value={brandBio}
              onChange={e => setBrandBio(e.target.value)}
              maxLength={600}
              rows={5}
              placeholder="Ex: Sunt creator de conținut beauty & lifestyle cu o audiență activă în România. Creez conținut autentic și estetic, potrivit pentru branduri care valorează calitatea..."
            />
            <p className="iu-muted iu-xs" style={{ margin: '4px 0 0', textAlign: 'right' }}>{brandBio.length}/600</p>
          </div>

          <div className="iu-card iu-card-pad">
            <h3>⭐ De ce să colaboreze cu mine?</h3>
            <p className="iu-muted iu-sm" style={{ margin: '4px 0 14px' }}>Adaugă minim 2 motive — vor apărea în media kit-ul tău.</p>
            <div className="iu-col" style={{ gap: 10 }}>
              {whyChooseMe.map((item, i) => (
                <div key={i} className="mk-line">
                  <div className={`mk-dot${item.trim() ? ' ok' : ''}`}><Check size={13} /></div>
                  <input
                    className="mk-in"
                    type="text"
                    value={item}
                    onChange={e => { const u = [...whyChooseMe]; u[i] = e.target.value; setWhyChooseMe(u) }}
                    maxLength={120}
                    placeholder={['Conținut autentic și estetic', 'Livrare în termen, profesionalism', 'Audiență activă în România', 'Experiență cu branduri din nișa ta'][i]}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* PAS 2 — Tarife */}
      {step === 2 && (
        <div className="iu-card iu-card-pad">
          <h3>💰 Tarifele mele</h3>
          <p className="iu-muted iu-sm" style={{ margin: '4px 0 16px' }}>Prețuri orientative — brandurile le văd pe profilul tău și în media kit.</p>
          <div className="iu-col" style={{ gap: 10 }}>
            {[
              { label: 'Story Instagram', value: priceStory, set: setPriceStory, placeholder: 'ex. 150' },
              { label: 'Reel / TikTok Video', value: priceReel, set: setPriceReel, placeholder: 'ex. 300' },
              { label: 'Post feed', value: pricePost, set: setPricePost, placeholder: 'ex. 200' },
              { label: 'Video YouTube', value: priceYoutube, set: setPriceYoutube, placeholder: 'ex. 500' },
              { label: 'Minim per campanie', value: priceMin, set: setPriceMin, placeholder: 'ex. 100' },
            ].map(f => (
              <div key={f.label} className="mk-rate">
                <span>{f.label}</span>
                <div className="w">
                  <input
                    className="mk-in num"
                    type="number"
                    min={0}
                    value={f.value}
                    onChange={e => f.set(e.target.value)}
                    placeholder={f.placeholder}
                  />
                  <span className="iu-muted" style={{ fontSize: 13, fontWeight: 700, flex: 'none', minWidth: 0 }}>RON</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PAS 3 — Conținut */}
      {step === 3 && (
        <>
          <div className="iu-card iu-card-pad">
            <h3>📸 Postări recente</h3>
            <p className="iu-muted iu-sm" style={{ margin: '4px 0 14px' }}>Adaugă 3–6 linkuri la postările tale recente de pe Instagram sau TikTok.</p>
            <div className="iu-col" style={{ gap: 8 }}>
              {recentPosts.map((url, i) => (
                <div key={i} className="mk-line" style={{ gap: 6 }}>
                  <span className="mk-n">{i + 1}</span>
                  <input
                    className="mk-in"
                    type="url"
                    value={url}
                    onChange={e => { const u = [...recentPosts]; u[i] = e.target.value; setRecentPosts(u) }}
                    placeholder={i === 0 ? 'https://www.instagram.com/p/...' : 'Link Instagram sau TikTok...'}
                  />
                  {url ? <button className="mk-x" aria-label="Șterge" onClick={() => { const u = [...recentPosts]; u[i] = ''; setRecentPosts(u) }}>✕</button> : <span style={{ width: 44, flex: 'none' }} />}
                </div>
              ))}
            </div>
          </div>

          <div className="iu-card iu-card-pad">
            <h3>🎬 Portfolio clipuri</h3>
            <p className="iu-muted iu-sm" style={{ margin: '4px 0 14px' }}>Adaugă 3–5 clipuri reprezentative — cele mai bune colaborări ale tale.</p>
            <div className="iu-col" style={{ gap: 8 }}>
              {portfolio.map((url, i) => (
                <div key={i} className="mk-line" style={{ gap: 6 }}>
                  <span className="mk-n">{i + 1}</span>
                  <input
                    className="mk-in"
                    type="url"
                    value={url}
                    onChange={e => { const u = [...portfolio]; u[i] = e.target.value; setPortfolio(u) }}
                    placeholder={i === 0 ? 'https://www.tiktok.com/@user/video/...' : 'Link TikTok sau Instagram Reel...'}
                  />
                  {url ? <button className="mk-x" aria-label="Șterge" onClick={() => { const u = [...portfolio]; u[i] = ''; setPortfolio(u) }}>✕</button> : <span style={{ width: 44, flex: 'none' }} />}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* PAS 4 — Preview */}
      {step === 4 && (
        <>
          <div className="iu-card iu-card-pad" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 36, margin: '0 0 8px' }}>🎉</p>
            <h2 style={{ margin: '0 0 6px' }}>Media kit-ul tău e gata!</h2>
            <p className="iu-muted iu-sm" style={{ margin: '0 0 18px', lineHeight: 1.6 }}>
              Salvează și previzualizează cum îl văd brandurile. Îl poți actualiza oricând.
            </p>
            <button
              className="iu-btn p big"
              onClick={async () => { await handleSave(); if (slug) window.open(`/influencer/media-kit/${slug}`, '_blank') }}
            >
              <Eye size={16} /> Salvează și previzualizează
            </button>
          </div>

          <div className="iu-card iu-card-pad">
            <div className="iu-row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <h3>Rezumat completare</h3>
              <span className="iu-chip" style={{ background: doneCount === 5 ? '#dcf5ec' : '#efeaff', color: doneCount === 5 ? '#14532d' : '#5b2fd0' }}>{doneCount}/5</span>
            </div>
            <div className="iu-bar" style={{ marginBottom: 6 }}><i style={{ width: `${doneCount * 20}%` }} /></div>
            {[
              { label: 'Bio pentru branduri', done: !!brandBio.trim() },
              { label: 'Motive colaborare', done: whyChooseMe.filter(w => w.trim()).length >= 2 },
              { label: 'Tarife setate', done: !!(priceReel || priceStory || pricePost) },
              { label: 'Postări recente', done: recentPosts.filter(u => u.trim()).length >= 1 },
              { label: 'Portfolio clipuri', done: portfolio.filter(u => u.trim()).length >= 1 },
            ].map(item => (
              <div key={item.label} className="mk-sum">
                <div className={`mk-dot${item.done ? ' ok' : ''}`} style={{ width: 22, height: 22 }}><Check size={12} /></div>
                <span style={{ fontSize: 14, flex: 1, color: item.done ? '#14123a' : '#8783a8' }}>{item.label}</span>
                <span className="iu-chip" style={item.done ? { background: '#dcf5ec', color: '#14532d' } : { background: '#f0eff7', color: '#4a4770' }}>{item.done ? 'Completat' : 'Lipsă'}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Navigation buttons */}
      <div className="mk-nav">
        {step > 1
          ? <button className="iu-btn" onClick={() => setStep(s => s - 1)}><ArrowLeft size={14} /> Înapoi</button>
          : <div />
        }
        {step < 4
          ? <button className="iu-btn p" onClick={async () => { await handleSave(); setStep(s => s + 1) }}>Salvează și continuă <ArrowRight size={14} /></button>
          : null
        }
      </div>
    </div>
  )
}
