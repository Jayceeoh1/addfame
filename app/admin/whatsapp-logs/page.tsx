'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle, CheckCircle, XCircle, RefreshCw, Filter } from 'lucide-react'

type WALog = {
  id: string
  created_at: string
  influencer_name: string
  phone: string
  campaign_title: string
  reminder_type: string
  twilio_message_sid: string | null
  success: boolean
  error_message: string | null
  sent_by_admin_id: string | null
}

export default function WhatsAppLogsPage() {
  const [logs, setLogs] = useState<WALog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all')
  const [search, setSearch] = useState('')

  async function fetchLogs() {
    setLoading(true)
    const sb = createClient()
    let q = sb
      .from('whatsapp_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (filter === 'success') q = q.eq('success', true)
    if (filter === 'failed') q = q.eq('success', false)

    const { data } = await q
    setLogs(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchLogs() }, [filter])

  const filtered = logs.filter(l =>
    !search ||
    l.influencer_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.campaign_title?.toLowerCase().includes(search.toLowerCase()) ||
    l.phone?.includes(search)
  )

  const successCount = logs.filter(l => l.success).length
  const failedCount = logs.filter(l => !l.success).length

  function reminderBadge(type: string) {
    const colors: Record<string, string> = {
      '2 zile': 'bg-blue-100 text-blue-700',
      '1 zi': 'bg-orange-100 text-orange-700',
      '12 ore': 'bg-red-100 text-red-700',
      'manual': 'bg-purple-100 text-purple-700',
    }
    return colors[type] || 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="p-6 max-w-6xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}>
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">WhatsApp Logs</h1>
            <p className="text-xs text-gray-500">Istoric mesaje trimise influencerilor</p>
          </div>
        </div>
        <button onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-2xl font-black text-gray-900">{logs.length}</p>
          <p className="text-xs font-bold text-gray-500 mt-1">Total trimise</p>
        </div>
        <div className="bg-white rounded-2xl border border-green-100 p-4 shadow-sm">
          <p className="text-2xl font-black text-green-600">{successCount}</p>
          <p className="text-xs font-bold text-gray-500 mt-1">✅ Livrate</p>
        </div>
        <div className="bg-white rounded-2xl border border-red-100 p-4 shadow-sm">
          <p className="text-2xl font-black text-red-500">{failedCount}</p>
          <p className="text-xs font-bold text-gray-500 mt-1">❌ Eșuate</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Caută influencer, campanie, telefon..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-green-400 transition"
        />
        <div className="flex gap-2">
          {(['all', 'success', 'failed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-black transition ${
                filter === f
                  ? 'text-white' + (f === 'all' ? ' bg-gray-700' : f === 'success' ? ' bg-green-500' : ' bg-red-500')
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={filter === f && f === 'all' ? { background: '#374151' } : {}}>
              <Filter className="w-3 h-3 inline mr-1" />
              {f === 'all' ? 'Toate' : f === 'success' ? 'Livrate' : 'Eșuate'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-green-200 border-t-green-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-bold">Nu există loguri</p>
            <p className="text-xs text-gray-300 mt-1">Mesajele WhatsApp trimise vor apărea aici</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider">Influencer</th>
                  <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider">Campanie</th>
                  <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider">Tip</th>
                  <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider">Twilio SID</th>
                  <th className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => (
                  <tr key={log.id} className={`border-b border-gray-50 hover:bg-gray-50 transition ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })}
                      <br />
                      <span className="text-gray-400">{new Date(log.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900 text-xs">{log.influencer_name || '—'}</p>
                      <p className="text-gray-400 text-xs">{log.phone || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-700 text-xs max-w-[200px] truncate">{log.campaign_title || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-black ${reminderBadge(log.reminder_type)}`}>
                        {log.reminder_type || '—'}
                      </span>
                      {!log.sent_by_admin_id && (
                        <span className="ml-1 text-xs text-gray-400">🤖 auto</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {log.twilio_message_sid ? (
                        <a
                          href={`https://console.twilio.com/us1/monitor/logs/sms`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline font-mono"
                          title={log.twilio_message_sid}>
                          {log.twilio_message_sid.substring(0, 12)}...
                        </a>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {log.success ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs font-bold">Livrat</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-500" title={log.error_message || ''}>
                          <XCircle className="w-4 h-4" />
                          <span className="text-xs font-bold">Eșuat</span>
                          {log.error_message && (
                            <span className="text-xs text-gray-400 ml-1 max-w-[120px] truncate">{log.error_message}</span>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-3 text-center">Afișând ultimele 200 de mesaje</p>
    </div>
  )
}
