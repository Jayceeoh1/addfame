'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { validatePassword, BRAND_INDUSTRIES, COMPANY_SIZES, COUNTRIES } from '@/lib/constants/registration'
import { useRouter } from 'next/navigation'
import {
  Building2, Bell, Lock, Shield, Trash2, Download, Eye, EyeOff,
  CheckCircle, AlertCircle, User, Mail, Smartphone, Globe,
  CreditCard, LogOut, ChevronRight, Upload, Link2, X
} from 'lucide-react'
import { BillingDetailsForm } from '@/components/stripe/stripe-payment'

type Tab = 'brand' | 'notifications' | 'privacy' | 'security' | 'billing' | 'danger'

type NotificationSettings = {
  campaign_updates: boolean
  influencer_messages: boolean
  application_received: boolean
  deliverable_submitted: boolean
  payment_updates: boolean
  weekly_report: boolean
  email_notifications: boolean
  push_notifications: boolean
}

type PrivacySettings = {
  profile_public: boolean
  show_campaigns: boolean
  allow_influencer_contact: boolean
  show_company_size: boolean
}

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  campaign_updates: true,
  influencer_messages: true,
  application_received: true,
  deliverable_submitted: true,
  payment_updates: true,
  weekly_report: false,
  email_notifications: true,
  push_notifications: false,
}

const DEFAULT_PRIVACY: PrivacySettings = {
  profile_public: true,
  show_campaigns: true,
  allow_influencer_contact: true,
  show_company_size: false,
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

export default function BrandSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('brand')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const router = useRouter()

  // Brand info
  const [userId, setUserId] = useState<string | null>(null)
  const [brandId, setBrandId] = useState<string | null>(null)
  const [logo, setLogo] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [brandName, setBrandName] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [industry, setIndustry] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [country, setCountry] = useState('')
  const [phone, setPhone] = useState('')
  const [description, setDescription] = useState('')
  const [language, setLanguage] = useState('en')
  const [currency, setCurrency] = useState('EUR')

  // Password
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

  // Delete
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
        .from('brands')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setBrandId(data.id)
        setBrandName(data.name || '')
        setWebsite(data.website || '')
        setIndustry(data.industry || '')
        setCompanySize(data.company_size || '')
        setCountry(data.country || '')
        setPhone(data.phone || '')
        setDescription(data.description || '')
        setLogo(data.logo || null)
        setLogoPreview(data.logo || null)
        if (data.settings) {
          if (data.settings.notifications) setNotifications({ ...DEFAULT_NOTIFICATIONS, ...data.settings.notifications })
          if (data.settings.privacy) setPrivacy({ ...DEFAULT_PRIVACY, ...data.settings.privacy })
          if (data.settings.language) setLanguage(data.settings.language)
          if (data.settings.currency) setCurrency(data.settings.currency)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    if (file.size > 5 * 1024 * 1024) { setSaveError('Logo must be under 5MB.'); return }

    const objectUrl = URL.createObjectURL(file)
    setLogoPreview(objectUrl)
    setLogoUploading(true)
    setSaveError(null)

    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
      const path = `${userId}/logo.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('brand-logos')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) {
        // fallback to base64
        const reader = new FileReader()
        reader.onload = async () => {
          const base64 = reader.result as string
          setLogo(base64)
          setLogoPreview(base64)
          await supabase.from('brands').update({ logo: base64 }).eq('user_id', userId)
          setLogoUploading(false)
        }
        reader.readAsDataURL(file)
        return
      }

      const { data: { publicUrl } } = supabase.storage.from('brand-logos').getPublicUrl(path)
      const url = `${publicUrl}?t=${Date.now()}`
      setLogo(publicUrl)
      setLogoPreview(url)
      await supabase.from('brands').update({ logo: publicUrl }).eq('user_id', userId)
    } catch (err: any) {
      setSaveError('Failed to upload logo: ' + err.message)
      setLogoPreview(logo)
    } finally {
      setLogoUploading(false)
    }
  }

  async function saveBrandInfo() {
    setSaveError(null)
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: existing } = await supabase.from('brands').select('settings').eq('user_id', user.id).single()
      const currentSettings = existing?.settings || {}

      const { error } = await supabase.from('brands').update({
        name: brandName,
        website,
        industry,
        company_size: companySize,
        country,
        phone,
        description,
        settings: { ...currentSettings, language, currency },
      }).eq('user_id', user.id)

      if (error) throw error
      showSuccess()
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  async function saveSection(section: 'notifications' | 'privacy') {
    setSaveError(null)
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: existing } = await supabase.from('brands').select('settings').eq('user_id', user.id).single()
      const currentSettings = existing?.settings || {}
      const { error } = await supabase.from('brands').update({
        settings: {
          ...currentSettings,
          ...(section === 'notifications' && { notifications }),
          ...(section === 'privacy' && { privacy }),
        }
      }).eq('user_id', user.id)
      if (error) throw error
      showSuccess()
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  function showSuccess() {
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  async function handleChangePassword() {
    setPasswordError(null)
    setPasswordSuccess(false)
    const validation = validatePassword(newPassword)
    if (!validation.valid) { setPasswordErrors(validation.errors); return }
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return }
    setPasswordSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('Not authenticated')
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
      if (signInError) throw new Error('Current password is incorrect.')
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPasswordSuccess(true)
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordErrors([])
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.')
    } finally {
      setPasswordSaving(false)
    }
  }

  async function handleChangeEmail() {
    setEmailError(null)
    setEmailSuccess(false)
    if (!newEmail.trim() || !newEmail.includes('@')) { setEmailError('Please enter a valid email.'); return }
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
    const [brandRes, campaignsRes] = await Promise.all([
      supabase.from('brands').select('*').eq('user_id', user.id).single(),
      supabase.from('campaigns').select('*').eq('brand_id', brandId),
    ])
    const exportData = { brand: brandRes.data, campaigns: campaignsRes.data || [], exported_at: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `influex-brand-data-${new Date().toISOString().split('T')[0]}.json`
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
      await supabase.from('brands').delete().eq('user_id', user.id)
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
    { id: 'brand', label: 'Brand Profile', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Eye },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'danger', label: 'Danger Zone', icon: Trash2 },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">Manage your brand account, preferences and security</p>

      <div className="flex flex-col lg:flex-row gap-6">

        {/* Sidebar */}
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
        <div className="flex-1 space-y-5 min-w-0">

          {saveSuccess && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4 flex-shrink-0" /> Settings saved successfully.
            </div>
          )}
          {saveError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {saveError}
            </div>
          )}

          {/* BRAND PROFILE */}
          {activeTab === 'brand' && (
            <>
              {/* Logo */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-bold text-lg mb-5 flex items-center gap-2"><Building2 className="w-5 h-5" /> Brand Logo</h2>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center overflow-hidden ring-4 ring-primary/20">
                      {logoPreview
                        ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                        : <span className="text-white text-2xl font-bold">{brandName?.[0]?.toUpperCase() || 'B'}</span>
                      }
                    </div>
                    {logoUploading && (
                      <div className="absolute inset-0 rounded-xl bg-black/50 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <input type="file" accept="image/*" className="hidden" id="logo-upload" onChange={handleLogoChange} />
                    <label htmlFor="logo-upload">
                      <Button variant="outline" className="cursor-pointer mb-2" asChild disabled={logoUploading}>
                        <span><Upload className="w-4 h-4 mr-2" />{logoUploading ? 'Uploading...' : 'Upload Logo'}</span>
                      </Button>
                    </label>
                    <p className="text-xs text-muted-foreground">PNG, JPG or WEBP. Max 5MB. Recommended 400×400px.</p>
                    {logoPreview && (
                      <button onClick={() => { setLogoPreview(null); setLogo(null) }} className="text-xs text-destructive hover:underline mt-1 block">Remove logo</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Brand Info */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-bold text-lg mb-5">Brand Information</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Brand Name *</label>
                      <Input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Your Brand" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Industry *</label>
                      <select value={industry} onChange={e => setIndustry(e.target.value)} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm">
                        <option value="">Select industry</option>
                        {BRAND_INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Company Size</label>
                      <select value={companySize} onChange={e => setCompanySize(e.target.value)} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm">
                        <option value="">Select size</option>
                        {COMPANY_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Country</label>
                      <select value={country} onChange={e => setCountry(e.target.value)} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm">
                        <option value="">Select country</option>
                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Website</label>
                      <div className="relative">
                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input className="pl-9" type="url" placeholder="https://yourbrand.com" value={website} onChange={e => setWebsite(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Phone</label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input className="pl-9" placeholder="+40 712 345 678" value={phone} onChange={e => setPhone(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Brand Description</label>
                    <textarea
                      rows={4}
                      maxLength={600}
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Tell influencers about your brand, values, and what makes you unique..."
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground text-right mt-1">{description.length}/600</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Language</label>
                      <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm">
                        <option value="en">English</option>
                        <option value="ro">Romanian</option>
                        <option value="de">German</option>
                        <option value="fr">French</option>
                        <option value="es">Spanish</option>
                        <option value="it">Italian</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Currency</label>
                      <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm">
                        <option value="EUR">EUR (€)</option>
                        <option value="USD">USD ($)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="RON">RON (lei)</option>
                        <option value="CHF">CHF (Fr.)</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <Button onClick={saveBrandInfo} disabled={saving} className="bg-gradient-to-r from-primary to-accent">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>

              {/* Export */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-bold text-lg mb-2 flex items-center gap-2"><Download className="w-5 h-5" /> Export Data</h2>
                <p className="text-sm text-muted-foreground mb-4">Download all your brand data and campaigns as a JSON file.</p>
                <Button variant="outline" onClick={handleExportData}>
                  <Download className="w-4 h-4 mr-2" /> Export Data
                </Button>
              </div>
            </>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-bold text-lg mb-1 flex items-center gap-2"><Bell className="w-5 h-5" /> Notification Preferences</h2>
              <p className="text-sm text-muted-foreground mb-5">Choose what you want to be notified about.</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Channels</p>
              <div className="divide-y divide-border mb-5">
                <SettingRow label="Email Notifications" description="Receive notifications via email" checked={notifications.email_notifications} onChange={v => setNotifications(p => ({ ...p, email_notifications: v }))} />
                <SettingRow label="Push Notifications" description="Browser push notifications" checked={notifications.push_notifications} onChange={v => setNotifications(p => ({ ...p, push_notifications: v }))} />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Campaign Activity</p>
              <div className="divide-y divide-border">
                <SettingRow label="Campaign Updates" description="Status changes on your campaigns" checked={notifications.campaign_updates} onChange={v => setNotifications(p => ({ ...p, campaign_updates: v }))} />
                <SettingRow label="Applications Received" description="When an influencer applies to your campaign" checked={notifications.application_received} onChange={v => setNotifications(p => ({ ...p, application_received: v }))} />
                <SettingRow label="Deliverable Submitted" description="When an influencer submits content" checked={notifications.deliverable_submitted} onChange={v => setNotifications(p => ({ ...p, deliverable_submitted: v }))} />
                <SettingRow label="Influencer Messages" description="Direct messages from influencers" checked={notifications.influencer_messages} onChange={v => setNotifications(p => ({ ...p, influencer_messages: v }))} />
                <SettingRow label="Payment Updates" description="Credits, billing and payout activity" checked={notifications.payment_updates} onChange={v => setNotifications(p => ({ ...p, payment_updates: v }))} />
                <SettingRow label="Weekly Report" description="Summary of campaign performance every Monday" checked={notifications.weekly_report} onChange={v => setNotifications(p => ({ ...p, weekly_report: v }))} />
              </div>
              <div className="flex justify-end mt-6">
                <Button onClick={() => saveSection('notifications')} disabled={saving} className="bg-gradient-to-r from-primary to-accent">
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </div>
          )}

          {/* PRIVACY */}
          {activeTab === 'privacy' && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-bold text-lg mb-1 flex items-center gap-2"><Shield className="w-5 h-5" /> Privacy Settings</h2>
              <p className="text-sm text-muted-foreground mb-5">Control how your brand appears to influencers.</p>
              <div className="divide-y divide-border">
                <SettingRow label="Public Brand Profile" description="Your brand page is visible to influencers" checked={privacy.profile_public} onChange={v => setPrivacy(p => ({ ...p, profile_public: v }))} />
                <SettingRow label="Show Active Campaigns" description="List your campaigns publicly for influencers to discover" checked={privacy.show_campaigns} onChange={v => setPrivacy(p => ({ ...p, show_campaigns: v }))} />
                <SettingRow label="Allow Influencer Contact" description="Influencers can send you direct messages" checked={privacy.allow_influencer_contact} onChange={v => setPrivacy(p => ({ ...p, allow_influencer_contact: v }))} />
                <SettingRow label="Show Company Size" description="Display your company size on your profile" checked={privacy.show_company_size} onChange={v => setPrivacy(p => ({ ...p, show_company_size: v }))} />
              </div>
              <div className="flex justify-end mt-6">
                <Button onClick={() => saveSection('privacy')} disabled={saving} className="bg-gradient-to-r from-primary to-accent">
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </div>
          )}

          {/* SECURITY */}
          {activeTab === 'security' && (
            <>
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-bold text-lg mb-1 flex items-center gap-2"><Mail className="w-5 h-5" /> Change Email</h2>
                <p className="text-sm text-muted-foreground mb-5">A confirmation link will be sent to your new email.</p>
                {emailSuccess && <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2 text-sm text-green-600 mb-4"><CheckCircle className="w-4 h-4" /> Confirmation email sent! Check your inbox.</div>}
                {emailError && <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2 text-sm text-destructive mb-4"><AlertCircle className="w-4 h-4" /> {emailError}</div>}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Current Email</label>
                    <Input value={email} disabled className="bg-muted text-muted-foreground" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">New Email</label>
                    <Input type="email" placeholder="new@brand.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                  </div>
                  <Button onClick={handleChangeEmail} disabled={emailSaving || !newEmail} className="bg-gradient-to-r from-primary to-accent">
                    {emailSaving ? 'Sending...' : 'Update Email'}
                  </Button>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-bold text-lg mb-1 flex items-center gap-2"><Lock className="w-5 h-5" /> Change Password</h2>
                <p className="text-sm text-muted-foreground mb-5">Use a strong password with at least 8 characters, uppercase, numbers and special characters.</p>
                {passwordSuccess && <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2 text-sm text-green-600 mb-4"><CheckCircle className="w-4 h-4" /> Password changed successfully!</div>}
                {passwordError && <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2 text-sm text-destructive mb-4"><AlertCircle className="w-4 h-4" /> {passwordError}</div>}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Current Password</label>
                    <div className="relative">
                      <Input type={showCurrentPw ? 'text' : 'password'} placeholder="••••••••" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="pr-10" />
                      <button type="button" onClick={() => setShowCurrentPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">New Password</label>
                    <div className="relative">
                      <Input type={showNewPw ? 'text' : 'password'} placeholder="••••••••" value={newPassword} onChange={e => { setNewPassword(e.target.value); if (e.target.value) setPasswordErrors(validatePassword(e.target.value).errors) }} className="pr-10" />
                      <button type="button" onClick={() => setShowNewPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordErrors.length > 0 && <ul className="mt-2 space-y-1">{passwordErrors.map(e => <li key={e} className="text-xs text-destructive">• {e}</li>)}</ul>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                    <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    {confirmPassword && newPassword !== confirmPassword && <p className="text-xs text-destructive mt-1">Passwords do not match</p>}
                  </div>
                  <Button onClick={handleChangePassword} disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword} className="bg-gradient-to-r from-primary to-accent">
                    {passwordSaving ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* BILLING */}
          {activeTab === 'billing' && (
            <div className="space-y-5">
              {/* Date facturare salvate */}
              <div className="bg-card border border-border rounded-xl p-6">
                <BillingDetailsForm />
              </div>

              {/* Link către wallet */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-bold text-lg mb-1 flex items-center gap-2"><CreditCard className="w-5 h-5" /> Credite & Plăți</h2>
                <p className="text-sm text-muted-foreground mb-4">Gestionează creditele și istoricul plăților din Wallet.</p>
                <a href="/brand/wallet"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                  Mergi la Wallet →
                </a>
              </div>
            </div>
          )}

          {/* DANGER ZONE */}
          {activeTab === 'danger' && (
            <div className="bg-card border border-destructive/30 rounded-xl p-6">
              <h2 className="font-bold text-lg mb-1 text-destructive flex items-center gap-2"><Trash2 className="w-5 h-5" /> Danger Zone</h2>
              <p className="text-sm text-muted-foreground mb-6">These actions are irreversible. Please proceed with caution.</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Pause All Campaigns</p>
                    <p className="text-xs text-muted-foreground">Temporarily pause all active campaigns</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={async () => {
                    const supabase = createClient()
                    await supabase.from('campaigns').update({ status: 'PAUSED' }).eq('brand_id', brandId).eq('status', 'ACTIVE')
                    showSuccess()
                  }}>Pause All</Button>
                </div>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Deactivate Account</p>
                    <p className="text-xs text-muted-foreground">Temporarily hide your brand profile</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={async () => {
                    const supabase = createClient()
                    await supabase.from('brands').update({ approval_status: 'deactivated' }).eq('user_id', userId)
                    showSuccess()
                  }}>Deactivate</Button>
                </div>
                <div className="flex items-center justify-between p-4 border border-destructive/30 bg-destructive/5 rounded-lg">
                  <div>
                    <p className="font-medium text-sm text-destructive">Delete Account</p>
                    <p className="text-xs text-muted-foreground">Permanently delete your brand and all campaigns</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => setShowDeleteModal(true)}>Delete</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-destructive">Delete Brand Account</h2>
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirm('') }} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              This will permanently delete your brand profile, all campaigns, collaborations and data. This action <strong>cannot be undone</strong>.
            </p>
            <div className="mb-5">
              <label className="block text-sm font-medium mb-2">Type <strong>DELETE</strong> to confirm</label>
              <Input placeholder="DELETE" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setShowDeleteModal(false); setDeleteConfirm('') }}>Cancel</Button>
              <Button variant="destructive" className="flex-1" disabled={deleteConfirm !== 'DELETE' || deleteLoading} onClick={handleDeleteAccount}>
                {deleteLoading ? 'Deleting...' : 'Delete Forever'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
