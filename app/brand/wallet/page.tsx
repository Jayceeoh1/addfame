'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Wallet, TrendingUp, ArrowUpRight, ArrowDownLeft, Clock,
  CheckCircle, XCircle, AlertCircle, X, Plus, CreditCard,
  Briefcase, Download, Receipt, BarChart3, Calendar,
  Building2, Smartphone, Globe, ChevronRight, Copy, Check,
  FileText, Printer, Shield, Info, Lock, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { COMPANY, BANK, REVOLUT, WISE, PAYPAL, CRYPTO, TOPUP_MIN, TOPUP_MAX, VAT_RATE } from '@/lib/payment-config'
import { StripePaymentModal } from '@/components/stripe/stripe-payment'

// ─── Types ─────────────────────────────────────────────────────────────────────
type Transaction = {
  id: string
  type: 'TOPUP' | 'SPEND' | 'REFUND' | 'RESERVE'
  amount: number
  description: string
  status: 'completed' | 'pending' | 'failed'
  payment_method?: string
  invoice_number?: string
  billing_details?: Record<string, string>
  created_at: string
}
type CampaignRow = { id: string; title: string; budget: number; status: string }
type BrandWallet = { credits_balance: number; credits_reserved: number; total_spent: number; credits_expires_at?: string | null }
type BrandInfo = {
  id: string; name: string; email: string
  website?: string; country?: string; phone?: string
  company_size?: string; industry?: string
}

// ─── Payment methods config (din lib/payment-config.ts) ──────────────────────
const ALL_PAYMENT_METHODS = [
  {
    id: 'bank_transfer',
    label: 'Transfer Bancar',
    icon: Building2,
    color: 'text-blue-600',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    description: `${BANK.name} · IBAN`,
    active: true, // mereu activ
    details: {
      'Bancă': BANK.name,
      'IBAN': BANK.iban,
      'BIC / SWIFT': BANK.bic,
      'Beneficiar': BANK.holder,
      'Referință': '← folosește numărul facturii',
    },
    note: 'Creditele sunt adăugate în 1-3 zile lucrătoare după confirmarea plății.',
  },
  {
    id: 'revolut',
    label: 'Revolut',
    icon: Smartphone,
    color: 'text-cyan-600',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    description: 'Transfer Revolut Business',
    active: REVOLUT.active,
    details: {
      'Revolut Tag': REVOLUT.tag,
      'Cont Business': REVOLUT.account,
      'Notă': '← include numărul facturii',
    },
    note: 'Instant sau până la 1 zi lucrătoare. Creditat după confirmare.',
  },
  {
    id: 'wise',
    label: 'Wise',
    icon: Globe,
    color: 'text-green-600',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    description: 'Transfer internațional',
    active: WISE.active,
    details: {
      'Email Wise': WISE.email,
      'Beneficiar': WISE.holder,
      'Notă': '← include numărul facturii',
    },
    note: 'Comisioane mici pentru transferuri internaționale. Creditat în 1-2 zile.',
  },
  {
    id: 'paypal',
    label: 'PayPal',
    icon: CreditCard,
    color: 'text-indigo-600',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    description: 'Trimite prin PayPal',
    active: PAYPAL.active,
    details: {
      'Email PayPal': PAYPAL.email,
      'Notă': '← include numărul facturii',
    },
    note: 'Creditele sunt adăugate în câteva ore după confirmarea plății.',
  },
  {
    id: 'crypto',
    label: 'Crypto',
    icon: Shield,
    color: 'text-orange-600',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    description: 'USDT / USDC',
    active: CRYPTO.active,
    details: {
      'Rețea': CRYPTO.network,
      'Adresă Wallet': CRYPTO.address,
      'Acceptat și pe': CRYPTO.also,
      'Notă': '← include numărul facturii în memo',
    },
    note: 'Valoare echivalentă RON la momentul primirii. Creditat în câteva ore.',
  },
]

// Afișăm doar metodele active
const PAYMENT_METHODS = ALL_PAYMENT_METHODS.filter(m => m.active)

const PRESET_AMOUNTS = [
  { value: 100, popular: false },
  { value: 250, popular: false },
  { value: 500, popular: true },
  { value: 1000, popular: false },
  { value: 2500, popular: false },
  { value: 5000, popular: false },
]

const TX_META: Record<string, { text: string; bg: string; badge: string; label: string }> = {
  TOPUP: { text: 'text-green-600', bg: 'bg-green-500/10', badge: 'bg-green-500/10 text-green-600', label: 'Top-up' },
  REFUND: { text: 'text-blue-600', bg: 'bg-blue-500/10', badge: 'bg-blue-500/10 text-blue-600', label: 'Refund' },
  SPEND: { text: 'text-destructive', bg: 'bg-destructive/10', badge: 'bg-destructive/10 text-destructive', label: 'Spend' },
  RESERVE: { text: 'text-amber-600', bg: 'bg-amber-500/10', badge: 'bg-amber-500/10 text-amber-600', label: 'Reserved' },
}

const CAMPAIGN_COLORS: Record<string, string> = {
  ACTIVE: 'bg-blue-500/10 text-blue-600', LIVE: 'bg-blue-500/10 text-blue-600',
  COMPLETED: 'bg-green-500/10 text-green-600', DRAFT: 'bg-muted text-muted-foreground',
  PAUSED: 'bg-amber-500/10 text-amber-600',
}

const fmt = (n: number) => `${n.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} RON`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtDateTime = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// ─── Invoice generator (HTML → print/download) ────────────────────────────────
function generateInvoiceHTML(tx: Transaction, brand: BrandInfo, amount: number): string {
  const date = new Date(tx.created_at)
  const dueDate = new Date(date)
  dueDate.setDate(dueDate.getDate() + 7)
  const fmt2 = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const vat = (amount * 0.19).toFixed(2)
  const subtotal = (amount / 1.19).toFixed(2)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Invoice ${tx.invoice_number} — AddFame</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111; background: #fff; font-size: 14px; line-height: 1.5; }
  .page { max-width: 760px; margin: 0 auto; padding: 48px 48px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
  .logo { display: flex; align-items: center; gap: 10px; }
  .logo-mark { width: 44px; height: 44px; background: linear-gradient(135deg, #7c3aed, #06b6d4); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 18px; }
  .logo-text { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
  .invoice-badge { background: #f3f0ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 10px 16px; text-align: right; }
  .invoice-badge .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; }
  .invoice-badge .number { font-size: 20px; font-weight: 800; color: #7c3aed; margin-top: 2px; }
  .status-badge { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 3px 10px; border-radius: 20px; margin-top: 4px; background: ${tx.status === 'completed' ? '#d1fae5' : '#fef3c7'}; color: ${tx.status === 'completed' ? '#065f46' : '#92400e'}; }
  .divider { height: 1px; background: #e5e7eb; margin: 32px 0; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
  .party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; margin-bottom: 10px; }
  .party-name { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
  .party-detail { color: #6b7280; font-size: 13px; line-height: 1.6; }
  .dates { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; background: #f9fafb; border-radius: 12px; padding: 18px 24px; margin-bottom: 36px; }
  .date-item .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 4px; }
  .date-item .value { font-weight: 600; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
  thead tr { background: #7c3aed; color: white; }
  thead th { padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
  thead th:last-child { text-align: right; }
  tbody tr { border-bottom: 1px solid #f3f4f6; }
  tbody td { padding: 14px 16px; font-size: 13px; }
  tbody td:last-child { text-align: right; font-weight: 600; }
  .totals { display: flex; justify-content: flex-end; }
  .totals-table { min-width: 260px; }
  .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; color: #6b7280; }
  .totals-row.total { border-top: 2px solid #7c3aed; margin-top: 8px; padding-top: 14px; font-size: 18px; font-weight: 800; color: #111; }
  .totals-row.total span:last-child { color: #7c3aed; }
  .payment-section { background: #f9fafb; border-radius: 12px; padding: 20px 24px; margin-bottom: 32px; }
  .payment-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 12px; }
  .payment-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .payment-row { font-size: 13px; }
  .payment-row .key { color: #6b7280; }
  .payment-row .val { font-weight: 600; color: #111; }
  .notes { border-left: 3px solid #7c3aed; padding: 12px 16px; background: #f5f3ff; border-radius: 0 8px 8px 0; margin-bottom: 32px; font-size: 13px; color: #5b21b6; }
  .footer { text-align: center; color: #9ca3af; font-size: 12px; padding-top: 24px; border-top: 1px solid #e5e7eb; }
  @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .page { padding: 32px; } }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="logo">
      <div class="logo-mark">IX</div>
      <div>
        <div class="logo-text">AddFame</div>
        <div style="font-size:12px;color:#6b7280">Influencer Marketing Platform</div>
      </div>
    </div>
    <div class="invoice-badge">
      <div class="label">Invoice</div>
      <div class="number">${tx.invoice_number}</div>
      <div><span class="status-badge">${tx.status === 'completed' ? 'PAID' : 'PENDING PAYMENT'}</span></div>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="party-label">From</div>
      <div class="party-name">${COMPANY.name}</div>
      <div class="party-detail">
        ${COMPANY.address}<br/>
        ${COMPANY.country} · CUI: ${COMPANY.cui}<br/>
        ${COMPANY.email}<br/>
        ${COMPANY.website}
      </div>
    </div>
    <div>
      <div class="party-label">Bill To</div>
      <div class="party-name">${brand.name}</div>
      <div class="party-detail">
        ${brand.email}<br/>
        ${brand.website ? brand.website + '<br/>' : ''}
        ${brand.country ? brand.country : ''}
      </div>
    </div>
  </div>

  <div class="dates">
    <div class="date-item">
      <div class="label">Invoice Date</div>
      <div class="value">${fmt2(date)}</div>
    </div>
    <div class="date-item">
      <div class="label">Due Date</div>
      <div class="value">${fmt2(dueDate)}</div>
    </div>
    <div class="date-item">
      <div class="label">Payment Method</div>
      <div class="value">${PAYMENT_METHODS.find(m => m.id === tx.payment_method)?.label ?? tx.payment_method ?? '—'}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:50%">Description</th>
        <th>Qty</th>
        <th>Unit Price</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <strong>AddFame Platform Credits</strong><br/>
          <span style="color:#6b7280;font-size:12px">Prepaid advertising credits for influencer campaigns</span>
        </td>
        <td>1</td>
        <td>${fmt(parseFloat(subtotal))}</td>
        <td>${fmt(parseFloat(subtotal))}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-table">
      <div class="totals-row"><span>Subtotal (excl. VAT)</span><span>${fmt(parseFloat(subtotal))}</span></div>
      <div class="totals-row"><span>VAT 19%</span><span>${fmt(parseFloat(vat))}</span></div>
      <div class="totals-row total"><span>Total Due</span><span>${fmt(amount)}</span></div>
    </div>
  </div>

  <div class="divider"></div>

  <div class="payment-section">
    <div class="payment-title">Payment Instructions</div>
    <div class="payment-grid">
      ${Object.entries(PAYMENT_METHODS.find(m => m.id === tx.payment_method)?.details ?? {})
      .map(([k, v]) => `<div class="payment-row"><span class="key">${k}: </span><span class="val">${v === '← use your invoice number' || v === '← include your invoice number' || v === '← include invoice number in memo' ? tx.invoice_number : v}</span></div>`)
      .join('')}
    </div>
  </div>

  <div class="notes">
    <strong>Important:</strong> Please include your invoice number <strong>${tx.invoice_number}</strong> as the payment reference. Credits will be added to your account within 1–3 business days after payment confirmation.
  </div>

  <div class="footer">
    <p>Mulțumim că ai ales AddFame · întrebări? contactează ${COMPANY.support}</p>
    <p style="margin-top:4px">${COMPANY.name} · ${COMPANY.address}, ${COMPANY.country} · CUI ${COMPANY.cui} · TVA ${COMPANY.vat}</p>
  </div>

</div>
</body>
</html>`
}

// ─── Copy helper ───────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="ml-2 text-muted-foreground hover:text-primary transition flex-shrink-0"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function BrandWalletPage() {
  const [wallet, setWallet] = useState<BrandWallet>({ credits_balance: 0, credits_reserved: 0, total_spent: 0, credits_expires_at: null })
  const [brand, setBrand] = useState<BrandInfo | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<'transactions' | 'campaigns'>('transactions')
  const [filterType, setFilterType] = useState('ALL')

  // Stripe modal
  const [stripeModal, setStripeModal] = useState(false)
  const [stripeAmount, setStripeAmount] = useState<number | null>(null)

  // Modal state machine: null | 'select_method' | 'enter_amount' | 'instructions' | 'success'
  const [modal, setModal] = useState<null | 'select_method' | 'enter_amount' | 'instructions' | 'success'>(null)
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [amount, setAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [billingName, setBillingName] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [billingVat, setBillingVat] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successTx, setSuccessTx] = useState<Transaction | null>(null)

  // Invoice viewer
  const [viewingInvoice, setViewingInvoice] = useState<Transaction | null>(null)
  const invoiceRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: b } = await supabase
        .from('brands')
        .select('id, name, email, website, country, phone, company_size, industry, credits_balance, credits_reserved, total_spent, credits_expires_at')
        .eq('user_id', user.id)
        .single()

      if (!b) return
      setBrand(b)
      setWallet({ credits_balance: b.credits_balance ?? 0, credits_reserved: b.credits_reserved ?? 0, total_spent: b.total_spent ?? 0, credits_expires_at: b.credits_expires_at ?? null })

      const [txRes, campRes] = await Promise.all([
        supabase.from('brand_transactions').select('*').eq('brand_id', b.id)
          .order('created_at', { ascending: false }).limit(100),
        supabase.from('campaigns').select('id, title, budget, status')
          .eq('brand_id', b.id).order('created_at', { ascending: false }),
      ])

      setTransactions((txRes.data as Transaction[]) ?? [])
      setCampaigns((campRes.data as CampaignRow[]) ?? [])
    } finally {
      setLoading(false)
    }
  }

  const resolvedAmount = amount ?? (customAmount ? parseFloat(customAmount) : 0)
  const methodObj = PAYMENT_METHODS.find(m => m.id === selectedMethod)

  async function handleSubmitPayment() {
    setSubmitError(null)
    if (!resolvedAmount || isNaN(resolvedAmount) || resolvedAmount < TOPUP_MIN) { setSubmitError(`Suma minimă este ${TOPUP_MIN} RON.`); return }
    if (resolvedAmount > TOPUP_MAX) { setSubmitError(`Suma maximă este ${TOPUP_MAX.toLocaleString('ro-RO')} RON.`); return }
    if (!selectedMethod) return

    setSubmitLoading(true)
    try {
      const res = await fetch('/api/wallet/submit-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: resolvedAmount,
          method: selectedMethod,
          billing: { name: billingName, address: billingAddress, vat: billingVat },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const newTx: Transaction = {
        id: data.transaction_id,
        type: 'TOPUP',
        amount: resolvedAmount,
        description: `Credit top-up via ${methodObj?.label} — ${fmt(resolvedAmount)}`,
        status: 'pending',
        payment_method: selectedMethod,
        invoice_number: data.invoice_number,
        created_at: data.created_at,
      }
      setSuccessTx(newTx)
      setModal('success')
      await fetchAll()
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit. Please try again.')
    } finally {
      setSubmitLoading(false)
    }
  }

  function openInvoice(tx: Transaction) {
    if (!brand) return
    const html = generateInvoiceHTML(tx, brand, tx.amount)
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  function printInvoiceAsPDF(tx: Transaction) {
    if (!brand) return
    const html = generateInvoiceHTML(tx, brand, tx.amount)
    // Deschidem într-un tab nou și declanșăm print dialog automat → Save as PDF
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
      // Așteptăm să se încarce, apoi print
      w.onload = () => {
        setTimeout(() => {
          w.focus()
          w.print()
        }, 300)
      }
      // Fallback dacă onload nu se declanșează
      setTimeout(() => {
        try { w.focus(); w.print() } catch (_) { }
      }, 800)
    }
  }

  function downloadInvoiceHTML(tx: Transaction) {
    if (!brand) return
    const html = generateInvoiceHTML(tx, brand, tx.amount)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `factura-${tx.invoice_number}.html`
    a.click(); URL.revokeObjectURL(url)
  }

  function closeModal() {
    setModal(null); setSelectedMethod(null); setAmount(null); setCustomAmount('')
    setBillingName(''); setBillingAddress(''); setBillingVat('')
    setSubmitError(null); setSuccessTx(null)
  }

  function exportCSV() {
    const rows = [['Date', 'Type', 'Description', 'Amount (RON)', 'Status', 'Invoice'],
    ...transactions.map(tx => [fmtDate(tx.created_at), tx.type, `"${tx.description}"`,
    Math.abs(tx.amount).toFixed(2), tx.status, tx.invoice_number ?? ''])]
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `addfame-wallet-${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthSpend = transactions
    .filter(tx => tx.type === 'SPEND' && new Date(tx.created_at) >= monthStart)
    .reduce((s, tx) => s + Math.abs(tx.amount), 0)

  const pendingTx = transactions.filter(tx => tx.status === 'pending')
  const filteredTx = transactions.filter(tx => filterType === 'ALL' || tx.type === filterType)

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Wallet</h1>
          <p className="text-muted-foreground text-sm">Creditele nu se pot retrage — pot fi folosite doar pentru campanii pe platformă</p>
        </div>
        <Button onClick={() => setModal('select_method')} className="bg-gradient-to-r from-primary to-accent shadow-md">
          <Plus className="w-4 h-4 mr-2" /> Add Credits
        </Button>
      </div>

      {/* Pending alert */}
      {pendingTx.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-700">
              {pendingTx.length} payment{pendingTx.length > 1 ? 's' : ''} awaiting confirmation
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Credits will be added once we verify your transfer. Reference: {pendingTx[0]?.invoice_number}
            </p>
          </div>
          <button onClick={fetchAll} className="text-xs text-amber-700 font-medium hover:underline">Refresh</button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="col-span-2 relative overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 rounded-2xl p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full -translate-y-8 translate-x-8 pointer-events-none" />
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Total Balance</span>
          </div>
          <p className="text-4xl font-bold tracking-tight mb-2">{fmt(wallet.credits_balance)}</p>

          {/* Expiry info */}
          {wallet.credits_expires_at && wallet.credits_balance > 0 && (() => {
            const expiresDate = new Date(wallet.credits_expires_at)
            const daysLeft = Math.ceil((expiresDate.getTime() - Date.now()) / 864e5)
            const isUrgent = daysLeft <= 30
            return (
              <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-xl text-xs font-semibold ${isUrgent ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-700'
                }`}>
                <span>{isUrgent ? '⚠️' : '⏳'}</span>
                <span>
                  Creditele expiră pe <strong>{expiresDate.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                  {' '}({daysLeft > 0 ? `${daysLeft} zile rămase` : 'azi!'})
                </span>
              </div>
            )
          })()}

          {/* Escrow breakdown */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">
                Disponibil: <strong className="text-green-600">{fmt(Math.max(0, wallet.credits_balance - wallet.credits_reserved))}</strong>
              </span>
            </div>
            {wallet.credits_reserved > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-xs text-muted-foreground">
                  Rezervat escrow: <strong className="text-amber-600">{fmt(wallet.credits_reserved)}</strong>
                </span>
              </div>
            )}
          </div>
          {wallet.credits_reserved > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                <strong>{fmt(wallet.credits_reserved)}</strong> sunt blocați ca garanție pentru colaborările active. Se eliberează automat la aprobarea posturilor.
              </p>
            </div>
          )}
          <Button onClick={() => setModal('select_method')} size="sm" className="bg-gradient-to-r from-primary to-accent w-fit shadow-md">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Credits
          </Button>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4 text-destructive" /><span className="text-xs text-muted-foreground">Total Spent</span></div>
          <p className="text-2xl font-bold">{fmt(wallet.total_spent)}</p>
          <p className="text-xs text-muted-foreground mt-1">All time</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3"><Calendar className="w-4 h-4 text-blue-500" /><span className="text-xs text-muted-foreground">This Month</span></div>
          <p className="text-2xl font-bold">{fmt(thisMonthSpend)}</p>
          <p className="text-xs text-muted-foreground mt-1">Spend</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {[{ id: 'transactions', label: 'Transactions', icon: Receipt }, { id: 'campaigns', label: 'Campaign Spend', icon: BarChart3 }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* Transactions */}
      {activeTab === 'transactions' && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="text-sm border border-input rounded-lg px-3 py-2 bg-background outline-none focus:ring-2 focus:ring-primary/30">
              <option value="ALL">All transactions</option>
              <option value="TOPUP">Top-ups</option>
              <option value="SPEND">Spend</option>
              <option value="REFUND">Refunds</option>
            </select>
            {transactions.length > 0 && (
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </Button>
            )}
          </div>

          {filteredTx.length === 0 ? (
            <div className="text-center py-16">
              <Wallet className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium mb-2">No transactions yet</p>
              <p className="text-sm text-muted-foreground mb-5">Add credits to start running campaigns</p>
              <Button onClick={() => setModal('select_method')} size="sm" className="bg-gradient-to-r from-primary to-accent">Add Credits</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTx.map(tx => {
                const meta = TX_META[tx.type] ?? TX_META.SPEND
                const isCredit = tx.type === 'TOPUP' || tx.type === 'REFUND'
                const method = PAYMENT_METHODS.find(m => m.id === tx.payment_method)
                return (
                  <div key={tx.id} className="flex items-center justify-between p-4 border border-border rounded-xl hover:bg-muted/30 transition">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                        {isCredit ? <ArrowDownLeft className={`w-4 h-4 ${meta.text}`} /> : <ArrowUpRight className={`w-4 h-4 ${meta.text}`} />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{tx.description}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">{fmtDateTime(tx.created_at)}</span>
                          {method && <span className="text-xs text-muted-foreground">· {method.label}</span>}
                          {tx.invoice_number && <span className="text-xs text-muted-foreground">· {tx.invoice_number}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                      <div className="hidden sm:flex items-center gap-1.5">
                        {tx.status === 'completed' && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                        {tx.status === 'pending' && <Clock className="w-3.5 h-3.5 text-amber-500" />}
                        {tx.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-destructive" />}
                        <span className="text-xs text-muted-foreground capitalize">{tx.status}</span>
                      </div>
                      <p className={`font-bold text-sm min-w-[72px] text-right ${meta.text}`}>
                        {isCredit ? '+' : '−'}{fmt(Math.abs(tx.amount))}
                      </p>
                      {tx.invoice_number && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => openInvoice(tx)} title="Vezi factura"
                            className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-primary transition">
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => printInvoiceAsPDF(tx)} title="Descarcă PDF"
                            className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-primary transition">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Campaign spend */}
      {activeTab === 'campaigns' && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold">Budget Allocation</h2>
            <p className="text-sm text-muted-foreground">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
          </div>
          {campaigns.length === 0 ? (
            <div className="text-center py-16">
              <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium mb-2">No campaigns yet</p>
              <Button asChild size="sm" className="mt-2 bg-gradient-to-r from-primary to-accent"><a href="/brand/campaigns">Create Campaign</a></Button>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-5">
                {campaigns.map(c => {
                  const spent = transactions.filter(tx => tx.type === 'SPEND' && tx.description.toLowerCase().includes(c.title.toLowerCase())).reduce((s, tx) => s + Math.abs(tx.amount), 0)
                  const pct = c.budget > 0 ? Math.min((spent / c.budget) * 100, 100) : 0
                  return (
                    <div key={c.id} className="p-4 border border-border rounded-xl hover:border-primary/30 transition">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Briefcase className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{c.title}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAMPAIGN_COLORS[c.status] ?? 'bg-muted text-muted-foreground'}`}>{c.status}</span>
                          </div>
                        </div>
                        <div className="text-right ml-3"><p className="text-sm font-bold">{fmt(spent)}</p><p className="text-xs text-muted-foreground">of {fmt(c.budget ?? 0)}</p></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{Math.round(pct)}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border">
                <p className="text-sm font-semibold">Total budgets</p>
                <p className="text-lg font-bold">{fmt(campaigns.reduce((s, c) => s + (c.budget ?? 0), 0))}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL OVERLAY                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-card z-10 rounded-t-3xl">
              <div className="flex items-center gap-2">
                {modal !== 'select_method' && modal !== 'success' && (
                  <button onClick={() => setModal(modal === 'instructions' ? 'enter_amount' : modal === 'enter_amount' ? 'select_method' : 'select_method')}
                    className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground mr-1">
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                )}
                <div>
                  <h2 className="font-bold text-base">
                    {modal === 'select_method' && 'Alege metoda de plată'}
                    {modal === 'enter_amount' && `Plătește via ${methodObj?.label}`}
                    {modal === 'instructions' && 'Instrucțiuni transfer'}
                    {modal === 'success' && 'Cerere înregistrată'}
                  </h2>
                  {modal !== 'success' && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {['select_method', 'enter_amount', 'instructions'].map((s, i) => (
                        <div key={s} className={`h-1 rounded-full transition-all ${modal === s ? 'w-6 bg-primary' : i < ['select_method', 'enter_amount', 'instructions'].indexOf(modal) ? 'w-3 bg-primary/50' : 'w-3 bg-muted'}`} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Step 1: Select method ─────────────────────────────────────── */}
            {modal === 'select_method' && (
              <div className="p-6 space-y-3">
                <p className="text-sm text-muted-foreground mb-4">Alege cum vrei să încarci credite în contul tău AddFame.</p>

                {/* Stripe Card — opțiunea principală */}
                <button
                  onClick={() => { setSelectedMethod('stripe_card'); setModal('enter_amount') }}
                  className="w-full flex items-center gap-4 p-4 border-2 border-indigo-300 bg-indigo-50/50 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition text-left group relative overflow-hidden">
                  <span className="absolute top-2 right-10 text-[10px] font-black bg-indigo-500 text-white px-2 py-0.5 rounded-full">RECOMANDAT</span>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-100">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-indigo-700">Card bancar</p>
                    <p className="text-xs text-indigo-500">Visa, Mastercard · instant · cardul se salvează</p>
                  </div>
                  <Zap className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600 transition" />
                </button>

                {/* Transfer bancar și alte metode */}
                {PAYMENT_METHODS.map(m => {
                  const Icon = m.icon
                  return (
                    <button key={m.id} onClick={() => { setSelectedMethod(m.id); setModal('enter_amount') }}
                      className="w-full flex items-center gap-4 p-4 border-2 border-border rounded-xl hover:border-primary/50 hover:bg-muted/30 transition text-left group">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${m.bg}`}>
                        <Icon className={`w-5 h-5 ${m.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{m.label}</p>
                        <p className="text-xs text-muted-foreground">{m.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition" />
                    </button>
                  )
                })}
              </div>
            )}

            {/* ── Step 2: Enter amount + billing ───────────────────────────── */}
            {modal === 'enter_amount' && methodObj && (
              <div className="p-6 space-y-5">
                {/* Balance */}
                <div className="flex items-center justify-between bg-muted/40 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /><span className="text-sm text-muted-foreground">Current balance</span></div>
                  <span className="font-bold text-primary">{fmt(wallet.credits_balance)}</span>
                </div>

                {submitError && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {submitError}
                  </div>
                )}

                {/* Preset grid */}
                <div>
                  <label className="block text-sm font-semibold mb-3">Select amount</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_AMOUNTS.map(({ value, popular }) => (
                      <button key={value} type="button" onClick={() => { setAmount(value); setCustomAmount('') }}
                        className={`relative p-3.5 rounded-xl border-2 text-sm font-semibold transition ${amount === value ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/40'}`}>
                        {popular && <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-accent text-white text-[9px] font-bold px-2 py-0.5 rounded-full">POPULAR</span>}
                        {value.toLocaleString('ro-RO')} RON
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Or enter custom amount</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold select-none">RON </span>
                    <Input type="number" className="pl-8 h-11" placeholder="0.00" min={10} max={50000} step="0.01"
                      value={customAmount} onChange={e => { setCustomAmount(e.target.value); setAmount(null) }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Minim {TOPUP_MIN} RON · Maxim {TOPUP_MAX.toLocaleString('ro-RO')} RON</p>
                </div>

                {/* Preview */}
                {resolvedAmount > 0 && (
                  <div className="bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Amount</span><span className="font-semibold">{fmt(resolvedAmount)}</span></div>
                    <div className="flex justify-between text-sm border-t border-primary/10 pt-2"><span className="text-muted-foreground">Balance after</span><span className="font-bold text-primary text-base">{fmt(wallet.credits_balance + resolvedAmount)}</span></div>
                  </div>
                )}

                {/* Billing */}
                <div className="border border-border rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold">Billing Details <span className="text-muted-foreground font-normal">(for invoice)</span></p>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Company / Full Name *</label>
                    <Input placeholder={brand?.name ?? 'Company name'} value={billingName} onChange={e => setBillingName(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Billing Address</label>
                    <Input placeholder="Street, City, Country" value={billingAddress} onChange={e => setBillingAddress(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">VAT / Tax ID <span className="text-muted-foreground">(optional)</span></label>
                    <Input placeholder="RO12345678" value={billingVat} onChange={e => setBillingVat(e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>

                <Button className="w-full h-12 bg-gradient-to-r from-primary to-accent font-semibold text-base"
                  onClick={() => {
                    if (!resolvedAmount || resolvedAmount < TOPUP_MIN) { setSubmitError(`Suma minimă este ${TOPUP_MIN} RON.`); return }
                    setSubmitError(null)
                    if (selectedMethod === 'stripe_card') {
                      // Deschide Stripe modal direct
                      setStripeAmount(resolvedAmount)
                      setModal(null)
                      setStripeModal(true)
                    } else {
                      if (!billingName.trim()) { setSubmitError('Completează numele pentru factură.'); return }
                      setModal('instructions')
                    }
                  }}
                  disabled={resolvedAmount < TOPUP_MIN}>
                  {selectedMethod === 'stripe_card'
                    ? resolvedAmount > 0 ? `Plătește cu cardul — ${fmt(resolvedAmount)}` : 'Selectează o sumă'
                    : resolvedAmount > 0 ? `Vezi instrucțiuni de plată — ${fmt(resolvedAmount)}` : 'Selectează o sumă'}
                </Button>
              </div>
            )}

            {/* ── Step 3: Instrucțiuni plată + confirmare ───────────────────── */}
            {modal === 'instructions' && methodObj && (
              <div className="p-6 space-y-5">

                {/* Sumar comandă */}
                <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Suma de plătit</p>
                    <p className="text-2xl font-black text-primary">{fmt(resolvedAmount ?? 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-0.5">Metoda</p>
                    <p className="font-bold text-sm">{methodObj.label}</p>
                  </div>
                </div>

                {/* Instrucțiuni transfer */}
                <div className="border-2 border-primary/20 rounded-2xl overflow-hidden">
                  <div className={`flex items-center gap-3 px-4 py-3 ${methodObj.bg}`}>
                    <methodObj.icon className={`w-5 h-5 ${methodObj.color}`} />
                    <p className="font-black text-sm">Detalii transfer — trimite exact suma de mai sus</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {Object.entries(methodObj.details).filter(([, v]) => !v.startsWith('←')).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <span className="text-xs text-muted-foreground font-medium">{key}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black">{val}</span>
                          <CopyButton text={val} />
                        </div>
                      </div>
                    ))}
                    {/* Referință — brandul pune numele lui */}
                    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-xs text-muted-foreground font-medium">Referință plată</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-primary">AddFame - {billingName}</span>
                        <CopyButton text={`AddFame - ${billingName}`} />
                      </div>
                    </div>
                  </div>
                  <div className="px-4 pb-4">
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 font-medium">{methodObj.note}</p>
                    </div>
                  </div>
                </div>

                {submitError && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {submitError}
                  </div>
                )}

                {/* Buton confirmare */}
                <Button className="w-full h-12 bg-gradient-to-r from-primary to-accent font-black text-base"
                  onClick={handleSubmitPayment} disabled={submitLoading}>
                  {submitLoading
                    ? <span className="flex items-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Se procesează…</span>
                    : '✅ Am trimis plata — înregistrează cererea'}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Apasă doar după ce ai efectuat transferul. Creditele apar în cont după verificare (1-3 zile lucrătoare).
                </p>
              </div>
            )}

            {/* ── Step 4: Success ───────────────────────────────────────────── */}
            {modal === 'success' && successTx && methodObj && (
              <div className="p-6 space-y-5">

                {/* Success banner */}
                <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-green-700">Payment request created</p>
                    <p className="text-xs text-green-600 mt-0.5">Invoice {successTx.invoice_number} · Credits added once payment confirmed</p>
                  </div>
                </div>

                {/* Invoice number highlight */}
                <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">Your Invoice Number</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-primary">{successTx.invoice_number}</p>
                    <CopyButton text={successTx.invoice_number!} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Include this in your payment reference</p>
                </div>

                {/* Payment instructions */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className={`flex items-center gap-3 px-4 py-3 ${methodObj.bg} border-b ${methodObj.border}`}>
                    <methodObj.icon className={`w-4 h-4 ${methodObj.color}`} />
                    <p className="font-semibold text-sm">{methodObj.label} — Payment Details</p>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {Object.entries(methodObj.details).map(([key, val]) => {
                      const isRef = val.startsWith('←')
                      const displayVal = isRef ? successTx.invoice_number! : val
                      return (
                        <div key={key} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                          <span className="text-xs text-muted-foreground">{key}</span>
                          <div className="flex items-center gap-1 max-w-[60%]">
                            <span className={`text-sm font-semibold text-right ${isRef ? 'text-primary' : ''}`}>{displayVal}</span>
                            <CopyButton text={displayVal} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="px-4 pb-4">
                    <div className="flex items-start gap-2 bg-amber-500/10 rounded-lg p-3">
                      <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">{methodObj.note}</p>
                    </div>
                  </div>
                </div>

                {/* Invoice actions */}
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="w-full" onClick={() => openInvoice(successTx)}>
                    <FileText className="w-4 h-4 mr-2" /> Vezi factura
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => printInvoiceAsPDF(successTx)}>
                    <Download className="w-4 h-4 mr-2" /> Descarcă PDF
                  </Button>
                </div>

                <Button className="w-full bg-gradient-to-r from-primary to-accent" onClick={closeModal}>
                  Gata
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Stripe Payment Modal ── */}
      {stripeModal && stripeAmount && (
        <StripePaymentModal
          amount={stripeAmount}
          onSuccess={() => { fetchAll(); setStripeModal(false) }}
          onClose={() => setStripeModal(false)}
        />
      )}
    </div>
  )
}
