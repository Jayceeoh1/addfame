'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
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

const TESTIMONIALS = [
  { name: 'Alex M.', role: 'Administrator, Tiki Bistro', text: 'We get authentic videos with real people filmed at our terrace. This created a connection that no classic ad could achieve.', rating: 5, avatar: 'AM', color: 'from-orange-400 to-pink-500' },
  { name: 'Andrei U.', role: 'CEO, Stailer', text: 'The clips created for us look much better than anything made by an agency. We reused them in paid campaigns with better results.', rating: 5, avatar: 'AU', color: 'from-purple-400 to-indigo-500' },
  { name: 'Vlad P.', role: 'Administrator, Pizza Di Napo', text: 'Authenticity brought more people in than any paid ad. Real customers, real reactions — that\'s what works.', rating: 5, avatar: 'VP', color: 'from-green-400 to-teal-500' },
  { name: 'Cristina D.', role: 'Administrator, Flower Shop', text: 'They filmed right in our store and the arrangements looked incredible. Videos circulated on Facebook too, not just TikTok.', rating: 5, avatar: 'CD', color: 'from-pink-400 to-rose-500' },
  { name: 'Adrian B.', role: 'Administrator, Body Line', text: 'Sent our supplements through AddFame and creators made natural videos that caught on immediately. Results were amazing.', rating: 5, avatar: 'AB', color: 'from-blue-400 to-cyan-500' },
]

const HOW_IT_WORKS = [
  { number: '01', title: 'Create your campaign', desc: 'Set your budget, describe your product, and tell us what kind of content you need. Takes less than 5 minutes.', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { number: '02', title: 'We find the right people', desc: 'We connect you with micro-influencers from your area or country who can make real, authentic videos about your business.', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { number: '03', title: 'They post, we handle payments', desc: 'Creators post directly from their accounts. We pay them directly — you get one simple invoice, no hassle.', icon: Shield, color: 'text-green-500', bg: 'bg-green-500/10' },
  { number: '04', title: 'Receive videos in 3 days', desc: 'Authentic, ready-to-use content for social media or ads. Reuse them anywhere — no extra licensing needed.', icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10' },
]

const WHY_US = [
  { icon: MessageCircle, title: 'Help whenever you need it', items: ['A real person answers you immediately, not bots', 'Fast responses, no complicated forms', 'We make sure everything runs smoothly, step by step'], color: 'from-blue-500 to-cyan-500' },
  { icon: Zap, title: 'Easy to get started', items: ['Simple instructions, no marketing jargon', 'We guide you at every step, even if it\'s your first campaign', 'In 3 days you\'ll already see the first videos'], color: 'from-purple-500 to-pink-500' },
  { icon: BarChart3, title: 'Clear results, not promises', items: ['See exactly how many people watched the clips', 'Reuse videos in ads or on your pages', '100% money-back guarantee if we can\'t find the right influencers'], color: 'from-orange-500 to-yellow-500' },
]

const FAQS = [
  { q: 'How quickly will I receive the videos?', a: 'In most cases within 3 days from campaign launch. Once creators accept and post, you receive full access to all content.' },
  { q: 'What if I\'m not happy with the results?', a: 'We offer a 100% money-back guarantee if we can\'t find the right micro-influencers for your campaign. No questions asked.' },
  { q: 'Do I need any marketing experience?', a: 'Not at all. AddFame is designed for businesses of all sizes. We guide you through every step, from campaign creation to final delivery.' },
  { q: 'Can I use the videos for paid ads?', a: 'Yes. All content created through AddFame can be repurposed for paid advertising, social media posts, or any other marketing channels.' },
  { q: 'Which platforms are supported?', a: 'TikTok and Instagram are fully active. YouTube and LinkedIn support is coming soon.' },
  { q: 'How are influencers paid?', a: 'We handle all payments directly with the influencers. You receive a single invoice from AddFame — simple and transparent.' },
]

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&display=swap');
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
            {[['Brands', '#brands'], ['Influencers', '#influencers'], ['How It Works', '#how-it-works'], ['Pricing', '#pricing'], ['FAQ', '#faq']].map(([l, h]) => (
              <a key={l} href={h} className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">{l}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-bold text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition">Sign In</Link>
            <Link href="/auth/register" className="inline-flex items-center gap-2 brand-grad text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md transition hover:-translate-y-0.5" style={{ boxShadow: '0 4px 16px rgba(249,115,22,0.3)' }}>
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-5 py-4 space-y-2">
            {[['Brands', '#brands'], ['Influencers', '#influencers'], ['How It Works', '#how-it-works'], ['Pricing', '#pricing'], ['FAQ', '#faq']].map(([l, h]) => (
              <a key={l} href={h} onClick={() => setMenuOpen(false)} className="block text-sm font-semibold text-gray-700 py-2.5">{l}</a>
            ))}
            <div className="pt-3 border-t border-gray-100 flex flex-col gap-2.5">
              <Link href="/auth/login" className="text-center py-3 text-sm font-bold border-2 border-gray-200 rounded-xl">Sign In</Link>
              <Link href="/auth/register" className="text-center py-3 text-sm font-bold brand-grad text-white rounded-xl">Get Started Free</Link>
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
              Trusted by 1,200+ brands
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.06] mb-6 fade-up d1">
              Promote your business{' '}
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>with real people,</span>
              <br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #f97316, #ec4899)' }}>not ads</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed fade-up d2">
              AddFame connects you with the right micro-influencers and you receive simple, natural videos that bring new customers in days — posted directly from their accounts.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14 fade-up d3">
              <Link href="/auth/register" className="inline-flex items-center gap-2 brand-grad text-white font-black text-base px-7 py-4 rounded-2xl w-full sm:w-auto justify-center transition hover:-translate-y-1" style={{ boxShadow: '0 8px 28px rgba(249,115,22,0.35)' }}>
                Start for Free <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="inline-flex items-center gap-3 border-2 border-gray-200 text-gray-700 font-bold text-base px-7 py-4 rounded-2xl w-full sm:w-auto justify-center hover:border-gray-300 hover:bg-gray-50 transition">
                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                </div>
                Watch how it works
              </button>
            </div>
            <div className="flex items-center justify-center gap-3 fade-up d4">
              <div className="flex -space-x-2">
                {['🧑', '👩', '👨', '👩', '🧑'].map((e, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-white flex items-center justify-center text-sm">{e}</div>
                ))}
              </div>
              <div className="text-left text-sm text-gray-500">
                <div><span className="font-black text-gray-900">4.9/5</span> from <span className="font-black text-gray-900">800+</span> reviews</div>
                <div className="flex gap-0.5 mt-0.5">{[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}</div>
              </div>
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="mt-16 scale-in d3 relative max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden" style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.12)' }}>
              <div className="bg-gray-50/80 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400" /><div className="w-3 h-3 rounded-full bg-yellow-400" /><div className="w-3 h-3 rounded-full bg-green-400" /></div>
                <div className="flex-1 bg-white rounded-lg border border-gray-200 px-4 py-1.5 text-xs text-gray-400 text-center">app.addfame.io/brand/dashboard</div>
              </div>
              <div className="p-6 grid grid-cols-3 md:grid-cols-5 gap-3">
                {[
                  { label: 'Active Campaigns', value: '12', change: '+3 this week', color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Total Reach', value: '2.5M', change: '+12% vs last month', color: 'text-purple-600', bg: 'bg-purple-50' },
                  { label: 'Content Pieces', value: '48', change: '+8 this week', color: 'text-green-600', bg: 'bg-green-50' },
                ].map((s, i) => (
                  <div key={i} className={`rounded-2xl p-4 ${s.bg}`}>
                    <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-xs font-semibold text-green-600 mt-1">↑ {s.change}</p>
                  </div>
                ))}
                {[
                  { name: 'Maria P.', followers: '24K', niche: 'Food & Drink', match: '98%', grad: 'brand-grad' },
                  { name: 'Alex C.', followers: '18K', niche: 'Lifestyle', match: '95%', grad: 'infl-grad' },
                ].map((inf, i) => (
                  <div key={i} className="rounded-2xl border border-gray-100 p-4 flex flex-col gap-2 bg-white">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full ${inf.grad} flex items-center justify-center text-white text-xs font-black`}>{inf.name[0]}</div>
                      <div><p className="text-xs font-black leading-tight">{inf.name}</p><p className="text-xs text-gray-400">{inf.followers}</p></div>
                    </div>
                    <p className="text-[10px] text-gray-500 bg-gray-50 rounded-lg px-2 py-1">{inf.niche}</p>
                    <p className="text-xs font-black text-green-600">{inf.match} match</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Floating badges */}
            <div className="absolute -top-4 -right-2 md:-right-6 bg-white rounded-2xl border border-gray-200 p-3 flex items-center gap-3 floating" style={{ boxShadow: '0 8px 28px rgba(0,0,0,0.1)' }}>
              <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center"><CheckCircle className="w-4 h-4 text-green-600" /></div>
              <div><p className="text-xs font-black">Video delivered!</p><p className="text-[10px] text-gray-400">Campaign "Summer 2025"</p></div>
            </div>
            <div className="absolute -bottom-3 -left-2 md:-left-6 bg-white rounded-2xl border border-gray-200 p-3 flex items-center gap-3 floating" style={{ animationDelay: '2.2s', boxShadow: '0 8px 28px rgba(0,0,0,0.1)' }}>
              <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center"><TrendingUp className="w-4 h-4 text-orange-600" /></div>
              <div><p className="text-xs font-black">+42K views</p><p className="text-[10px] text-gray-400">in the last 24 hours</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* LOGO MARQUEE */}
      <section className="py-10 border-y border-gray-100 bg-gray-50/60 overflow-hidden">
        <p className="text-center text-xs font-black uppercase tracking-widest text-gray-300 mb-6">Trusted by businesses like yours</p>
        <div className="flex overflow-hidden">
          <div className="flex gap-14 items-center marquee-track whitespace-nowrap pr-14">
            {[...BRANDS, ...BRANDS].map((b, i) => (
              <span key={i} className="text-gray-200 font-black text-xl tracking-tight">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-20 px-5">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
          {[
            { value: 1200, suffix: '+', label: 'Brands', sub: 'trust AddFame' },
            { value: 15000, suffix: '+', label: 'Creators', sub: 'in the network' },
            { value: 98000, suffix: '+', label: 'Videos', sub: 'delivered' },
            { value: 4, suffix: '.9/5', label: 'Rating', sub: 'from verified reviews' },
          ].map((s, i) => (
            <div key={i}>
              <p className="text-5xl font-black text-gray-900 mb-1"><Counter end={s.value} suffix={s.suffix} /></p>
              <p className="font-black text-gray-700 mb-0.5">{s.label}</p>
              <p className="text-sm text-gray-400">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TWO PATHS */}
      <section className="py-16 px-5 bg-gray-50" id="brands">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Who is AddFame for?</p>
          <h2 className="text-4xl md:text-5xl font-black text-center mb-12">Two sides, one platform</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Brands */}
            <div className="relative overflow-hidden bg-white rounded-3xl p-8 border border-orange-100 card-lift">
              <div className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle at top right, rgba(251,146,60,0.08) 0%, transparent 70%)' }} />
              <div className="w-12 h-12 brand-grad rounded-2xl flex items-center justify-center mb-5" style={{ boxShadow: '0 4px 14px rgba(249,115,22,0.3)' }}>
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="inline-flex items-center px-3 py-1 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-black rounded-full mb-4">For Brands</span>
              <h3 className="text-2xl font-black mb-3">Grow with authentic content</h3>
              <p className="text-gray-500 mb-6 leading-relaxed">Launch a campaign in minutes. Reach thousands of potential customers through genuine micro-influencer content — without needing a marketing team.</p>
              <ul className="space-y-2.5 mb-8">
                {['No marketing experience needed', '100% money-back guarantee', 'Videos ready in 3 days', 'Reuse content for paid ads'].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm font-semibold text-gray-700">
                    <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <Link href="/auth/register?type=brand" className="inline-flex items-center gap-2 brand-grad text-white text-sm font-black px-5 py-3 rounded-xl transition hover:-translate-y-0.5" style={{ boxShadow: '0 4px 14px rgba(249,115,22,0.28)' }}>
                Start as a Brand <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {/* Influencers */}
            <div className="relative overflow-hidden bg-white rounded-3xl p-8 border border-purple-100 card-lift" id="influencers">
              <div className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle at top right, rgba(139,92,246,0.08) 0%, transparent 70%)' }} />
              <div className="w-12 h-12 infl-grad rounded-2xl flex items-center justify-center mb-5" style={{ boxShadow: '0 4px 14px rgba(139,92,246,0.3)' }}>
                <Users className="w-6 h-6 text-white" />
              </div>
              <span className="inline-flex items-center px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-black rounded-full mb-4">For Influencers</span>
              <h3 className="text-2xl font-black mb-3">Earn from your audience</h3>
              <p className="text-gray-500 mb-6 leading-relaxed">Connect with brands that match your niche. Get paid for authentic content you'd create anyway — on your own schedule, from your own account.</p>
              <ul className="space-y-2.5 mb-8">
                {['Get paid fast, directly to your account', 'Work with brands you love', 'Full creative freedom', 'From 1,000 followers you can join'].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm font-semibold text-gray-700">
                    <CheckCircle className="w-4 h-4 text-purple-500 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <Link href="/auth/register?type=influencer" className="inline-flex items-center gap-2 infl-grad text-white text-sm font-black px-5 py-3 rounded-xl transition hover:-translate-y-0.5" style={{ boxShadow: '0 4px 14px rgba(139,92,246,0.28)' }}>
                Join as Influencer <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-5" id="how-it-works">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Simple process</p>
          <h2 className="text-4xl md:text-5xl font-black text-center mb-3">How AddFame works</h2>
          <p className="text-center text-gray-500 text-lg mb-14 max-w-xl mx-auto">Everything is automated and easy, even if you've never done influencer marketing before.</p>
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
            <Link href="/auth/register" className="inline-flex items-center gap-2 brand-grad text-white font-black text-base px-8 py-4 rounded-2xl transition hover:-translate-y-1" style={{ boxShadow: '0 8px 28px rgba(249,115,22,0.3)' }}>
              Start your first campaign <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 px-5 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Real results</p>
          <h2 className="text-4xl md:text-5xl font-black text-center mb-12">What businesses say</h2>
          <div className="grid md:grid-cols-3 gap-5 mb-5">
            {TESTIMONIALS.slice(0, 3).map((t, i) => (
              <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 card-lift">
                <div className="flex gap-0.5 mb-4">{[...Array(t.rating)].map((_, j) => <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}</div>
                <p className="text-gray-700 text-sm leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-black`}>{t.avatar}</div>
                  <div><p className="font-black text-sm">{t.name}</p><p className="text-xs text-gray-400">{t.role}</p></div>
                </div>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {TESTIMONIALS.slice(3).map((t, i) => (
              <div key={i} className="bg-white rounded-3xl p-6 border border-gray-100 card-lift">
                <div className="flex gap-0.5 mb-4">{[...Array(t.rating)].map((_, j) => <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}</div>
                <p className="text-gray-700 text-sm leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-black`}>{t.avatar}</div>
                  <div><p className="font-black text-sm">{t.name}</p><p className="text-xs text-gray-400">{t.role}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section className="py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Our advantages</p>
          <h2 className="text-4xl md:text-5xl font-black text-center mb-4">Why choose AddFame?</h2>
          <p className="text-center text-gray-500 text-lg mb-14 max-w-2xl mx-auto">Because small businesses deserve the same tools as big ones — without complexity and without risk. With <strong>100% money-back guarantee.</strong></p>
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
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Supported platforms</p>
          <h2 className="text-3xl md:text-4xl font-black mb-10">Where your content lives</h2>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {[
              { name: 'TikTok', Icon: TikTokIcon, grad: 'background:linear-gradient(135deg,#010101,#333)', label: 'Active', active: true },
              { name: 'Instagram', Icon: Instagram, grad: 'background:linear-gradient(135deg,#f43f5e,#a855f7)', label: 'Active', active: true },
              { name: 'YouTube', Icon: Youtube, grad: 'background:linear-gradient(135deg,#ef4444,#dc2626)', label: 'Coming soon', active: false },
            ].map(({ name, Icon, grad, label, active }) => (
              <div key={name} className="bg-white border border-gray-200 rounded-2xl px-6 py-5 flex items-center gap-4 card-lift">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ ...Object.fromEntries(grad.split(';').map(s => { const [k, v] = s.split(':'); return [k.trim(), v?.trim()] })), ...{ boxShadow: '0 3px 10px rgba(0,0,0,0.15)' } }}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-black text-sm">{name}</p>
                  <p className={`text-xs font-bold ${active ? 'text-green-600' : 'text-gray-400'}`}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-20 px-5" id="pricing">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Pricing</p>
          <h2 className="text-4xl md:text-5xl font-black text-center mb-3">Simple, transparent pricing</h2>
          <p className="text-center text-gray-500 text-lg mb-14">Start free. Scale as you grow.</p>
          <div className="grid md:grid-cols-3 gap-6 items-center">
            {[
              { name: 'Starter', price: 'Gratuit', period: 'forever', desc: 'Perfect to try AddFame', features: ['1 active campaign', 'Up to 5 influencers', 'Basic analytics', 'Email support'], cta: 'Start Free', highlighted: false },
              { name: 'Pro', price: '499 RON', period: '/lună', desc: 'For growing brands', features: ['Unlimited campaigns', 'Unlimited influencers', 'Advanced analytics', 'Priority support', 'API access'], cta: 'Start Pro', highlighted: true },
              { name: 'Enterprise', price: 'Custom', period: '', desc: 'For large teams', features: ['Everything in Pro', 'Dedicated manager', 'Custom integrations', 'White label', 'SLA'], cta: 'Contact Sales', highlighted: false },
            ].map((plan, i) => (
              <div key={i} className={`rounded-3xl p-7 relative ${plan.highlighted ? 'brand-grad text-white scale-105' : 'bg-white border border-gray-200 card-lift'}`}
                style={plan.highlighted ? { boxShadow: '0 24px 60px rgba(249,115,22,0.3)' } : {}}>
                {plan.highlighted && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-black px-4 py-1.5 rounded-full tracking-wide">MOST POPULAR</div>}
                <p className={`text-xs font-black uppercase tracking-widest mb-3 ${plan.highlighted ? 'text-orange-100' : 'text-gray-400'}`}>{plan.name}</p>
                <div className="mb-1"><span className="text-4xl font-black">{plan.price}</span><span className={`text-sm ml-1 ${plan.highlighted ? 'text-orange-100' : 'text-gray-400'}`}>{plan.period}</span></div>
                <p className={`text-sm mb-6 ${plan.highlighted ? 'text-orange-100' : 'text-gray-500'}`}>{plan.desc}</p>
                <ul className="space-y-2.5 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className={`flex items-center gap-2 text-sm font-semibold ${plan.highlighted ? 'text-white' : 'text-gray-700'}`}>
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 ${plan.highlighted ? 'text-orange-200' : 'text-orange-500'}`} />{f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/register" className={`block text-center py-3.5 rounded-2xl font-black text-sm transition hover:-translate-y-0.5 ${plan.highlighted ? 'bg-white text-orange-600 hover:bg-orange-50' : 'brand-grad text-white'}`}
                  style={!plan.highlighted ? { boxShadow: '0 4px 14px rgba(249,115,22,0.28)' } : {}}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-5 bg-gray-50" id="faq">
        <div className="max-w-3xl mx-auto">
          <p className="text-center text-xs font-black uppercase tracking-widest text-gray-400 mb-2">FAQ</p>
          <h2 className="text-4xl md:text-5xl font-black text-center mb-12">Frequently asked questions</h2>
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
            Ready to start?<br />
            <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400, color: '#f97316' }}>It's free.</span>
          </h2>
          <p className="text-gray-500 text-lg mb-10 max-w-xl mx-auto">
            Join 1,200+ brands that already use AddFame to grow with real people, not expensive ads.
          </p>
          <Link href="/auth/register" className="inline-flex items-center gap-2 brand-grad text-white font-black text-lg px-10 py-5 rounded-2xl transition hover:-translate-y-1" style={{ boxShadow: '0 12px 40px rgba(249,115,22,0.4)' }}>
            Start for Free — No credit card needed <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-gray-400 mt-5">100% money-back guarantee · Setup in under 5 minutes</p>
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
                <span className="font-black text-xl">Influe<span className="text-orange-500">X</span></span>
              </Link>
              <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-5">The simplest way to connect brands with micro-influencers for authentic content that converts.</p>
              <div className="flex gap-3">
                {[Instagram, TikTokIcon, Youtube].map((Icon, i) => (
                  <a key={i} href="#" className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-400 hover:text-orange-500 hover:border-orange-200 transition">
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
            {[
              { title: 'Platform', links: ['For Brands', 'For Influencers', 'Pricing', 'Case Studies'] },
              { title: 'Company', links: ['About Us', 'Blog', 'Press', 'Careers'] },
              { title: 'Legal', links: ['Terms', 'Privacy Policy', 'Cookie Policy', 'Contact'] },
            ].map(col => (
              <div key={col.title}>
                <p className="font-black text-sm mb-4">{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map(link => (
                    <li key={link}><a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-400">© 2025 AddFame. All rights reserved.</p>
            <p className="text-sm text-gray-400">contact@addfame.io</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
