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
    return <img src={brand.logo} alt="" style={{ width: size, height: size, borderRadius: Math.round(size * 0.28), objectFit: 'cover', flex: 'none', background: '#f1effc' }} />
  }
  return (
    <span aria-hidden="true" style={{ width: size, height: size, borderRadius: Math.round(size * 0.28), background: '#efeaff', color: '#4423c4', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: Math.round(size * 0.4), flex: 'none' }}>
      {initials(brand.name)}
    </span>
  )
}

/** Secțiune pe dashboardul brandului: „Au avut încredere în AddFame”. Ascunsă când nu există branduri de arătat. */
export default function PartnersShowcase() {
  const [brands, setBrands] = useState<ShowcaseBrand[] | null>(null)
  useEffect(() => {
    fetch('/api/brand/parteneri').then(r => r.json()).then(d => setBrands(Array.isArray(d.brands) ? d.brands : [])).catch(() => setBrands([]))
  }, [])
  if (!brands || brands.length === 0) return null
  const campaigns = brands.reduce((s, b) => s + b.campaigns.length, 0)
  const creators = brands.reduce((s, b) => s + b.creators, 0)
  return (
    <section className="bd-card" style={{ padding: '20px 22px' }}>
      <h2 style={{ margin: 0 }}>Au avut încredere în AddFame</h2>
      <p className="bd-muted" style={{ margin: '4px 0 0', fontSize: 14 }}>Brandurile care au lucrat cu noi. Apasă pe un brand ca să vezi campaniile lui.</p>
      <div style={{ display: 'flex', gap: 10, marginTop: 14, overflowX: 'auto', paddingBottom: 4 }}>
        {brands.map(b => (
          <Link key={b.id} href={`/brand/parteneri/${b.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none', border: '1px solid #e5e3f3', borderRadius: 14, padding: '10px 14px', textDecoration: 'none', color: '#14123a', background: '#fff', fontWeight: 700, fontSize: 14 }}>
            <BrandLogo brand={b} /> {b.name}
          </Link>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginTop: 16, paddingTop: 14, borderTop: '1px solid #f0eefa' }}>
        {[[brands.length, 'branduri partenere'], [campaigns, 'campanii'], [creators, 'creatori implicați']].map(([n, l]) => (
          <div key={String(l)}><div style={{ fontSize: 24, fontWeight: 800 }}>{Number(n).toLocaleString('ro-RO')}</div><div className="bd-muted" style={{ fontSize: 12 }}>{l}</div></div>
        ))}
      </div>
    </section>
  )
}
