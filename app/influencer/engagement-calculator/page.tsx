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
    light: '#faf5ff', textColor: '#9d174d',
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
    if (er >= plat.benchmarks.excellent) return { label: 'Excelent', color: '#14532d', bg: '#e9f8f1', bar: '#22a06b', pct: 100 }
    if (er >= plat.benchmarks.good) return { label: 'Bun', color: '#854d0e', bg: '#fff7da', bar: '#d4a017', pct: 66 }
    if (er >= plat.benchmarks.avg) return { label: 'Mediu', color: '#5b2fd0', bg: '#f4f0ff', bar: '#7040f0', pct: 40 }
    return { label: 'Scăzut', color: '#b42318', bg: '#fdeeec', bar: '#e5483b', pct: 15 }
  }

  const rating = result !== null ? getRating(result) : null
  const canCalc = followers && plat.fields.some(k => fields[k])

  return (
    <div className="iu" style={{ maxWidth: 760 }}>
      <style>{`
        .ic-plats { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; }
        .ic-plat { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px 6px; min-height: 44px; border-radius: 14px; border: 1.5px solid #e5e3f3; background: #fff; cursor: pointer; font-family: inherit; font-size: 12.5px; font-weight: 700; color: #6a6690; transition: border-color .15s, background .15s; }
        .ic-plat:hover { border-color: #cdb8ff; }
        .ic-plat.on { border-color: #7040f0; background: #f7f4ff; color: #14123a; }
        .ic-plat .ic-pi { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: #f0eff7; color: #8783a8; }
        .ic-grid2 { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 14px; }
        .ic-f { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .ic-f .iu-input { width: 100%; height: 46px; font-weight: 600; }
        .ic-f .iu-input::placeholder { color: #a9a6c4; font-weight: 400; }
        .ic-num { font-family: var(--font-display, system-ui), system-ui, sans-serif; font-weight: 800; font-size: 72px; line-height: 1; letter-spacing: -0.04em; }
        .bar-anim { animation: barGrow .6s cubic-bezier(.34,1.56,.64,1) .1s both; }
        @keyframes barGrow { from{width:0} to{width:var(--target-w)} }
        .ic-res { animation: icPop .3s cubic-bezier(.34,1.56,.64,1) both; }
        @keyframes icPop { from { opacity: 0; transform: scale(.96) translateY(8px); } to { opacity: 1; transform: none; } }
        .ic-bm { border-radius: 14px; padding: 12px 8px; text-align: center; border: 1.5px solid #e5e3f3; background: #fff; }
        .ic-tier { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 14px; border-radius: 12px; }
        @media (max-width: 560px) {
          .ic-plats { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .ic-num { font-size: 56px; }
          .ic-actions { flex-direction: column-reverse; }
          .ic-actions .iu-btn { width: 100%; height: 48px; }
        }
      `}</style>

      {/* Header */}
      <div className="iu-head">
        <div>
          <div className="iu-label" style={{ marginBottom: 6 }}>Instrumente</div>
          <h1>Calculator Engagement Rate</h1>
          <p className="iu-muted iu-sm" style={{ margin: '6px 0 0' }}>Calculează ER-ul exact ca platformele profesionale</p>
        </div>
      </div>

      {/* Calculator */}
      <div className="iu-card iu-card-pad iu-col" style={{ gap: 20 }}>
        <div>
          <div className="iu-label" style={{ marginBottom: 10 }}>Alege platforma</div>
          <div className="ic-plats">
            {PLATFORMS.map(p => {
              const Icon = p.icon
              const active = platform === p.id
              return (
                <button key={p.id} className={`ic-plat${active ? ' on' : ''}`}
                  onClick={() => { setPlatform(p.id); setResult(null) }}>
                  <span className="ic-pi" style={active ? { background: p.grad, color: '#fff' } : undefined}>
                    <Icon className="w-5 h-5" />
                  </span>
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="ic-grid2">
          <div className="ic-f">
            <label className="iu-label">Followeri *</label>
            <input className="iu-input" placeholder="Ex: 50K sau 500000"
              value={followers} onChange={e => { setFollowers(e.target.value); setResult(null) }} />
          </div>
          <div className="ic-f">
            <label className="iu-label">Posturi analizate</label>
            <input className="iu-input" placeholder="10"
              value={posts} onChange={e => { setPosts(e.target.value); setResult(null) }} />
          </div>
        </div>

        <div>
          <div className="iu-label" style={{ marginBottom: 10 }}>Total interacțiuni (suma ultimelor {posts || 10} posturi)</div>
          <div className="ic-grid2">
            {plat.fields.map(k => (
              <div key={k} className="ic-f">
                <label className="iu-sm iu-muted" style={{ fontWeight: 600 }}>{FIELD_LABELS[k]}</label>
                <input className="iu-input" placeholder="Ex: 15K"
                  value={fields[k]}
                  onChange={e => { setField(k, e.target.value); setResult(null) }} />
              </div>
            ))}
          </div>
        </div>

        <div className="iu-row iu-xs iu-muted" style={{ gap: 8, alignItems: 'flex-start' }}>
          <Info className="w-3.5 h-3.5" style={{ flex: 'none', marginTop: 2 }} />
          <span>Formula: (likes + comentarii + share-uri + saves) ÷ {posts || 10} posturi ÷ followeri × 100</span>
        </div>

        <div className="iu-row ic-actions" style={{ gap: 12 }}>
          <button onClick={reset} className="iu-btn big"><RefreshCw className="w-4 h-4" /> Resetează</button>
          <button className="iu-btn p big" style={{ flex: 1 }} disabled={!canCalc} onClick={calculate}>
            <Sparkles className="w-4 h-4" /> Calculează Engagement Rate
          </button>
        </div>
      </div>

      {/* Result */}
      {result !== null && rating && (
        <div className="ic-res iu-card iu-card-pad iu-col" style={{ gap: 18, background: rating.bg, borderColor: `${rating.bar}40` }}>
          <div className="iu-row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="iu-label" style={{ color: rating.color, opacity: .75, marginBottom: 6 }}>Engagement Rate</div>
              <div className="ic-num" style={{ color: rating.color }}>{result}%</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="iu-chip" style={{ background: '#fff', color: rating.color, height: 30, padding: '0 14px', fontSize: 14 }}>{rating.label}</span>
              <p className="iu-sm" style={{ margin: '6px 0 0', color: rating.color, opacity: .75 }}>pe {plat.label}</p>
            </div>
          </div>

          <div className="iu-bar" style={{ height: 10, background: `${rating.bar}25` }}>
            <i className="bar-anim" style={{ '--target-w': `${Math.min(rating.pct, 100)}%`, background: rating.bar, width: `${Math.min(rating.pct, 100)}%` } as React.CSSProperties} />
          </div>

          <div className="ic-grid2" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10 }}>
            {[
              { label: 'Mediu industrie', value: plat.benchmarks.avg, ok: result >= plat.benchmarks.avg },
              { label: 'Bun', value: plat.benchmarks.good, ok: result >= plat.benchmarks.good },
              { label: 'Excelent', value: plat.benchmarks.excellent, ok: result >= plat.benchmarks.excellent },
            ].map(b => (
              <div key={b.label} className="ic-bm" style={b.ok ? { borderColor: rating.bar } : undefined}>
                <div className="iu-d" style={{ fontSize: 20, fontWeight: 800, color: b.ok ? rating.color : '#8783a8' }}>{b.value}%</div>
                <div className="iu-xs" style={{ fontWeight: 600, color: b.ok ? rating.color : '#8783a8' }}>{b.label}</div>
              </div>
            ))}
          </div>

          <p className="iu-xs" style={{ margin: 0, textAlign: 'center', fontWeight: 600, color: rating.color, opacity: .8 }}>
            Mergi la Profil → editează platforma pentru a salva acest ER pe profilul tău public
          </p>
        </div>
      )}

      {/* Benchmarks */}
      <div className="iu-card iu-card-pad">
        <div className="iu-label" style={{ marginBottom: 14 }}>Benchmark-uri {plat.label} 2025</div>
        <div className="iu-col" style={{ gap: 8 }}>
          {[
            { label: 'Excelent — top creator', range: `≥ ${plat.benchmarks.excellent}%`, color: '#14532d', bg: '#dcf5ec' },
            { label: 'Bun — peste medie', range: `${plat.benchmarks.good}–${plat.benchmarks.excellent}%`, color: '#854d0e', bg: '#fff1c2' },
            { label: 'Mediu — industrie', range: `${plat.benchmarks.avg}–${plat.benchmarks.good}%`, color: '#5b2fd0', bg: '#efeaff' },
            { label: 'Scăzut', range: `< ${plat.benchmarks.avg}%`, color: '#b42318', bg: '#fde8e6' },
          ].map(b => (
            <div key={b.label} className="ic-tier" style={{ background: b.bg, color: b.color }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{b.label}</span>
              <span className="iu-d" style={{ fontSize: 14, fontWeight: 800 }}>{b.range}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
