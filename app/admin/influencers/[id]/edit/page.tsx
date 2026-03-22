'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getInfluencer, updateInfluencer } from '@/app/actions/admin'
import { generateSlug, validateSlugFormat } from '@/lib/slug-utils'
import {
  ArrowLeft, Save, AlertCircle, CheckCircle, RefreshCw,
  User, Mail, Phone, Globe, Tag, DollarSign, FileText, Link2
} from 'lucide-react'
import Link from 'next/link'

const NICHES = ['Fashion', 'Beauty', 'Technology', 'Fitness', 'Travel', 'Food', 'Gaming', 'Lifestyle', 'Health', 'Business', 'Entertainment', 'Sports']
const PLATFORMS = ['instagram', 'tiktok', 'youtube', 'twitter', 'linkedin']

export default function EditInfluencerPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const [form, setForm] = useState({
    name: '', email: '', slug: '', bio: '', phone: '', country: '',
    price_from: '', price_to: '',
  })
  const [niches, setNiches] = useState<string[]>([])
  const [platforms, setPlatforms] = useState<{ platform: string; url: string; followers: string }[]>([])
  const [slugSuggestion, setSlugSuggestion] = useState('')

  const notify = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500) }

  useEffect(() => {
    async function load() {
      const res = await getInfluencer(id)
      if (res.success && res.data) {
        const d = res.data
        setForm({
          name: d.name || '', email: d.email || '', slug: d.slug || '',
          bio: d.bio || '', phone: d.phone || '', country: d.country || '',
          price_from: d.price_from ?? '', price_to: d.price_to ?? '',
        })
        setNiches(d.niches || [])
        setPlatforms(
          (d.platforms || []).map((p: any) =>
            typeof p === 'string'
              ? { platform: p, url: '', followers: '' }
              : { platform: p.platform || '', url: p.url || '', followers: p.followers || '' }
          )
        )
      } else setError('Influencer not found')
      setLoading(false)
    }
    load()
  }, [id])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(p => ({ ...p, [name]: value }))
    setError(null)
    if (name === 'name' && value.trim()) {
      const s = generateSlug(value)
      if (validateSlugFormat(s).valid) setSlugSuggestion(s)
    }
  }

  function toggleNiche(n: string) {
    setNiches(p => p.includes(n) ? p.filter(x => x !== n) : [...p, n])
  }

  function addPlatform() {
    setPlatforms(p => [...p, { platform: '', url: '', followers: '' }])
  }

  function updatePlatform(i: number, field: string, value: string) {
    setPlatforms(p => p.map((pl, idx) => idx === i ? { ...pl, [field]: value } : pl))
  }

  function removePlatform(i: number) {
    setPlatforms(p => p.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.email.trim()) { setError('Email is required'); return }

    let finalSlug = form.slug.trim() || generateSlug(form.name)
    const slugVal = validateSlugFormat(finalSlug)
    if (!slugVal.valid) { setError(`Invalid slug: ${slugVal.error}`); return }

    setSaving(true)
    try {
      const res = await updateInfluencer(id, {
        ...form,
        slug: finalSlug.toLowerCase(),
        price_from: form.price_from ? Number(form.price_from) : undefined,
        price_to: form.price_to ? Number(form.price_to) : undefined,
        niches,
        platforms: Object.fromEntries(
          platforms
            .filter(p => p.platform)
            .map(p => [
              p.platform.toLowerCase(),
              JSON.stringify({
                url: p.url || undefined,
                followers: p.followers || undefined,
              })
            ])
        ),
      })
      if (res.success) {
        setSuccess(true)
        notify('✅ Influencer updated!')
        setTimeout(() => router.push(`/admin/influencers/${id}`), 1500)
      } else setError((res as any).error || 'Failed to save')
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="w-10 h-10 rounded-full border-t-indigo-500 border-indigo-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
    </div>
  )

  if (error && !form.name) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <AlertCircle className="w-12 h-12 text-red-300 mb-4" />
      <p className="font-black text-gray-700 text-lg mb-2">Could not load influencer</p>
      <p className="text-sm text-gray-400 mb-6">{error}</p>
      <Link href="/admin/influencers" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
    </div>
  )

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .card { background:white;border:1.5px solid #f0f0f0;border-radius:20px;padding:24px; }
        .field { width:100%;padding:10px 14px;border:2px solid #e5e7eb;border-radius:12px;font-size:14px;font-weight:500;outline:none;transition:border-color .2s,box-shadow .2s;font-family:inherit;color:#111; background:white; }
        .field:focus { border-color:#6366f1;box-shadow:0 0 0 4px rgba(99,102,241,.08); }
        .field::placeholder { color:#9ca3af;font-weight:400; }
        .field:disabled { background:#f9fafb;opacity:.7;cursor:not-allowed; }
        .label { display:block;font-size:12px;font-weight:800;color:#374151;margin-bottom:6px; }
        .label span { font-weight:400;color:#9ca3af;margin-left:4px; }
        .section-title { font-size:15px;font-weight:900;color:#111827;margin-bottom:16px;display:flex;align-items:center;gap:8px; }
        .niche-pill { padding:6px 14px;border-radius:99px;font-size:13px;font-weight:700;cursor:pointer;border:2px solid #e5e7eb;transition:all .15s;background:white;color:#6b7280;font-family:inherit; }
        .niche-pill.active { background:linear-gradient(135deg,rgba(99,102,241,.1),rgba(139,92,246,.07));border-color:#6366f1;color:#4f46e5; }
        .niche-pill:hover:not(.active) { border-color:#c7d2fe;color:#4f46e5; }
        .btn-save { display:inline-flex;align-items:center;gap:8px;padding:11px 24px;border-radius:14px;font-size:15px;font-weight:800;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;border:none;cursor:pointer;transition:all .2s;font-family:inherit; }
        .btn-save:hover:not(:disabled) { transform:translateY(-2px);box-shadow:0 8px 20px rgba(99,102,241,.38); }
        .btn-save:disabled { opacity:.6;cursor:not-allowed;transform:none; }
        .btn-cancel { display:inline-flex;align-items:center;gap:8px;padding:11px 20px;border-radius:14px;font-size:15px;font-weight:700;background:white;color:#6b7280;border:2px solid #e5e7eb;cursor:pointer;transition:all .18s;font-family:inherit; }
        .btn-cancel:hover { border-color:#d1d5db;background:#f9fafb; }
        .btn-add { display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:10px;font-size:13px;font-weight:700;background:#eef2ff;color:#4f46e5;border:none;cursor:pointer;transition:all .15s;font-family:inherit; }
        .btn-add:hover { background:#e0e7ff; }
        .btn-remove { display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:#fef2f2;color:#ef4444;border:none;cursor:pointer;transition:background .15s;font-family:inherit;flex-shrink:0; }
        .btn-remove:hover { background:#fee2e2; }
        .slug-suggest { background:#eef2ff;border:1.5px solid #c7d2fe;border-radius:12px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;margin-top:8px; }
        .btn-use-slug { padding:5px 12px;border-radius:8px;font-size:12px;font-weight:800;background:#6366f1;color:white;border:none;cursor:pointer;font-family:inherit; }
        select.field { appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:36px; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation:fadeUp .35s ease both; }
        @keyframes slideD { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .toast-anim { animation:slideD .3s ease; }
      `}</style>

      {toast && (
        <div className={`toast-anim fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold ${toast.ok ? 'bg-white border-2 border-green-200 text-green-700' : 'bg-white border-2 border-red-200 text-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Back */}
      <Link href={`/admin/influencers/${id}`} className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-700 transition mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Profile
      </Link>

      <div className="mb-6 fade-up">
        <h1 className="text-2xl font-black text-gray-900">Edit Influencer</h1>
        <p className="text-sm text-gray-400 mt-0.5">Update profile information for <span className="font-bold text-gray-600">{form.name}</span></p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic info */}
        <div className="card fade-up" style={{ animationDelay: '.04s' }}>
          <p className="section-title"><User className="w-4 h-4 text-indigo-500" /> Basic Information</p>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="label">Name <span>*</span></label>
              <input name="name" className="field" value={form.name} onChange={handleChange} placeholder="Full name" disabled={saving} />
            </div>
            <div>
              <label className="label">Email <span>*</span></label>
              <input name="email" type="email" className="field" value={form.email} onChange={handleChange} placeholder="email@example.com" disabled={saving} />
            </div>
          </div>
          <div className="mb-4">
            <label className="label">Slug <span>(unique URL identifier)</span></label>
            <input name="slug" className="field" value={form.slug} onChange={handleChange} placeholder="e.g. john-doe-fitness" disabled={saving} />
            {form.slug && (
              <p className="text-xs text-gray-400 mt-1.5 font-medium">
                Profile URL: /influencers/<span className="font-mono text-indigo-500">{form.slug.toLowerCase()}</span>
              </p>
            )}
            {slugSuggestion && !form.slug && (
              <div className="slug-suggest">
                <div>
                  <p className="text-xs font-black text-indigo-800">Auto-generate from name?</p>
                  <p className="text-xs font-mono text-indigo-600 mt-0.5">{slugSuggestion}</p>
                </div>
                <button type="button" className="btn-use-slug" onClick={() => setForm(p => ({ ...p, slug: slugSuggestion }))}>
                  Use this
                </button>
              </div>
            )}
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea name="bio" className="field" rows={4} value={form.bio} onChange={handleChange} placeholder="About this influencer…" disabled={saving} style={{ resize: 'vertical' }} />
          </div>
        </div>

        {/* Contact */}
        <div className="card fade-up" style={{ animationDelay: '.08s' }}>
          <p className="section-title"><Phone className="w-4 h-4 text-indigo-500" /> Contact & Location</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Phone</label>
              <input name="phone" className="field" value={form.phone} onChange={handleChange} placeholder="+1 (555) 123-4567" disabled={saving} />
            </div>
            <div>
              <label className="label">Country</label>
              <input name="country" className="field" value={form.country} onChange={handleChange} placeholder="e.g. Romania" disabled={saving} />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="card fade-up" style={{ animationDelay: '.12s' }}>
          <p className="section-title"><DollarSign className="w-4 h-4 text-indigo-500" /> Pricing (EUR)</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">From</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">€</span>
                <input name="price_from" type="number" className="field" style={{ paddingLeft: '28px' }} value={form.price_from} onChange={handleChange} placeholder="500" disabled={saving} />
              </div>
            </div>
            <div>
              <label className="label">To</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">€</span>
                <input name="price_to" type="number" className="field" style={{ paddingLeft: '28px' }} value={form.price_to} onChange={handleChange} placeholder="5000" disabled={saving} />
              </div>
            </div>
          </div>
        </div>

        {/* Niches */}
        <div className="card fade-up" style={{ animationDelay: '.16s' }}>
          <p className="section-title"><Tag className="w-4 h-4 text-indigo-500" /> Niches</p>
          <div className="flex flex-wrap gap-2">
            {NICHES.map(n => (
              <button key={n} type="button" className={`niche-pill ${niches.includes(n) ? 'active' : ''}`} onClick={() => toggleNiche(n)}>{n}</button>
            ))}
          </div>
        </div>

        {/* Platforms */}
        <div className="card fade-up" style={{ animationDelay: '.20s' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="section-title mb-0"><Link2 className="w-4 h-4 text-indigo-500" /> Social Platforms</p>
            <button type="button" className="btn-add" onClick={addPlatform}>+ Add Platform</button>
          </div>
          {platforms.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No platforms added yet.</p>
          ) : (
            <div className="space-y-3">
              {platforms.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50">
                  <select
                    className="field"
                    style={{ width: '140px', flexShrink: 0 }}
                    value={p.platform}
                    onChange={e => updatePlatform(i, 'platform', e.target.value)}
                  >
                    <option value="">Platform…</option>
                    {PLATFORMS.map(pl => <option key={pl} value={pl}>{pl.charAt(0).toUpperCase() + pl.slice(1)}</option>)}
                  </select>
                  <input className="field flex-1" placeholder="Profile URL" value={p.url} onChange={e => updatePlatform(i, 'url', e.target.value)} />
                  <input className="field" style={{ width: '120px', flexShrink: 0 }} placeholder="Followers" value={p.followers} onChange={e => updatePlatform(i, 'followers', e.target.value)} />
                  <button type="button" className="btn-remove" onClick={() => removePlatform(i)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-red-50 border-2 border-red-200 text-red-600 fade-up">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-green-50 border-2 border-green-200 text-green-700 fade-up">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm font-bold">Saved successfully! Redirecting…</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 fade-up" style={{ animationDelay: '.24s' }}>
          <button type="submit" className="btn-save" disabled={saving || success}>
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
              : <><Save className="w-4 h-4" /> Save Changes</>
            }
          </button>
          <button type="button" className="btn-cancel" onClick={() => router.back()} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
