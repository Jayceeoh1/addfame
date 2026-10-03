'use client'

// Rama comună pentru Autentificare / Înregistrare.
// Desktop: panou pastel în stânga (cifre reale + ultimele postări), formularul în dreapta.
// Telefon: antet compact cu logo și cifre, formularul imediat dedesubt.
// Culorile vin din logo: cyan #22c8f0 → albastru #3090f0 → violet #7040f0 → mov #9030f0.

import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import { fontVars } from '@/lib/fonts'

type Stats = { influencers: number; brands: number; campaigns: number; completedCampaigns: number }
type Clip = { id: string; display_name: string; influencer: { avatar: string | null }; campaign: { brand_name: string; title: string }; platform: string }

export type AuthVariant = 'login' | 'choose' | 'brand' | 'influencer'

const COPY: Record<AuthVariant, { tag: string; title: string; accent: string; lead: string }> = {
  login: {
    tag: 'Bine ai revenit',
    title: 'Campaniile tale te',
    accent: 'așteaptă.',
    lead: 'Intră în cont ca să vezi aplicările noi, postările de aprobat și activitatea campaniilor.',
  },
  choose: {
    tag: 'Alătură-te AddFame',
    title: 'Branduri și creatori,',
    accent: 'în același loc.',
    lead: 'Brandurile lansează campanii, creatorii aplică și postează din conturile lor. Contul e gratuit.',
  },
  brand: {
    tag: 'Pentru branduri',
    title: 'Oameni reali care îți',
    accent: 'recomandă produsul.',
    lead: 'Lansezi o campanie în câteva minute, alegi creatorii din aplicări și aprobi fiecare postare.',
  },
  influencer: {
    tag: 'Pentru creatori',
    title: 'Câștigă din',
    accent: 'audiența ta.',
    lead: 'Aplici la campanii din nișa ta, primești produse sau bani și postezi din contul tău, cu libertate creativă.',
  },
}

const TINTS = [['#ffe0cc', '#9a3d06'], ['#d6eefe', '#075985'], ['#ebe4ff', '#4c1d95'], ['#dcf5ec', '#14532d']]
const ini = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'AF'
const fmt = (n: unknown) => (Number(n) || 0).toLocaleString('ro-RO')

export function AuthLogo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`au-logo ${className}`} aria-label="AddFame — pagina principală">
      <span className="au-logo-mark"><img src="/logo.png" alt="" /></span>
      <span className="au-logo-text">Add<span className="au-grad-text">Fame</span></span>
    </Link>
  )
}

export default function AuthShell({ variant, children }: { variant: AuthVariant; children: React.ReactNode }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [clips, setClips] = useState<Clip[]>([])

  useEffect(() => {
    // Cifrele sunt decorative: orice eroare aici nu trebuie să afecteze formularul
    fetch('/api/public/stats').then(r => r.ok ? r.json() : null).then(d => { if (d && typeof d.influencers === 'number') setStats(d) }).catch(() => {})
    fetch('/api/public/clips').then(r => r.ok ? r.json() : null).then(d => setClips((Array.isArray(d?.clips) ? d.clips : []).filter((c: any) => c && c.id && c.display_name).slice(0, 3))).catch(() => {})
  }, [])

  const c = COPY[variant]
  const accent = variant === 'brand' ? 'au-brand' : variant === 'influencer' ? 'au-infl' : ''

  return (
    <div className={`au-page ${accent} ${fontVars}`}>
      <style>{AUTH_CSS}</style>

      {/* Panou stânga — doar desktop */}
      <aside className="au-side" aria-hidden="true">
        <div className="au-side-wash" />
        <AuthLogo />
        <div className="au-side-body">
          <span className="au-tag">{c.tag}</span>
          <h2 className="au-side-title">{c.title} <span className="au-grad-text">{c.accent}</span></h2>
          <p className="au-side-lead">{c.lead}</p>

          {stats && (
            <div className="au-stats">
              <div><b>{fmt(stats.influencers)}</b><span>influenceri</span></div>
              <div><b>{fmt(stats.brands)}</b><span>branduri</span></div>
              <div><b>{fmt(stats.campaigns)}</b><span>campanii active</span></div>
            </div>
          )}

          {clips.length > 0 && (
            <div className="au-feed">
              <span className="au-feed-label"><span className="au-dot" />Postări recente pe AddFame</span>
              {clips.map((cl, i) => {
                const [bg, fg] = TINTS[i % TINTS.length]
                return (
                  <div key={cl.id} className="au-feed-row" style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
                    <span className="au-av">
                      <span className="au-av-ring" />
                      {cl.influencer?.avatar
                        ? <img src={cl.influencer.avatar} alt="" className="au-av-img" />
                        : <span className="au-av-img" style={{ background: bg, color: fg }}>{ini(cl.display_name)}</span>}
                    </span>
                    <span className="au-feed-text">
                      <b>{cl.display_name}</b> a postat pe {cl.platform}
                      {cl.campaign?.brand_name ? <> pentru <b>{cl.campaign.brand_name}</b></> : null}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <p className="au-side-foot">© 2026 AddFame · ADD FAME DIGITAL S.R.L.</p>
      </aside>

      {/* Formular */}
      <main className="au-main">
        <div className="au-mobile-head">
          <AuthLogo />
          {stats && (
            <p className="au-mobile-stats">
              <span className="au-dot" />{fmt(stats.influencers)} influenceri · {fmt(stats.brands)} branduri
            </p>
          )}
        </div>
        <div className="au-form-wrap">{children}</div>
      </main>
    </div>
  )
}

export const AUTH_CSS = `
.au-page{--ink:#14123a;--muted:#4a4770;--soft:#6a6690;--faint:#8783a8;--line:#dcd9ee;--bg:#f6f6fc;
  --ac:#5a35e6;--ac-soft:rgba(90,53,230,.12);--btn:linear-gradient(135deg,#2f6fe0 0%,#5a35e6 55%,#7a22d0 100%);
  min-height:100vh;min-height:100dvh;display:flex;background:#fff;color:var(--ink);
  font-family:var(--font-body),system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.5}
.au-page.au-brand{--ac:#2f6fe0;--ac-soft:rgba(47,111,224,.12);--btn:linear-gradient(135deg,#2a8ae6 0%,#2f6fe0 45%,#5a35e6 100%)}
.au-page.au-infl{--ac:#6d3ae8;--ac-soft:rgba(109,58,232,.12);--btn:linear-gradient(135deg,#5a35e6 0%,#7040f0 50%,#8a26d6 100%)}
.au-page *{box-sizing:border-box}
.au-page h1,.au-page h2,.au-logo-text,.au-stats b{font-family:var(--font-display),var(--font-body),system-ui,sans-serif}
.au-grad-text{background:linear-gradient(100deg,#22c8f0 0%,#3090f0 38%,#7040f0 72%,#9030f0 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}

/* Logo */
.au-logo{display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);position:relative;z-index:1}
.au-logo-mark{width:38px;height:38px;border-radius:11px;background:#fff;border:1px solid #ede9fe;box-shadow:0 2px 10px rgba(112,64,240,.16);display:flex;align-items:center;justify-content:center}
.au-logo-mark img{width:78%;height:78%;object-fit:contain}
.au-logo-text{font-weight:800;font-size:21px;letter-spacing:-.02em}

/* Panou stânga */
.au-side{display:none;position:relative;overflow:hidden;flex:0 0 46%;max-width:640px;padding:44px 52px;flex-direction:column;justify-content:space-between;gap:32px;
  background:linear-gradient(150deg,#eaf8fe 0%,#eef1ff 45%,#f3ecff 100%)}
.au-side-wash{position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(420px 320px at 85% 12%,rgba(34,200,240,.22),transparent 70%),radial-gradient(460px 360px at 10% 90%,rgba(144,48,240,.16),transparent 70%),radial-gradient(380px 300px at 60% 55%,rgba(48,144,240,.12),transparent 70%)}
.au-side-body{position:relative;display:flex;flex-direction:column;gap:20px;max-width:440px}
.au-tag{align-self:flex-start;font-size:12px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#4423c4;background:rgba(255,255,255,.7);border:1px solid rgba(112,64,240,.18);padding:6px 12px;border-radius:999px}
.au-side-title{margin:0;font-size:clamp(34px,3.2vw,46px);font-weight:800;line-height:1.02;letter-spacing:-.03em;text-wrap:balance}
.au-side-lead{margin:0;color:var(--muted);font-size:16px;max-width:30em}
.au-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:6px}
.au-stats div{background:rgba(255,255,255,.75);border:1px solid rgba(255,255,255,.9);border-radius:14px;padding:14px;display:flex;flex-direction:column;box-shadow:0 8px 24px -16px rgba(80,50,200,.35)}
.au-stats b{font-size:26px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1.1}
.au-stats span{font-size:12px;color:var(--soft);font-weight:600}
.au-feed{display:flex;flex-direction:column;gap:8px}
.au-feed-label{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#1b7fae;margin-bottom:2px}
.au-feed-row{display:flex;align-items:center;gap:12px;background:rgba(255,255,255,.82);border:1px solid rgba(255,255,255,.95);border-radius:14px;padding:10px 12px;font-size:14px;line-height:1.35;box-shadow:0 8px 24px -18px rgba(80,50,200,.4);animation:au-in .6s cubic-bezier(.2,.9,.3,1.15) both}
.au-feed-text{min-width:0}
.au-av{position:relative;width:38px;height:38px;flex:none}
.au-av-ring{position:absolute;inset:0;border-radius:50%;background:linear-gradient(135deg,#22c8f0,#3090f0,#7040f0,#9030f0)}
.au-av-img{position:absolute;inset:2px;width:calc(100% - 4px);height:calc(100% - 4px);border-radius:50%;border:2px solid #fff;object-fit:cover;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800}
.au-dot{width:8px;height:8px;border-radius:50%;background:#22c8f0;flex:none;animation:au-pulse 2s infinite}
.au-side-foot{position:relative;margin:0;font-size:12px;color:var(--faint)}

/* Formular */
.au-main{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;
  background:linear-gradient(180deg,#eef4ff 0px,#f5f0ff 180px,#ffffff 360px)}
.au-mobile-head{width:100%;display:flex;flex-direction:column;align-items:center;gap:10px;padding:28px 20px 8px}
.au-mobile-stats{margin:0;display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--muted);background:rgba(255,255,255,.8);border:1px solid #e5e3f3;border-radius:999px;padding:6px 12px;font-variant-numeric:tabular-nums}
.au-form-wrap{width:100%;max-width:480px;padding:20px 20px 40px}

@media(min-width:1024px){
  .au-side{display:flex}
  .au-main{justify-content:center;background:#fff}
  .au-mobile-head{display:none}
  .au-form-wrap{padding:56px 40px}
}

/* Elemente de formular (folosite de login și register) */
.au-h1{margin:0 0 6px;font-size:clamp(28px,7vw,34px);font-weight:800;letter-spacing:-.03em;line-height:1.08}
.au-sub{margin:0 0 26px;color:var(--muted);font-size:15px}
.au-link{color:var(--ac);font-weight:700;text-decoration:none}
.au-link:hover{text-decoration:underline}
.au-label{display:block;font-size:14px;font-weight:700;color:var(--ink);margin-bottom:8px}
.au-label-row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px}
.au-label-row .au-label{margin:0}
.au-hint{font-size:13px;color:var(--soft);margin:6px 0 0}
.au-field{display:flex;flex-direction:column}
.au-stack{display:flex;flex-direction:column;gap:18px}
.au-input{width:100%;min-height:50px;padding:12px 16px;border:1.5px solid var(--line);border-radius:12px;font-size:16px;font-weight:500;font-family:inherit;color:var(--ink);background:#fff;outline:none;transition:border-color .15s,box-shadow .15s;-webkit-appearance:none;appearance:none}
.au-input::placeholder{color:#a3a0bf;font-weight:400}
.au-input:focus{border-color:var(--ac);box-shadow:0 0 0 4px var(--ac-soft)}
.au-input:disabled{background:#f6f6fc;color:#a3a0bf}
textarea.au-input{min-height:96px;resize:vertical}
.au-select{padding-right:44px;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238783a8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;background-size:18px}
.au-pw{position:relative}
.au-pw .au-input{padding-right:52px}
.au-eye{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:44px;height:44px;border:0;background:transparent;border-radius:10px;color:var(--faint);display:flex;align-items:center;justify-content:center;cursor:pointer}
.au-eye:hover{color:var(--ink);background:#f3f2fa}
.au-btn{width:100%;min-height:52px;padding:14px 20px;border:0;border-radius:12px;background:var(--btn);color:#fff;font-family:inherit;font-size:16px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;box-shadow:0 10px 24px -10px rgba(90,53,230,.65);transition:transform .15s,box-shadow .15s,opacity .15s}
.au-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 14px 28px -10px rgba(90,53,230,.7)}
.au-btn:disabled{opacity:.55;cursor:not-allowed;box-shadow:none}
.au-btn-ghost{width:100%;min-height:48px;border:0;background:transparent;color:var(--soft);font-family:inherit;font-size:15px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;border-radius:12px}
.au-btn-ghost:hover{color:var(--ink);background:#f6f6fc}
.au-spin{width:18px;height:18px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:au-rot .8s linear infinite}
.au-alert{display:flex;align-items:flex-start;gap:12px;border-radius:14px;padding:14px 16px;font-size:14px;margin-bottom:20px}
.au-alert svg{flex:none;margin-top:2px}
.au-alert-err{background:#fef2f2;border:1px solid #fecaca;color:#991b1b}
.au-alert-ok{background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46}
.au-alert-warn{background:#fffbeb;border:1px solid #fde68a;color:#92400e}
.au-divider{display:flex;align-items:center;gap:14px;margin:26px 0 18px;font-size:12px;font-weight:700;color:var(--faint);letter-spacing:.08em}
.au-divider:before,.au-divider:after{content:'';flex:1;height:1px;background:#ecebf5}
.au-legal{margin:28px 0 0;font-size:12px;color:var(--faint);text-align:center;line-height:1.6}
.au-legal a{color:var(--soft);text-decoration:underline}

/* Alegere rol */
.au-roles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.au-role{position:relative;display:flex;flex-direction:column;gap:10px;text-align:left;padding:18px;border-radius:16px;border:1.5px solid var(--line);background:#fff;cursor:pointer;font-family:inherit;color:var(--ink);transition:border-color .15s,box-shadow .15s,transform .15s;text-decoration:none}
.au-role:hover{transform:translateY(-2px);border-color:var(--rc);box-shadow:0 14px 30px -18px var(--rc)}
.au-role-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;background:var(--rg)}
.au-role b{font-size:17px;font-weight:800}
.au-role p{margin:0;font-size:13px;color:var(--soft);line-height:1.45}
.au-role ul{margin:2px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:600;color:var(--muted)}
.au-role li{display:flex;align-items:center;gap:8px}
.au-role li svg{color:var(--rc);flex:none}
.au-role-go{display:inline-flex;align-items:center;gap:4px;font-size:13px;font-weight:800;color:var(--rc);margin-top:4px}
.au-role-brand{--rc:#2f6fe0;--rg:linear-gradient(135deg,#22c8f0,#2f6fe0)}
.au-role-infl{--rc:#6d3ae8;--rg:linear-gradient(135deg,#7040f0,#9030f0)}
.au-role-mini{flex-direction:row;flex-wrap:nowrap!important;align-items:center;gap:10px;padding:12px 14px;min-height:56px}
.au-role-mini b{white-space:nowrap}
.au-role-mini .au-role-icon{width:36px;height:36px;border-radius:10px}
.au-role-mini b{font-size:15px}
@media(max-width:520px){.au-roles:not(.au-roles-compact){grid-template-columns:1fr}.au-roles-compact .au-role-mini{padding:10px;gap:8px}.au-roles-compact .au-role-mini b{font-size:14px}.au-roles-compact .au-role-icon{width:30px;height:30px;border-radius:8px}.au-role{flex-direction:row;flex-wrap:wrap;align-items:center}.au-role-text{flex:1;min-width:0}.au-role ul{display:none}.au-role-go{display:none}}

/* Pași */
.au-steps{display:flex;align-items:center;gap:8px;margin-bottom:26px}
.au-step{display:flex;align-items:center;gap:8px;flex:1}
.au-step:last-child{flex:none}
.au-step-n{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;background:#f0eff7;color:var(--faint);flex:none;transition:background .2s,color .2s}
.au-step-n.on{background:var(--btn);color:#fff}
.au-step-label{font-size:13px;font-weight:700;color:var(--faint);white-space:nowrap}
.au-step-label.on{color:var(--ink)}
.au-step-bar{flex:1;height:2px;border-radius:2px;background:#ecebf5;min-width:12px}
.au-step-bar.on{background:var(--ac)}
.au-step-label:not(.on){display:none}
@media(max-width:560px){.au-step-label{display:none}}

/* Nișe */
.au-chips{display:flex;flex-wrap:wrap;gap:8px}
.au-chip{min-height:40px;padding:8px 14px;border-radius:999px;border:1.5px solid var(--line);background:#fff;font-family:inherit;font-size:14px;font-weight:700;color:var(--muted);cursor:pointer;transition:all .15s}
.au-chip:hover{border-color:var(--ac);color:var(--ac)}
.au-chip.on{background:var(--btn);border-color:transparent;color:#fff}

/* Social */
.au-social{display:flex;align-items:center;border:1.5px solid var(--line);border-radius:12px;overflow:hidden;background:#fff;transition:border-color .15s,box-shadow .15s}
.au-social:focus-within{border-color:var(--ac);box-shadow:0 0 0 4px var(--ac-soft)}
.au-social-pre{display:flex;align-items:center;gap:8px;padding:0 12px;min-height:50px;border-right:1px solid #ecebf5;background:#f8f8fc;color:var(--faint);font-weight:700;flex:none}
.au-social input{flex:1;min-width:0;min-height:50px;border:0;outline:0;padding:0 14px;font-family:inherit;font-size:16px;color:var(--ink);background:transparent}

/* Oraș */
.au-city{position:relative}
.au-city-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--faint);pointer-events:none}
.au-city .au-input{padding-left:42px;padding-right:48px}
.au-city-clear{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:44px;height:44px;border:0;background:transparent;color:var(--faint);display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:10px}
.au-city-list{position:absolute;top:calc(100% + 6px);left:0;right:0;background:#fff;border:1px solid #e5e3f3;border-radius:14px;box-shadow:0 20px 40px -16px rgba(20,18,58,.3);overflow:hidden;z-index:50}
.au-city-list button{width:100%;display:flex;align-items:center;gap:10px;padding:12px 16px;min-height:52px;border:0;border-bottom:1px solid #f1f0f8;background:#fff;text-align:left;font-family:inherit;cursor:pointer}
.au-city-list button:last-child{border-bottom:0}
.au-city-list button:hover{background:#f5f2ff}

/* Acord */
.au-terms{border:1.5px solid #ecebf5;border-radius:16px;overflow:hidden}
.au-terms div{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-bottom:1px solid #ecebf5;background:#fafafd;font-size:14px;color:var(--muted)}
.au-terms div:last-child{border-bottom:0}
.au-terms svg{flex:none;color:var(--ac);margin-top:2px}
.au-check{width:100%;display:flex;align-items:center;gap:14px;padding:16px;border-radius:16px;border:1.5px solid var(--line);background:#fff;text-align:left;font-family:inherit;font-size:15px;font-weight:700;color:var(--ink);cursor:pointer;transition:border-color .15s,background .15s}
.au-check.on{border-color:var(--ac);background:var(--ac-soft)}
.au-check-box{width:24px;height:24px;border-radius:7px;border:2px solid #cfcce4;display:flex;align-items:center;justify-content:center;flex:none;color:#fff;transition:all .15s}
.au-check.on .au-check-box{background:var(--ac);border-color:var(--ac)}

.au-enter{animation:au-enter .45s cubic-bezier(.2,.8,.2,1) both}
@keyframes au-enter{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes au-in{from{opacity:0;transform:translateX(-14px) scale(.97)}to{opacity:1;transform:none}}
@keyframes au-pulse{0%{box-shadow:0 0 0 0 rgba(34,200,240,.6)}70%{box-shadow:0 0 0 10px rgba(34,200,240,0)}100%{box-shadow:0 0 0 0 rgba(34,200,240,0)}}
@keyframes au-rot{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.au-feed-row,.au-dot,.au-enter,.au-btn,.au-role{animation:none!important;transition:none!important}}
`
