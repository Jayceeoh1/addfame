'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { registerBrand, registerInfluencer } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'
import {
  AlertCircle, ArrowRight, ArrowLeft, Eye, EyeOff,
  TrendingUp, Users, CheckCircle, Clock, MapPin, X, Loader2,
  Check, FileText, Lock, Gift, ShieldCheck,
} from 'lucide-react'
import AuthShell from '@/components/auth/AuthShell'
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
  const brandRefCode = searchParams.get('bref') || ''

  const [step, setStep] = useState<Step>(initialType ? 'account' : 'role')
  const [role, setRole] = useState<'BRAND' | 'INFLUENCER' | null>(
    initialType === 'brand' ? 'BRAND' : initialType === 'influencer' ? 'INFLUENCER' : null
  )

  const [email, setEmail] = useState(() => (searchParams.get('email') || '').slice(0, 160))
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
  const [brandReferralAcknowledged, setBrandReferralAcknowledged] = useState(false)
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
    setError(null); setRateLimited(false)
    if (brandRefCode && !brandReferralAcknowledged) {
      setError('Trebuie să confirmi că datele companiei sunt reale pentru a primi bonusul.')
      return
    }
    setLoading(true)
    try {
      const result = await registerBrand(email, password, brandName, industry, companySize, website, cui, companyLegalName, companyAddress, brandRefCode || undefined)
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

  const variant = role === 'BRAND' ? 'brand' : role === 'INFLUENCER' ? 'influencer' : 'choose'
  const spinner = <><span className="au-spin" /> Se creează contul…</>

  return (
    <AuthShell variant={variant}>
      {/* Progres */}
      <div className="au-steps" aria-label={`Pasul ${stepIndex + 1} din ${steps.length}`}>
        {steps.map((s, i) => (
          <div key={i} className="au-step">
            <span className={`au-step-n ${i <= stepIndex ? 'on' : ''}`}>
              {i < stepIndex ? <CheckCircle size={16} /> : i + 1}
            </span>
            <span className={`au-step-label ${i === stepIndex ? 'on' : ''}`}>{s}</span>
            {i < steps.length - 1 && <span className={`au-step-bar ${i < stepIndex ? 'on' : ''}`} />}
          </div>
        ))}
      </div>

      {error && !rateLimited && (
        <div className="au-alert au-alert-err au-enter" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {rateLimited && (
        <div className="au-alert au-alert-warn au-enter" role="alert">
          <Clock size={18} />
          <div>
            <b>Limită email atinsă</b><br />
            Verifică inbox-ul pentru un email de confirmare existent, sau așteaptă câteva minute și încearcă din nou.<br />
            Ai deja un cont? <Link href="/auth/login" className="au-link">Autentifică-te</Link>
          </div>
        </div>
      )}

      {/* ── PAS 1: Rol ── */}
      {step === 'role' && (
        <div className="au-enter" key="role">
          <h1 className="au-h1">Creează-ți contul</h1>
          <p className="au-sub">Ai deja un cont? <Link href="/auth/login" className="au-link">Autentifică-te</Link></p>

          <div className="au-roles">
            {[
              { type: 'BRAND' as const, cls: 'au-role-brand', icon: TrendingUp, label: 'Sunt brand', desc: 'Lansează campanii și alege influencerii potriviți pentru afacerea ta.', features: ['Creezi campanii', 'Alegi creatorii', 'Urmărești rezultatele'] },
              { type: 'INFLUENCER' as const, cls: 'au-role-infl', icon: Users, label: 'Sunt influencer', desc: 'Descoperă colaborări cu branduri și câștigă din audiența ta.', features: ['Aplici la campanii', 'Îți construiești portofoliul', 'Câștigi bani și produse'] },
            ].map(opt => (
              <button key={opt.type} type="button" className={`au-role ${opt.cls}`}
                onClick={() => { setRole(opt.type); setStep('account') }}>
                <span className="au-role-icon"><opt.icon size={20} /></span>
                <span className="au-role-text" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <b>{opt.label}</b>
                  <p>{opt.desc}</p>
                </span>
                <ul>
                  {opt.features.map(f => <li key={f}><CheckCircle size={14} /> {f}</li>)}
                </ul>
                <span className="au-role-go">Începe <ArrowRight size={14} /></span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── PAS 2: Cont ── */}
      {step === 'account' && (
        <form onSubmit={handleAccountSubmit} className="au-stack au-enter" key="account">
          <div>
            <h1 className="au-h1">{isBrand ? 'Cont de brand' : 'Cont de creator'}</h1>
            <p className="au-sub" style={{ marginBottom: 0 }}>
              Datele cu care vei intra în cont. Ai deja cont? <Link href="/auth/login" className="au-link">Autentifică-te</Link>
            </p>
          </div>

          <div className="au-field">
            <label htmlFor="reg-email" className="au-label">Adresă de email</label>
            <input id="reg-email" className="au-input" type="email" placeholder="tu@exemplu.com" autoComplete="email" inputMode="email"
              value={email} onChange={e => setEmail(e.target.value)} disabled={loading} required />
          </div>

          <div className="au-field">
            <label htmlFor="reg-pw" className="au-label">Parolă</label>
            <div className="au-pw">
              <input id="reg-pw" className="au-input" type={showPassword ? 'text' : 'password'} placeholder="Minim 8 caractere" autoComplete="new-password"
                value={password}
                onChange={e => { setPassword(e.target.value); if (e.target.value) validatePwd(e.target.value) }}
                disabled={loading} required />
              <button type="button" className="au-eye" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ascunde parola' : 'Arată parola'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passwordErrors.length > 0 && (
              <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {passwordErrors.map(e => (
                  <li key={e} style={{ fontSize: 13, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={13} /> {e}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="au-field">
            <label htmlFor="reg-pw2" className="au-label">Confirmă parola</label>
            <div className="au-pw">
              <input id="reg-pw2" className="au-input" type={showConfirm ? 'text' : 'password'} placeholder="••••••••" autoComplete="new-password"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={loading} required />
              <button type="button" className="au-eye" onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? 'Ascunde parola' : 'Arată parola'}>
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="au-hint" style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={13} /> Parolele nu se potrivesc</p>
            )}
            {confirmPassword && password === confirmPassword && passwordErrors.length === 0 && (
              <p className="au-hint" style={{ color: '#047857', display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={14} /> Parolele se potrivesc</p>
            )}
          </div>

          <button type="submit" disabled={loading || passwordErrors.length > 0} className="au-btn">
            Continuă <ArrowRight size={18} />
          </button>
          <button type="button" onClick={() => setStep('role')} className="au-btn-ghost">
            <ArrowLeft size={16} /> Înapoi
          </button>
        </form>
      )}

      {/* ── PAS 3: Brand ── */}
      {step === 'profile' && role === 'BRAND' && (
        <form onSubmit={handleBrandSubmit} className="au-stack au-enter" key="brand">
          <div>
            <h1 className="au-h1">Informații brand</h1>
            <p className="au-sub" style={{ marginBottom: 0 }}>Spune-ne despre brandul tău și firma care îl deține.</p>
          </div>

          <div className="au-field">
            <label htmlFor="b-name" className="au-label">Numele brandului *</label>
            <input id="b-name" className="au-input" placeholder="Numele brandului tău" autoComplete="organization"
              value={brandName} onChange={e => setBrandName(e.target.value)} disabled={loading} required />
          </div>

          <div className="au-field">
            <label htmlFor="b-ind" className="au-label">Industrie *</label>
            <select id="b-ind" className="au-input au-select" value={industry} onChange={e => setIndustry(e.target.value)} disabled={loading} required>
              <option value="">Selectează o industrie</option>
              {BRAND_INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <div className="au-field">
            <label htmlFor="b-size" className="au-label">Mărimea companiei</label>
            <select id="b-size" className="au-input au-select" value={companySize} onChange={e => setCompanySize(e.target.value)} disabled={loading}>
              <option value="">Selectează mărimea companiei</option>
              {COMPANY_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="au-field">
            <label htmlFor="b-web" className="au-label">Website</label>
            <input id="b-web" className="au-input" type="url" inputMode="url" placeholder="https://siteultau.ro" autoComplete="url"
              value={website} onChange={e => setWebsite(e.target.value)} disabled={loading} />
          </div>

          <div className="au-field">
            <label htmlFor="b-cui" className="au-label">CUI / CIF firmă *</label>
            <input id="b-cui" className="au-input" placeholder="ex. RO12345678 sau 12345678"
              value={cui} onChange={e => setCui(e.target.value)} disabled={loading} required />
            {cui.trim().length > 0 && !/^(RO)?[0-9]{2,10}$/i.test(cui.trim()) ? (
              <p className="au-hint" style={{ color: '#b91c1c', fontWeight: 700 }}>CUI invalid — trebuie să conțină doar cifre (opțional cu prefix RO).</p>
            ) : (
              <p className="au-hint">Necesar pentru verificarea contului de brand.</p>
            )}
          </div>

          <div className="au-field">
            <label htmlFor="b-legal" className="au-label">Denumire legală firmă *</label>
            <input id="b-legal" className="au-input" placeholder="ex. SC Exemplu Marketing SRL"
              value={companyLegalName} onChange={e => setCompanyLegalName(e.target.value)} disabled={loading} required />
            <p className="au-hint">Așa cum apare la Registrul Comerțului.</p>
          </div>

          <div className="au-field">
            <label htmlFor="b-addr" className="au-label">Sediu social / Adresă firmă *</label>
            <input id="b-addr" className="au-input" placeholder="ex. Str. Exemplu nr. 1, București" autoComplete="street-address"
              value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} disabled={loading} required />
          </div>

          {brandRefCode && (
            <div className="au-alert au-alert-warn" style={{ marginBottom: 0, flexDirection: 'column', gap: 10 }}>
              <b>Ești invitat printr-un link de recomandare</b>
              <span>Pentru a activa bonusul influencerului care te-a invitat, brandul tău trebuie să fie verificat de echipa noastră (CUI valid, email firmă, număr de telefon, website real). Conturile sau datele false duc la penalizarea ambelor conturi.</span>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontWeight: 700 }}>
                <input type="checkbox" checked={brandReferralAcknowledged}
                  onChange={e => setBrandReferralAcknowledged(e.target.checked)}
                  style={{ marginTop: 2, width: 20, height: 20, accentColor: '#ca8a04', flexShrink: 0 }} />
                Confirm că datele companiei mele sunt reale și sunt de acord cu verificarea manuală a contului
              </label>
            </div>
          )}

          <button type="submit" className="au-btn"
            disabled={loading || !brandName || !industry || !/^(RO)?[0-9]{2,10}$/i.test(cui.trim()) || companyLegalName.trim().length < 5 || companyAddress.trim().length < 8 || (!!brandRefCode && !brandReferralAcknowledged)}>
            {loading ? spinner : <>Creează contul <ArrowRight size={18} /></>}
          </button>
          <button type="button" onClick={() => setStep('account')} className="au-btn-ghost">
            <ArrowLeft size={16} /> Înapoi
          </button>
        </form>
      )}

      {/* ── PAS 3: Influencer ── */}
      {step === 'profile' && role === 'INFLUENCER' && (
        <form onSubmit={handleInfluencerSubmit} className="au-stack au-enter" key="infl">
          <div>
            <h1 className="au-h1">Profilul tău de creator</h1>
            <p className="au-sub" style={{ marginBottom: 0 }}>Așa te vor vedea brandurile când aplici la campanii.</p>
          </div>

          <div className="au-field">
            <label htmlFor="i-name" className="au-label">Nume complet *</label>
            <input id="i-name" className="au-input" placeholder="Numele tău" autoComplete="name"
              value={influencerName} onChange={e => setInfluencerName(e.target.value)} disabled={loading} required />
          </div>

          <div className="au-field">
            <label htmlFor="i-bio" className="au-label">Bio *</label>
            <textarea id="i-bio" className="au-input" rows={3} maxLength={500} placeholder="Spune brandurilor despre tine și stilul tău de conținut…"
              value={bio} onChange={e => setBio(e.target.value)} disabled={loading} required />
            <p className="au-hint" style={{ textAlign: 'right' }}>{bio.length}/500</p>
          </div>

          <div className="au-field">
            <span className="au-label">Nișele tale * <span style={{ fontWeight: 500, color: '#8783a8' }}>(alege toate care se aplică)</span></span>
            <div className="au-chips">
              {INFLUENCER_NICHES.map(n => (
                <button key={n} type="button" onClick={() => toggleNiche(n)} aria-pressed={niches.includes(n)}
                  className={`au-chip ${niches.includes(n) ? 'on' : ''}`}>
                  {n}
                </button>
              ))}
            </div>
            {niches.length > 0 && (
              <p className="au-hint" style={{ color: 'var(--ac)', fontWeight: 700 }}>{niches.length} {niches.length === 1 ? 'nișă selectată' : 'nișe selectate'}</p>
            )}
          </div>

          <div className="au-field">
            <label htmlFor="i-country" className="au-label">Țară</label>
            <select id="i-country" className="au-input au-select" value={country} onChange={e => setCountry(e.target.value)} disabled={loading}>
              <option value="">Selectează țara ta</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="au-field">
            <label htmlFor="i-city" className="au-label">Oraș / Comună *</label>
            <div className="au-city" ref={cityWrapperRef}>
              <MapPin size={18} className="au-city-icon" />
              <input id="i-city" className="au-input" placeholder="ex. Iași, Cluj-Napoca, București…" autoComplete="address-level2"
                value={city}
                onChange={e => handleCityChange(e.target.value)}
                onFocus={() => cityResults.length > 0 && setShowCityResults(true)}
                disabled={loading} required />
              {citySearching && (
                <span className="au-city-clear" aria-hidden="true"><Loader2 size={18} className="animate-spin" /></span>
              )}
              {city && !citySearching && (
                <button type="button" className="au-city-clear" aria-label="Șterge orașul"
                  onClick={() => { setCity(''); setCityLat(undefined); setCityLon(undefined); setCityResults([]) }}>
                  <X size={18} />
                </button>
              )}
              {showCityResults && cityResults.length > 0 && (
                <div className="au-city-list">
                  {cityResults.map((r: any) => {
                    const a = r.address
                    const cityName = a.city || a.town || a.village || a.county || r.name
                    const region = a.county || a.state || ''
                    return (
                      <button key={r.place_id} type="button" onMouseDown={e => { e.preventDefault(); selectCity(r) }}>
                        <MapPin size={15} style={{ color: 'var(--ac)', flex: 'none' }} />
                        <span>
                          <span style={{ display: 'block', fontSize: 15, fontWeight: 700 }}>{cityName}</span>
                          {region && <span style={{ display: 'block', fontSize: 13, color: '#8783a8' }}>{region}</span>}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            {cityLat ? (
              <p className="au-hint" style={{ color: '#047857', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={14} /> Locație confirmată</p>
            ) : (
              <p className="au-hint">Folosit pentru oferte barter locale din zona ta.</p>
            )}
          </div>

          <div className="au-field">
            <span className="au-label">Conturi social media <span style={{ fontWeight: 500, color: '#8783a8' }}>(opțional, recomandat)</span></span>
            <p className="au-hint" style={{ margin: '0 0 10px' }}>Acceptăm @username, link complet sau doar numele.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div className="au-social">
                  <span className="au-social-pre">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <defs><linearGradient id="ig-reg" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#f09433" /><stop offset="0.25" stopColor="#e6683c" /><stop offset="0.5" stopColor="#dc2743" /><stop offset="0.75" stopColor="#cc2366" /><stop offset="1" stopColor="#bc1888" /></linearGradient></defs>
                      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#ig-reg)" />
                      <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none" />
                      <circle cx="17.2" cy="6.8" r="1.1" fill="white" />
                    </svg>@
                  </span>
                  <input type="text" aria-label="Instagram" placeholder="username sau link Instagram"
                    value={instagramHandle} onChange={e => setInstagramHandle(e.target.value)}
                    disabled={loading} autoComplete="off" autoCapitalize="none" spellCheck={false} />
                </div>
                {instagramHandle && normalizeHandle(instagramHandle, 'instagram') && (
                  <p className="au-hint" style={{ color: 'var(--ac)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={13} /> instagram.com/{normalizeHandle(instagramHandle, 'instagram')}
                  </p>
                )}
              </div>
              <div>
                <div className="au-social">
                  <span className="au-social-pre">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style={{ background: '#000', borderRadius: 5, padding: 2 }} aria-hidden="true">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.3 6.3 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.22 8.22 0 004.81 1.54V6.79a4.85 4.85 0 01-1.04-.1z" />
                    </svg>@
                  </span>
                  <input type="text" aria-label="TikTok" placeholder="username sau link TikTok"
                    value={tiktokHandle} onChange={e => setTiktokHandle(e.target.value)}
                    disabled={loading} autoComplete="off" autoCapitalize="none" spellCheck={false} />
                </div>
                {tiktokHandle && normalizeHandle(tiktokHandle, 'tiktok') && (
                  <p className="au-hint" style={{ color: 'var(--ac)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={13} /> tiktok.com/@{normalizeHandle(tiktokHandle, 'tiktok')}
                  </p>
                )}
              </div>
            </div>
          </div>

          <button type="submit" className="au-btn" disabled={loading || !influencerName || !bio || niches.length === 0 || !city.trim()}>
            {loading ? spinner : <>Continuă <ArrowRight size={18} /></>}
          </button>
          <button type="button" onClick={() => setStep('account')} className="au-btn-ghost">
            <ArrowLeft size={16} /> Înapoi
          </button>
        </form>
      )}

      {/* ── PAS 4: Acord (influencer) ── */}
      {step === 'terms' && role === 'INFLUENCER' && (
        <div className="au-stack au-enter" key="terms">
          <div>
            <h1 className="au-h1">Aproape gata!</h1>
            <p className="au-sub" style={{ marginBottom: 0 }}>Confirmă acordul înainte să intri în platformă.</p>
          </div>

          <div className="au-terms">
            <div><FileText size={18} /><span><a href="/termeni" target="_blank" className="au-link">Termeni și Condiții</a> — regulile de utilizare a platformei AddFame</span></div>
            <div><Lock size={18} /><span><a href="/politica-de-confidentialitate" target="_blank" className="au-link">Politica de confidențialitate</a> — cum procesăm datele tale (GDPR)</span></div>
            <div><Gift size={18} /><span>Înscrierea și aplicarea la campanii sunt <b>gratuite</b> pentru creatori</span></div>
            <div><ShieldCheck size={18} /><span>Confirm că am cel puțin <b>18 ani</b> sau dețin acordul unui tutore legal</span></div>
          </div>

          <button type="button" onClick={() => setTermsAccepted(!termsAccepted)} aria-pressed={termsAccepted}
            className={`au-check ${termsAccepted ? 'on' : ''}`}>
            <span className="au-check-box">{termsAccepted && <Check size={16} strokeWidth={3} />}</span>
            Am citit și sunt de acord cu toate cele de mai sus
          </button>

          <p className="au-hint" style={{ margin: 0 }}>Acordul va fi înregistrat cu data, ora și versiunea documentelor în vigoare la momentul semnării.</p>

          <button type="button" disabled={!termsAccepted || loading} onClick={handleTermsSubmit} className="au-btn">
            {loading ? spinner : <>Intră în AddFame <ArrowRight size={18} /></>}
          </button>
          <button type="button" onClick={() => setStep('profile')} className="au-btn-ghost">
            <ArrowLeft size={16} /> Înapoi
          </button>
        </div>
      )}

      <p className="au-legal">
        Creând un cont ești de acord cu <a href="/termeni">Termeni și Condiții</a> și{' '}
        <a href="/politica-de-confidentialitate">Politica de Confidențialitate</a>
      </p>
    </AuthShell>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f6f6fc' }}>
        <div className="w-8 h-8 rounded-full animate-spin" style={{ borderWidth: 3, borderStyle: 'solid', borderColor: '#e2dcff', borderTopColor: '#7040f0' }} />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
