'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { registerBrand, registerInfluencer } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'
import {
  AlertCircle, ArrowRight, ArrowLeft, Eye, EyeOff,
  TrendingUp, Users, CheckCircle, Clock, MapPin, X, Loader2,
} from 'lucide-react'
import {
  BRAND_INDUSTRIES, COMPANY_SIZES, INFLUENCER_NICHES,
  COUNTRIES, validatePassword,
} from '@/lib/constants/registration'
import { Suspense } from 'react'

type Step = 'role' | 'account' | 'profile'

function RegisterForm() {
  const searchParams = useSearchParams()
  const initialType = searchParams.get('type')

  const [step, setStep] = useState<Step>(initialType ? 'account' : 'role')
  const [role, setRole] = useState<'BRAND' | 'INFLUENCER' | null>(
    initialType === 'brand' ? 'BRAND' : initialType === 'influencer' ? 'INFLUENCER' : null
  )

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])

  const [brandName, setBrandName] = useState('')
  const [industry, setIndustry] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [website, setWebsite] = useState('')

  const [influencerName, setInfluencerName] = useState('')
  const [bio, setBio] = useState('')
  const [niches, setNiches] = useState<string[]>([])
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [cityLat, setCityLat] = useState<number | undefined>(undefined)
  const [cityLon, setCityLon] = useState<number | undefined>(undefined)
  const [cityResults, setCityResults] = useState<any[]>([])
  const [citySearching, setCitySearching] = useState(false)
  const [showCityResults, setShowCityResults] = useState(false)
  const cityDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const cityWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cityWrapperRef.current && !cityWrapperRef.current.contains(e.target as Node)) {
        setShowCityResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const [error, setError] = useState<string | null>(null)
  const [rateLimited, setRateLimited] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const isBrand = role === 'BRAND'
  const stepIndex = step === 'role' ? 0 : step === 'account' ? 1 : 2
  const steps = ['Choose type', 'Account', isBrand ? 'Brand info' : 'Your profile']

  const validatePwd = (pwd: string) => {
    const v = validatePassword(pwd)
    setPasswordErrors(v.errors)
    return v.valid
  }

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email || !password) { setError('Email and password are required'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    if (!validatePwd(password)) return
    setStep('profile')
  }

  const handleBrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setRateLimited(false); setLoading(true)
    try {
      const result = await registerBrand(email, password, brandName, industry, companySize, website)
      if (result?.error) {
        if ('rateLimited' in result && result.rateLimited) setRateLimited(true)
        setError(result.error)
      } else {
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}&type=brand`)
      }
    } catch { setError('An unexpected error occurred') }
    finally { setLoading(false) }
  }

  const handleInfluencerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setRateLimited(false)
    if (!city.trim()) { setError('Orașul/Comuna este obligatorie'); return }
    setLoading(true)
    try {
      const result = await registerInfluencer(email, password, influencerName, bio, niches, country, undefined, city, cityLat, cityLon)
      if (result?.error) {
        if ('rateLimited' in result && result.rateLimited) setRateLimited(true)
        setError(result.error)
      } else {
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}&type=influencer`)
      }
    } catch { setError('An unexpected error occurred') }
    finally { setLoading(false) }
  }

  const searchCity = async (q: string) => {
    if (q.length < 2) { setCityResults([]); setShowCityResults(false); return }
    setCitySearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=5&countrycodes=ro`,
        { headers: { 'Accept-Language': 'ro', 'User-Agent': 'AddFame/1.0' } }
      )
      const data = await res.json()
      setCityResults(data)
      setShowCityResults(true)
    } catch { setCityResults([]) }
    finally { setCitySearching(false) }
  }

  const handleCityChange = (val: string) => {
    setCity(val)
    setCityLat(undefined); setCityLon(undefined)
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current)
    cityDebounceRef.current = setTimeout(() => searchCity(val), 400)
  }

  const selectCity = (r: any) => {
    const a = r.address
    const name = a.city || a.town || a.village || a.county || r.name
    setCity(name)
    setCityLat(parseFloat(r.lat))
    setCityLon(parseFloat(r.lon))
    setShowCityResults(false)
    setCityResults([])
  }

  const toggleNiche = (n: string) =>
    setNiches(prev => prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n])

  const accentColor = isBrand || role === null ? '#f97316' : '#8b5cf6'
  const accentLight = isBrand || role === null ? 'rgba(249,115,22,0.10)' : 'rgba(139,92,246,0.10)'

  return (
    <div className="min-h-screen bg-white flex" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes floatBadge { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
        .fade-up{animation:fadeUp .55s ease both}
        .slide-in{animation:slideIn .4s ease both}
        .float-1{animation:floatBadge 4s ease-in-out infinite}
        .float-2{animation:floatBadge 5s ease-in-out infinite;animation-delay:1.5s}
        .float-3{animation:floatBadge 4.5s ease-in-out infinite;animation-delay:0.8s}
        .d1{animation-delay:.06s}.d2{animation-delay:.12s}.d3{animation-delay:.18s}.d4{animation-delay:.24s}.d5{animation-delay:.30s}
        .brand-grad{background:linear-gradient(135deg,#f97316,#ec4899)}
        .infl-grad{background:linear-gradient(135deg,#8b5cf6,#06b6d4)}
        .f{width:100%;padding:11px 16px;border:2px solid #e5e7eb;border-radius:12px;font-size:14px;font-weight:500;outline:none;transition:border-color .2s,box-shadow .2s;font-family:inherit;color:#111;background:white}
        .f:focus{border-color:var(--ac);box-shadow:0 0 0 4px var(--acl)}
        .f::placeholder{color:#9ca3af;font-weight:400}
        .f:disabled{background:#f9fafb;color:#9ca3af}
        .sel{width:100%;padding:11px 16px;border:2px solid #e5e7eb;border-radius:12px;font-size:14px;font-weight:500;outline:none;transition:border-color .2s;font-family:inherit;color:#111;background:white;cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;background-size:16px;padding-right:44px}
        .sel:focus{border-color:var(--ac);box-shadow:0 0 0 4px var(--acl)}
        .btn{width:100%;padding:14px;border-radius:12px;font-size:15px;font-weight:800;color:white;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:transform .18s,box-shadow .18s;font-family:inherit}
        .btn:hover:not(:disabled){transform:translateY(-2px)}
        .btn:disabled{opacity:.6;cursor:not-allowed}
        .niche-btn{padding:8px 14px;border-radius:10px;font-size:13px;font-weight:700;border:2px solid #e5e7eb;cursor:pointer;transition:all .18s;font-family:inherit;background:white;color:#374151}
        .niche-btn.active{color:white;border-color:transparent}
        .niche-btn:hover:not(.active){border-color:var(--ac);color:var(--ac);background:var(--acl)}
      `}</style>

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-[45%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: isBrand ? 'linear-gradient(145deg,#fff7ed,#fce7f3,#ede9fe)' : 'linear-gradient(145deg,#ede9fe,#dbeafe,#ecfdf5)' }}>

        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-12 right-8 w-80 h-80 rounded-full blur-3xl opacity-40"
            style={{ background: `radial-gradient(circle, ${isBrand ? 'rgba(249,115,22,0.22)' : 'rgba(139,92,246,0.22)'}, transparent 70%)` }} />
          <div className="absolute bottom-16 left-4 w-64 h-64 rounded-full blur-3xl opacity-30"
            style={{ background: `radial-gradient(circle, ${isBrand ? 'rgba(236,72,153,0.18)' : 'rgba(6,182,212,0.18)'}, transparent 70%)` }} />
        </div>

        <Link href="/" className="relative z-10 flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isBrand ? 'brand-grad' : 'infl-grad'}`}
            style={{ boxShadow: `0 4px 14px ${isBrand ? 'rgba(249,115,22,0.35)' : 'rgba(139,92,246,0.35)'}` }}>
            <img src="/logo.png" alt="AddFame" style={{ width: '110%', height: '110%', objectFit: 'contain' }} />
          </div>
          <span className="font-black text-xl tracking-tight text-gray-900">
            Add<span style={{ color: accentColor }}>Fame</span>
          </span>
        </Link>

        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <div className="mb-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border"
            style={{ background: accentLight, borderColor: `${accentColor}33`, color: accentColor }}>
            {isBrand ? '🏢 For Brands' : role === 'INFLUENCER' ? '✨ For Influencers' : '🚀 Join AddFame'}
          </div>
          <h2 className="text-4xl font-black text-gray-900 leading-tight mt-3 mb-4">
            {isBrand ? 'Grow your brand' : role === 'INFLUENCER' ? 'Monetize your' : 'Start your journey'}
            <br />
            <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontWeight: 400, color: accentColor }}>
              {isBrand ? 'with real people' : role === 'INFLUENCER' ? 'influence' : 'with AddFame'}
            </span>
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-10 max-w-xs">
            {isBrand
              ? 'Launch campaigns in minutes and receive authentic videos from micro-influencers that convert.'
              : role === 'INFLUENCER'
                ? 'Connect with brands you love, create authentic content, and get paid fast — on your own terms.'
                : 'The simplest platform to connect brands with micro-influencers for content that actually works.'}
          </p>

          {/* Floating feature cards */}
          <div className="space-y-3 max-w-[280px]">
            {(isBrand ? [
              { icon: '⚡', title: 'Launch in 5 minutes', sub: 'No marketing experience needed', delay: 'float-1' },
              { icon: '🎬', title: 'Videos in 3 days', sub: 'Ready to post or use as ads', delay: 'float-2' },
              { icon: '💯', title: '100% money back', sub: 'If we can\'t find your influencers', delay: 'float-3' },
            ] : role === 'INFLUENCER' ? [
              { icon: '💸', title: 'Get paid fast', sub: 'Direct to your account', delay: 'float-1' },
              { icon: '🎯', title: 'Matching brands', sub: 'Only brands that fit your niche', delay: 'float-2' },
              { icon: '🕐', title: 'Your schedule', sub: 'Work when you want', delay: 'float-3' },
            ] : [
              { icon: '🏢', title: '1,200+ brands', sub: 'already growing with AddFame', delay: 'float-1' },
              { icon: '✨', title: '15,000+ creators', sub: 'ready for your campaign', delay: 'float-2' },
              { icon: '🚀', title: '98,000+ videos', sub: 'delivered and counting', delay: 'float-3' },
            ]).map((c, i) => (
              <div key={i} className={`${c.delay} bg-white/75 backdrop-blur-sm rounded-2xl p-3.5 border border-white/60 flex items-center gap-3`}
                style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.07)', marginLeft: i === 1 ? '20px' : '0' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: accentLight }}>
                  {c.icon}
                </div>
                <div>
                  <p className="text-xs font-black text-gray-900">{c.title}</p>
                  <p className="text-xs text-gray-400">{c.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex -space-x-2">
            {['🧑', '👩', '👨', '👩'].map((e, i) => (
              <div key={i} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-xs"
                style={{ background: 'linear-gradient(135deg,#fed7aa,#fce7f3)' }}>{e}</div>
            ))}
          </div>
          <p className="text-sm text-gray-500"><span className="font-black text-gray-900">1,200+</span> brands trust AddFame</p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="w-full lg:w-7/12 xl:w-[55%] flex items-start justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-lg" style={{ '--ac': accentColor, '--acl': accentLight } as React.CSSProperties}>

          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-8 justify-center fade-up">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isBrand ? 'brand-grad' : 'infl-grad'}`}
              style={{ boxShadow: `0 4px 14px ${accentColor}55` }}>
              <img src="/logo.png" alt="AddFame" style={{ width: '110%', height: '110%', objectFit: 'contain' }} />
            </div>
            <span className="font-black text-xl tracking-tight">Influe<span style={{ color: accentColor }}>X</span></span>
          </Link>

          {/* Step progress */}
          <div className="fade-up mb-8">
            <div className="flex items-center gap-2 mb-4">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2 flex-1 last:flex-none">
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${i < stepIndex ? 'text-white' : i === stepIndex ? 'text-white' : 'bg-gray-100 text-gray-400'
                      }`} style={i <= stepIndex ? { background: accentColor } : {}}>
                      {i < stepIndex ? <CheckCircle className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className={`text-xs font-bold hidden sm:block ${i === stepIndex ? 'text-gray-900' : 'text-gray-400'}`}>{s}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="flex-1 h-0.5 rounded-full" style={{ background: i < stepIndex ? accentColor : '#e5e7eb' }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && !rateLimited && (
            <div className="fade-up mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl p-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {rateLimited && (
            <div className="fade-up mb-5 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-2xl p-4">
              <Clock className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
              <div>
                <p className="font-black mb-1">Email rate limit reached</p>
                <p className="text-amber-700">Check your inbox for an existing confirmation email, or wait a few minutes and try again.</p>
                <p className="mt-2">Already have an account? <Link href="/auth/login" className="font-black underline hover:text-amber-900">Sign in here</Link></p>
              </div>
            </div>
          )}

          {/* ── STEP 1: Role ── */}
          {step === 'role' && (
            <div className="slide-in">
              <h1 className="text-3xl font-black text-gray-900 mb-1">Create your account</h1>
              <p className="text-gray-500 text-sm mb-7">
                Already have an account?{' '}
                <Link href="/auth/login" className="font-bold hover:text-gray-800 transition" style={{ color: accentColor }}>Sign in</Link>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    type: 'BRAND' as const,
                    icon: TrendingUp,
                    grad: 'brand-grad',
                    label: 'I\'m a Brand',
                    desc: 'Launch campaigns and find the right influencers for your business.',
                    features: ['Create campaigns', 'Find influencers', 'Track results'],
                    border: 'border-orange-200',
                    activeBorder: 'border-orange-400',
                    activeBg: 'bg-orange-50',
                    checkColor: 'text-orange-500',
                  },
                  {
                    type: 'INFLUENCER' as const,
                    icon: Users,
                    grad: 'infl-grad',
                    label: 'I\'m an Influencer',
                    desc: 'Discover brand deals and earn money from your audience.',
                    features: ['Browse campaigns', 'Build portfolio', 'Earn money'],
                    border: 'border-purple-200',
                    activeBorder: 'border-purple-400',
                    activeBg: 'bg-purple-50',
                    checkColor: 'text-purple-500',
                  },
                ].map(opt => (
                  <button key={opt.type} type="button"
                    onClick={() => { setRole(opt.type); setStep('account') }}
                    className={`relative p-6 rounded-2xl border-2 text-left transition-all hover:-translate-y-1 ${opt.border} hover:${opt.activeBorder} bg-white`}
                    style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.05)', transition: 'all .2s ease' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = accentColor; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px ${accentColor}22` }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)' }}
                  >
                    <div className={`w-11 h-11 rounded-xl ${opt.grad} flex items-center justify-center mb-4`}
                      style={{ boxShadow: opt.type === 'BRAND' ? '0 4px 12px rgba(249,115,22,0.3)' : '0 4px 12px rgba(139,92,246,0.3)' }}>
                      <opt.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="font-black text-base text-gray-900 mb-1.5">{opt.label}</p>
                    <p className="text-xs text-gray-500 leading-relaxed mb-4">{opt.desc}</p>
                    <ul className="space-y-1.5">
                      {opt.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                          <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 ${opt.checkColor}`} /> {f}
                        </li>
                      ))}
                    </ul>
                    <div className="absolute top-4 right-4 flex items-center gap-1 text-xs font-bold" style={{ color: accentColor }}>
                      Start <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 2: Account ── */}
          {step === 'account' && (
            <form onSubmit={handleAccountSubmit} className="slide-in space-y-5">
              <div>
                <h1 className="text-3xl font-black text-gray-900 mb-1">
                  {isBrand ? 'Brand account' : 'Creator account'}
                </h1>
                <p className="text-gray-500 text-sm">Set up your login credentials</p>
              </div>

              <div className="d1 fade-up">
                <label className="block text-sm font-black text-gray-700 mb-2">Email address</label>
                <input className="f" type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} disabled={loading} required />
              </div>

              <div className="d2 fade-up">
                <label className="block text-sm font-black text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <input className="f pr-12" type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters"
                    value={password}
                    onChange={e => { setPassword(e.target.value); if (e.target.value) validatePwd(e.target.value) }}
                    disabled={loading} required />
                  <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordErrors.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {passwordErrors.map(e => (
                      <li key={e} className="text-xs text-red-500 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" /> {e}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="d3 fade-up">
                <label className="block text-sm font-black text-gray-700 mb-2">Confirm password</label>
                <div className="relative">
                  <input className="f pr-12" type={showConfirm ? 'text' : 'password'} placeholder="••••••••"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={loading} required />
                  <button type="button" tabIndex={-1} onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" /> Passwords don't match
                  </p>
                )}
                {confirmPassword && password === confirmPassword && passwordErrors.length === 0 && (
                  <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Passwords match
                  </p>
                )}
              </div>

              <div className="d4 fade-up pt-1">
                <button type="submit" disabled={loading || passwordErrors.length > 0} className="btn"
                  style={{ background: `linear-gradient(135deg,${isBrand ? '#f97316,#ec4899' : '#8b5cf6,#06b6d4'})`, boxShadow: `0 6px 20px ${accentColor}44` }}>
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <button type="button" onClick={() => setStep('role')}
                className="w-full flex items-center justify-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-700 transition pt-1">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </form>
          )}

          {/* ── STEP 3: Brand profile ── */}
          {step === 'profile' && role === 'BRAND' && (
            <form onSubmit={handleBrandSubmit} className="slide-in space-y-5">
              <div>
                <h1 className="text-3xl font-black text-gray-900 mb-1">Brand information</h1>
                <p className="text-gray-500 text-sm">Tell us about your brand</p>
              </div>

              <div className="d1 fade-up">
                <label className="block text-sm font-black text-gray-700 mb-2">Brand name *</label>
                <input className="f" placeholder="Your brand name" value={brandName}
                  onChange={e => setBrandName(e.target.value)} disabled={loading} required />
              </div>

              <div className="d2 fade-up">
                <label className="block text-sm font-black text-gray-700 mb-2">Industry *</label>
                <select className="sel" value={industry} onChange={e => setIndustry(e.target.value)} disabled={loading} required>
                  <option value="">Select an industry</option>
                  {BRAND_INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>

              <div className="d3 fade-up">
                <label className="block text-sm font-black text-gray-700 mb-2">Company size</label>
                <select className="sel" value={companySize} onChange={e => setCompanySize(e.target.value)} disabled={loading}>
                  <option value="">Select company size</option>
                  {COMPANY_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="d4 fade-up">
                <label className="block text-sm font-black text-gray-700 mb-2">Website</label>
                <input className="f" type="url" placeholder="https://yourwebsite.com" value={website}
                  onChange={e => setWebsite(e.target.value)} disabled={loading} />
              </div>

              <div className="d5 fade-up pt-1">
                <button type="submit" disabled={loading || !brandName || !industry} className="btn"
                  style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', boxShadow: '0 6px 20px rgba(249,115,22,0.38)' }}>
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Creating account…</>
                    : <>Create Account <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>

              <button type="button" onClick={() => setStep('account')}
                className="w-full flex items-center justify-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-700 transition">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </form>
          )}

          {/* ── STEP 3: Influencer profile ── */}
          {step === 'profile' && role === 'INFLUENCER' && (
            <form onSubmit={handleInfluencerSubmit} className="slide-in space-y-5">
              <div>
                <h1 className="text-3xl font-black text-gray-900 mb-1">Your creator profile</h1>
                <p className="text-gray-500 text-sm">Let brands know who you are</p>
              </div>

              <div className="d1 fade-up">
                <label className="block text-sm font-black text-gray-700 mb-2">Full name *</label>
                <input className="f" placeholder="Your name" value={influencerName}
                  onChange={e => setInfluencerName(e.target.value)} disabled={loading} required />
              </div>

              <div className="d2 fade-up">
                <label className="block text-sm font-black text-gray-700 mb-2">Bio *</label>
                <textarea className="f" rows={3} placeholder="Tell brands about you and your content style…"
                  value={bio} onChange={e => setBio(e.target.value)} disabled={loading} required
                  style={{ resize: 'none', height: 'auto' }} />
                <p className="text-xs text-gray-400 mt-1.5 text-right">{bio.length}/500</p>
              </div>

              <div className="d3 fade-up">
                <label className="block text-sm font-black text-gray-700 mb-3">
                  Your niches * <span className="text-gray-400 font-normal">(pick all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {INFLUENCER_NICHES.map(n => (
                    <button key={n} type="button" onClick={() => toggleNiche(n)}
                      className={`niche-btn ${niches.includes(n) ? 'active' : ''}`}
                      style={niches.includes(n) ? { background: `linear-gradient(135deg,#8b5cf6,#06b6d4)` } : {}}>
                      {n}
                    </button>
                  ))}
                </div>
                {niches.length > 0 && (
                  <p className="text-xs text-purple-600 font-bold mt-2">{niches.length} niche{niches.length > 1 ? 's' : ''} selected</p>
                )}
              </div>

              <div className="d4 fade-up">
                <label className="block text-sm font-black text-gray-700 mb-2">Country</label>
                <select className="sel" value={country} onChange={e => setCountry(e.target.value)} disabled={loading}>
                  <option value="">Select your country</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* ── Oraș obligatoriu ── */}
              <div className="d4 fade-up">
                <label className="block text-sm font-black text-gray-700 mb-2 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-purple-500" />
                  Oraș / Comună *
                </label>
                <p className="text-xs text-gray-400 mb-2">Folosit pentru oferte barter locale din zona ta</p>
                <div className="relative" ref={cityWrapperRef}>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      className="f pl-9"
                      placeholder="ex. Iași, Cluj-Napoca, București..."
                      value={city}
                      onChange={e => handleCityChange(e.target.value)}
                      onFocus={() => cityResults.length > 0 && setShowCityResults(true)}
                      disabled={loading}
                      required
                    />
                    {citySearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                    )}
                    {city && !citySearching && (
                      <button type="button" onClick={() => { setCity(''); setCityLat(undefined); setCityLon(undefined); setCityResults([]) }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {showCityResults && cityResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-2xl mt-1" style={{ zIndex: 9999 }}>
                      {cityResults.map((r: any) => {
                        const a = r.address
                        const cityName = a.city || a.town || a.village || a.county || r.name
                        const region = a.county || a.state || ''
                        return (
                          <button key={r.place_id} type="button"
                            onMouseDown={e => { e.preventDefault(); selectCity(r) }}
                            className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-purple-50 transition text-left border-b border-gray-100 last:border-0">
                            <MapPin className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-bold text-gray-900">{cityName}</p>
                              {region && <p className="text-xs text-gray-400">{region}</p>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                {cityLat && (
                  <p className="text-xs text-green-600 font-semibold mt-1.5 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Locație confirmată
                  </p>
                )}
              </div>

              <div className="d5 fade-up pt-1">
                <button type="submit" disabled={loading || !influencerName || !bio || niches.length === 0 || !city.trim()} className="btn"
                  style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', boxShadow: '0 6px 20px rgba(139,92,246,0.38)' }}>
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Creating account…</>
                    : <>Create Account <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>

              <button type="button" onClick={() => setStep('account')}
                className="w-full flex items-center justify-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-700 transition">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            </form>
          )}

          <p className="text-xs text-gray-400 text-center mt-8 leading-relaxed">
            By creating an account you agree to our{' '}
            <a href="#" className="underline hover:text-gray-600 transition">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="underline hover:text-gray-600 transition">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}

