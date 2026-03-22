'use client'
// @ts-nocheck

import { useState } from 'react'
import { TrendingUp, BarChart2, Info, RefreshCw, Sparkles } from 'lucide-react'
import { InstagramIcon, TikTokIcon as TikTokSVG, YoutubeIcon, TwitterXIcon } from '@/components/shared/platform-icons'

const PLATFORMS = [
  {
    id: 'tiktok', label: 'TikTok',
    icon: TikTokSVG,
    grad: 'linear-gradient(135deg,#010101,#69C9D0)',
    light: '#f3f4f6', textColor: '#111',
    benchmarks: { excellent: 9, good: 5, avg: 2 },
    fields: ['likes', 'comments', 'shares', 'saves'],
  },
  {
    id: 'instagram', label: 'Instagram',
    icon: InstagramIcon,
    grad: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)',
    light: '#fdf2f8', textColor: '#9d174d',
    benchmarks: { excellent: 5, good: 2, avg: 1 },
    fields: ['likes', 'comments', 'saves'],
  },
  {
    id: 'youtube', label: 'YouTube',
    icon: YoutubeIcon,
    grad: 'linear-gradient(135deg,#FF0000,#ff6b6b)',
    light: '#fff5f5', textColor: '#991b1b',
    benchmarks: { excellent: 5, good: 2, avg: 1 },
    fields: ['likes', 'comments'],
  },
  {
    id: 'twitter', label: 'X / Twitter',
    icon: TwitterXIcon,
    grad: 'linear-gradient(135deg,#14171A,#657786)',
    light: '#f9fafb', textColor: '#374151',
    benchmarks: { excellent: 3, good: 1, avg: 0.5 },
    fields: ['likes', 'comments', 'shares'],
  },
]

const FIELD_LABELS = {
  likes: 'Likes',
  comments: 'Comentarii',
  shares: 'Share-uri / Repost-uri',
  saves: 'Saves / Bookmark-uri',
}

function parseNum(v) {
  const s = String(v || '').trim().toLowerCase()
  if (s.endsWith('m')) return parseFloat(s) * 1_000_000
  if (s.endsWith('k')) return parseFloat(s) * 1_000
  return parseFloat(s.replace(/[^0-9.]/g, '')) || 0
}

function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K'
  return String(Math.round(n))
}

export default function EngagementCalculatorPage() {
  const [platform, setPlatform] = useState('tiktok')
  const [followers, setFollowers] = useState('')
  const [fields, setFields] = useState({ likes: '', comments: '', shares: '', saves: '' })
  const [posts, setPosts] = useState('10')
  const [result, setResult] = useState(null)

  const plat = PLATFORMS.find(p => p.id === platform)

  function setField(k, v) { setFields(prev => ({ ...prev, [k]: v })) }

  function calculate() {
    const f = parseNum(followers)
    const total = plat.fields.reduce((s, k) => s + parseNum(fields[k]), 0)
    const p = parseNum(posts) || 10
    if (!f || !total) return
    setResult(Math.round((total / p / f) * 10000) / 100)
  }

  function reset() {
    setFollowers('')
    setFields({ likes: '', comments: '', shares: '', saves: '' })
    setPosts('10')
    setResult(null)
  }

  function getRating(er) {
    if (er >= plat.benchmarks.excellent) return { label: 'Excelent 🔥', color: '#15803d', bg: '#f0fdf4', bar: '#22c55e', pct: 100 }
    if (er >= plat.benchmarks.good) return { label: 'Bun 👍', color: '#b45309', bg: '#fffbeb', bar: '#f59e0b', pct: 66 }
    if (er >= plat.benchmarks.avg) return { label: 'Mediu 😐', color: '#c2410c', bg: '#fff7ed', bar: '#f97316', pct: 40 }
    return { label: 'Scăzut ⚠️', color: '#b91c1c', bg: '#fef2f2', bar: '#ef4444', pct: 15 }
  }

  const rating = result !== null ? getRating(result) : null
  const canCalc = followers && plat.fields.some(k => fields[k])

  return (
    <div className="p-5 lg:p-8 max-w-2xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .er-input {
          width: 100%; padding: 11px 14px; font-size: 14px; font-family: inherit; font-weight: 600;
          border: 2px solid #e5e7eb; border-radius: 12px; background: white; color: #111;
          outline: none; transition: border-color .18s, box-shadow .18s;
        }
        .er-input:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139,92,246,0.1); }
        .er-input::placeholder { color: #9ca3af; font-weight: 400; }
        .plat-btn { border-radius: 16px; padding: 14px 10px; cursor: pointer; transition: all .18s; border: 2px solid transparent; text-align: center; }
        .plat-btn:hover { transform: translateY(-2px); }
        .calc-btn { width: 100%; padding: 14px; border-radius: 14px; font-family: inherit; font-size: 15px; font-weight: 800; cursor: pointer; border: none; color: white; transition: all .18s; }
        .calc-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(139,92,246,0.35); }
        .calc-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        @keyframes popIn { from{opacity:0;transform:scale(.92)translateY(8px)} to{opacity:1;transform:scale(1)translateY(0)} }
        .pop-in { animation: popIn .3s cubic-bezier(.34,1.56,.64,1) both; }
        @keyframes barGrow { from{width:0} to{width:var(--target-w)} }
        .bar-anim { animation: barGrow .6s cubic-bezier(.34,1.56,.64,1) .1s both; }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', boxShadow: '0 4px 14px rgba(139,92,246,0.35)' }}>
          <BarChart2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Calculator Engagement Rate</h1>
          <p className="text-sm text-gray-400 mt-0.5">Calculează ER-ul exact ca platformele profesionale</p>
        </div>
      </div>

      {/* Platform selector */}
      <div className="mb-6">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Alege platforma</p>
        <div className="grid grid-cols-4 gap-3">
          {PLATFORMS.map(p => {
            const Icon = p.icon
            const active = platform === p.id
            return (
              <button key={p.id}
                className="plat-btn"
                onClick={() => { setPlatform(p.id); setResult(null) }}
                style={{
                  background: active ? p.light : 'white',
                  border: active ? `2px solid transparent` : '2px solid #f0f0f0',
                  backgroundImage: active ? `${p.light}` : undefined,
                  boxShadow: active ? `0 4px 16px rgba(0,0,0,0.1)` : 'none',
                }}
              >
                <div className="w-9 h-9 rounded-xl mx-auto mb-2 flex items-center justify-center"
                  style={{ background: active ? p.grad : '#f3f4f6' }}>
                  <Icon className="w-5 h-5" style={{ color: active ? 'white' : '#9ca3af' }} />
                </div>
                <p className="text-xs font-black" style={{ color: active ? p.textColor : '#9ca3af' }}>
                  {p.label}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main form card */}
      <div className="rounded-2xl p-6 mb-5" style={{ background: 'white', border: '1.5px solid #f0f0f0' }}>

        {/* Followers + Posts */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-2">
              Followeri *
            </label>
            <input className="er-input" placeholder="Ex: 50K sau 500000"
              value={followers} onChange={e => { setFollowers(e.target.value); setResult(null) }} />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-2">
              Posturi analizate
            </label>
            <input className="er-input" placeholder="10"
              value={posts} onChange={e => { setPosts(e.target.value); setResult(null) }} />
          </div>
        </div>

        {/* Engagement fields */}
        <div>
          <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-3">
            Total interacțiuni (suma ultimelor {posts || 10} posturi)
          </label>
          <div className="grid grid-cols-2 gap-3">
            {plat.fields.map(k => (
              <div key={k}>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  {FIELD_LABELS[k]}
                </label>
                <input className="er-input" placeholder="Ex: 15K"
                  value={fields[k]}
                  onChange={e => { setField(k, e.target.value); setResult(null) }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Formula hint */}
      <div className="flex items-center gap-2 mb-5 px-1">
        <Info className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
        <p className="text-xs text-gray-400">
          Formula: (likes + comentarii + share-uri + saves) ÷ {posts || 10} posturi ÷ followeri × 100
        </p>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 mb-6">
        <button onClick={reset}
          className="flex items-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm text-gray-500 bg-white border-2 border-gray-200 hover:border-gray-300 transition flex-shrink-0">
          <RefreshCw className="w-4 h-4" /> Reset
        </button>
        <button className="calc-btn" disabled={!canCalc} onClick={calculate}
          style={{ background: canCalc ? 'linear-gradient(135deg,#8b5cf6,#06b6d4)' : '#e5e7eb' }}>
          <span className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" /> Calculează Engagement Rate
          </span>
        </button>
      </div>

      {/* Result */}
      {result !== null && rating && (
        <div className="pop-in rounded-2xl p-6 mb-6" style={{ background: rating.bg, border: `2px solid ${rating.bar}30` }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: rating.color, opacity: .7 }}>
                Engagement Rate
              </p>
              <p className="text-6xl font-black leading-none" style={{ color: rating.color }}>
                {result}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black" style={{ color: rating.color }}>{rating.label}</p>
              <p className="text-sm mt-1" style={{ color: rating.color, opacity: .7 }}>pe {plat.label}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2.5 rounded-full mb-4" style={{ background: `${rating.bar}20` }}>
            <div className="h-full rounded-full bar-anim"
              style={{ '--target-w': `${Math.min(rating.pct, 100)}%`, background: rating.bar, width: `${Math.min(rating.pct, 100)}%` }} />
          </div>

          {/* Benchmark pills */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Mediu industrie', value: plat.benchmarks.avg, ok: result >= plat.benchmarks.avg },
              { label: 'Bun', value: plat.benchmarks.good, ok: result >= plat.benchmarks.good },
              { label: 'Excelent', value: plat.benchmarks.excellent, ok: result >= plat.benchmarks.excellent },
            ].map(b => (
              <div key={b.label} className="rounded-xl p-3 text-center"
                style={{ background: b.ok ? `${rating.bar}15` : 'white', border: `1.5px solid ${b.ok ? rating.bar : '#f0f0f0'}` }}>
                <p className="text-lg font-black" style={{ color: b.ok ? rating.color : '#9ca3af' }}>
                  {b.value}%
                </p>
                <p className="text-[11px] font-semibold mt-0.5" style={{ color: b.ok ? rating.color : '#9ca3af', opacity: b.ok ? .8 : 1 }}>
                  {b.label}
                </p>
              </div>
            ))}
          </div>

          <p className="text-xs text-center mt-4 font-semibold" style={{ color: rating.color, opacity: .7 }}>
            Mergi la Profile → editează platforma pentru a salva acest ER pe profilul tău public
          </p>
        </div>
      )}

      {/* Benchmarks table */}
      <div className="rounded-2xl p-5" style={{ background: 'white', border: '1.5px solid #f0f0f0' }}>
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
          Benchmark-uri {plat.label} 2025
        </p>
        <div className="space-y-2.5">
          {[
            { label: 'Excelent — top creator', range: `≥ ${plat.benchmarks.excellent}%`, color: '#15803d', bg: '#f0fdf4', bar: '#22c55e' },
            { label: 'Bun — peste medie', range: `${plat.benchmarks.good}–${plat.benchmarks.excellent}%`, color: '#b45309', bg: '#fffbeb', bar: '#f59e0b' },
            { label: 'Mediu — industrie', range: `${plat.benchmarks.avg}–${plat.benchmarks.good}%`, color: '#c2410c', bg: '#fff7ed', bar: '#f97316' },
            { label: 'Scăzut', range: `< ${plat.benchmarks.avg}%`, color: '#b91c1c', bg: '#fef2f2', bar: '#ef4444' },
          ].map(b => (
            <div key={b.label} className="flex items-center justify-between px-4 py-2.5 rounded-xl"
              style={{ background: b.bg }}>
              <span className="text-sm font-semibold" style={{ color: b.color }}>{b.label}</span>
              <span className="text-sm font-black" style={{ color: b.color }}>{b.range}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
