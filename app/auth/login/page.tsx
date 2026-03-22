'use client'
// @ts-nocheck

import { Suspense } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, Eye, EyeOff, ArrowRight } from 'lucide-react'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionExpired = searchParams.get('expired') === '1'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        setError(result.error || 'Login failed')
        if (result.missingProfile) router.replace('/register')
        return
      }
      if (!result?.success || !result?.session) {
        setError('Login failed. Please try again.')
        return
      }
      const supabase = createClient()
      await supabase.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      })
      const destination = result.userRole === 'influencer' ? '/influencer/dashboard' : '/brand/dashboard'
      router.replace(destination)
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes floatBadge { 0%,100% { transform:translateY(0px) } 50% { transform:translateY(-8px) } }
        .fade-up { animation: fadeUp 0.6s ease both; }
        .d1{animation-delay:.05s} .d2{animation-delay:.12s} .d3{animation-delay:.18s} .d4{animation-delay:.24s} .d5{animation-delay:.30s}
        .brand-grad { background: linear-gradient(135deg, #f97316, #ec4899); }
        .input-field { width:100%; padding:12px 16px; border:2px solid #e5e7eb; border-radius:12px; font-size:14px; font-weight:500; outline:none; transition:border-color .2s, box-shadow .2s; font-family:inherit; color:#111; background:white; }
        .input-field:focus { border-color:#f97316; box-shadow:0 0 0 4px rgba(249,115,22,0.08); }
        .input-field::placeholder { color:#9ca3af; font-weight:400; }
        .input-field:disabled { background:#f9fafb; color:#9ca3af; cursor:not-allowed; }
        .btn-main { width:100%; padding:14px; border-radius:12px; font-size:15px; font-weight:800; color:white; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:transform .18s ease, box-shadow .18s ease; font-family:inherit; }
        .btn-main:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 24px rgba(249,115,22,0.38); }
        .btn-main:disabled { opacity:0.65; cursor:not-allowed; }
        .float-1 { animation: floatBadge 4s ease-in-out infinite; }
        .float-2 { animation: floatBadge 5s ease-in-out infinite; animation-delay: 1.8s; }
        .float-3 { animation: floatBadge 4.5s ease-in-out infinite; animation-delay: 0.9s; }
      `}</style>

      {/* ── Left panel — decorative ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(145deg, #fff7ed 0%, #fce7f3 50%, #ede9fe 100%)' }}>

        {/* Background circles */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-16 right-12 w-72 h-72 rounded-full blur-3xl opacity-40" style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.25), transparent 70%)' }} />
          <div className="absolute bottom-20 left-8 w-64 h-64 rounded-full blur-3xl opacity-35" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.2), transparent 70%)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl opacity-20" style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.2), transparent 70%)' }} />
        </div>

        {/* Logo */}
        <Link href="/" className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 brand-grad rounded-xl flex items-center justify-center" style={{ boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }}>
            <img src="/logo.png" alt="AddFame" style={{ width: "120%", height: "120%", objectFit: "contain" }} />
          </div>
          <span className="font-black text-xl tracking-tight text-gray-900">Add<span className="text-orange-500">Fame</span></span>
        </Link>

        {/* Center content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <h2 className="text-4xl font-black text-gray-900 leading-tight mb-4">
            Welcome back<br />
            <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontWeight: 400, color: '#f97316' }}>
              to your dashboard
            </span>
          </h2>
          <p className="text-gray-500 text-base leading-relaxed mb-10 max-w-sm">
            Manage your campaigns, track results, and connect with the best micro-influencers — all in one place.
          </p>

          {/* Floating UI cards */}
          <div className="space-y-3 max-w-xs">
            <div className="float-1 bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/60 flex items-center gap-3" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.07)' }}>
              <div className="w-10 h-10 brand-grad rounded-xl flex items-center justify-center flex-shrink-0" style={{ boxShadow: '0 3px 10px rgba(249,115,22,0.3)' }}>
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </div>
              <div>
                <p className="text-xs font-black text-gray-900">+42K views today</p>
                <p className="text-xs text-gray-400">Campaign "Summer 2025"</p>
              </div>
              <div className="ml-auto text-xs font-black text-green-500">↑ 18%</div>
            </div>

            <div className="float-2 bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/60 flex items-center gap-3 ml-6" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.07)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-purple-100">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" /></svg>
              </div>
              <div>
                <p className="text-xs font-black text-gray-900">3 new applicants</p>
                <p className="text-xs text-gray-400">Ready to review</p>
              </div>
            </div>

            <div className="float-3 bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/60 flex items-center gap-3" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.07)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-green-100">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="text-xs font-black text-gray-900">Video delivered!</p>
                <p className="text-xs text-gray-400">@maria.lifestyle · 24K followers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom social proof */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex -space-x-2">
            {['🧑', '👩', '👨', '👩'].map((e, i) => (
              <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-100 to-pink-100 border-2 border-white flex items-center justify-center text-xs">{e}</div>
            ))}
          </div>
          <p className="text-sm text-gray-500"><span className="font-black text-gray-900">1,200+ brands</span> trust AddFame</p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-10 justify-center fade-up">
            <div className="w-9 h-9 brand-grad rounded-xl flex items-center justify-center" style={{ boxShadow: '0 4px 14px rgba(249,115,22,0.35)' }}>
              <img src="/logo.png" alt="AddFame" style={{ width: "80%", height: "80%", objectFit: "contain" }} />
            </div>
            <span className="font-black text-xl tracking-tight">Influe<span className="text-orange-500">X</span></span>
          </Link>

          <div className="fade-up d1">
            <h1 className="text-3xl font-black text-gray-900 mb-1">Sign in</h1>
            <p className="text-gray-500 text-sm mb-8">
              Don't have an account?{' '}
              <Link href="/auth/register" className="text-orange-500 font-bold hover:text-orange-600 transition-colors">
                Create one free
              </Link>
            </p>
          </div>

          {error && (
            <div className="fade-up mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl p-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="fade-up d2">
              <label className="block text-sm font-black text-gray-700 mb-2">Email address</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="fade-up d3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-black text-gray-700">Password</label>
                <a href="/auth/forgot-password" className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors">Forgot password?</a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pr-12"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="fade-up d4 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="btn-main brand-grad"
                style={!loading ? { boxShadow: '0 6px 20px rgba(249,115,22,0.35)' } : {}}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>Sign In <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="fade-up d5 flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-semibold">OR</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Sign up CTA */}
          <div className="fade-up d5 text-center">
            <p className="text-sm text-gray-500 mb-3">New to AddFame?</p>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/auth/register?type=brand"
                className="flex items-center justify-center gap-2 border-2 border-orange-200 text-orange-600 font-black text-sm py-3 rounded-xl hover:bg-orange-50 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                I'm a Brand
              </Link>
              <Link href="/auth/register?type=influencer"
                className="flex items-center justify-center gap-2 border-2 border-purple-200 text-purple-600 font-black text-sm py-3 rounded-xl hover:bg-purple-50 transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                I'm an Influencer
              </Link>
            </div>
          </div>

          <p className="fade-up text-xs text-gray-400 text-center mt-8 leading-relaxed">
            By signing in you agree to our{' '}
            <a href="#" className="underline hover:text-gray-600 transition">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="underline hover:text-gray-600 transition">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoadingFallback />}>
      <LoginContent />
    </Suspense>
  )
}

function LoginLoadingFallback() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full border-t-orange-400 border-orange-100 animate-spin" style={{ borderWidth: '3px', borderStyle: 'solid' }} />
        <p className="text-sm font-medium text-gray-600">Loading...</p>
      </div>
    </div>
  )
}
