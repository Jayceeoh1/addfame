'use client'

import { useEffect, useState, useCallback } from 'react'
import { getAdminOverview, type AdminOverview } from '@/app/actions/admin-overview'
import { AdminDashboardView, greeting, QUEUE } from '@/components/admin/AdminDashboardView'

export default function AdminDashboard() {
  const [data, setData] = useState<AdminOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    const r = await getAdminOverview().catch((e: any) => ({ error: e?.message || 'Eroare' }))
    if ('success' in r) setData(r)
    else setError(r.error)
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  // Salutul și data se calculează doar în browser (ora serverului e UTC → altfel textul diferă și React dă eroare)
  const [hello, setHello] = useState({ title: '', today: '' })
  useEffect(() => {
    setHello({ title: greeting(), today: new Date().toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' }) })
  }, [])

  if (!data) {
    return (
      <div className="ad-page">
        <div className="ad-hello"><div><h1>{hello.title || 'Panou'}</h1><p>{hello.today || '\u00a0'}</p></div></div>
        {error ? (
          <div className="ad-card ad-pad" style={{ color: '#b42318' }}>
            Nu am putut încărca panoul: {error} <button className="ad-btn" onClick={load} style={{ marginLeft: 8 }}>Reîncearcă</button>
          </div>
        ) : (
          <div className="ad-queue">{QUEUE.map(q => <div key={q.key} className="ad-q" style={{ height: 70, opacity: .5 }} />)}</div>
        )}
      </div>
    )
  }

  return <AdminDashboardView data={data} loading={loading} onRefresh={load} />
}
