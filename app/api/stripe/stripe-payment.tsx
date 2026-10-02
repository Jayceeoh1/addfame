'use client'
// @ts-nocheck
import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CreditCard, CheckCircle, AlertCircle, Lock, Building2 } from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const fmt = (n: number) => `${n.toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON`

// ─── Billing details saved ────────────────────────────────────────────────────
type BillingDetails = {
  billing_company: string
  billing_cui: string
  billing_address: string
  billing_email: string
}

// ─── Inner checkout form ──────────────────────────────────────────────────────
function CheckoutForm({ amount, invoiceNumber, onSuccess, onCancel }: {
  amount: number
  invoiceNumber: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/brand/wallet?payment=success&invoice=${invoiceNumber}`,
      },
      redirect: 'if_required',
    })

    if (stripeError) {
      setError(stripeError.message || 'Plata a eșuat. Încearcă din nou.')
      setLoading(false)
      return
    }

    // Plată reușită fără redirect
    onSuccess()
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ fontFamily: 'inherit' }}>
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <Lock className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <p className="text-xs text-blue-700 font-medium">Plată securizată prin Stripe — cardul tău va fi salvat pentru plăți viitoare</p>
        </div>
        <PaymentElement options={{
          layout: 'tabs',
          defaultValues: { billingDetails: { address: { country: 'RO' } } }
        }} />
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onCancel}
          className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-600 border-2 border-gray-200 hover:bg-gray-50 transition">
          Înapoi
        </button>
        <button type="submit" disabled={!stripe || loading}
          className="flex-1 py-3 rounded-xl font-black text-sm text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,.35)' }}>
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Se procesează…</>
            : <><Lock className="w-4 h-4" /> Plătește {fmt(amount)}</>
          }
        </button>
      </div>
    </form>
  )
}

// ─── Main Stripe Payment Modal ────────────────────────────────────────────────
export function StripePaymentModal({ amount, onSuccess, onClose }: {
  amount: number
  onSuccess: () => void
  onClose: () => void
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function createIntent() {
      setLoading(true)
      try {
        const res = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setClientSecret(data.client_secret)
        setInvoiceNumber(data.invoice_number)
      } catch (err: any) {
        setError(err.message || 'Eroare la inițializare plată.')
      } finally {
        setLoading(false)
      }
    }
    createIntent()
  }, [amount])

  function handleSuccess() {
    setSuccess(true)
    setTimeout(() => { onSuccess(); onClose() }, 2500)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-black text-gray-900">Plată cu cardul</p>
              <p className="text-xs text-gray-400">Stripe · securizat</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition text-gray-500 text-lg font-bold">×</button>
        </div>

        <div className="p-6">
          {/* Suma */}
          <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 mb-5">
            <span className="text-sm text-gray-500 font-medium">Sumă de plătit</span>
            <span className="text-xl font-black text-indigo-600">{fmt(amount)}</span>
          </div>

          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="font-black text-gray-900 text-lg mb-1">Plată reușită! 🎉</p>
              <p className="text-sm text-gray-400">Creditele sunt adăugate în cont. Factură: <strong>{invoiceNumber}</strong></p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm text-gray-400">Se pregătește formularul de plată…</p>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-sm text-red-600 font-bold mb-4">{error}</p>
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition">Închide</button>
            </div>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#6366f1',
                  borderRadius: '12px',
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                }
              }
            }}>
              <CheckoutForm
                amount={amount}
                invoiceNumber={invoiceNumber}
                onSuccess={handleSuccess}
                onCancel={onClose}
              />
            </Elements>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ─── Billing Details Form (pentru Settings) ───────────────────────────────────
export function BillingDetailsForm() {
  const [details, setDetails] = useState<BillingDetails>({
    billing_company: '', billing_cui: '', billing_address: '', billing_email: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data } = await sb.from('brands')
        .select('billing_company, billing_cui, billing_address, billing_email, name, email')
        .eq('user_id', user.id).single()
      if (data) {
        setDetails({
          billing_company: data.billing_company || data.name || '',
          billing_cui: data.billing_cui || '',
          billing_address: data.billing_address || '',
          billing_email: data.billing_email || data.email || '',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  async function save() {
    setSaving(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    await sb.from('brands').update(details).eq('user_id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>

  return (
    <div className="space-y-4" style={{ fontFamily: 'inherit' }}>
      <div className="flex items-center gap-3 mb-2">
        <Building2 className="w-5 h-5 text-indigo-500" />
        <div>
          <p className="font-black text-gray-900">Date facturare</p>
          <p className="text-xs text-gray-400">Salvate și folosite automat la fiecare plată</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Nume firmă / Persoană</label>
          <input value={details.billing_company}
            onChange={e => setDetails(p => ({ ...p, billing_company: e.target.value }))}
            placeholder="Ex: TeleRom SRL"
            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 transition" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">CUI / CNP <span className="font-normal text-gray-400">(opțional)</span></label>
          <input value={details.billing_cui}
            onChange={e => setDetails(p => ({ ...p, billing_cui: e.target.value }))}
            placeholder="Ex: RO12345678"
            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 transition" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Adresă facturare</label>
          <input value={details.billing_address}
            onChange={e => setDetails(p => ({ ...p, billing_address: e.target.value }))}
            placeholder="Ex: Str. Victoriei 12, București, România"
            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 transition" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Email pentru facturi</label>
          <input type="email" value={details.billing_email}
            onChange={e => setDetails(p => ({ ...p, billing_email: e.target.value }))}
            placeholder="Ex: facturi@companie.ro"
            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-400 transition" />
        </div>
      </div>

      <button onClick={save} disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm text-white transition disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvez…</> :
          saved ? <><CheckCircle className="w-4 h-4" /> Salvat!</> :
            'Salvează datele'}
      </button>
    </div>
  )
}
