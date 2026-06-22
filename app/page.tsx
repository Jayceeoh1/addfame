'use client'

import Link from 'next/link'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n/context'
import {
  ArrowRight, CheckCircle, Star, Users, TrendingUp, Zap,
  Play, ChevronDown, Instagram, Youtube, Menu, X,
  MessageCircle, Shield, Clock, Award, BarChart3,
} from 'lucide-react'

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.3 6.3 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.22 8.22 0 004.81 1.54V6.79a4.85 4.85 0 01-1.04-.1z" />
    </svg>
  )
}

function Counter({ end, suffix = '', duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const start = performance.now()
        const step = (now: number) => {
          const progress = Math.min((now - start) / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setCount(Math.floor(eased * end))
          if (progress < 1) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      }
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [end, duration])
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

const BRANDS = ['Nike', 'Zara', 'H&M', 'Sephora', 'Samsung', 'Adidas', "L'Oréal", 'Spotify', 'Booking', 'Uber', 'Bolt', 'eMAG']

export default function HomePage() {
  const router = useRouter()
  const { lang, setLang, t } = useLang()
  const [menuOpen, setMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [inflReviews, setInflReviews] = useState<any[]>([])
  const [realBrands, setRealBrands] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/public/influencer-reviews')
      .then(r => r.json())
      .then(d => { if (d.reviews?.length) setInflReviews(d.reviews) })
  }, [])

  useEffect(() => {
    const sb = createClient()
    sb.from('brands')
      .select('name')
      .not('name', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data && data.length >= 1) {
          setRealBrands(data.map((b: any) => b.name).filter(Boolean))
        }
      })
  }, [])
  const [authChecked, setAuthChecked] = useState(false)
  const [liveCampaigns, setLiveCampaigns] = useState<any[]>([])
  const [featuredInfluencers, setFeaturedInfluencers] = useState<any[]>([])
  const [recentClips, setRecentClips] = useState<any[]>([])
  const [liveStats, setLiveStats] = useState({ influencers: 0, campaigns: 0, collabs: 0, brands: 0, completedCampaigns: 0, completedCollabs: 0 })

  // Fetch live data via API routes (bypass RLS pentru vizitatori neautentificati)
  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const [statsRes, teaserRes, clipsRes] = await Promise.all([
          fetch('/api/public/stats', { cache: 'no-store' }),
          fetch('/api/public/teaser'),
          fetch('/api/public/clips'),
        ])
        if (statsRes.ok) {
          const stats = await statsRes.json()
          setLiveStats(stats)
        }
        if (teaserRes.ok) {
          const teaser = await teaserRes.json()
          setLiveCampaigns(teaser.campaigns || [])
          setFeaturedInfluencers(teaser.influencers || [])
        }
        if (clipsRes.ok) {
          const { clips } = await clipsRes.json()
          setRecentClips(clips || [])
        }
      } catch {
        // silently fail
      }
    }
    fetchLiveData()
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const params = new URLSearchParams(window.location.search)
        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''))

        // Dacă vine cu ?code= — PKCE flow
        const code = params.get('code')
        if (code) {
          // SDK-ul procesează automat codul prin onAuthStateChange
          // Nu apelăm exchangeCodeForSession manual — lasăm SDK-ul să facă asta
          supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
              router.replace('/auth/reset-password')
            }
          })
          // Triggerăm procesarea sesiunii
          await supabase.auth.getSession()
          return
        }

        // Dacă vine cu error în hash — link expirat
        const hashError = hashParams.get('error') || params.get('error')
        if (hashError === 'access_denied') {
          router.replace('/auth/forgot-password?error=link_expirat')
          return
        }

        // Ascultă evenimentul PASSWORD_RECOVERY de la Supabase SDK
        // SDK-ul procesează automat ?code= din URL când detectSessionInUrl=true
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY') {
            subscription.unsubscribe()
            router.replace('/auth/reset-password')
          }
        })

        // Verificare rapidă din sesiunea locală (fără request la server)
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.user) {
          // Nu e logat — arată landing page imediat
          setAuthChecked(true)
          return
        }

        // E logat — redirecționează rapid
        const user = session.user
        // Folosim metadata din token ca să evităm query-uri inutile
        const role = user.user_metadata?.role
        if (role === 'influencer') {
          router.replace('/influencer/dashboard'); return
        }
        if (role === 'brand') {
          router.replace('/brand/dashboard'); return
        }
        if (role === 'admin') {
          router.replace('/admin'); return
        }
        // Fallback — verificăm în DB
        try {
          const { data: brand } = await supabase.from('brands').select('id').eq('user_id', user.id).maybeSingle()
          if (brand) { router.replace('/brand/dashboard'); return }
        } catch {}
        try {
          const { data: influencer } = await supabase.from('influencers').select('id').eq('user_id', user.id).maybeSingle()
          if (influencer) { router.replace('/influencer/dashboard'); return }
        } catch {}

        setAuthChecked(true)
      } catch {
        setAuthChecked(true)
      }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!authChecked) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 rounded-full animate-spin"
        style={{ borderWidth: '3px', borderStyle: 'solid', borderTopColor: '#f97316', borderColor: '#fed7aa' }} />
    </div>
  )

  const FAQS = [
    { q: t('faq_q1'), a: t('faq_a1') },
    { q: t('faq_q2'), a: t('faq_a2') },
    { q: t('faq_q3'), a: t('faq_a3') },
    { q: t('faq_q4'), a: t('faq_a4') },
    { q: t('faq_q5'), a: t('faq_a5') },
    { q: t('faq_q6'), a: t('faq_a6') },
  ]

  const HOW_IT_WORKS = [
    { number: '01', title: t('how_1_title'), desc: t('how_1_desc'), icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { number: '02', title: t('how_2_title'), desc: t('how_2_desc'), icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { number: '03', title: t('how_3_title'), desc: t('how_3_desc'), icon: Shield, color: 'text-green-500', bg: 'bg-green-500/10' },
    { number: '04', title: t('how_4_title'), desc: t('how_4_desc'), icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ]

  const WHY_US = [
    { icon: MessageCircle, title: t('why_1_title'), items: [t('why_1_a'), t('why_1_b'), t('why_1_c')], color: 'from-blue-500 to-cyan-500' },
    { icon: Zap, title: t('why_2_title'), items: [t('why_2_a'), t('why_2_b'), t('why_2_c')], color: 'from-purple-500 to-pink-500' },
    { icon: BarChart3, title: t('why_3_title'), items: [t('why_3_a'), t('why_3_b'), t('why_3_c')], color: 'from-orange-500 to-yellow-500' },
  ]

  const TESTIMONIALS = [
    { name: 'Alex M.', role: 'Administrator, Tiki Bistro', text: 'Primim videoclipuri autentice cu oameni reali filmați la terasa noastră. Asta a creat o conexiune pe care nicio reclamă clasică nu o poate atinge.', rating: 5, avatar: 'AM', color: 'from-orange-400 to-pink-500' },
    { name: 'Andrei U.', role: 'CEO, Stailer', text: 'Clipurile create pentru noi arată mult mai bine decât orice material făcut de o agenție. Le-am refolosit în campanii plătite și am obținut rezultate mai bune.', rating: 5, avatar: 'AU', color: 'from-purple-400 to-indigo-500' },
    { name: 'Vlad P.', role: 'Administrator, Pizza Di Napo', text: 'Autenticitatea a adus mai mulți clienți decât orice reclamă plătită. Clienți reali, reacții reale — asta funcționează.', rating: 5, avatar: 'VP', color: 'from-green-400 to-teal-500' },
    { name: 'Cristina D.', role: 'Administrator, Flower Shop', text: 'Au filmat direct în magazinul nostru și aranjamentele au ieșit incredibil. Videoclipurile au circulat și pe Facebook, nu doar pe TikTok.', rating: 5, avatar: 'CD', color: 'from-pink-400 to-rose-500' },
    { name: 'Adrian B.', role: 'Administrator, Body Line', text: 'Am trimis suplimentele noastre prin AddFame și creatorii au făcut videoclipuri naturale care au prins imediat. Rezultatele au fost uimitoare.', rating: 5, avatar: 'AB', color: 'from-blue-400 to-cyan-500' },
  ]

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <style>{`
        @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(28px) } to { opacity:1; transform:translateY(0) } }
        @keyframes scaleIn { from { opacity:0; transform:scale(0.94) } to { opacity:1; transform:scale(1) } }
        @keyframes floatAnim { 0%,100% { transform:translateY(0px) } 50% { transform:translateY(-10px) } }
        .marquee-track { animation: marquee 30s linear infinite; }
        .fade-up { animation: fadeUp 0.65s ease both; }
        .scale-in { animation: scaleIn 0.65s ease both; }
        .floating { animation: floatAnim 5s ease-in-out infinite; }
        .d1 { animation-delay:.1s } .d2 { animation-delay:.2s } .d3 { animation-delay:.3s } .d4 { animation-delay:.4s }
        .brand-grad { background: linear-gradient(135deg, #f97316, #ec4899); }
        .infl-grad { background: linear-gradient(135deg, #8b5cf6, #06b6d4); }
        .card-lift { transition: transform .22s ease, box-shadow .22s ease; }
        .card-lift:hover { transform: translateY(-5px); box-shadow: 0 20px 48px rgba(0,0,0,0.09); }
        .hero-bg { background: radial-gradient(ellipse 90% 55% at 50% -5%, #fed7aa44 0%, transparent 55%), radial-gradient(ellipse 55% 50% at 88% 42%, #fbcfe844 0%, transparent 50%), radial-gradient(ellipse 50% 45% at 12% 62%, #bfdbfe33 0%, transparent 50%), #fff; }
      `}</style>

      {/* NAV */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-lg shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl brand-grad flex items-center justify-center shadow-lg" style={{ boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }}>
              <img src="/logo.png" alt="AddFame" style={{ width: '110%', height: '110%', objectFit: 'contain' }} />
            </div>
            <span className="font-black text-xl tracking-tight">Add<span className="text-orange-500">Fame</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-7">
            {[
              [t('nav_brands'), '/pentru-branduri'],
              [t('nav_influencers'), '/pentru-influenceri'],
              [t('nav_how'), '/cum-functioneaza'],
              ['Prețuri', '/preturi'],
              [t('nav_faq'), '#faq'],
            ].map(([l, h]) => (
              <a key={l} href={h} className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">{l}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {/* Language toggle - clean pill */}
            <button
              onClick={() => setLang(lang === 'en' ? 'ro' : 'en')}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition text-sm font-black"
              title={lang === 'en' ? 'Schimbă în Română' : 'Switch to English'}
            >
              <span className={`px-2 py-0.5 rounded-lg text-xs font-black transition ${lang === 'ro' ? 'bg-orange-500 text-white' : 'text-gray-400'}`}>RO</span>
              <span className="text-gray-300 text-xs">|</span>
              <span className={`px-2 py-0.5 rounded-lg text-xs font-black transition ${lang === 'en' ? 'bg-orange-500 text-white' : 'text-gray-400'}`}>EN</span>
            </button>
            <Link href="/auth/login" className="text-sm font-bold text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition">{t('nav_signin')}</Link>
            <Link href="/auth/register?type=brand" className="inline-flex items-center gap-2 brand-grad text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md transition hover:-translate-y-0.5" style={{ boxShadow: '0 4px 16px rgba(249,115,22,0.3)' }}>
              {t('nav_getstarted')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-5 py-4 space-y-2">
            {[
              [t('nav_brands'), '/pentru-branduri'],
              [t('nav_influencers'), '/pentru-influenceri'],
              [t('nav_how'), '/cum-functioneaza'],
              ['Prețuri', '/preturi'],
              [t('nav_faq'), '#faq'],
            ].map(([l, h]) => (
              <a key={l} href={h} onClick={() => setMenuOpen(false)} className="block text-sm font-semibold text-gray-700 py-2.5">{l}</a>
            ))}
            <div className="pt-3 border-t border-gray-100 flex flex-col gap-2.5">
              <button onClick={() => setLang(lang === 'en' ? 'ro' : 'en')}
                className="flex items-center justify-center gap-2 py-3 text-sm font-bold border-2 border-gray-200 rounded-xl">
                <span className={`px-3 py-1 rounded-lg text-xs font-black ${lang === 'ro' ? 'bg-orange-500 text-white' : 'text-gray-400'}`}>RO</span>
                <span className="text-gray-300">|</span>
                <span className={`px-3 py-1 rounded-lg text-xs font-black ${lang === 'en' ? 'bg-orange-500 text-white' : 'text-gray-400'}`}>EN</span>
              </button>
              <Link href="/auth/login" className="text-center py-3 text-sm font-bold border-2 border-gray-200 rounded-xl">{t('nav_signin')}</Link>
              <Link href="/auth/register?type=brand" className="text-center py-3 text-sm font-bold brand-grad text-white rounded-xl">{t('nav_getstarted')}</Link>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="hero-bg pt-28 pb-16 px-5 relative overflow-hidden">
        <div className="absolute top-16 right-0 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.12) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)' }} />
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-8 fade-up">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" style={{ animation: 'floatAnim 1.2s ease-in-out infinite' }} />
              {t('hero_badge_alt')}
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.06] mb-6 fade-up d1">
              {t('hero_h1_a')}{' '}
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>{t('hero_h1_b')}</span>
              <br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #f97316, #ec4899)' }}>{t('hero_h1_c')}</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed fade-up d2">{t('hero_sub')}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14 fade-up d3">
              <Link href="/auth/register?type=brand" className="inline-flex items-center gap-2 brand-grad text-white font-black text-base px-7 py-4 rounded-2xl w-full sm:w-auto justify-center transition hover:-translate-y-1" style={{ boxShadow: '0 8px 28px rgba(249,115,22,0.35)' }}>
                {t('hero_cta_start')} <ArrowRight className="w-5 h-5" />
              </Link>
              <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex items-center gap-3 border-2 border-gray-200 text-gray-700 font-bold text-base px-7 py-4 rounded-2xl w-full sm:w-auto justify-center hover:border-gray-300 hover:bg-gray-50 transition">
                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                </div>
                {t('hero_cta_how')}
              </button>
            </div>
            <div className="flex items-center justify-center gap-3 fade-up d4">
              <div className="flex -space-x-2">
                {['🧑', '👩', '👨', '👩', '🧑'].map((e, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-white flex items-center justify-center text-sm">{e}</div>
                ))}
              </div>
              <div className="text-left text-sm text-gray-500">
                <div><span className="font-black text-gray-900">4.9/5</span> {t('hero_reviews')} <span className="font-black text-gray-900">800+</span> {t('hero_reviews2')}</div>
                <div className="flex gap-0.5 mt-0.5">{[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}</div>
              </div>
            </div>
          </div>

          {/* Live Stats */}
          <div className="mt-16 scale-in d3 max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  value: liveStats.influencers,
                  label: lang === 'ro' ? 'Influenceri activi' : 'Active Influencers',
                  sub: lang === 'ro' ? 'în rețeaua noastră' : 'in our network',
                  icon: '🎯',
                  color: 'from-orange-400 to-pink-500',
                  bg: 'from-orange-50 to-pink-50',
                  border: 'border-orange-100',
                },
                {
                  value: liveStats.campaigns,
                  label: lang === 'ro' ? 'Campanii active' : 'Active Campaigns',
                  sub: lang === 'ro' ? 'disponibile acum' : 'available now',
                  icon: '🚀',
                  color: 'from-purple-400 to-indigo-500',
                  bg: 'from-purple-50 to-indigo-50',
                  border: 'border-purple-100',
                },
                {
                  value: liveStats.completedCollabs,
                  label: lang === 'ro' ? 'Colaborări finalizate' : 'Collaborations',
                  sub: lang === 'ro' ? 'completate cu succes' : 'completed successfully',
                  icon: '✅',
                  color: 'from-green-400 to-teal-500',
                  bg: 'from-green-50 to-teal-50',
                  border: 'border-green-100',
                },
                {
                  value: liveStats.completedCampaigns,
                  label: lang === 'ro' ? 'Campanii finalizate' : 'Completed Campaigns',
                  sub: lang === 'ro' ? 'cu succes pe platformă' : 'successfully on platform',
                  icon: '🏆',
                  color: 'from-blue-400 to-cyan-500',
                  bg: 'from-blue-50 to-cyan-50',
                  border: 'border-blue-100',
                },
              ].map((s, i) => (
                <div key={i} className={`relative bg-gradient-to-br ${s.bg} rounded-3xl p-6 border ${s.border} overflow-hidden`}
                  style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}>
                  {/* Icon */}
                  <div className="text-3xl mb-3">{s.icon}</div>
                  {/* Value animat */}
                  <p className={`text-4xl font-black mb-1 text-transparent bg-clip-text bg-gradient-to-br ${s.color}`}>
                    <Counter end={s.value} />
                  </p>
                  <p className="font-black text-gray-800 text-sm leading-tight">{s.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                  {/* Live indicator */}
                  <div className="absolute top-4 right-4 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" style={{ animation: 'floatAnim 1s ease-in-out infinite' }} />
                    <span className="text-[9px] font-black text-green-600 uppercase tracking-wide">live</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CAROUSEL CLIPURI REALE ── */}
      {(recentClips.length > 0) && (
        <section className="py-14 overflow-hidden bg-white">
          <div className="max-w-6xl mx-auto px-5 mb-8 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-gray-300 mb-2">Conținut real</p>
            <h2 className="text-2xl font-black text-gray-900">Clipuri de la influencerii noștri</h2>
            <p className="text-gray-400 text-sm mt-1">Conținut autentic creat de creatori din rețeaua AddFame</p>
          </div>
          <style>{`
            @keyframes scroll-clips { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
            .clips-track { display: flex; gap: 12px; animation: scroll-clips 28s linear infinite; width: max-content; }
            .clips-track:hover { animation-play-state: paused; }
            .clip-card-home { width: 160px; flex-shrink: 0; border-radius: 14px; overflow: hidden; border: 1px solid #f1f5f9; background: white; cursor: pointer; transition: transform 0.15s; }
            .clip-card-home:hover { transform: scale(1.03); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
          `}</style>
          <div className="relative overflow-hidden" style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 80px, black calc(100% - 80px), transparent)' }}>
            <div className="clips-track">
              {[...recentClips, ...recentClips].map((clip: any, i: number) => {
                const initials = (clip.influencer?.name || '?').split(' ').slice(0,2).map((n: string) => n[0]).join('').toUpperCase()
                const followers = clip.influencer?.ig_followers || clip.influencer?.tt_followers || 0
                const fmtFollowers = followers >= 1000 ? `${(followers/1000).toFixed(1)}K` : String(followers)
                const isTikTok = clip.platform === 'TikTok'
                return (
                  <a key={`${clip.id}-${i}`} href={clip.url} target="_blank" rel="noreferrer" className="clip-card-home" style={{ textDecoration: 'none' }}>
                    {/* Thumbnail */}
                    <div style={{ width: 160, height: 220, background: `hsl(${(i * 47) % 360}, 30%, 20%)`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {clip.influencer?.avatar
                        ? <img src={clip.influencer.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
                        : <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 48, fontWeight: 900 }}>{initials}</span>
                      }
                      {/* Play button */}
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#7c3aed"><path d="M5 3l14 9-14 9z"/></svg>
                      </div>
                      {/* Platform badge */}
                      <span style={{ position: 'absolute', top: 8, right: 8, background: isTikTok ? '#010101' : '#7c3aed', color: 'white', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4 }}>
                        {isTikTok ? 'TikTok' : 'Reel'}
                      </span>
                    </div>
                    {/* Meta */}
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: 'white', flexShrink: 0, overflow: 'hidden' }}>
                          {clip.influencer?.avatar
                            ? <img src={clip.influencer.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : initials[0]}
                        </div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#1e1b4b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clip.influencer?.name?.split(' ')[0] || 'Creator'}</p>
                      </div>
                      <p style={{ fontSize: 10, color: '#9ca3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clip.campaign?.brand_name || 'Brand'}</p>
                      {followers > 0 && <p style={{ fontSize: 10, color: '#c4b5fd', margin: '2px 0 0', fontWeight: 700 }}>{fmtFollowers} urmăritori</p>}
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <section className="py-10 border-y border-gray-100 bg-gray-50/60 overflow-hidden">
        <p className="text-center text-xs font-black uppercase tracking-widest text-gray-300 mb-6">{t('marquee_label')}</p>
        <div className="flex overflow-hidden">
          <div className="flex gap-14 items-center marquee-track whitespace-nowrap pr-14">
            {(() => {
              const displayBrands = realBrands.length > 0 ? realBrands : BRANDS
              return [...displayBrands, ...displayBrands].map((b, i) => (
                <span key={i} className="text-gray-300 font-black text-xl tracking-tight">{b}</span>
              ))
            })()}
          </div>
        </div>
      </section>


      {/* TWO PATHS */}
      <section className="py-16 px-5 bg-gray-50" id="brands">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-black uppercase tracking-widest text-gray-400 mb-2">{t('paths_label')}</p>
          <h2 className="text-4xl md:text-5xl font-black text-center mb-12">{t('paths_title')}</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="relative overflow-hidden bg-white rounded-3xl p-8 border border-orange-100 card-lift">
              <div className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle at top right, rgba(251,146,60,0.08) 0%, transparent 70%)' }} />
              <div className="w-12 h-12 brand-grad rounded-2xl flex items-center justify-center mb-5" style={{ boxShadow: '0 4px 14px rgba(249,115,22,0.3)' }}>
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="inline-flex items-center px-3 py-1 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-black rounded-full mb-4">{t('brand_tag')}</span>
              <h3 className="text-2xl font-black mb-3">{t('brand_title')}</h3>
              <p className="text-gray-500 mb-6 leading-relaxed">{t('brand_desc')}</p>
              <ul className="space-y-2.5 mb-8">
                {[t('brand_f1'), t('brand_f2'), t('brand_f3'), t('brand_f4')].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm font-semibold text-gray-700">
                    <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link href="/auth/register?type=brand" className="inline-flex items-center gap-2 brand-grad text-white text-sm font-black px-5 py-3 rounded-xl transition hover:-translate-y-0.5" style={{ boxShadow: '0 4px 14px rgba(249,115,22,0.28)' }}>
                  {t('brand_cta')} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/pentru-branduri" className="inline-flex items-center gap-2 text-sm font-bold px-4 py-3 rounded-xl border-2 border-orange-200 text-orange-600 hover:bg-orange-50 transition">
                  Află mai mult
                </Link>
              </div>
            </div>
            <div className="relative overflow-hidden bg-white rounded-3xl p-8 border border-purple-100 card-lift" id="influencers">
              <div className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle at top right, rgba(139,92,246,0.08) 0%, transparent 70%)' }} />
              <div className="w-12 h-12 infl-grad rounded-2xl flex items-center justify-center mb-5" style={{ boxShadow: '0 4px 14px rgba(139,92,246,0.3)' }}>
                <Users className="w-6 h-6 text-white" />
              </div>
              <span className="inline-flex items-center px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-black rounded-full mb-4">{t('infl_tag')}</span>
              <h3 className="text-2xl font-black mb-3">{t('infl_title')}</h3>
              <p className="text-gray-500 mb-6 leading-relaxed">{t('infl_desc')}</p>
              <ul className="space-y-2.5 mb-8">
                {[t('infl_f1'), t('infl_f2'), t('infl_f3'), t('infl_f4')].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm font-semibold text-gray-700">
                    <CheckCircle className="w-4 h-4 text-purple-500 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link href="/auth/register?type=influencer" className="inline-flex items-center gap-2 infl-grad text-white text-sm font-black px-5 py-3 rounded-xl transition hover:-translate-y-0.5" style={{ boxShadow: '0 4px 14px rgba(139,92,246,0.28)' }}>
                  {t('infl_cta')} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/pentru-influenceri" className="inline-flex items-center gap-2 text-sm font-bold px-4 py-3 rounded-xl border-2 border-purple-200 text-purple-600 hover:bg-purple-50 transition">
                  Află mai mult
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-5" id="how-it-works">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-black uppercase tracking-widest text-gray-400 mb-2">{t('how_label')}</p>
          <h2 className="text-4xl md:text-5xl font-black text-center mb-3">{t('how_title')}</h2>
          <p className="text-center text-gray-500 text-lg mb-14 max-w-xl mx-auto">{t('how_sub')}</p>
          <div className="grid md:grid-cols-4 gap-6 relative">
            <div className="hidden md:block absolute top-14 left-[12.5%] right-[12.5%] h-px z-0" style={{ background: 'linear-gradient(90deg, rgba(249,115,22,0.3), rgba(139,92,246,0.3), rgba(6,182,212,0.3))' }} />
            {HOW_IT_WORKS.map((s, i) => (
              <div key={i} className="relative z-10 text-center">
                <div className={`w-16 h-16 rounded-2xl ${s.bg} flex items-center justify-center mx-auto mb-4`}>
                  <s.icon className={`w-7 h-7 ${s.color}`} />
                </div>
                <div className="text-xs font-black text-gray-300 mb-2 tracking-widest">{s.number}</div>
                <h3 className="font-black text-base mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-14">
            <Link href="/auth/register?type=brand" className="inline-flex items-center gap-2 brand-grad text-white font-black text-base px-8 py-4 rounded-2xl transition hover:-translate-y-1" style={{ boxShadow: '0 8px 28px rgba(249,115,22,0.3)' }}>
              {t('how_cta')} <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS — reviewuri reale influenceri, apare doar când există */}
      {inflReviews.length >= 1 && (
      <section className="py-20 px-5 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-xs font-black uppercase tracking-widest text-gray-400 mb-2">CE SPUN INFLUENCERII</p>
          <h2 className="text-4xl md:text-5xl font-black text-center mb-12">Vocea comunității noastre</h2>
          <div className="grid md:grid-cols-3 gap-5 mb-5">
            {inflReviews.slice(0, 3).map((r: any, i: number) => {
              const inf = r.influencer
              const initials = inf?.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '?'
              const colors = ['from-purple-400 to-indigo-500', 'from-pink-400 to-rose-500', 'from-green-400 to-teal-500']
              return (
                <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 card-lift">
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(r.rating)].map((_, j) => <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed mb-6">"{r.comment}"</p>
                  <div className="flex items-center gap-3">
                    {inf?.avatar
                      ? <img src={inf.avatar} alt={inf.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      : <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colors[i % colors.length]} flex items-center justify-center text-white text-xs font-black flex-shrink-0`}>{initials}</div>
                    }
                    <div>
                      <p className="font-black text-sm">{inf?.name || 'Influencer'}</p>
                      <p className="text-xs text-gray-400">{inf?.niches?.[0] || 'Creator'} · AddFame</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {inflReviews.length > 3 && (
            <div className="grid md:grid-cols-2 gap-5 max-w-2xl mx-auto">
              {inflReviews.slice(3, 5).map((r: any, i: number) => {
                const inf = r.influencer
                const initials = inf?.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '?'
                const colors = ['from-orange-400 to-pink-500', 'from-blue-400 to-cyan-500']
                return (
                  <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 card-lift">
                    <div className="flex gap-0.5 mb-4">
                      {[...Array(r.rating)].map((_, j) => <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed mb-6">"{r.comment}"</p>
                    <div className="flex items-center gap-3">
                      {inf?.avatar
                        ? <img src={inf.avatar} alt={inf.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                        : <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colors[i % colors.length]} flex items-center justify-center text-white text-xs font-black flex-shrink-0`}>{initials}</div>
                      }
                      <div>
                        <p className="font-black text-sm">{inf?.name || 'Influencer'}</p>
                        <p className="text-xs text-gray-400">{inf?.niches?.[0] || 'Creator'} · AddFame</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
      )}

      {/* WHY US */}
      <section className="py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-black uppercase tracking-widest text-gray-400 mb-2">{t('why_label')}</p>
          <h2 className="text-4xl md:text-5xl font-black text-center mb-4">{t('why_title')}</h2>
          <p className="text-center text-gray-500 text-lg mb-14 max-w-2xl mx-auto">{t('why_sub')}</p>
          <div className="grid md:grid-cols-3 gap-6">
            {WHY_US.map((item, i) => (
              <div key={i} className="bg-white rounded-3xl p-7 border border-gray-100 card-lift">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-5`} style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.12)' }}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-black text-lg mb-4">{item.title}</h3>
                <ul className="space-y-2.5">
                  {item.items.map(point => (
                    <li key={point} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-green-500 font-black mt-0.5 flex-shrink-0">✓</span>{point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLATFORMS */}
      <section className="py-16 px-5 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">{t('plat_label')}</p>
          <h2 className="text-3xl md:text-4xl font-black mb-10">{t('plat_title')}</h2>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {[
              { name: 'TikTok', Icon: TikTokIcon, grad: 'background:linear-gradient(135deg,#010101,#333)', active: true },
              { name: 'Instagram', Icon: Instagram, grad: 'background:linear-gradient(135deg,#f43f5e,#a855f7)', active: true },
              { name: 'YouTube', Icon: Youtube, grad: 'background:linear-gradient(135deg,#ef4444,#dc2626)', active: true },
              { name: 'Facebook', Icon: ({ className }: { className?: string }) => (
                <svg className={className} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              ), grad: 'background:linear-gradient(135deg,#1877f2,#0d5abf)', active: true },
              { name: 'LinkedIn', Icon: ({ className }: { className?: string }) => (
                <svg className={className} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              ), grad: 'background:linear-gradient(135deg,#0077b5,#005885)', active: false },
              { name: 'X (Twitter)', Icon: ({ className }: { className?: string }) => (
                <svg className={className} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              ), grad: 'background:linear-gradient(135deg,#000,#333)', active: false },
            ].map(({ name, Icon, grad, active }) => (
              <div key={name} className="bg-white border border-gray-200 rounded-2xl px-6 py-5 flex items-center gap-4 card-lift">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ ...Object.fromEntries(grad.split(';').map((s: string) => { const [k, v] = s.split(':'); return [k.trim(), v?.trim()] })), boxShadow: '0 3px 10px rgba(0,0,0,0.15)' }}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-black text-sm">{name}</p>
                  <p className={`text-xs font-bold ${active ? 'text-green-600' : 'text-gray-400'}`}>{active ? t('plat_active') : 'Coming soon'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE TEASER — Influenceri sus + Campanii jos */}
      <section className="py-24 px-5 overflow-hidden" id="platform" style={{ background: 'linear-gradient(180deg, #fafafa 0%, #fff 100%)' }}>
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-5">
              <span className="w-2 h-2 bg-green-500 rounded-full" style={{ animation: 'floatAnim 1s ease-in-out infinite' }} />
              {t('live_badge')}
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-4">{t('creators_title')}</h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">{t('creators_sub')}</p>
          </div>

          {/* ── INFLUENCERI — grid de 4 carduri mari ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
            {featuredInfluencers.length > 0 ? featuredInfluencers.map((inf, i) => {
              const followers = (inf.ig_followers || 0) + (inf.tt_followers || 0)
              const fmtF = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n)
              const gradients = [
                'linear-gradient(135deg,#fef3c7,#fed7aa)',
                'linear-gradient(135deg,#ede9fe,#ddd6fe)',
                'linear-gradient(135deg,#d1fae5,#a7f3d0)',
                'linear-gradient(135deg,#fce7f3,#fbcfe8)',
              ]
              return (
                <div key={inf.id} className="group bg-white rounded-3xl overflow-hidden card-lift cursor-pointer border border-gray-100"
                  style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                  {/* Top banner */}
                  <div className="h-20 relative flex items-end pb-0" style={{ background: inf.is_verified ? 'linear-gradient(135deg,#fef3c7,#fde68a)' : gradients[i % 4] }}>
                    {inf.is_verified && (
                      <div className="absolute top-3 left-3 flex items-center gap-1 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">
                        <Star className="w-2.5 h-2.5 fill-white" /> Verified
                      </div>
                    )}
                    {followers > 0 && (
                      <div className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm rounded-xl px-2 py-1 text-right">
                        <p className="font-black text-xs text-gray-900 leading-tight">{fmtF(followers)}</p>
                        <p className="text-[9px] text-gray-400 leading-tight">followers</p>
                      </div>
                    )}
                    {/* Avatar */}
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
                      <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-lg" style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
                        {inf.avatar
                          ? <img src={inf.avatar} alt={inf.name} className="w-full h-full object-cover" />
                          : <span className="w-full h-full flex items-center justify-center text-white font-black text-base">{inf.name?.[0]?.toUpperCase()}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="pt-8 px-4 pb-4 text-center">
                    <p className="font-black text-sm text-gray-900 truncate">{inf.name}</p>
                    {inf.city && (
                      <p className="text-[10px] text-orange-500 font-bold mt-0.5">📍 {inf.city}</p>
                    )}
                    {(inf.niches || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-center mt-2">
                        {inf.niches.slice(0, 2).map((n: string) => (
                          <span key={n} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100">{n}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
                      {inf.instagram_connected && <span className="text-[9px] font-bold text-pink-500 bg-pink-50 px-1.5 py-0.5 rounded-full border border-pink-100">IG ✓</span>}
                      {inf.tiktok_connected && <span className="text-[9px] font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded-full">TK ✓</span>}
                      {inf.ig_engagement_rate > 0 && <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">ER {inf.ig_engagement_rate}%</span>}
                    </div>
                  </div>
                </div>
              )
            }) : (
              [0, 1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-3xl overflow-hidden border border-gray-100">
                  <div className="animate-pulse">
                    <div className="h-20 bg-gray-100" />
                    <div className="pt-8 px-4 pb-4 space-y-2">
                      <div className="h-3 bg-gray-100 rounded mx-auto w-3/4" />
                      <div className="h-2 bg-gray-100 rounded mx-auto w-1/2" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* "Și mulți alții" hint */}
          <div className="flex items-center justify-center gap-3 mb-16">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-200" />
            <Link href="/auth/register?type=brand" className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-purple-600 transition px-4 py-2 rounded-full border border-gray-200 hover:border-purple-200 hover:bg-purple-50">
              <Users className="w-3.5 h-3.5" /> {t('creators_work')} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-200" />
          </div>

          {/* ── CAMPANII — cards orizontale atractive ── */}
          <div className="text-center mb-10">
            <h2 className="text-4xl md:text-5xl font-black mb-3">{t('live_title')}</h2>
            <p className="text-gray-500 text-lg">{t('live_sub')}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {liveCampaigns.length > 0 ? liveCampaigns.map((c, i) => {
              const isBarter = c.campaign_type === 'BARTER'
              const title = isBarter
                ? (c.offer_name || c.title.replace('[Barter] ', '').split(' —')[0])
                : c.title
              const slots = c.max_influencers || 0
              const taken = c.current_influencers || 0
              const pct = slots > 0 ? Math.round((taken / slots) * 100) : 0
              return (
                <div key={c.id} className="relative bg-white rounded-3xl overflow-hidden border border-gray-100 p-6 card-lift"
                  style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}>
                  {/* Gradient accent top */}
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl"
                    style={{ background: isBarter ? 'linear-gradient(90deg,#f97316,#ec4899)' : 'linear-gradient(90deg,#8b5cf6,#06b6d4)' }} />

                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0 pr-4">
                      {/* Badges */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" style={{ animation: 'floatAnim 1s ease-in-out infinite' }} />
                          {t('live_status')}
                        </span>
                        {isBarter
                          ? <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-2 py-0.5 rounded-full">🎁 Free Offer</span>
                          : <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-0.5 rounded-full">💰 Paid</span>
                        }
                      </div>
                      <h4 className="font-black text-gray-900 text-lg leading-tight truncate">{title}</h4>
                      {/* Platforms + niches */}
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        {(c.platforms || []).slice(0, 3).map((p: string) => (
                          <span key={p} className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{p.toLowerCase()}</span>
                        ))}
                        {(c.niches || []).slice(0, 2).map((n: string) => (
                          <span key={n} className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{n}</span>
                        ))}
                      </div>
                    </div>
                    {/* Valoare */}
                    <div className="text-right flex-shrink-0">
                      <p className={`font-black text-2xl ${isBarter ? 'text-orange-500' : 'text-green-600'}`}>
                        {isBarter ? (c.offer_value ? `${c.offer_value} RON` : 'Gratuit') : `${(c.budget_per_influencer || 0).toLocaleString('ro-RO')} RON`}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{isBarter ? 'valoare ofertă' : 'per influencer'}</p>
                    </div>
                  </div>

                  {/* Progress slots */}
                  <div className="mb-4">
                    <div className="flex justify-between text-[11px] font-bold text-gray-400 mb-1.5">
                      <span>{taken}/{slots} slots ocupate</span>
                      <span>{slots - taken} rămase</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: isBarter ? 'linear-gradient(90deg,#f97316,#ec4899)' : 'linear-gradient(90deg,#8b5cf6,#06b6d4)' }} />
                    </div>
                  </div>

                  <Link href="/auth/register" className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black text-white transition hover:-translate-y-0.5"
                    style={{
                      background: isBarter ? 'linear-gradient(135deg,#f97316,#ec4899)' : 'linear-gradient(135deg,#8b5cf6,#06b6d4)',
                      boxShadow: isBarter ? '0 4px 14px rgba(249,115,22,0.3)' : '0 4px 14px rgba(139,92,246,0.3)'
                    }}>
                    {t('live_apply')} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )
            }) : (
              [0, 1].map(i => (
                <div key={i} className="bg-white rounded-3xl border border-gray-100 p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-2 bg-gray-100 rounded-full" />
                    <div className="h-5 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-10 bg-gray-100 rounded-2xl" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* CTA centrat */}
          <div className="text-center">
            <Link href="/auth/register" className="inline-flex items-center gap-2 brand-grad text-white font-black text-base px-8 py-4 rounded-2xl transition hover:-translate-y-1"
              style={{ boxShadow: '0 8px 28px rgba(249,115,22,0.3)' }}>
              {t('live_apply')} <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-5 bg-gray-50" id="faq">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-xs font-black uppercase tracking-widest text-gray-400 mb-2">{t('faq_label')}</p>
          <h2 className="text-4xl md:text-5xl font-black text-center mb-12">{t('faq_title')}</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className={`bg-white rounded-2xl border transition-all ${openFaq === i ? 'border-orange-300 shadow-md' : 'border-gray-200'}`}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-6 py-4 text-left">
                  <span className="font-black text-sm pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && <div className="px-6 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-4">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 px-5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(249,115,22,0.06) 0%, transparent 65%)' }} />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="w-16 h-16 brand-grad rounded-3xl flex items-center justify-center mx-auto mb-8" style={{ boxShadow: '0 12px 40px rgba(249,115,22,0.35)' }}>
            <Award className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-5xl md:text-6xl font-black mb-5 leading-tight">
            {t('cta_title')}<br />
            <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400, color: '#f97316' }}>{t('cta_italic')}</span>
          </h2>
          <p className="text-gray-500 text-lg mb-10 max-w-xl mx-auto">
            {t('cta_join')} {liveStats.influencers > 0 ? `${liveStats.influencers}+` : ''} {t('cta_sub')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/register?type=brand" className="inline-flex items-center gap-2 brand-grad text-white font-black text-base px-8 py-4 rounded-2xl transition hover:-translate-y-1" style={{ boxShadow: '0 12px 40px rgba(249,115,22,0.4)' }}>
              {t('cta_brand')} <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/auth/register?type=influencer" className="inline-flex items-center gap-2 infl-grad text-white font-black text-base px-8 py-4 rounded-2xl transition hover:-translate-y-1" style={{ boxShadow: '0 12px 40px rgba(139,92,246,0.3)' }}>
              {t('cta_creator')} <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <p className="text-sm text-gray-400 mt-5">{t('cta_footnote')}</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 bg-gray-50 py-14 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-5 gap-8 mb-10">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl brand-grad flex items-center justify-center" style={{ boxShadow: '0 3px 12px rgba(249,115,22,0.3)' }}>
                  <img src="/logo.png" alt="AddFame" style={{ width: '110%', height: '110%', objectFit: 'contain' }} />
                </div>
                <span className="font-black text-xl">Add<span className="text-orange-500">Fame</span></span>
              </Link>
              <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-5">{t('footer_desc')}</p>
              <div className="flex gap-3">
                {([
                { Icon: Instagram, href: 'https://www.instagram.com/addfame.ro', label: 'Instagram' },
                { Icon: TikTokIcon, href: 'https://www.tiktok.com/@addfame', label: 'TikTok' },
                { Icon: Youtube, href: 'https://www.youtube.com/@addfame', label: 'YouTube' },
              ] as { Icon: React.ElementType; href: string; label: string }[]).map(({ Icon, href, label }, i) => (
                <a key={i} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-400 hover:text-orange-500 hover:border-orange-200 transition">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
              </div>
            </div>
            {[
              { title: 'Platformă', links: [['Pentru Branduri', '/pentru-branduri'], ['Pentru Influenceri', '/pentru-influenceri'], ['Cum Funcționează', '/cum-functioneaza'], ['Prețuri', '/preturi'], ['Întrebări Frecvente', '/intrebari-frecvente']] },
              { title: t('footer_company'), links: [[t('footer_about'), '/despre-noi'], [t('footer_contact'), '/contact'], ['Înregistrare', '/auth/register'], ['Autentificare', '/auth/login']] },
              { title: t('footer_legal'), links: [[t('footer_terms'), '/termeni'], [t('footer_privacy'), '/politica-de-confidentialitate'], ['Politica Cookies', '/politica-cookies'], [t('footer_contact'), '/contact']] },
            ].map(col => (
              <div key={col.title}>
                <p className="font-black text-sm mb-4">{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map(([label, href]) => (
                    <li key={label}><Link href={href} className="text-sm text-gray-500 hover:text-gray-900 transition">{label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">© 2026 AddFame. {t('footer_rights')}</p>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <a href="https://anpc.ro" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-500 transition font-semibold border border-gray-200 rounded-lg px-3 py-1.5 hover:border-orange-200">
                <span>🛡️</span> ANPC
              </a>
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer"
                className="text-xs text-gray-400 hover:text-orange-500 transition">
                SOL Online
              </a>
              <p className="text-sm text-gray-400">contact@addfame.ro</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
