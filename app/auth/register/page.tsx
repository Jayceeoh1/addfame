'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { registerBrand, registerInfluencer } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'
import {
  AlertCircle, ArrowRight, ArrowLeft, Eye, EyeOff,
  TrendingUp, Users, CheckCircle, Clock, MapPin, X, Loader2,
  Building2, ChevronRight,
} from 'lucide-react'
import {
  BRAND_INDUSTRIES, COMPANY_SIZES, INFLUENCER_NICHES,
  COUNTRIES, validatePassword,
} from '@/lib/constants/registration'
import { Suspense } from 'react'

type Step = 'role' | 'account' | 'profile' | 'terms'

function RegisterForm() {
  const searchParams = useSearchParams()
  const initialType = searchParams.get('type')
  const refCode = searchParams.get('ref') || ''

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
  const [cui, setCui] = useState('')
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [companyLegalName, setCompanyLegalName] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')

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

  const [instagramHandle, setInstagramHandle] = useState('')
  const [tiktokHandle, setTiktokHandle] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rateLimited, setRateLimited] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const isBrand = role === 'BRAND'
  const stepIndex = step === 'role' ? 0 : step === 'account' ? 1 : step === 'profile' ? 2 : 3
  const steps = isBrand
    ? ['Alege tipul', 'Cont', 'Info Brand']
    : ['Alege tipul', 'Cont', 'Profil', 'Acord']

  const validatePwd = (pwd: string) => {
    const v = validatePassword(pwd)
    setPasswordErrors(v.errors)
    return v.valid
  }

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email || !password) { setError('Emailul și parola sunt obligatorii'); return }
    if (password !== confirmPassword) { setError('Parolele nu se potrivesc'); return }
    if (!validatePwd(password)) return
    setStep('profile')
  }

  const handleBrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setRateLimited(false); setLoading(true)
    try {
      const result = await registerBrand(email, password, brandName, industry, companySize, website, cui, companyLegalName, companyAddress)
      if (result?.error) {
        if ('rateLimited' in result && result.rateLimited) setRateLimited(true)
        setError(result.error)
      } else {
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}&type=brand`)
      }
    } catch { setError('A apărut o eroare neașteptată') }
    finally { setLoading(false) }
  }

  function normalizeHandle(val: string, type: 'instagram' | 'tiktok'): string | null {
    val = val.trim().replace(/^@+/, '')
    if (!val) return null
    try {
      if (val.includes('instagram.com') || val.includes('tiktok.com') || val.startsWith('http')) {
        if (!val.startsWith('http')) val = 'https://' + val
        const path = new URL(val).pathname.replace(/^\/+|\/+$/g, '').replace(/^@/, '')
        return path || null
      }
    } catch { }
    return val
  }

  const handleInfluencerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!city.trim()) { setError('Orașul/Comuna este obligatorie'); return }
    setStep('terms')
  }

  const handleTermsSubmit = async () => {
    setError(null); setRateLimited(false); setLoading(true)
    try {
      const platforms: { platform: string; url: string }[] = []
      const igHandle = normalizeHandle(instagramHandle, 'instagram')
      const ttHandle = normalizeHandle(tiktokHandle, 'tiktok')
      if (igHandle) platforms.push({ platform: 'instagram', url: `https://instagram.com/${igHandle}` })
      if (ttHandle) platforms.push({ platform: 'tiktok', url: `https://tiktok.com/@${ttHandle}` })

      const result = await registerInfluencer(
        email, password, influencerName, bio, niches, country,
        platforms.length > 0 ? Object.fromEntries(platforms.map(p => [p.platform, p.url])) : undefined,
        city, cityLat, cityLon, refCode || undefined,
        platforms.length > 0 ? platforms : undefined
      )
      if (result?.error) {
        if ('rateLimited' in result && result.rateLimited) setRateLimited(true)
        setError(result.error)
        setStep('profile')
      } else {
        router.push('/influencer/dashboard')
      }
    } catch { setError('A apărut o eroare neașteptată'); setStep('profile') }
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
            {isBrand ? '🏢 Pentru Branduri' : role === 'INFLUENCER' ? '✨ Pentru Influenceri' : '🚀 Alătură-te AddFame'}
          </div>
          <h2 className="text-4xl font-black text-gray-900 leading-tight mt-3 mb-4">
            {isBrand ? 'Crește-ți brandul' : role === 'INFLUENCER' ? 'Monetizează-ți' : 'Începe călătoria'}
            <br />
            <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontWeight: 400, color: accentColor }}>
              {isBrand ? 'cu oameni reali' : role === 'INFLUENCER' ? 'influența' : 'cu AddFame'}
            </span>
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-10 max-w-xs">
            {isBrand
              ? 'Lansează campanii în minute și primește videoclipuri autentice de la micro-influenceri care convertesc.'
              : role === 'INFLUENCER'
                ? 'Conectează-te cu branduri pe care le iubești, creează conținut autentic și fii plătit rapid — în termenii tăi.'
                : 'Cea mai simplă platformă pentru a conecta brandurile cu micro-influencerii pentru conținut care chiar funcționează.'}
          </p>

          {/* Floating feature cards */}
          <div className="space-y-3 max-w-[280px]">
            {(isBrand ? [
              { icon: '⚡', title: 'Lansezi în 5 minute', sub: 'Fără experiență de marketing', delay: 'float-1' },
              { icon: '🎬', title: 'Videoclipuri în 3 zile', sub: 'Gata de postat sau folosit ca reclame', delay: 'float-2' },
              { icon: '💯', title: 'Bani înapoi 100%', sub: 'Dacă nu găsim influencerii tăi', delay: 'float-3' },
            ] : role === 'INFLUENCER' ? [
              { icon: '💸', title: 'Plătit rapid', sub: 'Direct în contul tău', delay: 'float-1' },
              { icon: '🎯', title: 'Branduri potrivite', sub: 'Doar branduri care se potrivesc nișei tale', delay: 'float-2' },
              { icon: '🕐', title: 'Programul tău', sub: 'Lucrează când vrei', delay: 'float-3' },
            ] : [
              { icon: '🏢', title: '1.200+ branduri', sub: 'cresc deja cu AddFame', delay: 'float-1' },
              { icon: '✨', title: '15.000+ creatori', sub: 'gata pentru campania ta', delay: 'float-2' },
              { icon: '🚀', title: '98.000+ videoclipuri', sub: 'livrate și tot mai multe', delay: 'float-3' },
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
          <p className="text-sm text-gray-500"><span className="font-black text-gray-900">22+</span> branduri au încredere în AddFame</p>
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
            <span className="font-black text-xl tracking-tight">AddFame</span>
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
                <p className="font-black mb-1">Limită email atinsă</p>
                <p className="text-amber-700">Verifică inbox-ul pentru un email de confirmare existent, sau așteaptă câteva minute și încearcă din nou.</p>
                <p className="mt-2">Ai deja un cont? <Link href="/auth/login" className="font-black underline hover:text-amber-900">Autentifică-te</Link></p>
              </div>
            </div>
          )}

          {/* ── STEP 1: Role ── */}
          {step === 'role' && (
            <div className="slide-in">
              <h1 className="text-3xl font-black text-gray-900 mb-1">Creează-ți contul</h1>
              <p className="text-gray-500 text-sm mb-7">
                Ai deja un cont?{' '}
                <Link href="/auth/login" className="font-bold hover:text-gray-800 transition" style={{ color: accentColor }}>Autentifică-te</Link>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    type: 'BRAND' as const,
                    icon: TrendingUp,
                    grad: 'brand-grad',
                    label: 'Sunt Brand',
                    desc: 'Lansează campanii și găsește influencerii potriviți pentru afacerea ta.',
                    features: ['Creează campanii', 'Găsește influenceri', 'Urmărește rezultatele'],
                    border: 'border-orange-200',
                    activeBorder: 'border-orange-400',
                    activeBg: 'bg-orange-50',
                    checkColor: 'text-orange-500',
                  },
                  {
                    type: 'INFLUENCER' as const,
                    icon: Users,
                    grad: 'infl-grad',
                    label: 'Sunt Influencer',
                    desc: 'Descoperă deal-uri cu branduri și câștigă bani din audiența ta.',
                    features: ['Răsfoiește campanii', 'Construiește portofoliu', 'Câștigă bani'],
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
                      Începe <ArrowRight className="w-3.5 h-3.5" />
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
                  {isBrand ? 'Cont Brand' : 'Cont Creator'}
                </h1>
                <p className="text-gray-500 text-sm">Configurează datele de autentificare</p>
              </div>

              <div className="d1 fade-up">
                <label className="block text-sm font-black text-gray-700 mb-2">Adresă de email</label>
                <input className="f" type="email" placeholder="tu@exemplu.com"
                  value={email} onChange={e => setEmail(e.target.value)} disabled={loading} required />
              </div>

              <div className="d2 fade-up">
                <label className="block text-sm font-black text-gray-700 mb-2">Parolă</label>
                <div className="relative">
                  <input className="f pr-12" type={showPassword ? 'text' : 'password'} placeholder="Min. 8 caractere"
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
                <label className="block text-sm font-black text-gray-700 mb-2">Confirmă parola</label>
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
                    <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0" /> Parolele nu se potrivesc
                  </p>
                )}
                {confirmPassword && password === confirmPassword && passwordErrors.length === 0 && (
                  <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Parolele se potrivesc
                  </p>
                )}
              </div>

              <div className="d4 fade-up pt-1">
                <button type="submit" disabled={loading || passwordErrors.length > 0} className="btn"
                  style={{ background: `linear-gradient(135deg,${isBrand ? '#f97316,#ec4899' : '#8b5cf6,#06b6d4'})`, boxShadow: `0 6px 20px ${accentColor}44` }}>
                  Continuă <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <button type="button" onClick={() => setStep('role')}
                className="w-full flex items-center justify-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-700 transition pt-1">
                <ArrowLeft className="w-4 h-4" /> Înapoi
              </button>
            </form>
          )}

          {/* ── STEP 3: Brand profile ── */}
          {step === 'profile' && role === 'BRAND' && (
            <form onSubmit={handleBrandSubmit} className="slide-in space-y-5">
              <div>
                <h1 className="text-3xl font-black text-gray-900 mb-1">Informații Brand</h1>
                <p className="text-gray-500 text-sm">Spune-ne despre brandul tău</p>
              </div>

              <div className="d1 fade-up">
                <label className="block text-sm font-black text-gray-700 mb-2">Numele brandului *</label>
                <input className="f" placeholder="Numele brandului tău" value={brandName}
                  onChange={e => setBrandName(e.target.value)} disabled={loading} required />
              </div>

              <div className="d2 fade-up">
                <label className="block text-sm font-black text-gray-700 mb-2">Industrie *</label>
                <select className="sel" value={industry} onChange={e => setIndustry(e.target.value)} disabled={loading} required>
                  <option value="">Selectează o industrie</option>
                  {BRAND_INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>

              <div className="d3 fade-up">
                <label className="block text-sm font-black text-gray-700 mb-2">Mărimea companiei</label>
                <select className="sel" value={companySize} onChange={e => setCompanySize(e.target.value)} disabled={loading}>
                  <option value="">Selectează mărimea companiei</option>
                  {COMPANY_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="d4 fade-up">
                <label className="block text-sm font-black text-gray-700 mb-2">Website</label>
                <input className="f" type="url" placeholder="https://siteultau.ro" value={website}
                  onChange={e => setWebsite(e.target.value)} disabled={loading} />
              </div>

              <div className="d4b fade-up">
                <button type="button" onClick={() => setShowCompanyModal(true)} disabled={loading}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50/40 transition text-left">
                  <span className="flex items-center gap-2.5 text-sm font-bold text-gray-700">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    Informații firmă
                    <span className="text-xs font-medium text-gray-400">(opțional)</span>
                    {cui.trim() && companyLegalName.trim() && companyAddress.trim() && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </button>
              </div>

              <div className="d5 fade-up pt-1">
                <button type="submit" disabled={loading || !brandName || !industry} className="btn"
                  style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', boxShadow: '0 6px 20px rgba(249,115,22,0.38)' }}>
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Se creează contul…</>
                    : <>Creează Cont <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>

              <button type="button" onClick={() => setStep('account')}
                className="w-full flex items-center justify-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-700 transition">
                <ArrowLeft className="w-4 h-4" /> Înapoi
              </button>
            </form>
          )}

          {/* ── STEP 3: Influencer profile ── */}
          {step === 'profile' && role === 'INFLUENCER' && (
            <form onSubmit={handleInfluencerSubmit} className="slide-in space-y-5">
              <div>
                <h1 className="text-3xl font-black text-gray-900 mb-1">Profilul tău de creator</h1>
                <p className="text-gray-500 text-sm">Spune brandurilor cine ești</p>
              </div>

              <div className="d1 fade-up">
                <label className="block text-sm font-black text-gray-700 mb-2">Nume complet *</label>
                <input className="f" placeholder="Numele tău" value={influencerName}
                  onChange={e => setInfluencerName(e.target.value)} disabled={loading} required />
              </div>

              <div className="d2 fade-up">
                <label className="block text-sm font-black text-gray-700 mb-2">Bio *</label>
                <textarea className="f" rows={3} placeholder="Spune brandurilor despre tine și stilul tău de conținut…"
                  value={bio} onChange={e => setBio(e.target.value)} disabled={loading} required
                  style={{ resize: 'none', height: 'auto' }} />
                <p className="text-xs text-gray-400 mt-1.5 text-right">{bio.length}/500</p>
              </div>

              <div className="d3 fade-up">
                <label className="block text-sm font-black text-gray-700 mb-3">
                  Nișele tale * <span className="text-gray-400 font-normal">(alege toate care se aplică)</span>
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
                  <p className="text-xs text-purple-600 font-bold mt-2">{niches.length} {niches.length} {niches.length === 1 ? 'nișă selectată' : 'nișe selectate'}</p>
                )}
              </div>

              <div className="d4 fade-up">
                <label className="block text-sm font-black text-gray-700 mb-2">Țară</label>
                <select className="sel" value={country} onChange={e => setCountry(e.target.value)} disabled={loading}>
                  <option value="">Selectează țara ta</option>
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

              {/* ── Social Media ── */}
              <div className="fade-up">
                <label className="block text-sm font-black text-gray-700 mb-1">
                  Conturi social media
                  <span className="ml-2 text-xs font-normal text-gray-400">(opțional, recomandat)</span>
                </label>
                <p className="text-xs text-gray-400 mb-3">Acceptăm orice format: @username, link complet sau doar numele</p>

                {/* Instagram */}
                <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden mb-2 focus-within:border-purple-400 transition-colors">
                  <div className="flex items-center gap-2 px-3 py-3 border-r border-gray-200 bg-gray-50 flex-shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <defs><linearGradient id="ig-reg" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#f09433"/><stop offset="0.25" stopColor="#e6683c"/><stop offset="0.5" stopColor="#dc2743"/><stop offset="0.75" stopColor="#cc2366"/><stop offset="1" stopColor="#bc1888"/></linearGradient></defs>
                      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#ig-reg)"/>
                      <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none"/>
                      <circle cx="17.2" cy="6.8" r="1.1" fill="white"/>
                    </svg>
                    <span className="text-sm font-bold text-gray-400">@</span>
                  </div>
                  <input
                    type="text"
                    placeholder="username sau link Instagram"
                    value={instagramHandle}
                    onChange={e => setInstagramHandle(e.target.value)}
                    disabled={loading}
                    className="flex-1 px-3 py-3 text-sm font-medium outline-none bg-transparent"
                    style={{ fontFamily: 'inherit' }}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                {instagramHandle && normalizeHandle(instagramHandle, 'instagram') && (
                  <p className="text-xs text-purple-500 font-semibold mb-2 flex items-center gap-1 px-1">
                    <CheckCircle className="w-3 h-3" /> instagram.com/{normalizeHandle(instagramHandle, 'instagram')}
                  </p>
                )}

                {/* TikTok */}
                <div className="flex items-center border-2 border-gray-200 rounded-xl overflow-hidden mb-2 focus-within:border-purple-400 transition-colors">
                  <div className="flex items-center gap-2 px-3 py-3 border-r border-gray-200 bg-gray-50 flex-shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style={{ background: '#000', borderRadius: 5, padding: 2 }}>
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.3 6.3 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.22 8.22 0 004.81 1.54V6.79a4.85 4.85 0 01-1.04-.1z"/>
                    </svg>
                    <span className="text-sm font-bold text-gray-400">@</span>
                  </div>
                  <input
                    type="text"
                    placeholder="username sau link TikTok"
                    value={tiktokHandle}
                    onChange={e => setTiktokHandle(e.target.value)}
                    disabled={loading}
                    className="flex-1 px-3 py-3 text-sm font-medium outline-none bg-transparent"
                    style={{ fontFamily: 'inherit' }}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                {tiktokHandle && normalizeHandle(tiktokHandle, 'tiktok') && (
                  <p className="text-xs text-purple-500 font-semibold mb-1 flex items-center gap-1 px-1">
                    <CheckCircle className="w-3 h-3" /> tiktok.com/@{normalizeHandle(tiktokHandle, 'tiktok')}
                  </p>
                )}
              </div>

              <div className="d5 fade-up pt-1">
                <button type="submit" disabled={loading || !influencerName || !bio || niches.length === 0 || !city.trim()} className="btn"
                  style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', boxShadow: '0 6px 20px rgba(139,92,246,0.38)' }}>
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Se creează contul…</>
                    : <>Creează Cont <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>

              <button type="button" onClick={() => setStep('account')}
                className="w-full flex items-center justify-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-700 transition">
                <ArrowLeft className="w-4 h-4" /> Înapoi
              </button>
            </form>
          )}

          {/* ── STEP 4: Terms (influencer only) ── */}
          {step === 'terms' && role === 'INFLUENCER' && (
            <div className="slide-in space-y-5">
              <div>
                <h1 className="text-3xl font-black text-gray-900 mb-1">Aproape gata!</h1>
                <p className="text-gray-500 text-sm">Confirmă acordul înainte să intri în platformă.</p>
              </div>

              <div className="rounded-2xl border-2 border-gray-100 overflow-hidden">
                {[
                  { icon: '📄', text: <><a href="/termeni" target="_blank" className="font-black underline" style={{ color: accentColor }}>Termeni și Condiții</a> — regulile de utilizare a platformei AddFame</> },
                  { icon: '🔒', text: <><a href="/politica-de-confidentialitate" target="_blank" className="font-black underline" style={{ color: accentColor }}>Politica de confidențialitate</a> — cum procesăm datele tale (GDPR)</> },
                  { icon: '💸', text: <>Comision de <span className="font-black">15%</span> reținut din valoarea colaborării, după aprobarea postului</> },
                  { icon: '✅', text: <>Confirm că am cel puțin <span className="font-black">18 ani</span> sau dețin acordul unui tutore legal</> },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3.5 border-b border-gray-100 last:border-0 bg-gray-50">
                    <span className="text-base flex-shrink-0">{item.icon}</span>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setTermsAccepted(!termsAccepted)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all"
                style={{
                  borderColor: termsAccepted ? accentColor : '#e5e7eb',
                  background: termsAccepted ? 'rgba(139,92,246,0.06)' : 'white',
                }}
              >
                <div className="w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    borderColor: termsAccepted ? accentColor : '#d1d5db',
                    background: termsAccepted ? accentColor : 'white',
                  }}>
                  {termsAccepted && <CheckCircle className="w-4 h-4 text-white" />}
                </div>
                <p className="text-sm font-black text-gray-900">Am citit și sunt de acord cu toate cele de mai sus</p>
              </button>

              <div className="flex items-start gap-2.5 px-3 py-2.5 bg-gray-50 rounded-xl">
                <span className="text-sm flex-shrink-0">🛡️</span>
                <p className="text-xs text-gray-400 leading-relaxed">Acordul va fi înregistrat cu data, ora și versiunea documentelor în vigoare la momentul semnării.</p>
              </div>

              <button
                type="button"
                disabled={!termsAccepted || loading}
                onClick={handleTermsSubmit}
                className="btn"
                style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', boxShadow: '0 6px 20px rgba(139,92,246,0.38)', opacity: (!termsAccepted || loading) ? 0.5 : 1 }}
              >
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Se creează contul…</>
                  : <>Intră în AddFame <ArrowRight className="w-4 h-4" /></>}
              </button>

              <button type="button" onClick={() => setStep('profile')}
                className="w-full flex items-center justify-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-700 transition">
                <ArrowLeft className="w-4 h-4" /> Înapoi
              </button>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center mt-8 leading-relaxed">
            Creând un cont ești de acord cu{' '}
            <a href="/termeni" className="underline hover:text-gray-600 transition">Termeni și Condiții</a>
            {' '}și{' '}
            <a href="/politica-de-confidentialitate" className="underline hover:text-gray-600 transition">Politică de Confidențialitate</a>
          </p>
        </div>
      </div>

      {/* Modal informații firmă (opțional) */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowCompanyModal(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-black text-gray-900 text-lg">Informații firmă</h3>
                <p className="text-xs text-gray-400 mt-0.5">Opțional — le poți completa și mai târziu din setări</p>
              </div>
              <button onClick={() => setShowCompanyModal(false)} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition flex-shrink-0">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-black text-gray-700 mb-2">CUI / CIF firmă</label>
                <input className="f" placeholder="ex. RO12345678 sau 12345678" value={cui}
                  onChange={e => setCui(e.target.value)} disabled={loading} />
                {cui.trim().length > 0 && !/^(RO)?[0-9]{2,10}$/i.test(cui.trim()) ? (
                  <p className="text-xs text-red-500 mt-1.5 font-bold">CUI invalid — trebuie să conțină doar cifre (opțional cu prefix RO).</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1.5">Necesar pentru verificarea contului de brand.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-2">Denumire legală firmă</label>
                <input className="f" placeholder="ex. SC Exemplu Marketing SRL" value={companyLegalName}
                  onChange={e => setCompanyLegalName(e.target.value)} disabled={loading} />
                <p className="text-xs text-gray-400 mt-1.5">Așa cum apare la Registrul Comerțului.</p>
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-2">Sediu social / Adresă firmă</label>
                <input className="f" placeholder="ex. Str. Exemplu nr. 1, București" value={companyAddress}
                  onChange={e => setCompanyAddress(e.target.value)} disabled={loading} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowCompanyModal(false)}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 transition">
                Anulează
              </button>
              <button type="button" onClick={() => setShowCompanyModal(false)}
                className="flex-1 py-3 rounded-xl font-black text-sm text-white transition"
                style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)' }}>
                Salvează
              </button>
            </div>
          </div>
        </div>
      )}
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

