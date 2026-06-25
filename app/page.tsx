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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [menuOpen, setMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [scrolled, setScrolled] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [liveCampaigns, setLiveCampaigns] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

        // Ascultă evenimentul PASSWORD_RECOVERY de la Supabase SDK
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#080808' }} className="min-h-screen text-white overflow-x-hidden">
      <style>{`
        @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        .marquee-track { animation: marquee 35s linear infinite; }
        .fade-up { animation: fadeUp 0.6s ease both; }
        .d1{animation-delay:.1s}.d2{animation-delay:.2s}.d3{animation-delay:.3s}.d4{animation-delay:.4s}
        .brand-grad { background: linear-gradient(135deg, #f97316, #ec4899); }
        .infl-grad { background: linear-gradient(135deg, #8b5cf6, #06b6d4); }
        .nav-link { font-size:13px; font-weight:700; color:#666; transition:color .15s; text-decoration:none; }
        .nav-link:hover { color:#fff; }
        .step-card { background:#111; border:1px solid #1e1e1e; border-radius:16px; padding:28px; transition:border-color .2s; }
        .step-card:hover { border-color:#333; }
        .faq-item { background:#111; border:1px solid #1e1e1e; border-radius:14px; overflow:hidden; transition:border-color .2s; }
        .faq-item.open { border-color:#f97316; }
        .testimonial-card { background:#111; border:1px solid #1e1e1e; border-radius:16px; padding:24px; }
        @media(max-width:768px) {
          .hide-mobile { display:none !important; }
          .hero-btns { flex-direction:column !important; align-items:stretch !important; }
          .hero-btns a { text-align:center; justify-content:center; }
          .brands-grid { grid-template-columns:1fr !important; gap:32px !important; }
          .footer-bottom { flex-direction:column !important; align-items:flex-start !important; gap:16px !important; }
        }
        .pill { display:inline-flex; align-items:center; gap:6px; background:#151515; border:1px solid #222; border-radius:999px; padding:5px 14px; }
      `}</style>

      {/* NAV */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:50, borderBottom:'1px solid #111', background:'rgba(8,8,8,0.9)', backdropFilter:'blur(12px)' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px', height:64, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <Link href="/" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none' }}>
            <div style={{ width:32, height:32, background:'linear-gradient(135deg,#f97316,#ec4899)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <img src="/logo.png" alt="AddFame" style={{ width:'100%', height:'100%', objectFit:'contain', borderRadius:8 }} />
            </div>
            <span style={{ fontWeight:900, fontSize:18, color:'white' }}>Add<span style={{ color:'#f97316' }}>Fame</span></span>
          </Link>
          <div style={{ display:'flex', gap:28 }} className="hide-mobile hidden md:flex">
            {[['Cum funcționează', '#how-it-works'], ['Pentru branduri', '#brands'], ['Influenceri', '#influencers'], ['FAQ', '#faq']].map(([label, href]) => (
              <a key={label} href={href} className="nav-link">{label}</a>
            ))}
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <Link href="/auth/login" style={{ fontSize:13, fontWeight:700, color:'#666', textDecoration:'none' }}>Autentificare</Link>
            <Link href="/auth/register" style={{ background:'#f97316', color:'white', fontSize:13, fontWeight:800, padding:'9px 20px', borderRadius:10, textDecoration:'none' }}>
              Înregistrare →
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ paddingTop:140, paddingBottom:80, paddingLeft:24, paddingRight:24, textAlign:'center', position:'relative' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(249,115,22,0.08) 0%, transparent 60%)', pointerEvents:'none' }} />
        <div style={{ maxWidth:800, margin:'0 auto', position:'relative' }}>
          <div className="pill fade-up" style={{ marginBottom:28 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e' }} />
            <span style={{ fontSize:11, fontWeight:800, color:'#666', textTransform:'uppercase', letterSpacing:'0.08em' }}>
              {liveStats.influencers > 0 ? `${liveStats.influencers}+` : '700+'} influenceri · {liveStats.brands > 0 ? liveStats.brands : '28'} branduri active
            </span>
          </div>
          <h1 className="fade-up d1" style={{ fontSize:'clamp(40px,7vw,72px)', fontWeight:900, lineHeight:1.05, letterSpacing:'-0.02em', margin:'0 0 16px', color:'white' }}>
            Influencer marketing<br />
            <span style={{ background:'linear-gradient(135deg,#f97316,#ec4899)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              fără risc, doar rezultate.
            </span>
          </h1>
          <p className="fade-up d2" style={{ fontSize:18, color:'#888', maxWidth:520, margin:'0 auto 40px', lineHeight:1.7, fontWeight:500 }}>
            Plătești <strong style={{ color:'#fff' }}>0 RON</strong> până când postul e aprobat.{' '}
            <strong style={{ color:'#fff' }}>15% comision</strong> doar la rezultat confirmat.
          </p>
          <div className="hero-btns fade-up d3" style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap', marginBottom:64 }}>
            <Link href="/auth/register?type=brand" style={{ background:'#f97316', color:'white', fontSize:15, fontWeight:800, padding:'16px 32px', borderRadius:12, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:8 }}>
              Lansează o campanie <ArrowRight style={{ width:18, height:18 }} />
            </Link>
            <Link href="/auth/register?type=influencer" style={{ background:'#151515', border:'1px solid #2a2a2a', color:'white', fontSize:15, fontWeight:700, padding:'16px 32px', borderRadius:12, textDecoration:'none' }}>
              Sunt influencer
            </Link>
          </div>

          {/* STATS GRID */}
          <div className="fade-up d4" style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:1, background:'#1a1a1a', border:'1px solid #1a1a1a', borderRadius:16, overflow:'hidden' }}>
            {[
              { label:'Influenceri', value: liveStats.influencers > 0 ? `${liveStats.influencers}+` : '710+', color:'#fff' },
              { label:'Branduri', value: liveStats.brands > 0 ? String(liveStats.brands) : '28', color:'#fff' },
              { label:'Comision platformă', value:'15%', color:'#f97316' },
              { label:'Până la rezultat', value:'0 RON', color:'#22c55e' },
            ].map((s) => (
              <div key={s.label} style={{ background:'#0d0d0d', padding:'24px 16px', textAlign:'center' }}>
                <p style={{ fontSize:28, fontWeight:900, color:s.color, margin:'0 0 4px' }}>{s.value}</p>
                <p style={{ fontSize:11, color:'#555', fontWeight:700, margin:0, textTransform:'uppercase', letterSpacing:'0.05em' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BRANDS MARQUEE */}
      <section style={{ padding:'32px 0', borderTop:'1px solid #111', borderBottom:'1px solid #111', overflow:'hidden' }}>
        <p style={{ textAlign:'center', fontSize:11, fontWeight:800, color:'#444', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:20 }}>Branduri care cresc cu AddFame</p>
        <div style={{ display:'flex', overflow:'hidden' }}>
          <div className="marquee-track" style={{ display:'flex', gap:48, whiteSpace:'nowrap', paddingRight:48 }}>
            {[...(realBrands.length > 0 ? realBrands : ['CashClub', 'Plantica Biolabs', 'Parfum Misterios', 'Tiki Bistro', 'Stailer', 'Pizza Di Napo', 'Body Line', 'Flower Shop']),
              ...(realBrands.length > 0 ? realBrands : ['CashClub', 'Plantica Biolabs', 'Parfum Misterios', 'Tiki Bistro', 'Stailer', 'Pizza Di Napo', 'Body Line', 'Flower Shop'])
            ].map((b, i) => (
              <span key={i} style={{ fontSize:15, fontWeight:800, color:'#333' }}>{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding:'96px 24px', maxWidth:1100, margin:'0 auto' }} id="how-it-works">
        <p style={{ textAlign:'center', fontSize:11, fontWeight:800, color:'#f97316', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>Proces simplu</p>
        <h2 style={{ textAlign:'center', fontSize:'clamp(28px,4vw,44px)', fontWeight:900, color:'white', margin:'0 0 64px', lineHeight:1.2 }}>
          De la idee la rezultat<br /><span style={{ color:'#555' }}>în 4 pași</span>
        </h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:16 }}>
          {HOW_IT_WORKS.map((s, i) => (
            <div key={i} className="step-card">
              <div style={{ fontSize:11, fontWeight:900, color:'#333', letterSpacing:'0.1em', marginBottom:16 }}>{s.number}</div>
              <s.icon style={{ width:28, height:28, marginBottom:16, color:'#f97316' }} />
              <h3 style={{ fontSize:16, fontWeight:900, color:'white', margin:'0 0 8px' }}>{s.title}</h3>
              <p style={{ fontSize:13, color:'#666', lineHeight:1.7, margin:0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PENTRU BRANDURI */}
      <section style={{ background:'#080808', borderTop:'1px solid #111', borderBottom:'1px solid #111', padding:'96px 24px' }} id="brands">
        <div className="brands-grid" style={{ maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:40, alignItems:'start' }}>
          <div>
            <p style={{ fontSize:11, fontWeight:800, color:'#f97316', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:16 }}>Pentru branduri</p>
            <h2 style={{ fontSize:'clamp(28px,4vw,44px)', fontWeight:900, color:'white', margin:'0 0 20px', lineHeight:1.2 }}>
              Campanii cu ROI<br />măsurabil
            </h2>
            <p style={{ fontSize:15, color:'#666', lineHeight:1.8, marginBottom:32 }}>
              Selectezi influencerii potriviți, trimiți produsele, aprobi conținutul. Plătești doar când ești mulțumit de rezultat — fără surprize.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:36 }}>
              {[
                'Brief → aplicări → selecție → livrare → aprobare',
                'Contracte digitale automate cu semnătură electronică',
                'Rapoarte de performanță detaliate per influencer',
                'Control total asupra conținutului înainte de publicare',
              ].map((item, i) => (
                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  <div style={{ width:20, height:20, borderRadius:'50%', background:'#1a2e1a', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                    <CheckCircle style={{ width:12, height:12, color:'#22c55e' }} />
                  </div>
                  <span style={{ fontSize:14, color:'#aaa', lineHeight:1.6 }}>{item}</span>
                </div>
              ))}
            </div>
            <Link href="/auth/register?type=brand" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#f97316', color:'white', fontWeight:800, fontSize:14, padding:'14px 28px', borderRadius:12, textDecoration:'none' }}>
              Lansează prima campanie <ArrowRight style={{ width:16, height:16 }} />
            </Link>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { label:'Comision platformă', value:'15%', sub:'din colaborare finalizată', color:'#f97316' },
              { label:'Plată în avans', value:'0 RON', sub:'plătești doar la rezultat aprobat', color:'#22c55e' },
              { label:'Timp mediu lansare campanie', value:'< 24h', sub:'de la înregistrare la primele aplicări', color:'#888' },
            ].map((card, i) => (
              <div key={i} style={{ background:'#111', border:'1px solid #1e1e1e', borderRadius:14, padding:'20px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <p style={{ fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 4px' }}>{card.label}</p>
                  <p style={{ fontSize:11, color:'#444', margin:0 }}>{card.sub}</p>
                </div>
                <span style={{ fontSize:28, fontWeight:900, color:card.color }}>{card.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALE REALE */}
      <section style={{ padding:'96px 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <p style={{ textAlign:'center', fontSize:11, fontWeight:800, color:'#f97316', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>Ce spun utilizatorii</p>
          <h2 style={{ textAlign:'center', fontSize:'clamp(28px,4vw,44px)', fontWeight:900, color:'white', margin:'0 0 16px', lineHeight:1.2 }}>
            Recenzii reale,<br /><span style={{ color:'#555' }}>de la utilizatori verificați</span>
          </h2>
          <p style={{ textAlign:'center', fontSize:14, color:'#555', marginBottom:48 }}>
            Recenziile sunt lăsate direct în platformă de branduri și influenceri după colaborări finalizate.
          </p>
          {inflReviews.length > 0 ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16, marginBottom:48 }}>
              {inflReviews.map((r: any, i: number) => (
                <div key={i} className="testimonial-card">
                  <div style={{ display:'flex', gap:3, marginBottom:14 }}>
                    {Array.from({length: r.rating || 5}).map((_, j) => (
                      <Star key={j} style={{ width:14, height:14, color:'#f97316', fill:'#f97316' }} />
                    ))}
                  </div>
                  <p style={{ fontSize:14, color:'#aaa', lineHeight:1.7, margin:'0 0 20px', fontStyle:'italic' }}>
                    "{r.comment}"
                  </p>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    {r.influencer?.avatar ? (
                      <img src={r.influencer.avatar} alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
                    ) : (
                      <div style={{ width:36, height:36, borderRadius:'50%', background:'#1e1e1e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:'#666', flexShrink:0 }}>
                        {(r.influencer?.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p style={{ fontSize:13, fontWeight:800, color:'white', margin:0 }}>{r.influencer?.name || 'Utilizator verificat'}</p>
                      <p style={{ fontSize:11, color:'#555', margin:0 }}>✓ Utilizator verificat AddFame</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background:'#111', border:'1px solid #1e1e1e', borderRadius:16, padding:'48px 24px', textAlign:'center', marginBottom:48 }}>
              <div style={{ fontSize:40, marginBottom:16 }}>⭐</div>
              <p style={{ fontSize:16, fontWeight:800, color:'white', margin:'0 0 8px' }}>Fii primul care lasă o recenzie!</p>
              <p style={{ fontSize:14, color:'#555', margin:'0 0 24px', lineHeight:1.7 }}>
                Recenziile de la utilizatori reali apar aici după finalizarea colaborărilor.<br />
                Nu publicăm testimoniale false — doar feedback autentic.
              </p>
              <Link href="/auth/register" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#f97316', color:'white', fontWeight:800, fontSize:14, padding:'12px 24px', borderRadius:10, textDecoration:'none' }}>
                Înregistrează-te și lasă o recenzie →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* INFLUENCERI */}
      <section style={{ background:'#080808', borderTop:'1px solid #111', borderBottom:'1px solid #111', padding:'96px 24px' }} id="influencers">
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <p style={{ textAlign:'center', fontSize:11, fontWeight:800, color:'#8b5cf6', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>Pentru influenceri</p>
          <h2 style={{ textAlign:'center', fontSize:'clamp(28px,4vw,44px)', fontWeight:900, color:'white', margin:'0 0 16px', lineHeight:1.2 }}>
            Colaborări cu branduri verificate
          </h2>
          <p style={{ textAlign:'center', fontSize:16, color:'#666', maxWidth:520, margin:'0 auto 48px', lineHeight:1.7 }}>
            Aplici la campanii care ți se potrivesc, primești produsul și ești plătit rapid — fără negocieri, fără bătăi de cap.
          </p>

          {/* Influencer clips/cards */}
          {/* Clips cu thumbnail real */}
          {recentClips.filter((c: any) => c.thumbnail_url).length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:40 }}>
              {recentClips.filter((c: any) => c.thumbnail_url).slice(0, 6).map((clip: any, i: number) => (
                <div key={i} style={{ background:'#111', border:'1px solid #1e1e1e', borderRadius:14, overflow:'hidden', aspectRatio:'9/16', position:'relative' }}>
                  <img src={clip.thumbnail_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  {clip.influencer_name && (
                    <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'20px 12px 12px', background:'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                      <p style={{ fontSize:12, fontWeight:800, color:'white', margin:0 }}>@{clip.influencer_name}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* Feature cards — mereu vizibile */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16, marginBottom:40 }}>
            {[
              { label:'Creator Score', desc:'Sistem de reputație și badge-uri pentru influenceri activi', icon:Award, color:'#f97316' },
              { label:'Plăți rapide', desc:'Retrageri procesate în 3-5 zile lucrătoare', icon:Zap, color:'#22c55e' },
              { label:'Contracte digitale', desc:'Totul semnat electronic, simplu și legal', icon:Shield, color:'#8b5cf6' },
            ].map((item, i) => (
              <div key={i} style={{ background:'#111', border:'1px solid #1e1e1e', borderRadius:14, padding:24 }}>
                <item.icon style={{ width:28, height:28, color:item.color, marginBottom:12 }} />
                <h3 style={{ fontSize:15, fontWeight:900, color:'white', margin:'0 0 6px' }}>{item.label}</h3>
                <p style={{ fontSize:13, color:'#666', margin:0, lineHeight:1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign:'center' }}>
            <Link href="/auth/register?type=influencer" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'linear-gradient(135deg,#8b5cf6,#06b6d4)', color:'white', fontWeight:800, fontSize:15, padding:'16px 32px', borderRadius:12, textDecoration:'none' }}>
              Înregistrează-te ca influencer <ArrowRight style={{ width:18, height:18 }} />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding:'96px 24px' }} id="faq">
        <div style={{ maxWidth:720, margin:'0 auto' }}>
          <p style={{ textAlign:'center', fontSize:11, fontWeight:800, color:'#f97316', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>{t('faq_label')}</p>
          <h2 style={{ textAlign:'center', fontSize:'clamp(28px,4vw,44px)', fontWeight:900, color:'white', margin:'0 0 48px', lineHeight:1.2 }}>Întrebări frecvente</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {FAQS.map((faq, i) => (
              <div key={i} className={`faq-item ${openFaq === i ? 'open' : ''}`}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', textAlign:'left', background:'none', border:'none', cursor:'pointer', color:'white' }}>
                  <span style={{ fontSize:14, fontWeight:800, paddingRight:16 }}>{faq.q}</span>
                  <ChevronDown style={{ width:16, height:16, color:'#555', flexShrink:0, transform: openFaq === i ? 'rotate(180deg)' : 'none', transition:'transform .2s' }} />
                </button>
                {openFaq === i && (
                  <div style={{ padding:'0 24px 20px', fontSize:14, color:'#888', lineHeight:1.8, borderTop:'1px solid #1e1e1e', paddingTop:16 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding:'96px 24px', textAlign:'center', position:'relative', borderTop:'1px solid #111' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 50% 60% at 50% 50%, rgba(249,115,22,0.06) 0%, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ maxWidth:640, margin:'0 auto', position:'relative' }}>
          <div style={{ width:64, height:64, background:'linear-gradient(135deg,#f97316,#ec4899)', borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 32px' }}>
            <Award style={{ width:32, height:32, color:'white' }} />
          </div>
          <h2 style={{ fontSize:'clamp(32px,5vw,56px)', fontWeight:900, color:'white', margin:'0 0 20px', lineHeight:1.1, letterSpacing:'-0.02em' }}>
            Gata să începi?<br />
            <span style={{ background:'linear-gradient(135deg,#f97316,#ec4899)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              Este gratuit.
            </span>
          </h2>
          <p style={{ fontSize:16, color:'#666', marginBottom:40, lineHeight:1.7 }}>
            Alătură-te la {liveStats.influencers > 0 ? `${liveStats.influencers}+` : '700+'} branduri care folosesc deja AddFame pentru a crește cu oameni reali.
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <Link href="/auth/register?type=brand" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#f97316', color:'white', fontWeight:800, fontSize:15, padding:'16px 32px', borderRadius:12, textDecoration:'none' }}>
              Lansează o campanie <ArrowRight style={{ width:18, height:18 }} />
            </Link>
            <Link href="/auth/register?type=influencer" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#151515', border:'1px solid #2a2a2a', color:'white', fontWeight:800, fontSize:15, padding:'16px 32px', borderRadius:12, textDecoration:'none' }}>
              Sunt influencer <ArrowRight style={{ width:18, height:18 }} />
            </Link>
          </div>
          <p style={{ fontSize:13, color:'#444', marginTop:20 }}>Înregistrare gratuită · Fără abonament · Plătești doar la rezultat</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop:'1px solid #111', background:'#080808', padding:'64px 24px 40px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:32, marginBottom:48 }}>
            <div>
              <Link href="/" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none', marginBottom:16 }}>
                <div style={{ width:32, height:32, background:'linear-gradient(135deg,#f97316,#ec4899)', borderRadius:8 }}>
                  <img src="/logo.png" alt="AddFame" style={{ width:'100%', height:'100%', objectFit:'contain', borderRadius:8 }} />
                </div>
                <span style={{ fontWeight:900, fontSize:17, color:'white' }}>Add<span style={{ color:'#f97316' }}>Fame</span></span>
              </Link>
              <p style={{ fontSize:13, color:'#555', lineHeight:1.8, maxWidth:260, marginBottom:20 }}>Conectăm branduri românești cu influenceri autentici. Plătești doar când ești mulțumit de rezultat.</p>
              <div style={{ display:'flex', gap:10 }}>
                {([
                  { Icon: Instagram, href: 'https://www.instagram.com/addfame.ro', label: 'Instagram' },
                  { Icon: TikTokIcon, href: 'https://www.tiktok.com/@addfame', label: 'TikTok' },
                  { Icon: Youtube, href: 'https://www.youtube.com/@addfame', label: 'YouTube' },
                ] as { Icon: React.ElementType; href: string; label: string }[]).map(({ Icon, href, label }, i) => (
                  <a key={i} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                    style={{ width:36, height:36, background:'#111', border:'1px solid #1e1e1e', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', color:'#555', transition:'color .15s' }}>
                    <Icon style={{ width:16, height:16 }} />
                  </a>
                ))}
              </div>
            </div>
            {[
              { title: 'Platformă', links: [['Pentru Branduri', '/pentru-branduri'], ['Pentru Influenceri', '/pentru-influenceri'], ['Cum Funcționează', '/cum-functioneaza'], ['Prețuri', '/preturi']] },
              { title: 'Companie', links: [['Despre noi', '/despre-noi'], ['Contact', '/contact'], ['Înregistrare', '/auth/register']] },
              { title: 'Legal', links: [['Termeni', '/termeni'], ['Confidențialitate', '/politica-de-confidentialitate'], ['Politica Cookies', '/politica-cookies']] },
            ].map(col => (
              <div key={col.title}>
                <p style={{ fontSize:11, fontWeight:800, color:'#444', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:16 }}>{col.title}</p>
                <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:10 }}>
                  {col.links.map(([label, href]) => (
                    <li key={label}><Link href={href} style={{ fontSize:13, color:'#555', textDecoration:'none', transition:'color .15s' }}>{label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="footer-bottom" style={{ borderTop:'1px solid #111', paddingTop:24, display:'flex', flexWrap:'wrap', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <div>
              <p style={{ fontSize:13, color:'#444', margin:'0 0 4px' }}>© 2026 AddFame. Toate drepturile rezervate.</p>
              <p style={{ fontSize:11, color:'#333', margin:0 }}>ADD FAME DIGITAL S.R.L. · CUI: 54992560 · Reg. Com.: J2026040984009 · Argeș, România</p>
            </div>
            <div style={{ display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
              <a href="https://anpc.ro" target="_blank" rel="noopener noreferrer"
                style={{ fontSize:12, color:'#444', textDecoration:'none', border:'1px solid #1e1e1e', borderRadius:8, padding:'6px 12px', display:'flex', alignItems:'center', gap:6 }}>
                🛡️ ANPC
              </a>
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer"
                style={{ fontSize:12, color:'#444', textDecoration:'none' }}>SOL Online</a>
              <span style={{ fontSize:12, color:'#333' }}>contact@addfame.ro</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
