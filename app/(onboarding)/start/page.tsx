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
  { name: 'Alex M.', role: 'Administrator, Tiki Bistro', text: 'Primim videoclipuri autentice cu oameni reali filmati la terasa noastra. Asta a creat o conexiune pe care nicio reclama clasica nu o putea obtine.', rating: 5, avatar: 'AM', color: 'from-orange-400 to-pink-500' },
  { name: 'Andrei U.', role: 'CEO, Stailer', text: 'Clipurile create pentru noi arata mult mai bine decat orice facut de o agentie. Le-am reutilizat in campanii platite cu rezultate mai bune.', rating: 5, avatar: 'AU', color: 'from-purple-400 to-indigo-500' },
  { name: 'Vlad P.', role: 'Administrator, Pizza Di Napo', text: 'Autenticitatea a adus mai multi oameni decat orice reclama platita. Clienti reali, reactii reale - asta functioneaza.', rating: 5, avatar: 'VP', color: 'from-green-400 to-teal-500' },
  { name: 'Cristina D.', role: 'Administrator, Flower Shop', text: 'Au filmat chiar in magazinul nostru si aranjamentele aratau incredibil. Videoclipurile au circulat si pe Facebook, nu doar pe TikTok.', rating: 5, avatar: 'CD', color: 'from-pink-400 to-rose-500' },
  { name: 'Adrian B.', role: 'Administrator, Body Line', text: 'Am trimis suplimentele prin AddFame si creatorii au facut videoclipuri naturale care s-au prins imediat. Rezultatele au fost uimitoare.', rating: 5, avatar: 'AB', color: 'from-blue-400 to-cyan-500' },
]

const HOW_IT_WORKS = [
  { number: '01', title: 'Creează campania ta', desc: 'Setează bugetul, descrie produsul tău și spune-ne ce tip de conținut ai nevoie. Durează mai puțin de 5 minute.', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { number: '02', title: 'Găsim oamenii potriviți', desc: 'Te conectăm cu micro-influenceri din zona ta sau din țară care pot crea videoclipuri reale și autentice despre afacerea ta.', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { number: '03', title: 'Ei postează, noi gestionăm plățile', desc: 'Creatorii postează direct din conturile lor. Îi plătim direct — tu primești o singură factură simplă, fără bătăi de cap.', icon: Shield, color: 'text-green-500', bg: 'bg-green-500/10' },
  { number: '04', title: 'Primești videoclipuri în 3 zile', desc: 'Conținut autentic, gata de utilizat pentru social media sau reclame. Reutilizează-le oriunde — fără licențe suplimentare.', icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10' },
]

const WHY_US = [
  { icon: MessageCircle, title: 'Ajutor oricând ai nevoie', items: ['O persoană reală îți răspunde imediat, nu boți', 'Răspunsuri rapide, fără formulare complicate', 'Ne asigurăm că totul merge bine, pas cu pas'], color: 'from-blue-500 to-cyan-500' },
  { icon: Zap, title: 'Ușor de început', items: ['Instructiuni simple, fara jargon de marketing', 'Te ghidam la fiecare pas, chiar daca e prima ta campanie', 'In 3 zile vei vedea deja primele videoclipuri'], color: 'from-purple-500 to-pink-500' },
  { icon: BarChart3, title: 'Rezultate clare, nu promisiuni', items: ['Vezi exact cati oameni au urmarit clipurile', 'Reutilizeaza videoclipurile in reclame sau pe paginile tale', 'Garantie 100% returnare bani daca nu gasim influencerii potriviti'], color: 'from-orange-500 to-yellow-500' },
]

const FAQS = [
  { q: 'Cat de repede primesc videoclipurile?', a: 'In cele mai multe cazuri in 3 zile de la lansarea campaniei. Odata ce creatorii accepta si posteaza, primesti acces complet la tot continutul.' },
  { q: 'Ce se intampla daca nu sunt multumit de rezultate?', a: 'Oferim garantie 100% returnare bani daca nu gasim micro-influencerii potriviti pentru campania ta. Fara intrebari suplimentare.' },
  { q: 'Am nevoie de experienta in marketing?', a: 'Deloc. AddFame este conceput pentru afaceri de toate dimensiunile. Te ghidam la fiecare pas, de la crearea campaniei pana la livrarea finala.' },
  { q: 'Pot folosi videoclipurile pentru reclame platite?', a: 'Da. Tot continutul creat prin AddFame poate fi reutilizat pentru reclame platite, postari pe social media sau orice alte canale de marketing.' },
  { q: 'Ce platforme sunt suportate?', a: 'TikTok si Instagram sunt complet active. Suportul pentru YouTube si LinkedIn vine curand.' },
  { q: 'Cum sunt platiti influencerii?', a: 'Gestionam toate platile direct cu influencerii. Tu primesti o singura factura de la AddFame — simplu si transparent.' },
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
            {[['Branduri', '#brands'], ['Influenceri', '#influencers'], ['Cum Functioneaza', '#how-it-works'], ['Prețuri', '#pricing'], ['FAQ', '#faq']].map(([l, h]) => (
              <a key={l} href={h} className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">{l}</a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-bold text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition">Autentificare</Link>
            <Link href="/auth/register" className="inline-flex items-center gap-2 brand-grad text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md transition hover:-translate-y-0.5" style={{ boxShadow: '0 4px 16px rgba(249,115,22,0.3)' }}>
              Incepe Gratuit <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition">
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-5 py-4 space-y-2">
            {[['Branduri', '#brands'], ['Influenceri', '#influencers'], ['Cum Functioneaza', '#how-it-works'], ['Prețuri', '#pricing'], ['FAQ', '#faq']].map(([l, h]) => (
              <a key={l} href={h} onClick={() => setMenuOpen(false)} className="block text-sm font-semibold text-gray-700 py-2.5">{l}</a>
            ))}
            <div className="pt-3 border-t border-gray-100 flex flex-col gap-2.5">
              <Link href="/auth/login" className="text-center py-3 text-sm font-bold border-2 border-gray-200 rounded-xl">Autentificare</Link>
              <Link href="/auth/register" className="text-center py-3 text-sm font-bold brand-grad text-white rounded-xl">Incepe Gratuit</Link>
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
              Ales de 1.200+ branduri
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.06] mb-6 fade-up d1">
              Promoveaza-ti afacerea{' '}
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400 }}>cu oameni reali,</span>
              <br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #f97316, #ec4899)' }}>nu reclame</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed fade-up d2">
              AddFame te conecteaza cu micro-influenceri potriviti si primesti videoclipuri simple, naturale care aduc clienti noi in cateva zile — postate direct din conturile lor.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14 fade-up d3">
              <Link href="/auth/register" className="inline-flex items-center gap-2 brand-grad text-white font-black text-base px-7 py-4 rounded-2xl w-full sm:w-auto justify-center transition hover:-translate-y-1" style={{ boxShadow: '0 8px 28px rgba(249,115,22,0.35)' }}>
                Incepe Gratuit <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="inline-flex items-center gap-3 border-2 border-gray-200 text-gray-700 font-bold text-base px-7 py-4 rounded-2xl w-full sm:w-auto justify-center hover:border-gray-300 hover:bg-gray-50 transition">
                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                </div>
                Vezi cum functioneaza
              </button>
            </div>
            <div className="flex items-center justify-center gap-3 fade-up d4">
              <div className="flex -space-x-2">
                {['🧑', '👩', '👨', '👩', '🧑'].map((e, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-white flex items-center justify-center text-sm">{e}</div>
                ))}
              </div>
              <div className="text-left text-sm text-gray-500">
                <div><span className="font-black text-gray-900">4.9/5</span> din <span className="font-black text-gray-900">800+</span> recenzii</div>
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
                  { label: 'Campanii Active', value: '12', change: '+3 săptămâna asta', color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Reach Total', value: '2.5M', change: '+12% față de luna trecută', color: 'text-purple-600', bg: 'bg-purple-50' },
                  { label: 'Piese de Conținut', value: '48', change: '+8 săptămâna asta', color: 'text-green-600', bg: 'bg-green-50' },
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
              <div><p className="text-xs font-black">Video livrat!</p><p className="text-[10px] text-gray-400">Campania "Summer 2025"</p></div>
            </div>
            <div className="absolute -bottom-3 -left-2 md:-left-6 bg-white rounded-2xl border border-gray-200 p-3 flex items-center gap-3 floating" style={{ animationDelay: '2.2s', boxShadow: '0 8px 28px rgba(0,0,0,0.1)' }}>
              <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center"><TrendingUp className="w-4 h-4 text-orange-600" /></div>
              <div><p className="text-xs font-black">+42K vizualizari</p><p className="text-[10px] text-gray-400">in ultimele 24 de ore</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* LOGO MARQUEE */}
      <section className="py-10 border-y border-gray-100 bg-gray-50/60 overflow-hidden">
        <p className="text-center text-xs font-black uppercase tracking-widest text-gray-300 mb-6">Ales de afaceri ca a ta</p>
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
            { value: 1200, suffix: '+', label: 'Branduri', sub: 'au încredere în AddFame' },
            { value: 15000, suffix: '+', label: 'Creatori', sub: 'în rețea' },
            { value: 98000, suffix: '+', label: 'Videoclipuri', sub: 'livrate' },
            { value: 4, suffix: '.9/5', label: 'Rating', sub: 'din recenzii verificate' },
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
          <p className="text-center text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Pentru cine este AddFame?</p>
          <h2 className="text-4xl md:text-5xl font-black text-center mb-12">Doua roluri, o platforma</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Brands */}
            <div className="relative overflow-hidden bg-white rounded-3xl p-8 border border-orange-100 card-lift">
              <div className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle at top right, rgba(251,146,60,0.08) 0%, transparent 70%)' }} />
              <div className="w-12 h-12 brand-grad rounded-2xl flex items-center justify-center mb-5" style={{ boxShadow: '0 4px 14px rgba(249,115,22,0.3)' }}>
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="inline-flex items-center px-3 py-1 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-black rounded-full mb-4">Pentru Branduri</span>
              <h3 className="text-2xl font-black mb-3">Crește cu conținut autentic</h3>
              <p className="text-gray-500 mb-6 leading-relaxed">Lanseaza o campanie in minute. Ajungi la mii de potentiali clienti prin continut autentic de la micro-influenceri — fara sa ai nevoie de o echipa de marketing.</p>
              <ul className="space-y-2.5 mb-8">
                {['Nu ai nevoie de experienta in marketing', 'Garantie 100% returnare bani', 'Videoclipuri gata in 3 zile', 'Reutilizeaza continutul pentru reclame platite'].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm font-semibold text-gray-700">
                    <CheckCircle className="w-4 h-4 text-orange-500 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <Link href="/auth/register?type=brand" className="inline-flex items-center gap-2 brand-grad text-white text-sm font-black px-5 py-3 rounded-xl transition hover:-translate-y-0.5" style={{ boxShadow: '0 4px 14px rgba(249,115,22,0.28)' }}>
                Incepe ca Brand <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {/* Influencers */}
            <div className="relative overflow-hidden bg-white rounded-3xl p-8 border border-purple-100 card-lift" id="influencers">
              <div className="absolute top-0 right-0 w-56 h-56 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle at top right, rgba(139,92,246,0.08) 0%, transparent 70%)' }} />
              <div className="w-12 h-12 infl-grad rounded-2xl flex items-center justify-center mb-5" style={{ boxShadow: '0 4px 14px rgba(139,92,246,0.3)' }}>
                <Users className="w-6 h-6 text-white" />
              </div>
              <span className="inline-flex items-center px-3 py-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-black rounded-full mb-4">Pentru Influenceri</span>
              <h3 className="text-2xl font-black mb-3">Câștigă din audiența ta</h3>
              <p className="text-gray-500 mb-6 leading-relaxed">Conecteaza-te cu branduri care se potrivesc nișei tale. Esti platit pentru continut autentic pe care l-ai crea oricum — dupa propriul program, din propriul cont.</p>
              <ul className="space-y-2.5 mb-8">
                {['Esti platit rapid, direct in cont', 'Lucreaza cu branduri pe care le iubesti', 'Libertate creativa completa', 'De la 1.000 de urmatori te poti alatura'].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm font-semibold text-gray-700">
                    <CheckCircle className="w-4 h-4 text-purple-500 flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <Link href="/auth/register?type=influencer" className="inline-flex items-center gap-2 infl-grad text-white text-sm font-black px-5 py-3 rounded-xl transition hover:-translate-y-0.5" style={{ boxShadow: '0 4px 14px rgba(139,92,246,0.28)' }}>
                Alatura-te ca Influencer <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-5" id="how-it-works">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Proces simplu</p>
          <h2 className="text-4xl md:text-5xl font-black text-center mb-3">Cum functioneaza AddFame</h2>
          <p className="text-center text-gray-500 text-lg mb-14 max-w-xl mx-auto">Totul este automatizat si simplu, chiar daca nu ai mai facut niciodata influencer marketing.</p>
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
              Incepe prima ta campanie <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 px-5 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Rezultate reale</p>
          <h2 className="text-4xl md:text-5xl font-black text-center mb-12">Ce spun afacerile</h2>
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
          <p className="text-center text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Avantajele noastre</p>
          <h2 className="text-4xl md:text-5xl font-black text-center mb-4">De ce să alegi AddFame?</h2>
          <p className="text-center text-gray-500 text-lg mb-14 max-w-2xl mx-auto">Pentru ca afacerile mici merita aceleasi unelte ca cele mari — fara complexitate si fara risc. Cu <strong>garantie 100% returnare bani.</strong></p>
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
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Platforme suportate</p>
          <h2 className="text-3xl md:text-4xl font-black mb-10">Unde trăiește conținutul tău</h2>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {[
              { name: 'TikTok', Icon: TikTokIcon, grad: 'background:linear-gradient(135deg,#010101,#333)', label: 'Activ', active: true },
              { name: 'Instagram', Icon: Instagram, grad: 'background:linear-gradient(135deg,#f43f5e,#a855f7)', label: 'Activ', active: true },
              { name: 'YouTube', Icon: Youtube, grad: 'background:linear-gradient(135deg,#ef4444,#dc2626)', label: 'În curând', active: false },
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
          <p className="text-center text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Preturi</p>
          <h2 className="text-4xl md:text-5xl font-black text-center mb-3">Preturi simple si transparente</h2>
          <p className="text-center text-gray-500 text-lg mb-14">Începe gratuit. Crește odată cu tine.</p>
          <div className="grid md:grid-cols-3 gap-6 items-center">
            {[
              { name: 'Starter', price: 'Gratuit', period: 'forever', desc: 'Perfect pentru a încerca AddFame', features: ['1 campanie activă', 'Până la 5 influenceri', 'Analiză de bază', 'Suport email'], cta: 'Începe Gratuit', highlighted: false },
              { name: 'Pro', price: '499 RON', period: '/lună', desc: 'Pentru branduri în creștere', features: ['Campanii nelimitate', 'Influenceri nelimitați', 'Analiză avansată', 'Suport prioritar', 'Acces API'], cta: 'Începe Pro', highlighted: true },
              { name: 'Enterprise', price: 'Custom', period: '', desc: 'Pentru echipe mari', features: ['Tot din Pro', 'Manager dedicat', 'Integrări personalizate', 'White label', 'SLA'], cta: 'Contactează Vânzări', highlighted: false },
            ].map((plan, i) => (
              <div key={i} className={`rounded-3xl p-7 relative ${plan.highlighted ? 'brand-grad text-white scale-105' : 'bg-white border border-gray-200 card-lift'}`}
                style={plan.highlighted ? { boxShadow: '0 24px 60px rgba(249,115,22,0.3)' } : {}}>
                {plan.highlighted && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-black px-4 py-1.5 rounded-full tracking-wide">CEL MAI POPULAR</div>}
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
          <h2 className="text-4xl md:text-5xl font-black text-center mb-12">Intrebari frecvente</h2>
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
            Esti gata sa incepi?<br />
            <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400, color: '#f97316' }}>E gratuit.</span>
          </h2>
          <p className="text-gray-500 text-lg mb-10 max-w-xl mx-auto">
            Alatura-te celor 1.200+ branduri care folosesc deja AddFame pentru a creste cu oameni reali, nu reclame scumpe.
          </p>
          <Link href="/auth/register" className="inline-flex items-center gap-2 brand-grad text-white font-black text-lg px-10 py-5 rounded-2xl transition hover:-translate-y-1" style={{ boxShadow: '0 12px 40px rgba(249,115,22,0.4)' }}>
            Incepe Gratuit — No credit card needed <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-gray-400 mt-5">Garantie 100% returnare bani · Configurare in sub 5 minute</p>
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
              <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-5">Cel mai simplu mod de a conecta brandurile cu micro-influenceri pentru continut autentic care converteste.</p>
              <div className="flex gap-3">
                {[Instagram, TikTokIcon, Youtube].map((Icon, i) => (
                  <a key={i} href="#" className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-400 hover:text-orange-500 hover:border-orange-200 transition">
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
            {[
              { title: 'Platformă', links: ['Pentru Branduri', 'Pentru Influenceri', 'Prețuri', 'Studii de Caz'] },
              { title: 'Companie', links: ['Despre Noi', 'Blog', 'Presă', 'Cariere'] },
              { title: 'Legal', links: ['Termeni', 'Politică Confidențialitate', 'Politică Cookies', 'Contact'] },
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
            <p className="text-sm text-gray-400">© 2025 AddFame. Toate drepturile rezervate.</p>
            <p className="text-sm text-gray-400">contact@addfame.io</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
