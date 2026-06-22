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
  CreditCard, LogOut, ChevronRight, Upload, Link2, X, Package
} from 'lucide-react'
import { BillingDetailsForm } from '@/components/stripe/stripe-payment'

type Tab = 'brand' | 'notifications' | 'privacy' | 'security' | 'billing' | 'shipping' | 'danger'

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
  const [shippingAddr, setShippingAddr] = useState({
    contact: '', phone: '', email: '',
    street: '', street_number: '', city: '', county: '', postal_code: '',
  })
  const [shippingSaving, setShippingSaving] = useState(false)
  const [shippingSaved, setShippingSaved] = useState(false)
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
          if (data.settings.shipping_address) setShippingAddr(prev => ({ ...prev, ...data.settings.shipping_address }))
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
    if (newPassword !== confirmPassword) { setPasswordError('Parolele nu se potrivesc.'); return }
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

  async function saveShippingAddress() {
    setShippingSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: existing } = await supabase.from('brands').select('settings').eq('user_id', user.id).single()
      const current = existing?.settings || {}
      await supabase.from('brands').update({
        settings: { ...current, shipping_address: shippingAddr }
      }).eq('user_id', user.id)
      setShippingSaved(true)
      setTimeout(() => setShippingSaved(false), 3000)
    } catch (e) { console.error(e) }
    finally { setShippingSaving(false) }
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'brand', label: 'Brand Profile', icon: Building2 },
    { id: 'notifications', label: 'Notificări', icon: Bell },
    { id: 'privacy', label: 'Confidențialitate', icon: Eye },
    { id: 'security', label: 'Securitate', icon: Lock },
    { id: 'billing', label: 'Facturare', icon: CreditCard },
    { id: 'shipping', label: 'Adresă expediere', icon: Package },
    { id: 'danger', label: 'Zonă Periculoasă', icon: Trash2 },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">Gestionează contul, preferințele și securitatea brandului</p>

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
                      <button onClick={() => { setLogoPreview(null); setLogo(null) }} className="text-xs text-destructive hover:underline mt-1 block">Șterge logo</button>
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
                      <Input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Numele brandului tău" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Industry *</label>
                      <select value={industry} onChange={e => setIndustry(e.target.value)} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm">
                        <option value="">Selectează industria</option>
                        {BRAND_INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Mărimea companiei</label>
                      <select value={companySize} onChange={e => setCompanySize(e.target.value)} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm">
                        <option value="">Selectează mărimea</option>
                        {COMPANY_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Country</label>
                      <select value={country} onChange={e => setCountry(e.target.value)} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm">
                        <option value="">Selectează țara</option>
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
                      placeholder="Spune influencerilor despre brandul tău, valorile tale și ce te face unic..."
                      className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground text-right mt-1">{description.length}/600</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Language</label>
                      <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm">
                        <option value="en">Engleză</option>
                        <option value="ro">Română</option>
                        <option value="de">Germană</option>
                        <option value="fr">Franceză</option>
                        <option value="es">Spaniolă</option>
                        <option value="it">Italiană</option>
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
                <p className="text-sm text-muted-foreground mb-4">Descarcă toate datele brandului și campaniile ca fișier JSON.</p>
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
              <p className="text-sm text-muted-foreground mb-5">Alege despre ce vrei să fii notificat.</p>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Channels</p>
              <div className="divide-y divide-border mb-5">
                <SettingRow label="Notificări Email" description="Primește notificări prin email" checked={notifications.email_notifications} onChange={v => setNotifications(p => ({ ...p, email_notifications: v }))} />
                <SettingRow label="Notificări Push" description="Notificări push în browser" checked={notifications.push_notifications} onChange={v => setNotifications(p => ({ ...p, push_notifications: v }))} />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Campaign Activity</p>
              <div className="divide-y divide-border">
                <SettingRow label="Actualizări Campanii" description="Modificări de status pe campaniile tale" checked={notifications.campaign_updates} onChange={v => setNotifications(p => ({ ...p, campaign_updates: v }))} />
                <SettingRow label="Aplicații Primite" description="Când un influencer aplică la campania ta" checked={notifications.application_received} onChange={v => setNotifications(p => ({ ...p, application_received: v }))} />
                <SettingRow label="Conținut Trimis" description="Când un influencer trimite conținut" checked={notifications.deliverable_submitted} onChange={v => setNotifications(p => ({ ...p, deliverable_submitted: v }))} />
                <SettingRow label="Mesaje de la Influenceri" description="Mesaje directe de la influenceri" checked={notifications.influencer_messages} onChange={v => setNotifications(p => ({ ...p, influencer_messages: v }))} />
                <SettingRow label="Actualizări Plăți" description="Activitate credite, facturare și plăți" checked={notifications.payment_updates} onChange={v => setNotifications(p => ({ ...p, payment_updates: v }))} />
                <SettingRow label="Raport Săptămânal" description="Rezumat al performanței campaniilor în fiecare luni" checked={notifications.weekly_report} onChange={v => setNotifications(p => ({ ...p, weekly_report: v }))} />
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
              <p className="text-sm text-muted-foreground mb-5">Controlează cum apare brandul tău influencerilor.</p>
              <div className="divide-y divide-border">
                <SettingRow label="Profil Brand Public" description="Pagina brandului tău este vizibilă influencerilor" checked={privacy.profile_public} onChange={v => setPrivacy(p => ({ ...p, profile_public: v }))} />
                <SettingRow label="Afișează Campaniile Active" description="Listează campaniile tale public pentru influenceri" checked={privacy.show_campaigns} onChange={v => setPrivacy(p => ({ ...p, show_campaigns: v }))} />
                <SettingRow label="Permite Contact de la Influenceri" description="Influencerii îți pot trimite mesaje directe" checked={privacy.allow_influencer_contact} onChange={v => setPrivacy(p => ({ ...p, allow_influencer_contact: v }))} />
                <SettingRow label="Afișează Mărimea Companiei" description="Afișează mărimea companiei pe profilul tău" checked={privacy.show_company_size} onChange={v => setPrivacy(p => ({ ...p, show_company_size: v }))} />
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
                <p className="text-sm text-muted-foreground mb-5">Un link de confirmare va fi trimis la noul tău email.</p>
                {emailSuccess && <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2 text-sm text-green-600 mb-4"><CheckCircle className="w-4 h-4" /> Confirmation email sent! Check your inbox.</div>}
                {emailError && <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2 text-sm text-destructive mb-4"><AlertCircle className="w-4 h-4" /> {emailError}</div>}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Current Email</label>
                    <Input value={email} disabled className="bg-muted text-muted-foreground" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email Nou</label>
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
                    <label className="block text-sm font-medium mb-2">Parolă Nouă</label>
                    <div className="relative">
                      <Input type={showNewPw ? 'text' : 'password'} placeholder="••••••••" value={newPassword} onChange={e => { setNewPassword(e.target.value); if (e.target.value) setPasswordErrors(validatePassword(e.target.value).errors) }} className="pr-10" />
                      <button type="button" onClick={() => setShowNewPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordErrors.length > 0 && <ul className="mt-2 space-y-1">{passwordErrors.map(e => <li key={e} className="text-xs text-destructive">• {e}</li>)}</ul>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Confirmă Parola Nouă</label>
                    <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    {confirmPassword && newPassword !== confirmPassword && <p className="text-xs text-destructive mt-1">Parolele nu se potrivesc</p>}
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


          {/* SHIPPING ADDRESS */}
          {activeTab === 'shipping' && (
            <div className="space-y-6">
              <div className="bg-card border rounded-xl p-6">
                <div className="flex items-center gap-3 mb-1">
                  <Package className="w-5 h-5 text-indigo-500" />
                  <h2 className="font-bold text-lg">Adresă expediere colete</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  Adresa de unde pleacă coletele către influenceri. Se folosește automat când generezi AWB prin eAWB.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Persoana de contact *</label>
                    <Input value={shippingAddr.contact}
                      onChange={e => setShippingAddr(p => ({ ...p, contact: e.target.value }))}
                      placeholder="Nume complet sau firma" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Telefon *</label>
                    <Input value={shippingAddr.phone}
                      onChange={e => setShippingAddr(p => ({ ...p, phone: e.target.value }))}
                      placeholder="07XXXXXXXX" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Email (opțional)</label>
                    <Input value={shippingAddr.email}
                      onChange={e => setShippingAddr(p => ({ ...p, email: e.target.value }))}
                      placeholder="contact@firma.ro" type="email" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Stradă *</label>
                    <Input value={shippingAddr.street}
                      onChange={e => setShippingAddr(p => ({ ...p, street: e.target.value }))}
                      placeholder="Strada Exemplu" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Număr *</label>
                    <Input value={shippingAddr.street_number}
                      onChange={e => setShippingAddr(p => ({ ...p, street_number: e.target.value }))}
                      placeholder="10, bl. A, sc. 1, ap. 5" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Oraș *</label>
                    <Input value={shippingAddr.city}
                      onChange={e => setShippingAddr(p => ({ ...p, city: e.target.value }))}
                      placeholder="București" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Județ *</label>
                    <Input value={shippingAddr.county}
                      onChange={e => setShippingAddr(p => ({ ...p, county: e.target.value }))}
                      placeholder="Ilfov" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Cod poștal *</label>
                    <Input value={shippingAddr.postal_code}
                      onChange={e => setShippingAddr(p => ({ ...p, postal_code: e.target.value }))}
                      placeholder="077190" />
                  </div>
                </div>

                {/* Preview */}
                {shippingAddr.contact && shippingAddr.street && (
                  <div className="mt-5 bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                    <p className="text-xs font-black text-indigo-600 uppercase tracking-wider mb-2">Preview adresă expeditor</p>
                    <p className="text-sm font-bold text-gray-800">{shippingAddr.contact}</p>
                    {shippingAddr.phone && <p className="text-xs text-gray-600">📞 {shippingAddr.phone}</p>}
                    <p className="text-xs text-gray-600">🏠 {shippingAddr.street} {shippingAddr.street_number}</p>
                    <p className="text-xs text-gray-600">📍 {shippingAddr.city}, {shippingAddr.county} {shippingAddr.postal_code}</p>
                  </div>
                )}

                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400">* Câmpuri obligatorii pentru generarea AWB</p>
                  <button onClick={saveShippingAddress} disabled={shippingSaving}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition disabled:opacity-60 ${shippingSaved ? 'bg-green-500' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                    {shippingSaving ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Se salvează...</>
                    ) : shippingSaved ? (
                      <><CheckCircle className="w-4 h-4" />Salvat!</>
                    ) : (
                      <><Package className="w-4 h-4" />Salvează adresa</>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-700">
                  <p className="font-bold mb-1">Cum funcționează</p>
                  <p>Când generezi un AWB din secțiunea Colaborări, adresa de mai sus se folosește automat ca adresă expeditor. Influencerul primește coletul la adresa lui salvată la aplicare.</p>
                </div>
              </div>
            </div>
          )}

          {/* DANGER ZONE */}
          {activeTab === 'danger' && (
            <div className="bg-card border border-destructive/30 rounded-xl p-6">
              <h2 className="font-bold text-lg mb-1 text-destructive flex items-center gap-2"><Trash2 className="w-5 h-5" /> Danger Zone</h2>
              <p className="text-sm text-muted-foreground mb-6">Aceste acțiuni sunt ireversibile. Te rugăm să procedezi cu atenție.</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Pausează Toate Campaniile</p>
                    <p className="text-xs text-muted-foreground">Pausează temporar toate campaniile active</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={async () => {
                    const supabase = createClient()
                    await supabase.from('campaigns').update({ status: 'PAUSED' }).eq('brand_id', brandId).eq('status', 'ACTIVE')
                    showSuccess()
                  }}>Pausează Tot</Button>
                </div>
                <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Dezactivează Contul</p>
                    <p className="text-xs text-muted-foreground">Ascunde temporar profilul brandului tău</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={async () => {
                    const supabase = createClient()
                    await supabase.from('brands').update({ approval_status: 'deactivated' }).eq('user_id', userId)
                    showSuccess()
                  }}>Dezactivează</Button>
                </div>
                <div className="flex items-center justify-between p-4 border border-destructive/30 bg-destructive/5 rounded-lg">
                  <div>
                    <p className="font-medium text-sm text-destructive">Șterge Contul</p>
                    <p className="text-xs text-muted-foreground">Șterge permanent brandul și toate campaniile</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => setShowDeleteModal(true)}>Șterge</Button>
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
              <h2 className="text-xl font-bold text-destructive">Șterge Contul de Brand</h2>
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirm('') }} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Aceasta va șterge permanent profilul brandului, toate campaniile, colaborările și datele. Această acțiune <strong>nu poate fi anulată</strong>.
            </p>
            <div className="mb-5">
              <label className="block text-sm font-medium mb-2">Scrie <strong>DELETE</strong> pentru confirmare</label>
              <Input placeholder="DELETE" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setShowDeleteModal(false); setDeleteConfirm('') }}>Anulează</Button>
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
