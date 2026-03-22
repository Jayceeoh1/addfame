'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true); setError(null)
    try {
      const sb = createClient()
      const { error: err } = await sb.auth.updateUser({ password })
      if (err) throw err
      setDone(true)
      setTimeout(() => router.replace('/auth/login'), 2500)
    } catch (e: any) { setError(e.message || 'Failed to reset password') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');`}</style>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl p-8" style={{ border: '1.5px solid #f0f0f0', boxShadow: '0 20px 60px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', boxShadow: '0 4px 12px rgba(249,115,22,.35)' }}><img src="/logo.png" alt="AddFame" style={{ width: '110%', height: '110%', objectFit: 'contain' }} /></div>
            <span className="font-black text-gray-900">AddFame</span>
          </div>

          {done ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-xl font-black text-gray-900 mb-2">Password updated!</h1>
              <p className="text-sm text-gray-400">Redirecting you to login…</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-black text-gray-900 mb-2">Set new password</h1>
              <p className="text-sm text-gray-400 mb-7">Choose a strong password for your account</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                {[
                  { label: 'New password', value: password, setter: setPassword, placeholder: 'Min 8 characters' },
                  { label: 'Confirm password', value: confirm, setter: setConfirm, placeholder: 'Repeat password' },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">{f.label}</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type={showPw ? 'text' : 'password'} value={f.value} onChange={e => f.setter(e.target.value)}
                        placeholder={f.placeholder} disabled={loading}
                        className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-gray-100 text-sm font-medium outline-none transition focus:border-orange-400 disabled:opacity-60"
                        style={{ fontFamily: 'inherit' }} />
                      <button type="button" onClick={() => setShowPw(p => !p)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}

                {error && (
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-bold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full py-3.5 rounded-xl text-sm font-black text-white transition disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#f97316,#ec4899)', boxShadow: '0 4px 14px rgba(249,115,22,.3)' }}>
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
