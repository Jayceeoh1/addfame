'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Wallet, TrendingUp, ArrowUpRight, ArrowDownLeft, Clock,
  CheckCircle, XCircle, AlertCircle, X, Plus, CreditCard,
  Briefcase, Download, Receipt, BarChart3, Calendar,
  Building2, Smartphone, Globe, ChevronRight, Copy, Check,
  FileText, Shield, Info, Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { COMPANY, BANK, REVOLUT, WISE, PAYPAL, CRYPTO, TOPUP_MIN, TOPUP_MAX } from '@/lib/payment-config'

// ─── Types ─────────────────────────────────────────────────────────────────────
type Transaction = {
  id: string
  type: 'TOPUP' | 'SPEND' | 'REFUND' | 'RESERVE'
  amount: number
  description: string
  status: 'completed' | 'pending' | 'failed'
  payment_method?: string
  invoice_number?: string
  smartbill_invoice_number?: string
  billing_details?: Record<string, string>
  created_at: string
}
type CampaignRow = { id: string; title: string; budget: number; status: string }
type BrandWallet = { credits_balance: number; credits_reserved: number; total_spent: number; credits_expires_at?: string | null }
type BrandInfo = {
  id: string; name: string; email: string
  website?: string; country?: string; phone?: string
  company_size?: string; industry?: string
  verification_status?: string
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
    bg: 'bg-violet-600/10',
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


// ─── Copy helper ───────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="ml-2 text-muted-foreground hover:text-primary transition flex-shrink-0"
      title="Copiază"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
function BrandWalletPageInner() {
  const searchParams = useSearchParams()
  const isLocked = searchParams.get('locked') === '1'
  const [wallet, setWallet] = useState<BrandWallet>({ credits_balance: 0, credits_reserved: 0, total_spent: 0, credits_expires_at: null })
  const [brand, setBrand] = useState<BrandInfo | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<'transactions' | 'campaigns'>('transactions')
  const [filterType, setFilterType] = useState('ALL')

  // Modal state machine: null | 'select_method' | 'enter_amount' | 'instructions' | 'success'
  const [modal, setModal] = useState<null | 'select_method' | 'enter_amount' | 'instructions' | 'success'>(null)
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [amount, setAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [billingType, setBillingType] = useState<'pf' | 'pj'>('pj')
  const [billingName, setBillingName] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [billingVat, setBillingVat] = useState('')
  const [billingRegCom, setBillingRegCom] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successTx, setSuccessTx] = useState<Transaction | null>(null)

  // Invoice viewer

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: b } = await supabase
        .from('brands')
        .select('id, name, email, website, country, phone, company_size, industry, credits_balance, credits_reserved, total_spent, credits_expires_at, verification_status, billing_company, billing_cui, billing_address, billing_email')
        .eq('user_id', user.id)
        .single()

      if (!b) return

      // Autofill billing din datele salvate în Settings → Facturare
      if (b.billing_company || b.billing_cui) {
        setBillingType('pj')
        setBillingName(b.billing_company || b.name || '')
        setBillingVat(b.billing_cui || '')
        setBillingAddress(b.billing_address || '')
      } else {
        setBillingName(b.name || '')
      }
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
          billing: { type: billingType, name: billingName, address: billingAddress, vat: billingVat, reg_com: billingRegCom },
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
      setSubmitError(err.message || 'Trimitere eșuată. Încearcă din nou.')
    } finally {
      setSubmitLoading(false)
    }
  }

  function openInvoice(tx: Transaction) {
    if (!tx.smartbill_invoice_number) {
      alert('Factura este în curs de generare. Încearcă din nou în câteva minute.')
      return
    }
    window.open(`/api/smartbill/invoice-pdf?transaction_id=${tx.id}`, '_blank')
  }

  function printInvoiceAsPDF(tx: Transaction) {
    openInvoice(tx)
  }

  function downloadInvoiceHTML(tx: Transaction) {
    openInvoice(tx)
  }

  function closeModal() {
    setModal(null); setSelectedMethod(null); setAmount(null); setCustomAmount('')
    setBillingName(''); setBillingAddress(''); setBillingVat(''); setBillingRegCom(''); setBillingType('pj')
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

  const TX_CHIP: Record<string, { bg: string; fg: string }> = {
    completed: { bg: '#dcf5ec', fg: '#14532d' },
    pending: { bg: '#fff1c2', fg: '#854d0e' },
    failed: { bg: '#fde8e6', fg: '#b42318' },
  }
  const TX_STATUS_RO: Record<string, string> = { completed: 'Finalizat', pending: 'În așteptare', failed: 'Eșuat' }
  const TX_ICO: Record<string, { bg: string; fg: string }> = {
    TOPUP: { bg: '#dcf5ec', fg: '#14532d' },
    REFUND: { bg: '#e6f0ff', fg: '#1d4fb8' },
    SPEND: { bg: '#efeaff', fg: '#4423c4' },
    RESERVE: { bg: '#fff1c2', fg: '#854d0e' },
  }
  const CAMP_CHIP: Record<string, { bg: string; fg: string }> = {
    ACTIVE: { bg: '#e6f0ff', fg: '#1d4fb8' }, LIVE: { bg: '#e6f0ff', fg: '#1d4fb8' },
    COMPLETED: { bg: '#dcf5ec', fg: '#14532d' }, DRAFT: { bg: '#f0eff7', fg: '#4a4770' },
    PAUSED: { bg: '#fff1c2', fg: '#854d0e' },
  }

  if (loading) return (
    <div className="bu"><div className="bu-card bu-card-pad" style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div></div>
  )

  const available = Math.max(0, wallet.credits_balance - wallet.credits_reserved)

  return (
    <div className="bu">
      <style>{`
        .bw-grid { display: grid; grid-template-columns: minmax(0,1.5fr) minmax(0,1fr); gap: 18px; align-items: stretch; }
        .bw-wallet { position: relative; overflow: hidden; background: #14123a; color: #fff; border-radius: 20px; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .bw-glow { position: absolute; right: -70px; top: -90px; width: 260px; height: 260px; border-radius: 50%; background: linear-gradient(135deg, #22c8f0, #7040f0); opacity: .35; filter: blur(40px); pointer-events: none; }
        .bw-wallet > *:not(.bw-glow) { position: relative; }
        .bw-bal { font-family: var(--font-display, system-ui), system-ui, sans-serif; font-weight: 800; font-size: 44px; letter-spacing: -0.03em; line-height: 1.05; }
        .bw-lbl { font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,.6); }
        .bw-split { display: flex; flex-wrap: wrap; gap: 20px; }
        .bw-split b { display: block; font-size: 17px; font-family: var(--font-display, system-ui), system-ui, sans-serif; }
        .bw-cta { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 46px; padding: 0 22px; border-radius: 12px; border: 0; background: linear-gradient(135deg, #2f6fe0, #5a35e6); color: #fff; font-weight: 700; font-size: 15px; cursor: pointer; font-family: inherit; width: fit-content; box-shadow: 0 12px 26px -12px rgba(90,53,230,.9); }
        .bw-note { display: flex; gap: 10px; align-items: flex-start; border-radius: 12px; padding: 10px 12px; font-size: 12.5px; background: rgba(255,255,255,.08); color: rgba(255,255,255,.85); }
        .bw-stats { display: grid; grid-template-rows: 1fr 1fr; gap: 18px; }
        .bw-stat { padding: 20px; display: flex; flex-direction: column; gap: 6px; justify-content: center; }
        .bw-stat .v { font-family: var(--font-display, system-ui), system-ui, sans-serif; font-weight: 800; font-size: 26px; letter-spacing: -0.02em; }
        .bw-banner { display: flex; align-items: flex-start; gap: 14px; border-radius: 20px; padding: 16px 18px; }
        .bw-tx { display: flex; align-items: center; gap: 12px; padding: 14px 0; border-top: 1px solid #eeecf7; }
        .bw-tx:first-child { border-top: 0; }
        .bw-tx-main { min-width: 0; flex: 1; }
        .bw-tx-main p { margin: 0; }
        .bw-tx-d { font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .bw-tx-r { text-align: right; flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .bw-tx-amt { font-family: var(--font-display, system-ui), system-ui, sans-serif; font-weight: 800; font-size: 15px; }
        .bw-ib { width: 44px; height: 44px; border-radius: 12px; border: 0; background: transparent; color: #6a6690; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex: none; }
        .bw-ib:hover { background: #f7f4ff; color: #5a35e6; }
        .bw-empty { text-align: center; padding: 48px 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        @media (max-width: 860px) { .bw-grid { grid-template-columns: minmax(0,1fr); } .bw-stats { grid-template-rows: none; grid-template-columns: 1fr 1fr; } }
        @media (max-width: 560px) {
          .bw-bal { font-size: 36px; } .bw-wallet { padding: 20px; } .bw-cta { width: 100%; }
          .bw-tx { flex-wrap: wrap; } .bw-tx-r { flex-direction: row; align-items: center; margin-left: 56px; width: calc(100% - 56px); justify-content: space-between; }
          .bw-stat { padding: 16px; } .bw-stat .v { font-size: 20px; }
          .bw-select { width: 100%; }
        }
      `}</style>

      {/* Header */}
      <div className="bu-head">
        <div>
          <div className="bu-label" style={{ marginBottom: 6 }}>Finanțe</div>
          <h1>Wallet</h1>
          <p className="bu-muted bu-sm" style={{ margin: '6px 0 0' }}>Creditele nu se pot retrage — pot fi folosite doar pentru campanii pe platformă</p>
        </div>
      </div>

      {/* Banner acces blocat */}
      {isLocked && (
        <div className="bw-banner" style={{ background: '#fff1c2', border: '1px solid #f3dc8a' }}>
          <div className="bu-ico" style={{ background: '#fff', color: '#854d0e' }}><Lock className="w-5 h-5" /></div>
          <div style={{ flex: 1, minWidth: 0, color: '#854d0e' }}>
            <p style={{ margin: 0, fontWeight: 800 }}>Acces restricționat</p>
            <p className="bu-sm" style={{ margin: '4px 0 12px' }}>
              Pentru a accesa lista de influenceri și a crea campanii ai nevoie de <strong>minimum 500 RON credite</strong> în cont.
              Adaugă credite mai jos sau contactează echipa AddFame la{' '}
              <a href="mailto:ciprian@addfame.ro" style={{ fontWeight: 700, textDecoration: 'underline' }}>ciprian@addfame.ro</a> pentru acces anticipat.
            </p>
            <button onClick={() => setModal('select_method')} className="bu-btn p">Adaugă acum</button>
          </div>
        </div>
      )}

      {/* Pending alert */}
      {pendingTx.length > 0 && (
        <div className="bw-banner" style={{ background: '#fff8dc', border: '1px solid #f3dc8a', alignItems: 'center' }}>
          <div className="bu-ico" style={{ background: '#fff1c2', color: '#854d0e' }}><Clock className="w-5 h-5" /></div>
          <div style={{ flex: 1, minWidth: 0, color: '#854d0e' }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>
              {pendingTx.length} {pendingTx.length > 1 ? 'plăți' : 'plată'} în așteptarea confirmării
            </p>
            <p className="bu-xs" style={{ margin: '2px 0 0' }}>
              Creditele vor fi adăugate după verificarea transferului. Referință: {pendingTx[0]?.invoice_number}
            </p>
          </div>
          <button onClick={fetchAll} className="bu-btn">Reîmprospătează</button>
        </div>
      )}

      {/* Balance + stats */}
      <div className="bw-grid">
        <div className="bw-wallet">
          <div className="bw-glow" />
          <div className="bw-lbl" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Wallet className="w-4 h-4" /> Sold total</div>
          <div className="bw-bal">{fmt(wallet.credits_balance)}</div>

          {wallet.credits_expires_at && wallet.credits_balance > 0 && (() => {
            const expiresDate = new Date(wallet.credits_expires_at)
            const daysLeft = Math.ceil((expiresDate.getTime() - Date.now()) / 864e5)
            const isUrgent = daysLeft <= 30
            return (
              <div className="bw-note" style={isUrgent ? { background: 'rgba(240,68,56,.2)', color: '#ffd9d5' } : undefined}>
                <span>{isUrgent ? '⚠️' : '⏳'}</span>
                <span>
                  Creditele expiră pe <strong>{expiresDate.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                  {' '}({daysLeft > 0 ? `${daysLeft} zile rămase` : 'azi!'})
                </span>
              </div>
            )
          })()}

          <div className="bw-split">
            <div><span className="bw-lbl">Disponibil</span><b style={{ color: '#7ee2b8' }}>{fmt(available)}</b></div>
            {wallet.credits_reserved > 0 && (
              <div><span className="bw-lbl">Rezervat escrow</span><b style={{ color: '#ffd666' }}>{fmt(wallet.credits_reserved)}</b></div>
            )}
          </div>

          {wallet.credits_reserved > 0 && (
            <div className="bw-note">
              <Shield className="w-4 h-4" style={{ flex: 'none', marginTop: 2 }} />
              <span><strong>{fmt(wallet.credits_reserved)}</strong> sunt blocați ca garanție pentru colaborările active. Se eliberează automat la aprobarea posturilor.</span>
            </div>
          )}

          <button onClick={() => setModal('select_method')} className="bw-cta"><Plus className="w-4 h-4" /> Adaugă credite</button>
        </div>

        <div className="bw-stats">
          <div className="bu-card bw-stat">
            <div className="bu-row" style={{ gap: 10 }}>
              <div className="bu-ico" style={{ background: '#efeaff', color: '#4423c4', width: 34, height: 34, borderRadius: 10 }}><TrendingUp className="w-4 h-4" /></div>
              <span className="bu-label">Total cheltuit</span>
            </div>
            <div className="v">{fmt(wallet.total_spent)}</div>
          </div>
          <div className="bu-card bw-stat">
            <div className="bu-row" style={{ gap: 10 }}>
              <div className="bu-ico" style={{ background: '#e6f0ff', color: '#1d4fb8', width: 34, height: 34, borderRadius: 10 }}><Calendar className="w-4 h-4" /></div>
              <span className="bu-label">Luna aceasta</span>
            </div>
            <div className="v">{fmt(thisMonthSpend)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bu-tabs">
        {[{ id: 'transactions', label: 'Tranzacții', icon: Receipt }, { id: 'campaigns', label: 'Cheltuieli campanii', icon: BarChart3 }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`bu-pill${activeTab === tab.id ? ' on' : ''}`} style={{ minHeight: 44 }}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* Transactions */}
      {activeTab === 'transactions' && (
        <div className="bu-card bu-card-pad">
          <div className="bu-row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bu-input bw-select" style={{ height: 44 }}>
              <option value="ALL">Toate tranzacțiile</option>
              <option value="TOPUP">Top-ups</option>
              <option value="SPEND">Cheltuieli</option>
              <option value="REFUND">Refunds</option>
            </select>
            {transactions.length > 0 && (
              <button className="bu-btn" style={{ height: 44 }} onClick={exportCSV}>
                <Download className="w-4 h-4" /> Exportă CSV
              </button>
            )}
          </div>

          {filteredTx.length === 0 ? (
            <div className="bw-empty">
              <div className="bu-ico" style={{ background: '#efeaff', color: '#4423c4', width: 56, height: 56, borderRadius: 16 }}><Wallet className="w-6 h-6" /></div>
              <h3>Nicio tranzacție încă</h3>
              <p className="bu-muted bu-sm" style={{ margin: 0 }}>Adaugă credite pentru a lansa campanii</p>
              <button onClick={() => setModal('select_method')} className="bu-btn p big" style={{ marginTop: 8 }}>Adaugă credite</button>
            </div>
          ) : (
            <div>
              {filteredTx.map(tx => {
                const ico = TX_ICO[tx.type] ?? TX_ICO.SPEND
                const isCredit = tx.type === 'TOPUP' || tx.type === 'REFUND'
                const method = PAYMENT_METHODS.find(m => m.id === tx.payment_method)
                const chip = TX_CHIP[tx.status] ?? TX_CHIP.pending
                return (
                  <div key={tx.id} className="bw-tx">
                    <div className="bu-ico" style={{ background: ico.bg, color: ico.fg }}>
                      {isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="bw-tx-main">
                      <p className="bw-tx-d">{tx.description}</p>
                      <p className="bu-xs bu-muted">
                        {fmtDateTime(tx.created_at)}
                        {method && ` · ${method.label}`}
                        {tx.invoice_number && ` · ${tx.invoice_number}`}
                      </p>
                    </div>
                    <div className="bw-tx-r">
                      <span className="bw-tx-amt" style={{ color: isCredit ? '#14532d' : '#14123a' }}>
                        {isCredit ? '+' : '−'}{fmt(Math.abs(tx.amount))}
                      </span>
                      <span className="bu-chip" style={{ background: chip.bg, color: chip.fg }}>
                        {tx.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                        {tx.status === 'pending' && <Clock className="w-3 h-3" />}
                        {tx.status === 'failed' && <XCircle className="w-3 h-3" />}
                        {TX_STATUS_RO[tx.status] ?? tx.status}
                      </span>
                    </div>
                    {tx.invoice_number && (
                      <div className="bu-row">
                        <button onClick={() => openInvoice(tx)} title="Vezi factura" className="bw-ib"><FileText className="w-4 h-4" /></button>
                        <button onClick={() => printInvoiceAsPDF(tx)} title="Descarcă PDF" className="bw-ib"><Download className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Campaign spend */}
      {activeTab === 'campaigns' && (
        <div className="bu-card bu-card-pad">
          <div className="bu-row" style={{ justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
            <h2>Alocare buget</h2>
            <p className="bu-muted bu-sm" style={{ margin: 0 }}>{campaigns.length} {campaigns.length !== 1 ? 'campanii' : 'campanie'}</p>
          </div>
          {campaigns.length === 0 ? (
            <div className="bw-empty">
              <div className="bu-ico" style={{ background: '#efeaff', color: '#4423c4', width: 56, height: 56, borderRadius: 16 }}><Briefcase className="w-6 h-6" /></div>
              <h3>Nicio campanie încă</h3>
              <a href="/brand/campaigns" className="bu-btn p big" style={{ marginTop: 8 }}>Creează campanie</a>
            </div>
          ) : (
            <>
              <div className="bu-col" style={{ gap: 12, marginBottom: 16 }}>
                {campaigns.map(c => {
                  const spent = transactions.filter(tx => tx.type === 'SPEND' && tx.description.toLowerCase().includes(c.title.toLowerCase())).reduce((s, tx) => s + Math.abs(tx.amount), 0)
                  const pct = c.budget > 0 ? Math.min((spent / c.budget) * 100, 100) : 0
                  const cc = CAMP_CHIP[c.status] ?? { bg: '#f0eff7', fg: '#4a4770' }
                  return (
                    <div key={c.id} style={{ padding: 16, border: '1px solid #e5e3f3', borderRadius: 16 }}>
                      <div className="bu-row" style={{ justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                        <div className="bu-row" style={{ gap: 12, minWidth: 0 }}>
                          <div className="bu-ico" style={{ background: '#efeaff', color: '#4423c4' }}><Briefcase className="w-4 h-4" /></div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</p>
                            <span className="bu-chip" style={{ background: cc.bg, color: cc.fg }}>{c.status}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flex: 'none' }}>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>{fmt(spent)}</p>
                          <p className="bu-xs bu-muted" style={{ margin: 0 }}>din {fmt(c.budget ?? 0)}</p>
                        </div>
                      </div>
                      <div className="bu-row" style={{ gap: 12 }}>
                        <div className="bu-bar" style={{ flex: 1 }}><i style={{ width: `${pct}%` }} /></div>
                        <span className="bu-xs bu-muted" style={{ width: 34, textAlign: 'right' }}>{Math.round(pct)}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="bu-row" style={{ justifyContent: 'space-between', padding: 16, background: '#f6f6fc', borderRadius: 14, border: '1px solid #e5e3f3' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Total bugete</p>
                <p className="bu-d" style={{ margin: 0, fontWeight: 800, fontSize: 20 }}>{fmt(campaigns.reduce((s, c) => s + (c.budget ?? 0), 0))}</p>
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
                {/* Banner securitate */}
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 mb-2">
                  <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-blue-800">Pentru siguranța dumneavoastră</p>
                    <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                      Echipa AddFame <strong>nu vă va solicita niciodată</strong> date bancare prin telefon, email sau chat. Toate plățile se fac exclusiv prin platformă.
                      Dacă aveți nelămuriri, contactați-ne la{' '}
                      <a href="mailto:ciprian@addfame.ro" className="underline font-bold">ciprian@addfame.ro</a>{' '}
                      sau <a href="tel:+40724796883" className="underline font-bold">+40 724 796 883</a>.
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Alege cum vrei să încarci credite în contul tău AddFame.</p>

                {/* Card bancar — în curând */}
                <div className="w-full flex items-center gap-4 p-4 border-2 border-dashed border-gray-200 bg-gray-50 rounded-xl opacity-60 cursor-not-allowed relative">
                  <span className="absolute top-2 right-3 text-[10px] font-black bg-gray-400 text-white px-2 py-0.5 rounded-full">ÎN CURÂND</span>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-gray-400">Card bancar</p>
                    <p className="text-xs text-gray-400">Visa, Mastercard · în curând disponibil</p>
                  </div>
                </div>

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

                {brand?.verification_status !== 'verified' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">⚠️</span>
                    <div>
                      <p className="text-sm font-black text-amber-800">Cont neverificat</p>
                      <p className="text-xs text-amber-700 mt-0.5">Trebuie să îți verifici contul înainte de a adăuga credite. Mergi la <a href="/brand/verify" className="underline font-bold">Verificare cont</a> pentru a trimite documentele.</p>
                    </div>
                  </div>
                )}

                {submitError && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {submitError}
                  </div>
                )}

                {/* Preset grid */}
                <div>
                  <label className="block text-sm font-semibold mb-3">Selectează suma</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_AMOUNTS.map(({ value, popular }) => (
                      <button key={value} type="button" onClick={() => { setAmount(value); setCustomAmount('') }}
                        className={`relative p-3.5 min-h-[48px] rounded-xl border-2 text-sm font-bold transition ${amount === value ? 'border-[#5a35e6] bg-[#efeaff] text-[#4423c4]' : 'border-[#e5e3f3] hover:border-[#c9b9fb]'}`}>
                        {popular && <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-accent text-white text-[9px] font-bold px-2 py-0.5 rounded-full">POPULAR</span>}
                        {value.toLocaleString('ro-RO')} RON
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Sau introdu o sumă personalizată</label>
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
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Credite adăugate</span>
                      <span className="font-semibold">{fmt(resolvedAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-primary/10 pt-2">
                      <span className="font-bold">Total de plătit</span>
                      <span className="font-black text-primary text-base">{fmt(resolvedAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-primary/10 pt-2">
                      <span className="text-muted-foreground">Sold după încărcare</span>
                      <span className="font-bold text-green-600">{fmt(wallet.credits_balance + resolvedAmount)}</span>
                    </div>
                  </div>
                )}

                {/* Billing */}
                <div className="border border-border rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold">Date Facturare</p>

                  {/* Toggle PF / PJ */}
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setBillingType('pf')}
                      className={`flex-1 py-2 text-sm font-semibold transition ${billingType === 'pf' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                    >
                      Persoană Fizică
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingType('pj')}
                      className={`flex-1 py-2 text-sm font-semibold transition ${billingType === 'pj' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                    >
                      Persoană Juridică
                    </button>
                  </div>

                  {billingType === 'pf' ? (
                    <>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Nume Complet *</label>
                        <Input placeholder="Ion Popescu" value={billingName} onChange={e => setBillingName(e.target.value)} className="h-9 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">CNP <span className="text-muted-foreground">(opțional)</span></label>
                        <Input placeholder="1234567890123" value={billingVat} onChange={e => setBillingVat(e.target.value)} className="h-9 text-sm" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Denumire Firmă *</label>
                        <Input placeholder={brand?.name ?? 'FIRMA SRL'} value={billingName} onChange={e => setBillingName(e.target.value)} className="h-9 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">CUI / CIF *</label>
                        <Input placeholder="ex: RO43782172" value={billingVat} onChange={e => setBillingVat(e.target.value)} className="h-9 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Adresă Sediu *</label>
                        <Input placeholder="Strada, Nr., Oraș, Județ" value={billingAddress} onChange={e => setBillingAddress(e.target.value)} className="h-9 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Reg. Comerțului <span className="text-muted-foreground">(opțional)</span></label>
                        <Input placeholder="ex: J40/1234/2020" value={billingRegCom} onChange={e => setBillingRegCom(e.target.value)} className="h-9 text-sm" />
                      </div>
                    </>
                  )}
                </div>

                <Button className="w-full h-12 bg-gradient-to-r from-primary to-accent font-semibold text-base"
                  onClick={() => {
                    if (!resolvedAmount || resolvedAmount < TOPUP_MIN) { setSubmitError(`Suma minimă este ${TOPUP_MIN} RON.`); return }
                    setSubmitError(null)
                    if (!billingName.trim()) { setSubmitError('Completează numele pentru factură.'); return }
                    if (billingType === 'pj' && !billingVat.trim()) { setSubmitError('CUI-ul este obligatoriu pentru persoane juridice.'); return }
                    if (billingType === 'pj' && !billingAddress.trim()) { setSubmitError('Adresa sediului este obligatorie pentru persoane juridice.'); return }
                    setModal('instructions')
                  }}
                  disabled={resolvedAmount < TOPUP_MIN}>
                  {resolvedAmount > 0 ? `Vezi instrucțiuni de plată — ${fmt(resolvedAmount)}` : 'Selectează o sumă'}
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
                    {Object.entries(methodObj.details).filter(([, v]) => !String(v).startsWith('←')).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <span className="text-xs text-muted-foreground font-medium">{key}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black">{String(val)}</span>
                          <CopyButton text={String(val)} />
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
                  <p className="text-xs text-muted-foreground mb-1">Numărul Facturii Tale</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-primary">{successTx.invoice_number}</p>
                    <CopyButton text={successTx.invoice_number!} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Include-l în referința plății tale</p>
                </div>

                {/* Payment instructions */}
                <div className="border border-border rounded-xl overflow-hidden">
                  <div className={`flex items-center gap-3 px-4 py-3 ${methodObj.bg} border-b ${methodObj.border}`}>
                    <methodObj.icon className={`w-4 h-4 ${methodObj.color}`} />
                    <p className="font-semibold text-sm">{methodObj.label} — Payment Details</p>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {Object.entries(methodObj.details).map(([key, val]) => {
                      const isRef = String(val).startsWith('←')
                      const displayVal = isRef ? successTx.invoice_number! : String(val)
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

    </div>
  )
}

export default function BrandWalletPage() {
  return (
    <Suspense fallback={null}>
      <BrandWalletPageInner />
    </Suspense>
  )
}
