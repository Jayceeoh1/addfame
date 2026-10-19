'use client'

// Admin → Puncte: pornește/oprește quiz-ul de Halloween și vezi câți au jucat.
import { useEffect, useState } from 'react'
import { adminGetQuiz, adminSetQuizEnabled } from '@/app/actions/halloween-quiz'

export default function HalloweenQuizAdmin() {
  const [d, setD] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const load = () => adminGetQuiz().then((r: any) => { if (r?.error) setErr(r.error); else setD(r) }).catch(() => {})
  useEffect(() => { load() }, [])

  async function toggle() {
    if (!d || busy) return
    setBusy(true); setErr(null)
    const r: any = await adminSetQuizEnabled(!d.enabled)
    setBusy(false)
    if (r?.error) setErr(r.error); else load()
  }

  return (
    <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-orange-50 p-4 mb-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <p className="text-xs font-black text-violet-600 uppercase tracking-wider mb-1">🎃 Quiz de Halloween</p>
          <p className="text-sm font-black text-gray-900 mb-1">„Ce influencer de Halloween ești?” · +25 puncte o dată</p>
          <p className="text-xs text-gray-500">Când e pornit, influencerii îl văd în dashboard și la /influencer/halloween-quiz.</p>
        </div>
        {d && (
          <button onClick={toggle} disabled={busy}
            className={`px-4 py-2 rounded-lg text-xs font-black transition ${d.enabled ? 'bg-white border-2 border-red-200 text-red-600 hover:border-red-400' : 'bg-violet-600 hover:bg-violet-700 text-white'}`}>
            {busy ? '…' : d.enabled ? 'Oprește quiz-ul' : 'Pornește quiz-ul'}
          </button>
        )}
      </div>
      {d && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className={`px-2.5 py-1 rounded-full font-black border ${d.enabled ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>{d.enabled ? 'Pornit' : 'Oprit'}</span>
          {d.ready ? (<>
            <span className="px-2.5 py-1 rounded-full font-black bg-white border border-violet-100 text-gray-800">{d.total} au jucat</span>
            <span className="px-2.5 py-1 rounded-full font-black bg-white border border-violet-100 text-gray-800">{d.points} puncte acordate</span>
            {d.byCharacter.map((c: any) => <span key={c.id} className="px-2.5 py-1 rounded-full font-bold bg-white border border-orange-100 text-gray-700">{c.name}: {c.count}</span>)}
          </>) : <span className="px-2.5 py-1 rounded-full font-black bg-red-50 text-red-700 border border-red-200">Rulează SQL 43 în Supabase</span>}
        </div>
      )}
      {err && <p className="mt-2 text-xs font-bold text-red-600">{err}</p>}
    </div>
  )
}
