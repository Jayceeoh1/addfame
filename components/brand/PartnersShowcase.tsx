'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ShowcaseBrand } from '@/lib/showcase'

export function initials(name: string) {
  const p = name.replace(/[^\p{L}\p{N} ]/gu, '').trim().split(/\s+/)
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '?'
}

export function BrandLogo({ brand, size = 32 }: { brand: { name: string; logo: string | null }; size?: number }) {
  if (brand.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={brand.logo} alt="" loading="lazy" draggable={false} style={{ width: size, height: size, borderRadius: Math.round(size * 0.28), objectFit: 'cover', flex: 'none', background: '#f1effc' }} />
  }
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: Math.round(size * 0.28), background: '#efeaff', color: '#4423c4', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: Math.round(size * 0.4), flex: 'none' }}>
      {initials(brand.name)}
    </span>
  )
}

/** Dashboard brand: „Au avut încredere în AddFame”, cu logo-urile care alunecă încet de la stânga la dreapta.
 *  Se oprește la hover, la atingere (telefon) și la focus de tastatură. Fără mișcare dacă utilizatorul a cerut „reduce motion”. */
export default function PartnersShowcase() {
  const [brands, setBrands] = useState<ShowcaseBrand[] | null>(null)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    fetch('/api/brand/parteneri').then(r => r.json()).then(d => setBrands(Array.isArray(d.brands) ? d.brands : [])).catch(() => setBrands([]))
  }, [])
  if (!brands || brands.length === 0) return null
  const campaigns = brands.reduce((s, b) => s + b.campaigns.length, 0)
  const creators = brands.reduce((s, b) => s + b.creators, 0)
  // ~3,5 s pe brand: destul de lent cât să poată fi citit și apăsat
  const duration = Math.max(30, brands.length * 3.5)

  const chip = (b: ShowcaseBrand, copy: boolean) => (
    <Link key={(copy ? 'c-' : '') + b.id} href={`/brand/parteneri/${b.id}`} className="ps-chip"
      aria-hidden={copy || undefined} tabIndex={copy ? -1 : undefined}>
      <BrandLogo brand={b} /> <span>{b.name}</span>
    </Link>
  )

  return (
    <section className="bd-card ps">
      <style>{`
        .ps { padding: 20px 22px; overflow: hidden; }
        .ps-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 6px 16px; }
        .ps-viewport { position: relative; margin: 14px -22px 0; overflow: hidden; touch-action: pan-y;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 48px, #000 calc(100% - 48px), transparent);
                  mask-image: linear-gradient(90deg, transparent, #000 48px, #000 calc(100% - 48px), transparent); }
        .ps-track { display: flex; width: max-content; padding: 2px 0 4px; animation: ps-slide var(--ps-dur) linear infinite; will-change: transform; }
        .ps-viewport:hover .ps-track, .ps-viewport:focus-within .ps-track, .ps-track.paused { animation-play-state: paused; }
        @keyframes ps-slide { from { transform: translate3d(-50%, 0, 0); } to { transform: translate3d(0, 0, 0); } }
        .ps-copy { display: contents; }
        .ps-chip { display: inline-flex; align-items: center; gap: 10px; flex: none; margin-right: 10px; min-height: 48px; border: 1px solid #e5e3f3; border-radius: 14px;
          padding: 8px 14px; text-decoration: none; color: #14123a; background: #fff; font-weight: 700; font-size: 14px; white-space: nowrap;
          transition: border-color .15s, box-shadow .15s, transform .15s; -webkit-tap-highlight-color: transparent; }
        .ps-chip:hover, .ps-chip:focus-visible { border-color: #b9aef0; box-shadow: 0 6px 16px -10px rgba(90,53,230,.6); transform: translateY(-1px); outline: none; }
        .ps-stats { display: flex; gap: 28px; flex-wrap: wrap; margin-top: 16px; padding-top: 14px; border-top: 1px solid #f0eefa; }
        .ps-stats b { display: block; font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums; }
        @media (max-width: 640px) {
          .ps { padding: 16px; }
          .ps-viewport { margin: 12px -16px 0; }
          .ps-chip { margin-right: 8px; }
          .ps-chip { font-size: 13px; padding: 7px 12px; gap: 8px; }
          .ps-stats { gap: 18px; }
          .ps-stats b { font-size: 20px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ps-viewport { overflow-x: auto; -webkit-mask-image: none; mask-image: none; }
          .ps-track { animation: none; padding: 2px 16px 4px; }
          .ps-copy { display: none; }
        }
      `}</style>
      <div className="ps-head">
        <h2 style={{ margin: 0 }}>Au avut încredere în AddFame</h2>
        <span className="bd-muted" style={{ fontSize: 13 }}>Apasă pe un brand ca să-i vezi campaniile</span>
      </div>
      <div className="ps-viewport"
        onTouchStart={() => setPaused(true)} onTouchEnd={() => setTimeout(() => setPaused(false), 2500)}>
        <div className={`ps-track ${paused ? 'paused' : ''}`} style={{ ['--ps-dur' as any]: `${duration}s` }}>
          {brands.map(b => chip(b, false))}
          <span className="ps-copy">{brands.map(b => chip(b, true))}</span>
        </div>
      </div>
      <div className="ps-stats">
        {[[brands.length, 'branduri partenere'], [campaigns, 'campanii'], [creators, 'creatori implicați']].map(([n, l]) => (
          <div key={String(l)}><b>{Number(n).toLocaleString('ro-RO')}</b><span className="bd-muted" style={{ fontSize: 12 }}>{l}</span></div>
        ))}
      </div>
    </section>
  )
}
