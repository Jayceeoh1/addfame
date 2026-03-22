'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { validatePassword } from '@/lib/constants/registration'
import {
  Bell, Lock, Shield, Trash2, Download, Eye, EyeOff,
  CheckCircle, AlertCircle, ChevronRight, User, Mail,
  Smartphone, Globe, DollarSign, LogOut, Star, Zap,
  TrendingUp, Award, Wallet, Building2, CreditCard, Copy, Check, X, ArrowLeft, MapPin
} from 'lucide-react'
import { purchaseVerifiedBadgeWallet, initiateBadgeBankTransfer, getInfluencerStats } from '@/app/actions/badge'
const BADGE_PRICE = 50 // RON
import { useRouter } from 'next/navigation'

type Tab = 'account' | 'notifications' | 'privacy' | 'security' | 'verified' | 'identity' | 'danger'

type NotificationSettings = {
  campaign_opportunities: boolean
  messages_from_brands: boolean
  payment_updates: boolean
  weekly_digest: boolean
  application_updates: boolean
  new_followers: boolean
  email_notifications: boolean
  push_notifications: boolean
}

type PrivacySettings = {
  profile_public: boolean
  allow_brand_contact: boolean
  show_earnings: boolean
  show_social_stats: boolean
  discoverable: boolean
}

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  campaign_opportunities: true,
  messages_from_brands: true,
  payment_updates: true,
  weekly_digest: false,
  application_updates: true,
  new_followers: false,
  email_notifications: true,
  push_notifications: false,
}

const DEFAULT_PRIVACY: PrivacySettings = {
  profile_public: true,
  allow_brand_contact: true,
  show_earnings: false,
  show_social_stats: true,
  discoverable: true,
}

// ─── CityPicker cu Nominatim ──────────────────────────────────────────────────

function CityPicker({ value, onChange }: { value: string; onChange: (v: string, lat?: number, lon?: number) => void }) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node))
        setShowResults(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = async (q: string) => {
    if (q.length < 2) { setResults([]); setShowResults(false); return }
    setSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&addressdetails=1&limit=5&countrycodes=ro&featuretype=city`,
        { headers: { 'Accept-Language': 'ro', 'User-Agent': 'AddFame/1.0' } }
      )
      const data = await res.json()
      setResults(data)
      setShowResults(true)
    } catch { setResults([]) }
    finally { setSearching(false) }
  }

  const handleChange = (val: string) => {
    setQuery(val)
    onChange(val) // salvăm și textul liber
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 400)
  }

  const handleSelect = (r: any) => {
    const a = r.address
    const cityName = a.city || a.town || a.village || a.county || r.name || query
    setQuery(cityName)
    onChange(cityName, parseFloat(r.lat), parseFloat(r.lon))
    setShowResults(false)
    setResults([])
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="ex. Iași, Cluj-Napoca, București..."
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          className="w-full pl-9 pr-8 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
        )}
        {query && !searching && (
          <button type="button" onClick={() => { setQuery(''); onChange(''); setResults([]) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 bg-background border border-border rounded-lg shadow-lg overflow-hidden mt-1">
          {results.map((r: any) => {
            const a = r.address
            const cityName = a.city || a.town || a.village || a.county || r.name
            const region = a.county || a.state || ''
            return (
              <button key={r.place_id} type="button" onClick={() => handleSelect(r)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/50 transition text-left border-b border-border last:border-0">
                <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{cityName}</p>
                  {region && <p className="text-xs text-muted-foreground">{region}</p>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

function SettingRow({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 pr-4">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('account')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const router = useRouter()

  // Verified badge state
  const [isVerified, setIsVerified] = useState(false)
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null)
  const [badgeExpiresAt, setBadgeExpiresAt] = useState<string | null>(null)
  const [idVerifStatus, setIdVerifStatus] = useState<string>('unverified')
  const [idVerifRejReason, setIdVerifRejReason] = useState<string | null>(null)
  const [walletBalance, setWalletBalance] = useState(0)
  const [stats, setStats] = useState<{ total: number; completed: number; successRate: number; totalEarned: number; avgDays: number } | null>(null)
  const [influencerId, setInfluencerId] = useState<string | null>(null)

  // Badge purchase modal
  // step: null=closed | 'choose'=alegere metoda | 'bank_form'=detalii transfer | 'bank_instructions'=instructiuni | 'success'=succes
  const [badgeModal, setBadgeModal] = useState<null | 'choose' | 'bank_form' | 'bank_instructions' | 'wallet_confirm' | 'success'>(null)
  const [badgePayMethod, setBadgePayMethod] = useState<'wallet' | 'bank' | null>(null)
  const [badgeLoading, setBadgeLoading] = useState(false)
  const [badgeError, setBadgeError] = useState<string | null>(null)
  const [badgeSuccess, setBadgeSuccess] = useState(false)
  const [invoiceData, setInvoiceData] = useState<{ invoiceNumber: string; amount: number } | null>(null)
  const [billingName, setBillingName] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  // Account info
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [cityLat, setCityLat] = useState<number | null>(null)
  const [cityLon, setCityLon] = useState<number | null>(null)
  const [language, setLanguage] = useState('en')
  const [currency, setCurrency] = useState('RON')
  const [userId, setUserId] = useState<string | null>(null)

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // Email change
  const [newEmail, setNewEmail] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)

  // Notifications & Privacy
  const [notifications, setNotifications] = useState<NotificationSettings>(DEFAULT_NOTIFICATIONS)
  const [privacy, setPrivacy] = useState<PrivacySettings>(DEFAULT_PRIVACY)

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => { fetchSettings() }, [])

  async function fetchSettings() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      setEmail(user.email || '')

      const { data } = await supabase
        .from('influencers')
        .select('id, phone, city, settings, is_verified, verified_at, badge_expires_at, wallet_balance, verification_status, verification_rejection_reason')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setPhone(data.phone || '')
        setCity(data.city || '')
        setIsVerified(data.is_verified && data.badge_expires_at && new Date(data.badge_expires_at) > new Date() || false)
        setVerifiedAt(data.verified_at || null)
        setBadgeExpiresAt(data.badge_expires_at || null)
        setIdVerifStatus(data.verification_status || 'unverified')
        setIdVerifRejReason(data.verification_rejection_reason || null)
        setWalletBalance(data.wallet_balance || 0)
        setInfluencerId(data.id || null)
        if (data.settings) {
          if (data.settings.notifications) setNotifications({ ...DEFAULT_NOTIFICATIONS, ...data.settings.notifications })
          if (data.settings.privacy) setPrivacy({ ...DEFAULT_PRIVACY, ...data.settings.privacy })
          if (data.settings.language) setLanguage(data.settings.language)
          if (data.settings.currency) setCurrency(data.settings.currency)
        }
        if (data.id) {
          const s = await getInfluencerStats(data.id)
          setStats(s)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  function closeBadgeModal() {
    setBadgeModal(null)
    setBadgePayMethod(null)
    setBadgeLoading(false)
    setBadgeError(null)
    setBillingName('')
    setBillingAddress('')
    setInvoiceData(null)
  }

  async function handleWalletPurchase() {
    setBadgeError(null)
    setBadgeLoading(true)
    try {
      const result = await purchaseVerifiedBadgeWallet()
      if (result.error) { setBadgeError(result.error); return }
      setIsVerified(true)
      setVerifiedAt(new Date().toISOString())
      setWalletBalance(prev => prev - BADGE_PRICE)
      setBadgeSuccess(true)
      setBadgeModal('success')
    } catch (e: any) {
      setBadgeError(e.message || 'Purchase failed')
    } finally {
      setBadgeLoading(false)
    }
  }

  async function handleBankTransfer() {
    if (!billingName.trim()) { setBadgeError('Introdu numele pentru factură.'); return }
    setBadgeError(null)
    setBadgeLoading(true)
    try {
      const result = await initiateBadgeBankTransfer(billingName, billingAddress)
      if (result.error) { setBadgeError(result.error); return }
      setInvoiceData({ invoiceNumber: result.invoiceNumber!, amount: result.amount! })
      setBadgeModal('bank_instructions')
    } catch (e: any) {
      setBadgeError(e.message || 'Failed')
    } finally {
      setBadgeLoading(false)
    }
  }

  async function saveSettings(section: 'account' | 'notifications' | 'privacy') {
    setSaveError(null)
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: existing } = await supabase
        .from('influencers')
        .select('settings, phone')
        .eq('user_id', user.id)
        .single()

      const currentSettings = existing?.settings || {}

      const updatedSettings = {
        ...currentSettings,
        ...(section === 'notifications' && { notifications }),
        ...(section === 'privacy' && { privacy }),
        ...(section === 'account' && { language, currency }),
      }

      const updatePayload: Record<string, any> = { settings: updatedSettings }
      if (section === 'account') { updatePayload.phone = phone; updatePayload.city = city; if (cityLat) updatePayload.latitude = cityLat; if (cityLon) updatePayload.longitude = cityLon }

      const { error } = await supabase
        .from('influencers')
        .update(updatePayload)
        .eq('user_id', user.id)

      if (error) throw error

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    setPasswordError(null)
    setPasswordSuccess(false)

    const validation = validatePassword(newPassword)
    if (!validation.valid) {
      setPasswordErrors(validation.errors)
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    setPasswordSaving(true)
    try {
      const supabase = createClient()
      // Re-authenticate first
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('Not authenticated')

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (signInError) throw new Error('Current password is incorrect.')

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordErrors([])
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.')
    } finally {
      setPasswordSaving(false)
    }
  }

  async function handleChangeEmail() {
    setEmailError(null)
    setEmailSuccess(false)
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setEmailError('Please enter a valid email address.')
      return
    }

    setEmailSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) throw error
      setEmailSuccess(true)
      setNewEmail('')
    } catch (err: any) {
      setEmailError(err.message || 'Failed to update email.')
    } finally {
      setEmailSaving(false)
    }
  }

  async function handleExportData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: influencer } = await supabase
      .from('influencers')
      .select('*')
      .eq('user_id', user.id)
      .single()

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)

    const exportData = {
      profile: influencer,
      transactions: transactions || [],
      exported_at: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `influex-data-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE') return
    setDeleteLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      await supabase.from('influencers').delete().eq('user_id', user.id)
      await supabase.auth.signOut()
      router.replace('/auth/login')
    } catch (err: any) {
      setSaveError(err.message || 'Failed to delete account.')
      setDeleteLoading(false)
      setShowDeleteModal(false)
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/auth/login')
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Eye },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'verified', label: 'Verified Creator', icon: Star },
    { id: 'identity', label: 'Verificare ID', icon: Shield },
    { id: 'danger', label: 'Danger Zone', icon: Trash2 },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">Manage your account preferences and security</p>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:w-56 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition text-left ${activeTab === tab.id
                    ? 'bg-primary text-white'
                    : tab.id === 'danger'
                      ? 'text-destructive hover:bg-destructive/10'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {tab.label}
                </button>
              )
            })}
            <div className="pt-2 border-t border-border mt-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5">

          {/* Status messages */}
          {saveSuccess && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" /> Settings saved successfully.
            </div>
          )}
          {saveError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" /> {saveError}
            </div>
          )}

          {/* ACCOUNT TAB */}
          {activeTab === 'account' && (
            <>
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-bold text-lg mb-5 flex items-center gap-2"><User className="w-5 h-5" /> Account Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Current Email</label>
                    <Input value={email} disabled className="bg-muted text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mt-1">To change your email, use the Security tab.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone Number</label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder="+40 712 345 678"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* ── Orașul tău ── */}
                  <div>
                    <label className="block text-sm font-medium mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary" /> Orașul tău
                    </label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Folosit pentru a-ți arăta ofertele barter locale din zona ta.
                    </p>
                    <CityPicker value={city} onChange={(v, lat, lon) => { setCity(v); if (lat) setCityLat(lat); if (lon) setCityLon(lon) }} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Language</label>
                      <select
                        value={language}
                        onChange={e => setLanguage(e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                      >
                        <option value="en">English</option>
                        <option value="ro">Romanian</option>
                        <option value="de">German</option>
                        <option value="fr">French</option>
                        <option value="es">Spanish</option>
                        <option value="it">Italian</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Currency</label>
                      <select
                        value={currency}
                        onChange={e => setCurrency(e.target.value)}
                        className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
                      >
                        <option value="RON">RON</option>
                        <option value="USD">USD ($)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="RON">RON (lei)</option>
                        <option value="CHF">CHF (Fr.)</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <Button onClick={() => saveSettings('account')} disabled={saving} className="bg-gradient-to-r from-primary to-accent">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-bold text-lg mb-2 flex items-center gap-2"><Download className="w-5 h-5" /> Export My Data</h2>
                <p className="text-sm text-muted-foreground mb-4">Download all your profile data, transactions, and settings as a JSON file.</p>
                <Button variant="outline" onClick={handleExportData}>
                  <Download className="w-4 h-4 mr-2" /> Export Data
                </Button>
              </div>
            </>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-bold text-lg mb-1 flex items-center gap-2"><Bell className="w-5 h-5" /> Notification Preferences</h2>
              <p className="text-sm text-muted-foreground mb-5">Choose what you want to be notified about.</p>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Channels</p>
                <div className="divide-y divide-border">
                  <SettingRow label="Email Notifications" description="Receive notifications via email" checked={notifications.email_notifications} onChange={v => setNotifications(p => ({ ...p, email_notifications: v }))} />
                  <SettingRow label="Push Notifications" description="Browser push notifications" checked={notifications.push_notifications} onChange={v => setNotifications(p => ({ ...p, push_notifications: v }))} />
                </div>

                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-5 mb-2">Activity</p>
                <div className="divide-y divide-border">
                  <SettingRow label="Campaign Opportunities" description="New campaigns matching your niche" checked={notifications.campaign_opportunities} onChange={v => setNotifications(p => ({ ...p, campaign_opportunities: v }))} />
                  <SettingRow label="Messages from Brands" description="When a brand sends you a message" checked={notifications.messages_from_brands} onChange={v => setNotifications(p => ({ ...p, messages_from_brands: v }))} />
                  <SettingRow label="Application Updates" description="Status changes on your applications" checked={notifications.application_updates} onChange={v => setNotifications(p => ({ ...p, application_updates: v }))} />
                  <SettingRow label="Payment Updates" description="Payouts, earnings and wallet activity" checked={notifications.payment_updates} onChange={v => setNotifications(p => ({ ...p, payment_updates: v }))} />
                  <SettingRow label="Weekly Digest" description="Summary of activity every Monday" checked={notifications.weekly_digest} onChange={v => setNotifications(p => ({ ...p, weekly_digest: v }))} />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={() => saveSettings('notifications')} disabled={saving} className="bg-gradient-to-r from-primary to-accent">
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </div>
          )}

          {/* PRIVACY TAB */}
          {activeTab === 'privacy' && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-bold text-lg mb-1 flex items-center gap-2"><Shield className="w-5 h-5" /> Privacy Settings</h2>
              <p className="text-sm text-muted-foreground mb-5">Control who can see your profile and how brands can find you.</p>

              <div className="divide-y divide-border">
                <SettingRow label="Public Profile" description="Your profile is visible to brands and the public" checked={privacy.profile_public} onChange={v => setPrivacy(p => ({ ...p, profile_public: v }))} />
                <SettingRow label="Discoverable" description="Appear in search results for brands" checked={privacy.discoverable} onChange={v => setPrivacy(p => ({ ...p, discoverable: v }))} />
                <SettingRow label="Allow Brand Contact" description="Brands can send you direct messages" checked={privacy.allow_brand_contact} onChange={v => setPrivacy(p => ({ ...p, allow_brand_contact: v }))} />
                <SettingRow label="Show Social Stats" description="Display your follower counts publicly" checked={privacy.show_social_stats} onChange={v => setPrivacy(p => ({ ...p, show_social_stats: v }))} />
                <SettingRow label="Show Earnings" description="Display total earnings on your profile" checked={privacy.show_earnings} onChange={v => setPrivacy(p => ({ ...p, show_earnings: v }))} />
              </div>

              <div className="flex justify-end mt-6">
                <Button onClick={() => saveSettings('privacy')} disabled={saving} className="bg-gradient-to-r from-primary to-accent">
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <>
              {/* Change Email */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-bold text-lg mb-1 flex items-center gap-2"><Mail className="w-5 h-5" /> Change Email</h2>
                <p className="text-sm text-muted-foreground mb-5">A confirmation will be sent to your new email address.</p>

                {emailSuccess && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2 text-sm text-green-600 mb-4">
                    <CheckCircle className="w-4 h-4" /> Confirmation email sent! Check your inbox.
                  </div>
                )}
                {emailError && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2 text-sm text-destructive mb-4">
                    <AlertCircle className="w-4 h-4" /> {emailError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Current Email</label>
                    <Input value={email} disabled className="bg-muted text-muted-foreground" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">New Email</label>
                    <Input
                      type="email"
                      placeholder="new@example.com"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleChangeEmail} disabled={emailSaving || !newEmail} className="bg-gradient-to-r from-primary to-accent">
                    {emailSaving ? 'Sending...' : 'Update Email'}
                  </Button>
                </div>
              </div>

              {/* Change Password */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-bold text-lg mb-1 flex items-center gap-2"><Lock className="w-5 h-5" /> Change Password</h2>
                <p className="text-sm text-muted-foreground mb-5">Use a strong password with at least 8 characters, uppercase, numbers and special characters.</p>

                {passwordSuccess && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2 text-sm text-green-600 mb-4">
                    <CheckCircle className="w-4 h-4" /> Password changed successfully!
                  </div>
                )}
                {passwordError && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2 text-sm text-destructive mb-4">
                    <AlertCircle className="w-4 h-4" /> {passwordError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Current Password</label>
                    <div className="relative">
                      <Input
                        type={showCurrentPw ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button type="button" onClick={() => setShowCurrentPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">New Password</label>
                    <div className="relative">
                      <Input
                        type={showNewPw ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={e => { setNewPassword(e.target.value); if (e.target.value) setPasswordErrors(validatePassword(e.target.value).errors) }}
                        className="pr-10"
                      />
                      <button type="button" onClick={() => setShowNewPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordErrors.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {passwordErrors.map(e => <li key={e} className="text-xs text-destructive">• {e}</li>)}
                      </ul>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-destructive mt-1">Passwords do not match</p>
                    )}
                  </div>
                  <Button
                    onClick={handleChangePassword}
                    disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                    className="bg-gradient-to-r from-primary to-accent"
                  >
                    {passwordSaving ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* VERIFIED CREATOR TAB */}
          {activeTab === 'verified' && (
            <div className="space-y-5">

              {/* Current status */}
              {isVerified ? (
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-400 flex items-center justify-center shadow-lg flex-shrink-0">
                      <Star className="w-7 h-7 text-white fill-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-black text-amber-800 dark:text-amber-200">Verified Creator</h2>
                        <CheckCircle className="w-5 h-5 text-amber-600" />
                      </div>
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        Activ din {verifiedAt ? new Date(verifiedAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                      </p>
                      {/* Expiry info */}
                      {badgeExpiresAt && (
                        <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${new Date(badgeExpiresAt) < new Date(Date.now() + 7 * 86400000)
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                          }`}>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          {new Date(badgeExpiresAt) < new Date()
                            ? 'Expirat!'
                            : new Date(badgeExpiresAt) < new Date(Date.now() + 7 * 86400000)
                              ? `Expiră în ${Math.ceil((new Date(badgeExpiresAt).getTime() - Date.now()) / 86400000)} zile!`
                              : `Activ până pe ${new Date(badgeExpiresAt).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}`
                          }
                        </div>
                      )}
                    </div>
                    {/* Renew button */}
                    <button
                      onClick={() => setBadgeModal('choose')}
                      className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-200 transition"
                    >
                      Reînnoiește
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Apari primul', icon: TrendingUp, desc: 'În lista brandurilor' },
                      { label: 'Badge vizibil', icon: Star, desc: 'Pe profilul tău' },
                      { label: 'Statistici', icon: Award, desc: 'Rata de succes vizibilă' },
                    ].map(b => (
                      <div key={b.label} className="bg-white/60 dark:bg-black/20 rounded-xl p-3 text-center">
                        <b.icon className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                        <p className="text-xs font-bold text-amber-800 dark:text-amber-200">{b.label}</p>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400">{b.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-card border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-xl p-6">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Star className="w-7 h-7 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-foreground">Devino Verified Creator</h2>
                      <p className="text-sm text-muted-foreground">Abonament lunar · {BADGE_PRICE} RON/lună</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-5">
                    {[
                      { icon: TrendingUp, title: 'Apari primul în lista brandurilor', desc: 'Profilul tău e afișat înaintea influencerilor neverificați' },
                      { icon: Star, title: 'Badge ⭐ Verified pe profil', desc: 'Brandurile văd că ești un creator de încredere' },
                      { icon: Award, title: 'Statistici de succes vizibile', desc: 'Rata ta de succes și campaniile completate apar la branduri' },
                      { icon: Zap, title: 'Mai multe invitații', desc: 'Brandurile preferă influenceri verificați pentru campanii' },
                    ].map(b => (
                      <div key={b.title} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                          <b.icon className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{b.title}</p>
                          <p className="text-xs text-muted-foreground">{b.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {badgeError && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4 flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" /> {badgeError}
                    </div>
                  )}

                  {badgeSuccess && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-4 text-center">
                      <Star className="w-8 h-8 text-amber-500 fill-amber-400 mx-auto mb-2" />
                      <p className="font-black text-green-700">Felicitări! Ești acum Verified Creator!</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between bg-muted/40 rounded-xl px-4 py-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-primary" />
                      <span className="text-sm text-muted-foreground">Wallet disponibil</span>
                    </div>
                    <span className={`font-bold ${walletBalance >= BADGE_PRICE ? 'text-green-600' : 'text-destructive'}`}>
                      {walletBalance.toLocaleString('ro-RO')} RON
                    </span>
                  </div>

                  {badgeError && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-3 flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" /> {badgeError}
                    </div>
                  )}

                  <button
                    onClick={() => setBadgeModal('choose')}
                    className="w-full py-3.5 rounded-xl font-black text-sm text-white bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 transition flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Star className="w-4 h-4 fill-white" /> Activează Verified Creator — {BADGE_PRICE} RON/lună
                  </button>
                  <p className="text-xs text-muted-foreground text-center mt-2">Abonament lunar {BADGE_PRICE} RON/lună. Se reînnoiește automat.</p>
                </div>
              )}

              {/* Stats card */}
              {stats && (
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-primary" /> Statisticile tale de performanță</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Campanii totale', value: stats.total, color: 'text-foreground' },
                      { label: 'Completate', value: stats.completed, color: 'text-green-600' },
                      { label: 'Rată succes', value: `${stats.successRate}%`, color: stats.successRate >= 80 ? 'text-green-600' : stats.successRate >= 50 ? 'text-amber-600' : 'text-destructive' },
                      { label: 'Total câștigat', value: `${stats.totalEarned.toLocaleString('ro-RO')} RON`, color: 'text-primary' },
                    ].map(s => (
                      <div key={s.label} className="bg-muted/40 rounded-xl p-4 text-center">
                        <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {stats.total > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Rată succes</span>
                        <span className="text-xs font-bold">{stats.successRate}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${stats.successRate >= 80 ? 'bg-green-500' : stats.successRate >= 50 ? 'bg-amber-500' : 'bg-destructive'}`}
                          style={{ width: `${stats.successRate}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {isVerified && (
                    <p className="text-xs text-muted-foreground mt-4 text-center">Aceste statistici sunt vizibile brandurilor pe profilul tău</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* DANGER ZONE TAB */}
          {activeTab === 'identity' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-bold text-lg mb-1 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-500" /> Verificare identitate
                </h2>
                <p className="text-muted-foreground text-sm">Verifică-ți identitatea cu un document oficial</p>
              </div>

              {idVerifStatus === 'verified' && (
                <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-2xl p-6 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-7 h-7 text-green-500" />
                  </div>
                  <div>
                    <p className="font-black text-green-800 dark:text-green-300 text-lg">Identitate verificată ✓</p>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-0.5">Profilul tău are badge-ul de identitate verificată vizibil brandurilor.</p>
                  </div>
                </div>
              )}

              {idVerifStatus === 'pending' && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-2xl p-6 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-7 h-7 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-black text-amber-800 dark:text-amber-300 text-lg">În curs de verificare</p>
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-0.5">Documentele tale sunt în revizuire. Verificăm în 24-48 ore.</p>
                  </div>
                </div>
              )}

              {idVerifStatus === 'rejected' && (
                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                    <p className="font-black text-red-700 dark:text-red-300">Verificare respinsă</p>
                  </div>
                  {idVerifRejReason && (
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-xl p-3">
                      Motiv: {idVerifRejReason}
                    </p>
                  )}
                </div>
              )}

              {idVerifStatus === 'unverified' && (
                <div className="bg-card border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-2xl p-6">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <Shield className="w-7 h-7 text-indigo-500" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-foreground">Verifică-ți identitatea</h3>
                      <p className="text-sm text-muted-foreground">Buletin, pașaport sau permis auto</p>
                    </div>
                  </div>
                  <div className="space-y-3 mb-5">
                    {[
                      { title: 'Badge identitate verificată', desc: 'Apare pe profilul tău vizibil brandurilor' },
                      { title: 'Mai multă încredere', desc: 'Brandurile preferă creatori verificați' },
                      { title: 'Prioritate mai mare', desc: 'Apari mai sus în rezultate de căutare' },
                      { title: 'Protecție anti-fake', desc: 'Platforma e mai sigură pentru toți' },
                    ].map(b => (
                      <div key={b.title} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40">
                        <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0 mt-1.5" />
                        <div>
                          <p className="text-sm font-semibold">{b.title}</p>
                          <p className="text-xs text-muted-foreground">{b.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <a
                    href="/influencer/verify"
                    className="w-full py-3.5 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 transition hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                  >
                    <Shield className="w-4 h-4" /> Începe verificarea
                  </a>
                  <p className="text-xs text-muted-foreground text-center mt-2">Procesul durează 2 minute · Verificăm în 24-48h</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'danger' && (
            <div className="bg-card border border-destructive/30 rounded-xl p-6">
              <h2 className="font-bold text-lg mb-1 text-destructive flex items-center gap-2"><Trash2 className="w-5 h-5" /> Danger Zone</h2>
              <p className="text-sm text-muted-foreground mb-6">These actions are irreversible. Please proceed with caution.</p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Deactivate Account</p>
                    <p className="text-xs text-muted-foreground">Temporarily hide your profile from brands</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={async () => {
                    const supabase = createClient()
                    const { data: { user } } = await supabase.auth.getUser()
                    if (!user) return
                    await supabase.from('influencers').update({ approval_status: 'deactivated' }).eq('user_id', user.id)
                    setSaveSuccess(true)
                    setTimeout(() => setSaveSuccess(false), 3000)
                  }}>
                    Deactivate
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border border-destructive/30 bg-destructive/5 rounded-lg">
                  <div>
                    <p className="font-medium text-sm text-destructive">Delete Account</p>
                    <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => setShowDeleteModal(true)}>
                    Delete Account
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Badge Purchase Modal ─────────────────────────────────────────── */}
      {badgeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                {(badgeModal === 'bank_form' || badgeModal === 'wallet_confirm') && (
                  <button onClick={() => setBadgeModal('choose')} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground mr-1">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                <h2 className="font-black text-base">
                  {badgeModal === 'choose' && 'Alege metoda de plată'}
                  {badgeModal === 'wallet_confirm' && 'Confirmă plata din wallet'}
                  {badgeModal === 'bank_form' && 'Transfer bancar'}
                  {badgeModal === 'bank_instructions' && 'Instrucțiuni transfer'}
                  {badgeModal === 'success' && 'Felicitări!'}
                </h2>
              </div>
              <button onClick={closeBadgeModal} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">

              {/* ── STEP 1: Alege metoda ── */}
              {badgeModal === 'choose' && (
                <div className="space-y-3">

                  {/* Beneficii Verified Creator */}
                  <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-4 mb-4">
                    <p className="text-xs font-black text-amber-700 uppercase tracking-wider mb-3">⭐ Ce primești cu Verified Creator</p>
                    <div className="space-y-2">
                      {[
                        { icon: '🥇', text: 'Apari primul în lista brandurilor', sub: 'Vizibilitate maximă față de influencerii neverificați' },
                        { icon: '✅', text: 'Badge verificat pe profil', sub: 'Brandurile au mai multă încredere în tine' },
                        { icon: '📊', text: 'Statistici vizibile pentru branduri', sub: 'Rata de succes și colaborările afișate public' },
                        { icon: '🎯', text: 'Acces la campanii exclusive', sub: 'Unele branduri filtrează doar creatori verificați' },
                        { icon: '💬', text: 'Prioritate în inbox brandurilor', sub: 'Mesajele tale apar primele' },
                      ].map((b, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="text-base flex-shrink-0 mt-0.5">{b.icon}</span>
                          <div>
                            <p className="text-xs font-black text-gray-800">{b.text}</p>
                            <p className="text-[11px] text-gray-500">{b.sub}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-amber-200 flex items-center justify-between">
                      <span className="text-xs text-amber-700 font-semibold">Abonament lunar</span>
                      <span className="text-sm font-black text-amber-800">{BADGE_PRICE} RON/lună</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mb-2">
                    Anulezi oricând — badge-ul rămâne activ până la expirare.
                  </p>

                  {/* Wallet option */}
                  <button
                    onClick={() => setBadgeModal('wallet_confirm')}
                    className="w-full flex items-center gap-4 p-4 border-2 border-border rounded-xl hover:border-primary/50 hover:bg-muted/30 transition text-left group"
                  >
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">Din wallet</p>
                      <p className="text-xs text-muted-foreground">
                        {walletBalance >= BADGE_PRICE
                          ? <span className="text-green-600 font-semibold">Disponibil: {walletBalance.toLocaleString('ro-RO')} RON ✓</span>
                          : <span className="text-destructive">Insuficient — ai {walletBalance.toLocaleString('ro-RO')} RON</span>
                        }
                      </p>
                    </div>
                    {walletBalance >= BADGE_PRICE && (
                      <span className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded-lg">Instant</span>
                    )}
                  </button>

                  {/* Bank transfer option */}
                  <button
                    onClick={() => { setBadgeError(null); setBadgeModal('bank_form') }}
                    className="w-full flex items-center gap-4 p-4 border-2 border-border rounded-xl hover:border-primary/50 hover:bg-muted/30 transition text-left group"
                  >
                    <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">Transfer bancar</p>
                      <p className="text-xs text-muted-foreground">SEPA / SWIFT — confirmare în 1-3 zile</p>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg">Manual</span>
                  </button>

                  {/* Stripe — coming soon */}
                  <div className="w-full flex items-center gap-4 p-4 border-2 border-dashed border-border rounded-xl opacity-50 cursor-not-allowed">
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">Card online (Stripe)</p>
                      <p className="text-xs text-muted-foreground">Visa, Mastercard — instant</p>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-lg">În curând</span>
                  </div>
                </div>
              )}

              {/* ── STEP 2a: Confirmare wallet ── */}
              {badgeModal === 'wallet_confirm' && (
                <div className="space-y-4">
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-center">
                    <Star className="w-10 h-10 text-amber-500 fill-amber-400 mx-auto mb-2" />
                    <p className="font-black text-lg text-amber-800 dark:text-amber-200">Verified Creator</p>
                    <p className="text-sm text-amber-600">Abonament lunar · anulezi oricând</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b border-border text-sm">
                      <span className="text-muted-foreground">Preț badge</span>
                      <span className="font-bold">{BADGE_PRICE} RON</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border text-sm">
                      <span className="text-muted-foreground">Wallet înainte</span>
                      <span>{walletBalance.toLocaleString('ro-RO')} RON</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className="text-muted-foreground">Wallet după</span>
                      <span className="font-bold text-primary">{(walletBalance - BADGE_PRICE).toLocaleString('ro-RO')} RON</span>
                    </div>
                  </div>

                  {badgeError && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" /> {badgeError}
                    </div>
                  )}

                  <button
                    onClick={handleWalletPurchase}
                    disabled={badgeLoading}
                    className="w-full py-3.5 rounded-xl font-black text-sm text-white bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-lg"
                  >
                    {badgeLoading
                      ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Processing…</>
                      : <><Star className="w-4 h-4 fill-white" /> Activează — {BADGE_PRICE} RON/lună din wallet</>
                    }
                  </button>
                </div>
              )}

              {/* ── STEP 2b: Formular transfer bancar ── */}
              {badgeModal === 'bank_form' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Generăm o factură. Transferi {BADGE_PRICE} RON în contul AddFame și abonamentul lunar se activează după confirmare.</p>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Nume complet / Firmă *</label>
                    <input
                      type="text"
                      placeholder="Ex: Ionescu Maria"
                      value={billingName}
                      onChange={e => setBillingName(e.target.value)}
                      className="w-full px-3 py-2.5 border border-input rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Adresă (opțional)</label>
                    <input
                      type="text"
                      placeholder="Str. Exemplu 1, București"
                      value={billingAddress}
                      onChange={e => setBillingAddress(e.target.value)}
                      className="w-full px-3 py-2.5 border border-input rounded-xl bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  {badgeError && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" /> {badgeError}
                    </div>
                  )}

                  <button
                    onClick={handleBankTransfer}
                    disabled={badgeLoading || !billingName.trim()}
                    className="w-full py-3.5 rounded-xl font-black text-sm text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    {badgeLoading
                      ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Generez factura…</>
                      : <><Building2 className="w-4 h-4" /> Generează factura</>
                    }
                  </button>
                </div>
              )}

              {/* ── STEP 3: Instrucțiuni transfer ── */}
              {badgeModal === 'bank_instructions' && invoiceData && (
                <div className="space-y-4">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-green-700">Factură generată!</p>
                      <p className="text-xs text-green-600">Badge-ul se activează după ce confirmăm transferul.</p>
                    </div>
                  </div>

                  {/* Invoice number highlight */}
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Număr factură (referință plată)</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-black text-primary">{invoiceData.invoiceNumber}</p>
                      <button onClick={() => copyText(invoiceData.invoiceNumber, 'inv')} className="text-muted-foreground hover:text-primary transition">
                        {copied === 'inv' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Incluide acest număr ca referință în transfer</p>
                  </div>

                  {/* Bank details */}
                  <div className="border border-border rounded-xl overflow-hidden">
                    <div className="bg-blue-500/10 border-b border-blue-500/20 px-4 py-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <p className="font-bold text-sm text-blue-700">Detalii cont bancar AddFame</p>
                    </div>
                    <div className="p-4 space-y-2.5">
                      {[
                        { label: 'Beneficiar', value: 'AddFame SRL' },
                        { label: 'IBAN', value: 'RO49 AAAA 1B31 0075 9384 0000' },
                        { label: 'BIC / SWIFT', value: 'RNCBROBU' },
                        { label: 'Bancă', value: 'AddFame Financial Services' },
                        { label: 'Sumă', value: `\${invoiceData.amount} RON` },
                        { label: 'Referință', value: invoiceData.invoiceNumber },
                      ].map(row => (
                        <div key={row.label} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                          <span className="text-xs text-muted-foreground">{row.label}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold">{row.value}</span>
                            <button onClick={() => copyText(row.value, row.label)} className="text-muted-foreground hover:text-primary transition">
                              {copied === row.label ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="px-4 pb-4">
                      <div className="bg-amber-500/10 rounded-lg p-3 flex items-start gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700">Badge-ul se activează în 1-3 zile lucrătoare după confirmarea transferului de către echipa AddFame.</p>
                      </div>
                    </div>
                  </div>

                  <button onClick={closeBadgeModal} className="w-full py-3 rounded-xl font-bold text-sm border border-border hover:bg-muted transition">
                    Am înțeles, voi face transferul
                  </button>
                </div>
              )}

              {/* ── SUCCESS ── */}
              {badgeModal === 'success' && (
                <div className="text-center py-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-400 flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Star className="w-10 h-10 text-white fill-white" />
                  </div>
                  <h3 className="text-2xl font-black mb-2">Ești Verified Creator!</h3>
                  <p className="text-muted-foreground text-sm mb-6">Profilul tău apare acum primul în lista brandurilor. Succes!</p>
                  <button
                    onClick={closeBadgeModal}
                    className="w-full py-3.5 rounded-xl font-black text-sm text-white bg-gradient-to-r from-amber-400 to-yellow-500 shadow-lg"
                  >
                    Super, mulțumesc!
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-destructive mb-2">Delete Account</h2>
            <p className="text-sm text-muted-foreground mb-5">
              This will permanently delete your profile, all your data, transaction history and payment methods. This action <strong>cannot be undone</strong>.
            </p>
            <div className="mb-5">
              <label className="block text-sm font-medium mb-2">Type <strong>DELETE</strong> to confirm</label>
              <Input
                placeholder="DELETE"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setShowDeleteModal(false); setDeleteConfirm('') }}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={deleteConfirm !== 'DELETE' || deleteLoading}
                onClick={handleDeleteAccount}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Forever'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
