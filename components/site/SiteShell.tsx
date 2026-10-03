// Rama comună a paginilor publice: antet, subsol și stilurile de bază.
// Fără 'use client' — merge și în paginile server (cu `export const metadata`).
// Culorile vin din logo: cyan #22c8f0 → albastru #3090f0 → violet #7040f0 → mov #9030f0.

import Link from 'next/link'
import React from 'react'
import { fontVars } from '@/lib/fonts'

const NAV = [
  ['Cum funcționează', '/cum-functioneaza'],
  ['Pentru branduri', '/pentru-branduri'],
  ['Pentru influenceri', '/pentru-influenceri'],
  ['Întrebări', '/intrebari-frecvente'],
] as const

export function SiteLogo() {
  return (
    <Link href="/" className="af-logo" aria-label="AddFame — pagina principală">
      <span className="af-logo-mark"><img src="/logo.png" alt="" /></span>
      <span className="af-logo-text">Add<span className="af-grad-text">Fame</span></span>
    </Link>
  )
}

export function SiteHeader() {
  return (
    <header className="af-header">
      <nav className="af-wrap af-nav" aria-label="Navigare principală">
        <SiteLogo />
        <div className="af-nav-links">
          {NAV.map(([l, h]) => <Link key={h} href={h}>{l}</Link>)}
        </div>
        <div className="af-nav-cta">
          <Link href="/auth/login" className="af-nav-login">Autentificare</Link>
          <Link href="/auth/register" className="af-btn af-btn-violet af-btn-sm">Creează cont</Link>
          {/* Meniu telefon — <details> funcționează fără JavaScript */}
          <details className="af-menu">
            <summary aria-label="Meniu">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </summary>
            <div className="af-menu-panel">
              {NAV.map(([l, h]) => <Link key={h} href={h}>{l}</Link>)}
              <Link href="/despre-noi">Despre noi</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/auth/login" className="af-menu-login">Autentificare</Link>
            </div>
          </details>
        </div>
      </nav>
    </header>
  )
}

function Icon({ d }: { d: string }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
}

export function SiteFooter() {
  const cols = [
    { title: 'Platformă', links: [['Pentru branduri', '/pentru-branduri'], ['Pentru influenceri', '/pentru-influenceri'], ['Cum funcționează', '/cum-functioneaza'], ['Întrebări frecvente', '/intrebari-frecvente']] },
    { title: 'Companie', links: [['Despre noi', '/despre-noi'], ['Contact', '/contact'], ['Creează cont', '/auth/register']] },
    { title: 'Legal', links: [['Termeni și condiții', '/termeni'], ['Confidențialitate', '/politica-de-confidentialitate'], ['Cookie-uri', '/politica-de-confidentialitate#s-7']] },
  ]
  return (
    <footer className="af-footer">
      <div className="af-wrap">
        <div className="af-footer-grid">
          <div>
            <SiteLogo />
            <p className="af-footer-about">Conectăm branduri românești cu influenceri autentici.</p>
            <div className="af-socials">
              <a href="https://www.instagram.com/addfame.ro" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Icon d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm5 6a4 4 0 100 8 4 4 0 000-8zm5.5-1.5h.01" /></a>
              <a href="https://www.tiktok.com/@addfame" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><Icon d="M16 3c.4 2.4 2 4 4.5 4.2M16 3v12a4 4 0 11-4-4" /></a>
              <a href="https://www.youtube.com/@addfame" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><Icon d="M22 8.5s-.2-1.7-.9-2.4c-.8-.9-1.8-.9-2.2-1C15.8 5 12 5 12 5s-3.8 0-6.9.1c-.4.1-1.4.1-2.2 1C2.2 6.8 2 8.5 2 8.5S1.8 10.4 1.8 12.3v1.4c0 1.9.2 3.8.2 3.8s.2 1.7.9 2.4c.8.9 1.9.9 2.4 1 1.7.2 7 .2 7 .2s3.8 0 6.9-.2c.4-.1 1.4-.1 2.2-1 .7-.7.9-2.4.9-2.4s.2-1.9.2-3.8v-1.4c0-1.9-.2-3.8-.2-3.8zM10 15V9l5 3-5 3z" /></a>
            </div>
          </div>
          {cols.map(col => (
            <div key={col.title}>
              <p className="af-eyebrow">{col.title}</p>
              <ul className="af-footer-links">
                {col.links.map(([label, href]) => <li key={href}><Link href={href}>{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="af-footer-bottom">
          <div>
            <p>© 2026 AddFame. Toate drepturile rezervate.</p>
            <p className="af-small">ADD FAME DIGITAL S.R.L. · CUI: 54992560 · Reg. Com.: J2026040984009 · Argeș, România</p>
          </div>
          <div className="af-footer-legal">
            <a href="https://anpc.ro" target="_blank" rel="noopener noreferrer">ANPC</a>
            <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">SOL Online</a>
            <span>contact@addfame.ro</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

/** Pagină publică completă: antet + conținut + subsol, cu fonturile și stilurile comune. */
export default function SitePage({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`af-page ${fontVars} ${className}`}>
      <style>{SITE_CSS}</style>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  )
}

/** Hero simplu pentru paginile interioare. */
export function PageHero({ eyebrow, title, accent, lead, children }: { eyebrow?: string; title: React.ReactNode; accent?: string; lead?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="sp-hero">
      <div className="sp-hero-wash" aria-hidden="true" />
      <div className="af-wrap sp-hero-inner">
        {eyebrow && <span className="af-pill"><span className="af-dot" />{eyebrow}</span>}
        <h1 className="sp-h1">{title}{accent && <> <span className="af-grad-text">{accent}</span></>}</h1>
        {lead && <p className="af-lead">{lead}</p>}
        {children}
      </div>
    </section>
  )
}

export const SITE_CSS = `
.af-page{--ink:#14123a;--muted:#4a4770;--soft:#6a6690;--faint:#8783a8;--line:#e5e3f3;--line2:#eeecf7;--bg:#f6f6fc;--violet:#5a35e6;
  background:var(--bg);color:var(--ink);font-family:var(--font-body,system-ui),system-ui,-apple-system,'Segoe UI',sans-serif;font-size:16px;line-height:1.55;min-height:100vh;overflow-x:hidden}
.af-page *{box-sizing:border-box}
.af-page h1,.af-page h2,.af-page h3,.af-logo-text,.sp-num{font-family:var(--font-display,system-ui),system-ui,sans-serif}
.af-wrap{max-width:1200px;margin:0 auto;padding-inline:clamp(16px,4vw,40px)}
.af-grad{background:linear-gradient(135deg,#22c8f0 0%,#3090f0 38%,#7040f0 72%,#9030f0 100%)}
.af-grad-text{background:linear-gradient(100deg,#22c8f0 0%,#3090f0 38%,#7040f0 72%,#9030f0 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent}
.af-eyebrow{display:block;font-size:12px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--faint);margin:0}
.af-lead{margin:0;font-size:clamp(17px,1.6vw,19px);color:var(--muted);max-width:36em}
.af-pill{display:inline-flex;align-self:flex-start;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 14px;font-size:13px;font-weight:600;color:var(--muted)}
.af-dot{width:8px;height:8px;border-radius:50%;background:#22c8f0;flex:none;animation:af-pulse 2.8s ease-out infinite}

/* Butoane */
.af-btn{white-space:nowrap;display:inline-flex;align-items:center;justify-content:center;gap:10px;font-weight:700;font-size:16px;padding:15px 24px;border-radius:12px;text-decoration:none;transition:transform .15s,box-shadow .15s,background .15s;min-height:48px;border:0;cursor:pointer;font-family:inherit}
.af-btn:hover{transform:translateY(-1px)}
.af-btn-ink{background:var(--ink);color:#fff}
.af-btn-ink:hover{box-shadow:0 10px 24px -10px rgba(20,18,58,.6);color:#fff}
.af-btn-ghost{background:#fff;color:var(--ink);border:1px solid #d8d5ec}
.af-btn-violet{background:var(--violet);color:#fff}
.af-btn-violet:hover{background:#4423c4;color:#fff}
.af-btn-brand{background:linear-gradient(135deg,#2a8ae6 0%,#2f6fe0 45%,#5a35e6 100%);color:#fff}
.af-btn-infl{background:linear-gradient(135deg,#5a35e6 0%,#7040f0 50%,#8a26d6 100%);color:#fff}
.af-btn-white{background:#fff;color:var(--ink)}
.af-btn-sm{font-size:14px;padding:11px 18px;min-height:44px}
.af-btn:disabled{opacity:.55;cursor:not-allowed;transform:none}

/* Antet */
.af-header{background:rgba(255,255,255,.92);backdrop-filter:saturate(1.4) blur(10px);-webkit-backdrop-filter:saturate(1.4) blur(10px);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:50}
.af-nav{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-block:12px}
.af-logo{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink)}
.af-logo-mark{width:36px;height:36px;border-radius:10px;background:#fff;border:1px solid #ede9fe;box-shadow:0 2px 8px rgba(112,64,240,.15);display:flex;align-items:center;justify-content:center;flex:none}
.af-logo-mark img{width:78%;height:78%;object-fit:contain}
.af-logo-text{font-weight:800;font-size:21px;letter-spacing:-.02em}
.af-nav-links{display:flex;gap:26px;font-size:14px;font-weight:600}
.af-nav-links a{color:var(--muted);text-decoration:none}
.af-nav-links a:hover{color:var(--ink)}
.af-nav-cta{display:flex;align-items:center;gap:8px}
.af-nav-login{font-size:14px;font-weight:600;color:var(--ink);text-decoration:none;padding:12px 8px;white-space:nowrap}
.af-menu{display:none;position:relative}
.af-menu summary{list-style:none;width:44px;height:44px;border-radius:10px;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--ink);background:#fff}
.af-menu summary::-webkit-details-marker{display:none}
.af-menu-panel{position:absolute;right:0;top:calc(100% + 8px);width:min(260px,calc(100vw - 32px));background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 24px 48px -20px rgba(20,18,58,.35);padding:8px;display:flex;flex-direction:column}
.af-menu-panel a{padding:12px 14px;border-radius:10px;color:var(--ink);text-decoration:none;font-weight:600;font-size:15px;min-height:44px;display:flex;align-items:center}
.af-menu-panel a:hover{background:var(--bg)}
.af-menu-login{display:none!important}
@media(max-width:960px){.af-nav-links{display:none}.af-menu{display:block}}
@media(max-width:480px){.af-nav-login{display:none}.af-menu-login{display:flex!important;border-top:1px solid var(--line2);margin-top:4px}.af-logo-text{font-size:18px}.af-logo-mark{width:32px;height:32px}.af-btn-sm{font-size:13px;padding:10px 14px}}

/* Hero pagini interioare */
.sp-hero{position:relative;overflow:hidden;border-bottom:1px solid var(--line);background:linear-gradient(160deg,#eaf8fe 0%,#f0f1ff 50%,#f5eeff 100%)}
.sp-hero-wash{position:absolute;inset:0;pointer-events:none;background:radial-gradient(520px 320px at 88% 0%,rgba(34,200,240,.20),transparent 70%),radial-gradient(520px 360px at 0% 100%,rgba(144,48,240,.13),transparent 70%)}
.sp-hero-inner{position:relative;display:flex;flex-direction:column;gap:20px;padding-block:clamp(48px,7vw,88px)}
.sp-h1{margin:0;font-weight:800;font-size:clamp(36px,5.6vw,68px);line-height:1;letter-spacing:-.035em;text-wrap:balance;max-width:16em}
.sp-hero .af-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:6px}

/* Secțiuni */
.sp-section{padding-block:clamp(56px,8vw,96px)}
.sp-section-white{background:#fff;border-block:1px solid var(--line)}
.sp-head{display:flex;flex-direction:column;gap:12px;margin-bottom:clamp(28px,4vw,44px);max-width:44em}
.sp-h2{margin:0;font-weight:800;font-size:clamp(28px,3.6vw,46px);line-height:1.05;letter-spacing:-.03em;text-wrap:balance}
.sp-h3{margin:0;font-weight:700;font-size:20px;letter-spacing:-.01em;line-height:1.25}
.sp-muted{margin:0;color:var(--muted)}
.sp-tag{display:inline-flex;align-self:flex-start;align-items:center;gap:6px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:5px 11px;border-radius:999px}
.sp-tag-brand{background:#e6f0ff;color:#1d4fb8}
.sp-tag-infl{background:#efeaff;color:#4423c4}

/* Carduri și grile */
.sp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:16px}
.sp-grid-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:16px}
.sp-card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:clamp(20px,3vw,28px);display:flex;flex-direction:column;gap:12px}
.sp-card p{margin:0;color:var(--muted);font-size:15px}
.sp-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;flex:none}
.sp-icon-brand{background:linear-gradient(135deg,#22c8f0,#2f6fe0)}
.sp-icon-infl{background:linear-gradient(135deg,#7040f0,#9030f0)}
.sp-icon-soft{background:#efeaff;color:#5a35e6}

/* Pași numerotați */
.sp-steps{display:flex;flex-direction:column;gap:12px;counter-reset:sp}
.sp-step{display:flex;gap:18px;align-items:flex-start;background:#fff;border:1px solid var(--line);border-radius:18px;padding:clamp(18px,3vw,24px)}
.sp-num{flex:none;width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;color:#fff;background:linear-gradient(135deg,#22c8f0,#3090f0,#7040f0)}
.sp-step-infl .sp-num{background:linear-gradient(135deg,#7040f0,#9030f0)}
.sp-step h3{margin:0 0 4px;font-size:18px;font-weight:700}
.sp-step p{margin:0;color:var(--muted);font-size:15px}

/* Listă cu bife */
.sp-checks{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.sp-checks li{display:flex;gap:10px;align-items:flex-start;color:var(--muted);font-size:15px}
.sp-checks li:before{content:'';flex:none;width:20px;height:20px;margin-top:1px;border-radius:50%;background:#e6f0ff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%232f6fe0' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12l5 5L20 7'/%3E%3C/svg%3E") center/12px no-repeat}

/* Cifre */
.sp-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:12px}
.sp-stat{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px}
.sp-stat b{display:block;font-family:var(--font-display,system-ui),system-ui,sans-serif;font-size:clamp(26px,3vw,34px);font-weight:800;letter-spacing:-.02em;line-height:1.1}
.sp-stat span{font-size:13px;color:var(--soft);font-weight:600}

/* Întrebări (accordion fără JS) */
.sp-faq{display:flex;flex-direction:column;max-width:860px}
.sp-faq details{border-top:1px solid #d8d5ec}
.sp-faq details:last-child{border-bottom:1px solid #d8d5ec}
.sp-faq summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px 0;font-size:17px;font-weight:700;min-height:44px}
.sp-faq summary::-webkit-details-marker{display:none}
.sp-faq summary:after{content:'+';flex:none;font-size:24px;font-weight:500;color:#7040f0;transition:transform .2s}
.sp-faq details[open] summary:after{transform:rotate(45deg)}
.sp-faq details p{margin:0 0 20px;color:var(--muted);max-width:60em}

/* Text lung (termeni, confidențialitate) */
.sp-prose{max-width:760px;font-size:16px;line-height:1.7;color:var(--muted)}
.sp-prose h2{color:var(--ink);font-size:clamp(20px,2.4vw,24px);font-weight:700;letter-spacing:-.01em;line-height:1.3;margin:40px 0 12px}
.sp-prose h2:first-child{margin-top:0}
.sp-prose h3{color:var(--ink);font-size:18px;font-weight:700;margin:28px 0 8px}
.sp-prose p{margin:0 0 14px}
.sp-prose ul,.sp-prose ol{margin:0 0 14px;padding-left:22px}
.sp-prose li{margin-bottom:6px}
.sp-prose a{color:var(--violet);font-weight:600}
.sp-prose strong{color:var(--ink)}
.sp-prose table{width:100%;border-collapse:collapse;font-size:14px}
.sp-table-wrap{overflow-x:auto;margin:0 0 16px;border:1px solid var(--line);border-radius:14px;background:#fff}
.sp-prose th,.sp-prose td{text-align:left;padding:12px 14px;border-bottom:1px solid var(--line2);vertical-align:top}
.sp-prose th{color:var(--ink);background:#fafafd;font-weight:700}
.sp-meta{font-size:14px;color:var(--soft)}

/* Formulare */
.sp-form{display:flex;flex-direction:column;gap:16px}
.sp-label{display:block;font-size:14px;font-weight:700;margin-bottom:8px;color:var(--ink)}
.sp-input{width:100%;min-height:50px;padding:12px 16px;border:1.5px solid #dcd9ee;border-radius:12px;font-size:16px;font-family:inherit;color:var(--ink);background:#fff;outline:none;transition:border-color .15s,box-shadow .15s;-webkit-appearance:none;appearance:none}
.sp-input:focus{border-color:var(--violet);box-shadow:0 0 0 4px rgba(90,53,230,.12)}
textarea.sp-input{min-height:130px;resize:vertical}
.sp-alert{display:flex;gap:12px;align-items:flex-start;border-radius:14px;padding:14px 16px;font-size:15px}
.sp-alert-ok{background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46}
.sp-alert-err{background:#fef2f2;border:1px solid #fecaca;color:#991b1b}

/* CTA */
.sp-cta{position:relative;overflow:hidden;background:var(--ink);color:#fff;border-radius:28px;padding:clamp(32px,6vw,64px);display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:28px}
.sp-cta h2{position:relative;margin:0;font-weight:800;font-size:clamp(28px,3.6vw,46px);letter-spacing:-.03em;line-height:1.05;max-width:13em;text-wrap:balance}
.sp-cta p{position:relative;margin:8px 0 0;color:#c9c5e8}
.sp-cta .af-row{position:relative;display:flex;flex-wrap:wrap;gap:12px}
.sp-cta-glow{position:absolute;width:420px;height:420px;right:-120px;top:-180px;border-radius:50%;opacity:.35;filter:blur(60px)}

/* Subsol */
.af-footer{border-top:1px solid var(--line);background:#fff;padding:56px 0 32px}
.af-footer-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:32px;margin-bottom:40px}
.af-footer-about{font-size:14px;color:var(--soft);max-width:260px;margin:14px 0 16px}
.af-socials{display:flex;gap:10px}
.af-socials a{width:40px;height:40px;border:1px solid var(--line);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--muted)}
.af-socials a:hover{color:#7040f0;border-color:#cfc4ff}
.af-footer-links{list-style:none;padding:0;margin:14px 0 0;display:flex;flex-direction:column;gap:10px}
.af-footer-links a{font-size:14px;color:var(--muted);text-decoration:none}
.af-footer-links a:hover{color:var(--ink)}
.af-footer-bottom{border-top:1px solid var(--line);padding-top:24px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;font-size:13px;color:var(--soft)}
.af-footer-bottom p{margin:0 0 4px}
.af-small{font-size:12px}
.af-footer-legal{display:flex;flex-wrap:wrap;gap:16px;align-items:center}
.af-footer-legal a{color:var(--soft);text-decoration:none;border:1px solid var(--line);border-radius:8px;padding:6px 12px}

@keyframes af-pulse{0%{box-shadow:0 0 0 0 rgba(34,200,240,.6)}70%{box-shadow:0 0 0 11px rgba(34,200,240,0)}100%{box-shadow:0 0 0 0 rgba(34,200,240,0)}}
@media(prefers-reduced-motion:reduce){.af-page *{animation:none!important;transition:none!important}}
`
