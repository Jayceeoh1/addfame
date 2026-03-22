'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, X, CheckCheck } from 'lucide-react'

export function NotificationsBell({ accentColor = '#8b5cf6' }: { accentColor?: string }) {
  const [notifs, setNotifs] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    async function init() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await sb.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
      setNotifs(data || [])
      sb.channel(`notifs-${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (p) => setNotifs(prev => [p.new, ...prev]))
        .subscribe()
    }
    init()
  }, [])

  async function markAllRead() {
    if (!userId) return
    const sb = createClient()
    await sb.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setNotifs(p => p.map(n => ({ ...n, read: true })))
  }

  async function markRead(id: string) {
    const sb = createClient()
    await sb.from('notifications').update({ read: true }).eq('id', id)
    setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const unread = notifs.filter(n => !n.read).length
  const fmtTime = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
    if (diff < 1) return 'just now'
    if (diff < 60) return `${diff}m ago`
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
    return `${Math.floor(diff / 1440)}d ago`
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(p => !p)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center transition"
        style={{ background: open ? '#f3f4f6' : 'white', border: '1.5px solid #f0f0f0' }}>
        <Bell className="w-4 h-4 text-gray-500" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white text-[10px] font-black flex items-center justify-center"
            style={{ background: accentColor }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{ border: '1.5px solid #f0f0f0', boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1.5px solid #f5f5f5' }}>
            <p className="font-black text-gray-900 text-sm">Notifications {unread > 0 && <span className="text-xs font-black text-white px-1.5 py-0.5 rounded-full ml-1" style={{ background: accentColor }}>{unread}</span>}</p>
            <div className="flex items-center gap-2">
              {unread > 0 && <button onClick={markAllRead} className="text-xs font-bold text-gray-400 hover:text-gray-700 flex items-center gap-1"><CheckCheck className="w-3.5 h-3.5" /> All read</button>}
              <button onClick={() => setOpen(false)} className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"><X className="w-3 h-3 text-gray-500" /></button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="text-center py-10">
                <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-400">No notifications</p>
              </div>
            ) : notifs.map(n => (
              <button key={n.id} onClick={() => { markRead(n.id); if (n.link) window.location.href = n.link }}
                className="w-full flex items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50"
                style={{ borderBottom: '1px solid #f9f9f9', background: !n.read ? '#fafbff' : undefined }}>
                {!n.read && <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: accentColor }} />}
                {n.read && <div className="w-2 h-2 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.read ? 'font-semibold text-gray-600' : 'font-black text-gray-900'}`}>{n.title}</p>
                  {n.body && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-[10px] text-gray-300 mt-1">{fmtTime(n.created_at)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
