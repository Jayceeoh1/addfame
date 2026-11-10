'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, Users } from 'lucide-react'
import type { ShowcaseBrand } from '@/lib/showcase'
import { BrandLogo } from '@/components/brand/PartnersShowcase'

type Filter = 'all' | 'ACTIVE' | 'COMPLETED'

export default function PartnerBrandPage() {
  const { id } = useParams<{ id: string }>()
  const [brand, setBrand] = useState<ShowcaseBrand | null | undefined>(undefined)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    fetch('/api/brand/parteneri').then(r => r.json())
      .then(d => setBrand((d.brands || []).find((b: ShowcaseBrand) => b.id === id) || null))
      .catch(() => setBrand(null))
  }, [id])

  if (brand === undefined) return <div style={{ padding: 28 }}>Se încarcă...</div>
  if (brand === null) return (
    <div style={{ padding: 28 }}>
      <Link href="/brand/dashboard" style={{ color: '#5a35e6', fontWeight: 700, textDecoration: 'none' }}>← Înapoi la dashboard</Link>
      <p style={{ marginTop: 16 }}>Acest brand nu mai e în lista de parteneri.</p>
    </div>
  )
  const list = brand.campaigns.filter(c => filter === 'all' || c.status === filter)
  const pill = (f: Filter, label: string) => (
    <button key={f} type="button" onClick={() => setFilter(f)} style={{ border: filter === f ? 0 : '1px solid #e5e3f3', cursor: 'pointer', padding: '8px 16px', borderRadius: 99, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', background: filter === f ? '#5a35e6' : '#fff', color: filter === f ? '#fff' : '#14123a' }}>{label}</button>
  )
  return (
    <div style={{ padding: 28, maxWidth: 1240, margin: '0 auto', color: '#14123a' }}>
      <Link href="/brand/dashboard" style={{ color: '#5a35e6', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>← Înapoi la dashboard</Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 18 }}>
        <BrandLogo brand={brand} size={72} />
        <div><h1 style={{ margin: 0, fontSize: 30, fontWeight: 800 }}>{brand.name}</h1><div style={{ fontSize: 13, color: '#6a6690' }}>Partener AddFame</div></div>
      </div>
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginTop: 20, padding: '16px 20px', background: '#fff', border: '1px solid #e5e3f3', borderRadius: 16, width: 'fit-content' }}>
        {[[brand.completed, 'campanii finalizate'], [brand.active, 'în desfășurare'], [brand.creators, 'creatori implicați']].map(([n, l]) => (
          <div key={String(l)}><div style={{ fontSize: 22, fontWeight: 800 }}>{Number(n).toLocaleString('ro-RO')}</div><div style={{ fontSize: 12, color: '#6a6690' }}>{l}</div></div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>{pill('all', 'Toate')}{pill('ACTIVE', 'În desfășurare')}{pill('COMPLETED', 'Finalizate')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 16 }}>
        {list.map((c, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e5e3f3', borderRadius: 16, overflow: 'hidden', cursor: 'default' }}>
            <div style={{ position: 'relative', height: 160, background: '#efeaff' }}>
              {c.banner && /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.banner} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', userSelect: 'none' }} />}
              <span style={{ position: 'absolute', top: 10, left: 10, borderRadius: 99, padding: '4px 10px', fontSize: 11, fontWeight: 800, background: c.status === 'COMPLETED' ? '#dcfce7' : '#fef3c7', color: c.status === 'COMPLETED' ? '#166534' : '#854d0e' }}>{c.status === 'COMPLETED' ? 'Finalizată' : 'În desfășurare'}</span>
              <span style={{ position: 'absolute', top: 10, right: 10, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(20,18,58,.78)', color: '#fff', borderRadius: 99, padding: '4px 10px', fontSize: 11, fontWeight: 700 }}><Lock size={12} /> Previzualizare</span>
            </div>
            <div style={{ padding: '14px 16px 16px' }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{c.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6a6690', marginTop: 8 }}><Users size={14} /> {c.creators} {c.creators === 1 ? 'creator' : 'creatori'}</div>
            </div>
          </div>
        ))}
      </div>
      <p style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, fontSize: 12, color: '#6a6690' }}><Lock size={13} /> Campaniile sunt doar de previzualizare: nu se deschid, iar creatorii, bugetul și detaliile rămân private.</p>
    </div>
  )
}
