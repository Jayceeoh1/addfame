'use client'

// Plata cu cardul (Stripe) în fereastra „Adaugă credite”, în stilul paginii de wallet.
// Creditele se adaugă din webhook-ul Stripe (după confirmarea plății), iar factura ADDF se emite automat.

import { useEffect, useMemo, useState } from 'react'
import { loadStripe, type Stripe as StripeJs } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Loader2, Lock, AlertCircle } from 'lucide-react'

const PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
/** Plata cu cardul e disponibilă doar când cheia publică Stripe e setată în Vercel. */
export const CARD_PAYMENTS_ENABLED = PK.startsWith('pk_')

let stripePromise: Promise<StripeJs | null> | null = null
const getStripe = () => (stripePromise ||= loadStripe(PK))

const ron = (n: number) => `${n.toLocaleString('ro-RO', { maximumFractionDigits: 2 })} RON`

function Form({ amount, reference, onPaid, onBack }: { amount: number; reference: string; onPaid: (ref: string) => void; onBack: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pay(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setBusy(true); setError(null)
    const { error: err, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/brand/wallet?payment=card&ref=${encodeURIComponent(reference)}` },
      redirect: 'if_required',
    })
    setBusy(false)
    if (err) { setError(err.message || 'Plata nu a reușit. Încearcă din nou sau folosește alt card.'); return }
    if (paymentIntent && ['succeeded', 'processing'].includes(paymentIntent.status)) onPaid(reference)
    else setError('Plata nu a fost finalizată. Încearcă din nou.')
  }

  return (
    <form onSubmit={pay} className="tp-body" style={{ gap: 16 }}>
      <div className="tp-hero">
        <span className="bw-lbl">Plătești cu cardul</span>
        <span className="v">{ron(amount)}</span>
        <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,.75)' }}>Referință {reference} · factura ADDF se emite automat</span>
      </div>
      <PaymentElement options={{ layout: 'tabs', defaultValues: { billingDetails: { address: { country: 'RO' } } } }} />
      {error && (
        <div className="tp-alert" style={{ background: '#fde8e6', border: '1px solid #f3c9c4', color: '#b42318' }}>
          <AlertCircle className="w-4 h-4" style={{ flex: 'none', marginTop: 2 }} /><p>{error}</p>
        </div>
      )}
      <div className="tp-alert" style={{ background: '#f6f6fc', color: '#4a4770' }}>
        <Lock className="w-4 h-4" style={{ flex: 'none', marginTop: 2 }} />
        <p className="bu-xs">Plată securizată prin Stripe. Datele cardului nu ajung la AddFame. Banca îți poate cere confirmarea în aplicație (3D Secure).</p>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="bu-btn big" onClick={onBack} disabled={busy}>Înapoi</button>
        <button type="submit" className="bu-btn p big" style={{ flex: 1 }} disabled={!stripe || busy}>
          {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Se procesează…</> : <><Lock className="w-4 h-4" /> Plătește {ron(amount)}</>}
        </button>
      </div>
    </form>
  )
}

export default function CardCheckout({ amount, billing, onPaid, onBack }: {
  amount: number
  billing: Record<string, string>
  onPaid: (reference: string) => void
  onBack: () => void
}) {
  const [secret, setSecret] = useState<string | null>(null)
  const [reference, setReference] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/stripe/create-payment-intent', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, billing }),
    }).then(async r => {
      const d = await r.json().catch(() => ({}))
      if (!alive) return
      if (!r.ok) setError(d.error || 'Nu am putut pregăti plata.')
      else { setSecret(d.client_secret); setReference(d.invoice_number) }
    }).catch(() => alive && setError('Nu am putut pregăti plata. Verifică conexiunea.'))
    return () => { alive = false }
  }, [amount, billing])

  const options = useMemo(() => secret ? {
    clientSecret: secret,
    locale: 'ro' as const,
    appearance: {
      theme: 'stripe' as const,
      variables: { colorPrimary: '#5a35e6', colorText: '#14123a', colorDanger: '#b42318', borderRadius: '12px', fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif', spacingUnit: '4px' },
    },
  } : null, [secret])

  if (error) return (
    <div className="tp-body">
      <div className="tp-alert" style={{ background: '#fde8e6', border: '1px solid #f3c9c4', color: '#b42318' }}>
        <AlertCircle className="w-4 h-4" style={{ flex: 'none', marginTop: 2 }} /><p>{error}</p>
      </div>
      <button className="bu-btn big" onClick={onBack}>Înapoi</button>
    </div>
  )
  if (!options) return (
    <div className="tp-body" style={{ alignItems: 'center', padding: '48px 20px' }}>
      <Loader2 className="w-7 h-7 animate-spin" style={{ color: '#5a35e6' }} />
      <span className="bu-sm bu-muted">Se pregătește plata securizată…</span>
    </div>
  )
  return (
    <Elements stripe={getStripe()} options={options}>
      <Form amount={amount} reference={reference} onPaid={onPaid} onBack={onBack} />
    </Elements>
  )
}
