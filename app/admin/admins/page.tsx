'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, Plus, Trash2, CheckCircle, XCircle, Crown, User, Eye, EyeOff } from 'lucide-react'

const PERMISSIONS = [
  { key: 'approve_influencers', label: 'Aprobare influenceri' },
  { key: 'approve_brands', label: 'Aprobare branduri' },
  { key: 'manage_campaigns', label: 'Închidere campanii' },
  { key: 'suspend_accounts', label: 'Blocare/suspendare conturi' },
]

export default function AdminsPage() {
  const [admins, setAdmins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentAdmin, setCurrentAdmin] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState('admin')
  const [newPerms, setNewPerms] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return

    const res = await fetch('/api/admin/admins')
    const data = await res.json()
    if (data.admins) setAdmins(data.admins)
    if (data.current) setCurrentAdmin(data.current)
    setLoading(false)
  }

  async function createAdmin() {
    if (!newEmail.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim(), role: newRole, permissions: newPerms }),
      })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error || 'Eroare'); return }
      setSuccess(`Admin creat cu succes pentru ${newEmail}`)
      setNewEmail(''); setNewRole('admin'); setNewPerms([])
      setShowCreate(false)
      fetchData()
    } catch (e: any) { setError(e.message) }
    finally { setCreating(false) }
  }

  async function toggleActive(adminId: string, isActive: boolean) {
    await fetch('/api/admin/admins', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_id: adminId, is_active: !isActive }),
    })
    fetchData()
  }

  async function deleteAdmin(adminId: string) {
    if (!confirm('Ești sigur că vrei să ștergi acest admin?')) return
    await fetch('/api/admin/admins', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_id: adminId }),
    })
    fetchData()
  }

  function togglePerm(perm: string) {
    setNewPerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm])
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-t-purple-500 border-purple-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
    </div>
  )

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <Crown className="w-6 h-6 text-amber-500" /> Management Admini
          </h1>
          <p className="text-sm text-gray-400 mt-1">Crează și gestionează conturile de admin</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-white"
          style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
          <Plus className="w-4 h-4" /> Admin nou
        </button>
      </div>

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm font-bold px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}

      {/* Admins list */}
      <div className="space-y-3">
        {admins.map(a => (
          <div key={a.id} className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${a.role === 'super_admin' ? 'bg-amber-100' : 'bg-purple-100'}`}>
                  {a.role === 'super_admin'
                    ? <Crown className="w-5 h-5 text-amber-600" />
                    : <Shield className="w-5 h-5 text-purple-600" />
                  }
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-gray-900">{a.email}</p>
                    {a.role === 'super_admin' && (
                      <span className="text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">Super Admin</span>
                    )}
                    {a.role === 'admin' && (
                      <span className="text-xs font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">Admin</span>
                    )}
                    {!a.is_active && (
                      <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Inactiv</span>
                    )}
                  </div>
                  {a.role === 'admin' && a.permissions?.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.permissions.map((p: string) => PERMISSIONS.find(x => x.key === p)?.label || p).join(', ')}
                    </p>
                  )}
                  {a.role === 'admin' && (!a.permissions || a.permissions.length === 0) && (
                    <p className="text-xs text-gray-400 mt-0.5">Fără permisiuni specifice</p>
                  )}
                  <p className="text-xs text-gray-300 mt-0.5">
                    Creat: {new Date(a.created_at).toLocaleDateString('ro-RO')}
                  </p>
                </div>
              </div>

              {/* Actions — can't touch super_admin or yourself */}
              {a.role !== 'super_admin' && a.user_id !== currentAdmin?.user_id && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleActive(a.id, a.is_active)}
                    className={`p-2 rounded-lg transition ${a.is_active ? 'bg-amber-50 hover:bg-amber-100 text-amber-600' : 'bg-green-50 hover:bg-green-100 text-green-600'}`}
                    title={a.is_active ? 'Dezactivează' : 'Activează'}>
                    {a.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => deleteAdmin(a.id)}
                    className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition"
                    title="Șterge">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <h2 className="text-lg font-black text-gray-900 mb-5">Crează admin nou</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  placeholder="email@exemplu.com"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 transition"
                  style={{ fontFamily: 'inherit' }} />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-1.5">Rol</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'admin', label: 'Admin', icon: Shield, desc: 'Acces limitat' },
                    { value: 'super_admin', label: 'Super Admin', icon: Crown, desc: 'Acces total' },
                  ].map(r => {
                    const Icon = r.icon
                    return (
                      <button key={r.value} onClick={() => setNewRole(r.value)}
                        className="p-3 rounded-xl border-2 text-left transition"
                        style={{ borderColor: newRole === r.value ? '#8b5cf6' : '#e5e7eb', background: newRole === r.value ? '#f5f3ff' : 'white' }}>
                        <Icon className="w-4 h-4 mb-1" style={{ color: newRole === r.value ? '#8b5cf6' : '#9ca3af' }} />
                        <p className="text-sm font-black" style={{ color: newRole === r.value ? '#7c3aed' : '#374151' }}>{r.label}</p>
                        <p className="text-xs text-gray-400">{r.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {newRole === 'admin' && (
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-wide mb-2">Permisiuni</label>
                  <div className="space-y-2">
                    {PERMISSIONS.map(p => (
                      <label key={p.key} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition">
                        <input type="checkbox" checked={newPerms.includes(p.key)} onChange={() => togglePerm(p.key)}
                          className="w-4 h-4 accent-purple-600" />
                        <span className="text-sm font-semibold text-gray-700">{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowCreate(false); setError(null) }}
                className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition">
                Anulează
              </button>
              <button onClick={createAdmin} disabled={creating || !newEmail.trim()}
                className="flex-1 py-3 rounded-xl font-black text-sm text-white disabled:opacity-40 transition"
                style={{ background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)' }}>
                {creating ? 'Se creează…' : 'Crează admin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
