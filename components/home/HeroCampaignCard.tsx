'use client'

// Cardul „Exemplu de campanie” din hero — povestea unei campanii în ~24s, în buclă:
// 1. Aplicări (contor 0→30, poze care apar)  2. Selecție (creatori aleși, ștampilă)
// 3. Postări (bara se umple, notificări „a postat · aprobat”).
// Totul stă în interiorul cardului (fără elemente care ies din ecran pe telefon).
// Se oprește când cardul nu e vizibil; cu „reduce motion” arată direct starea finală.

import React, { useEffect, useRef, useState } from 'react'
import { Bell, Check, Send, UserPlus, Users } from 'lucide-react'

const LOOP = 24000
const FINAL = 20000 // momentul afișat static (reduce motion / înainte de pornire)

const APPLICANTS = [
  ['AV', '#e0f2fe', '#0c4a6e'], ['MC', '#fde0ea', '#9d174d'], ['DP', '#dcf5ec', '#14532d'],
  ['ER', '#fff1c2', '#854d0e'], ['LS', '#ebe4ff', '#4c1d95'], ['TB', '#ffe0cc', '#9a3d06'],
]
const CREATORS = [
  { ini: 'IM', name: 'Ioana M.', meta: 'Fashion · TikTok · 18k', bg: '#ffe0cc', fg: '#9a3d06', tag: 'Selectată' },
  { ini: 'RA', name: 'Radu A.', meta: 'Fitness · Instagram · 9k', bg: '#d6eefe', fg: '#075985', tag: 'Selectat' },
]
const POSTS = [
  ['Ioana M.', 'TikTok'], ['Radu A.', 'Instagram'], ['Ana P.', 'TikTok'],
  ['Bianca G.', 'Instagram'], ['Vlad T.', 'TikTok'], ['Cristina F.', 'Instagram'],
]
const APPLY_NAMES = ['Andra V.', 'Mihai C.', 'Diana P.', 'Elena R.', 'Luca S.', 'Teo B.']

const clamp = (x: number) => Math.max(0, Math.min(1, x))
const ease = (x: number) => 1 - Math.pow(1 - x, 3)

export default function HeroCampaignCard() {
  const [t, setT] = useState(FINAL)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    let start = performance.now()
    let raf = 0
    let last = 0
    let visible = true
    let pausedAt: number | null = null

    const loop = (now: number) => {
      // ~20 cadre/s ajung pentru contoare; tranzițiile CSS fac restul fluid
      if (now - last > 90) { setT((now - start) % LOOP); last = now }
      raf = requestAnimationFrame(loop)
    }
    const play = () => {
      if (raf) return
      if (pausedAt !== null) { start += performance.now() - pausedAt; pausedAt = null }
      raf = requestAnimationFrame(loop)
    }
    const pause = () => {
      if (!raf) return
      cancelAnimationFrame(raf); raf = 0; pausedAt = performance.now()
    }
    const sync = () => (visible && !document.hidden ? play() : pause())

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync() }, { threshold: 0.15 })
    if (ref.current) io.observe(ref.current)
    document.addEventListener('visibilitychange', sync)
    setT(0)
    play()
    return () => { cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener('visibilitychange', sync) }
  }, [])

  // ── Stare derivată din timp ──
  const phase = t < 5500 ? 0 : t < 11000 ? 1 : 2
  const applicants = Math.round(ease(clamp((t - 400) / 4400)) * 30)
  const avatarsShown = Math.min(APPLICANTS.length, Math.ceil(applicants / 5))
  const selected = t < 5500 ? 0 : Math.round(ease(clamp((t - 5800) / 4000)) * 10)
  const rowsShown = t < 6200 ? 0 : t < 7800 ? 1 : 2
  const posted = t < 11500 ? 0 : Math.min(6, Math.floor((t - 11500) / 1500) + 1)
  const fading = t > 23000

  let event: { key: string; icon: React.ReactNode; text: React.ReactNode } | null = null
  if (phase === 0 && applicants > 0) {
    const i = Math.min(APPLY_NAMES.length - 1, Math.floor((t - 400) / 1200))
    event = { key: `a${i}`, icon: <UserPlus size={15} />, text: <><b>{APPLY_NAMES[i]}</b> a aplicat la campanie</> }
  } else if (phase === 1 && rowsShown > 0) {
    const c = CREATORS[rowsShown - 1]
    event = { key: `s${rowsShown}`, icon: <Check size={15} strokeWidth={3} />, text: <>{rowsShown === 1 ? 'Ai selectat-o' : 'L-ai selectat'} pe <b>{c.name}</b></> }
  } else if (phase === 2 && posted > 0) {
    const [n, pl] = POSTS[posted - 1]
    event = { key: `p${posted}`, icon: <Send size={14} />, text: <><b>{n}</b> a postat pe {pl} · <span className="hc-ok">aprobat</span></> }
  }

  const steps = [
    { label: 'Aplicări', icon: <Users size={13} /> },
    { label: 'Selecție', icon: <Check size={13} strokeWidth={3} /> },
    { label: 'Postări', icon: <Send size={12} /> },
  ]

  return (
    <div ref={ref} className={`hc-wrap ${fading ? 'hc-fading' : ''}`} aria-hidden="true">
      <style>{HC_CSS}</style>
      <div className="hc-card">
        {/* Antet */}
        <div className="hc-head">
          <div>
            <span className="hc-eyebrow">Exemplu de campanie</span>
            <span className="hc-title">Lansare colecție de toamnă</span>
          </div>
          <span className="hc-live"><span className="hc-live-dot" />Activă</span>
        </div>

        {/* Etape */}
        <div className="hc-steps">
          <span className="hc-steps-ind" style={{ transform: `translateX(${phase * 100}%)` }} />
          {steps.map((s, i) => (
            <span key={s.label} className={`hc-step ${i === phase ? 'on' : ''} ${i < phase ? 'done' : ''}`}>
              {s.icon}{s.label}
            </span>
          ))}
        </div>

        {/* Cifre */}
        <div className="hc-grid">
          <div><b>10</b><span>locuri</span></div>
          <div className={phase === 0 ? 'hc-hot' : ''}><b>{applicants}</b><span>aplicări</span></div>
          <div className={phase === 1 ? 'hc-hot' : ''}><b>{selected}</b><span>selectați</span></div>
        </div>

        {/* Aplicanți */}
        <div className="hc-applicants">
          <div className="hc-stack">
            {APPLICANTS.slice(0, avatarsShown).map(([ini, bg, fg], i) => (
              <span key={ini} className="hc-mini" style={{ background: bg, color: fg, zIndex: 10 - i }}>{ini}</span>
            ))}
            {applicants > 6 && <span className="hc-mini hc-more">+{applicants - avatarsShown}</span>}
          </div>
          <span className="hc-applicants-label">{applicants === 0 ? 'Se așteaptă aplicări…' : `${applicants} creatori au aplicat`}</span>
        </div>

        {/* Creatori selectați */}
        <div className="hc-rows">
          {CREATORS.map((c, i) => (
            <div key={c.ini} className={`hc-person ${i < rowsShown ? 'in' : ''}`}>
              <span className="hc-av"><span className="hc-av-ring" /><span className="hc-av-img" style={{ background: c.bg, color: c.fg }}>{c.ini}</span></span>
              <span className="hc-person-text"><b>{c.name}</b><span>{c.meta}</span></span>
              <span className="hc-stamp">{c.tag}</span>
            </div>
          ))}
        </div>

        {/* Progres postări */}
        <div className="hc-progress">
          <div className="hc-progress-row"><span>Postări aprobate</span><b>{posted} din 10</b></div>
          <div className="hc-bar"><div className="hc-bar-fill" style={{ width: `${posted * 10}%` }} /></div>
        </div>

        {/* Notificare curentă — înălțime fixă, fără salturi de layout */}
        <div className="hc-event-slot">
          {event && (
            <div key={event.key} className="hc-event">
              <span className="hc-event-icon">{event.icon}</span>
              <span className="hc-event-text">{event.text}</span>
              <span className="hc-event-time">acum</span>
            </div>
          )}
        </div>
      </div>

      {/* Bulă decorativă — doar pe ecrane mari */}
      <div className={`hc-float ${phase === 2 && posted > 0 ? 'in' : ''}`}>
        <Bell size={14} /> {posted} postări noi
      </div>
    </div>
  )
}

const HC_CSS = `
.hc-wrap{position:relative;flex:1 1 380px;min-width:0;transition:opacity .9s ease}
.hc-wrap.hc-fading{opacity:.35}
.hc-card{position:relative;background:#fff;border:1px solid #e5e3f3;border-radius:22px;padding:clamp(18px,3vw,26px);
  box-shadow:0 30px 60px -30px rgba(80,50,200,.38);display:flex;flex-direction:column;gap:16px;overflow:hidden}
.hc-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
.hc-head>div{display:flex;flex-direction:column;gap:4px;min-width:0}
.hc-eyebrow{font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#8783a8}
.hc-title{font-family:var(--font-display,system-ui),system-ui,sans-serif;font-weight:700;font-size:clamp(18px,2vw,21px);letter-spacing:-.01em;color:#14123a}
.hc-live{display:inline-flex;align-items:center;gap:6px;background:#e3f6fd;color:#075f7d;font-size:12px;font-weight:700;padding:5px 10px;border-radius:999px;white-space:nowrap}
.hc-live-dot{width:7px;height:7px;border-radius:50%;background:#22c8f0;animation:hc-pulse 2.8s ease-out infinite}

.hc-steps{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));background:#f4f3fb;border-radius:12px;padding:4px}
.hc-steps-ind{position:absolute;top:4px;bottom:4px;left:4px;width:calc((100% - 8px)/3);border-radius:9px;background:#fff;box-shadow:0 4px 12px -6px rgba(80,50,200,.45);transition:transform .9s cubic-bezier(.4,0,.2,1)}
.hc-step{position:relative;display:flex;align-items:center;justify-content:center;gap:5px;padding:8px 4px;font-size:12px;font-weight:700;color:#8783a8;transition:color .6s ease;white-space:nowrap}
.hc-step.on{color:#4423c4}
.hc-step.done{color:#3090f0}

.hc-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.hc-grid div{background:#f6f6fc;border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;transition:background .7s ease,box-shadow .7s ease}
.hc-grid div.hc-hot{background:#f0ebff;box-shadow:inset 0 0 0 1.5px rgba(112,64,240,.35)}
.hc-grid b{font-family:var(--font-display,system-ui),system-ui,sans-serif;font-size:26px;font-weight:800;line-height:1.1;font-variant-numeric:tabular-nums;color:#14123a}
.hc-grid span{font-size:12px;color:#6a6690;font-weight:600}

.hc-applicants{display:flex;align-items:center;gap:12px;min-height:34px}
.hc-stack{display:flex}
.hc-mini{width:30px;height:30px;border-radius:50%;border:2px solid #fff;margin-left:-8px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;animation:hc-pop .7s cubic-bezier(.25,.8,.25,1) both}
.hc-mini:first-child{margin-left:0}
.hc-more{background:#14123a;color:#fff;font-size:10px;width:auto;min-width:30px;padding:0 6px;border-radius:999px;animation:none}
.hc-applicants-label{font-size:13px;font-weight:600;color:#4a4770;font-variant-numeric:tabular-nums}

.hc-rows{display:flex;flex-direction:column;gap:8px}
.hc-person{display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid #eeecf7;border-radius:14px;
  opacity:.28;filter:grayscale(1);transform:scale(.98);transition:opacity .8s ease,filter .8s ease,transform .8s cubic-bezier(.25,.8,.25,1),border-color .8s ease}
.hc-person.in{opacity:1;filter:none;transform:none;border-color:#e2dcff}
.hc-av{position:relative;width:40px;height:40px;flex:none}
.hc-av-ring{position:absolute;inset:0;border-radius:50%;background:linear-gradient(135deg,#22c8f0,#3090f0,#7040f0,#9030f0)}
.hc-av-img{position:absolute;inset:2px;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800}
.hc-person.in .hc-av-ring{animation:hc-spin 1.4s cubic-bezier(.4,0,.2,1)}
.hc-person-text{flex:1;min-width:0;display:flex;flex-direction:column;font-size:14px;color:#14123a}
.hc-person-text span{font-size:12px;color:#6a6690;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hc-stamp{font-size:12px;font-weight:800;color:#4423c4;background:#efeaff;padding:4px 10px;border-radius:999px;white-space:nowrap;opacity:0;transform:scale(1.25)}
.hc-person.in .hc-stamp{animation:hc-stamp .7s .4s cubic-bezier(.25,.8,.25,1) both}

.hc-progress{display:flex;flex-direction:column;gap:8px;border-top:1px solid #eeecf7;padding-top:14px}
.hc-progress-row{display:flex;justify-content:space-between;font-size:14px;font-weight:600;color:#4a4770}
.hc-progress-row b{color:#14123a;font-variant-numeric:tabular-nums}
.hc-bar{height:10px;border-radius:999px;background:#eeecf7;overflow:hidden}
.hc-bar-fill{position:relative;height:100%;border-radius:999px;background:linear-gradient(90deg,#22c8f0,#3090f0,#7040f0,#9030f0);transition:width 1.2s cubic-bezier(.4,0,.2,1);overflow:hidden}
.hc-bar-fill:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.6),transparent);transform:translateX(-100%);animation:hc-shine 3.2s ease-in-out infinite}

.hc-event-slot{height:48px;position:relative}
.hc-event{position:absolute;inset:0;display:flex;align-items:center;gap:10px;padding:0 12px;border-radius:12px;background:#14123a;color:#fff;font-size:13px;animation:hc-toast .8s cubic-bezier(.25,.8,.25,1) both}
.hc-event-icon{width:26px;height:26px;border-radius:8px;flex:none;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#22c8f0,#7040f0)}
.hc-event-text{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hc-event-time{font-size:11px;color:#b9b5dc;flex:none}
.hc-ok{color:#6ee7b7;font-weight:700}

.hc-float{display:none}
@media(min-width:1100px){
  .hc-float{display:inline-flex;position:absolute;right:-22px;top:-18px;align-items:center;gap:8px;background:#fff;border:1px solid #e5e3f3;border-radius:999px;padding:8px 14px;font-size:13px;font-weight:700;color:#14123a;
    box-shadow:0 14px 30px -14px rgba(80,50,200,.5);opacity:0;transform:translateY(8px) scale(.9);transition:opacity .8s ease,transform .9s cubic-bezier(.25,.8,.25,1)}
  .hc-float svg{color:#7040f0}
  .hc-float.in{opacity:1;transform:none;animation:hc-bob 5s ease-in-out 1s infinite}
}
@media(max-width:420px){
  .hc-event-slot{height:56px}
  .hc-event-text{white-space:normal;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
  .hc-event-time{display:none}
  .hc-grid b{font-size:22px}
  .hc-grid div{padding:10px 12px}
  .hc-step{font-size:11px;gap:4px}
  .hc-step svg{display:none}
}

@keyframes hc-pulse{0%{box-shadow:0 0 0 0 rgba(34,200,240,.6)}70%{box-shadow:0 0 0 9px rgba(34,200,240,0)}100%{box-shadow:0 0 0 0 rgba(34,200,240,0)}}
@keyframes hc-pop{from{opacity:0;transform:scale(.7) translateY(4px)}to{opacity:1;transform:none}}
@keyframes hc-spin{from{transform:rotate(-120deg)}to{transform:rotate(0)}}
@keyframes hc-stamp{from{opacity:0;transform:scale(1.25)}to{opacity:1;transform:scale(1)}}
@keyframes hc-toast{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes hc-shine{0%{transform:translateX(-100%)}60%,100%{transform:translateX(100%)}}
@keyframes hc-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@media(prefers-reduced-motion:reduce){.hc-wrap *{animation:none!important;transition:none!important}.hc-person.in .hc-stamp{opacity:1;transform:none}}
`
