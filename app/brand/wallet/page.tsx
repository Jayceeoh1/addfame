'use client'
import { campaignName } from '@/lib/campaign-name'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Wallet, TrendingUp, ArrowUpRight, ArrowDownLeft, Clock,
  CheckCircle, XCircle, AlertCircle, X, Plus, CreditCard,
  Briefcase, Download, Receipt, BarChart3, Calendar,
  Building2, Copy, Check, FileText, Shield, Info, Loader2,
} from 'lucide-react'
import { BANK, REVOLUT, WISE, PAYPAL, CRYPTO, TOPUP_MIN, TOPUP_MAX } from '@/lib/payment-config'
import CardCheckout, { CARD_PAYMENTS_ENABLED } from '@/components/stripe/CardCheckout'

// ─── Types ─────────────────────────────────────────────────────────────────────
type Transaction = {
  id: string
  type: 'TOPUP' | 'SPEND' | 'REFUND' | 'RESERVE' | 'CAMPAIGN_FEE' | 'ESCROW_LOCK' | 'ESCROW_RETURN'
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

// ─── Metode de plată (din lib/payment-config.ts) ─────────────────────────────
const ALL_PAYMENT_METHODS = [
  { id: 'bank_transfer', label: 'Transfer bancar', sub: `${BANK.name} · IBAN`, active: true,
    details: [['Beneficiar', BANK.holder], ['IBAN', BANK.iban], ['Banca', BANK.name], ['BIC / SWIFT', BANK.bic]] },
  { id: 'revolut', label: 'Revolut', sub: 'Revolut Business', active: REVOLUT.active,
    details: [['Revolut tag', REVOLUT.tag], ['Cont', REVOLUT.account]] },
  { id: 'wise', label: 'Wise', sub: 'Transfer internațional', active: WISE.active,
    details: [['Email Wise', WISE.email], ['Beneficiar', WISE.holder]] },
  { id: 'paypal', label: 'PayPal', sub: 'PayPal Business', active: PAYPAL.active,
    details: [['Email PayPal', PAYPAL.email]] },
  { id: 'crypto', label: 'Crypto', sub: 'USDT / USDC', active: CRYPTO.active,
    details: [['Rețea', CRYPTO.network], ['Adresă', CRYPTO.address], ['Acceptat și pe', CRYPTO.also]] },
] as const
const PAYMENT_METHODS = ALL_PAYMENT_METHODS.filter(m => m.active)

const PRESET_AMOUNTS = [250, 500, 1000, 2500, 5000, 10000]
const POPULAR = 1000

const fmt = (n: number) => `${n.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} RON`
const fmtDate = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtDateTime = (d: string) => new Date(d).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const hasInvoice = (tx: Transaction) => !!tx.smartbill_invoice_number && !tx.smartbill_invoice_number.startsWith('EMITERE') && tx.smartbill_invoice_number !== 'VERIFICA'

// ─── Copiere ───────────────────────────────────────────────────────────────────
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(text) } catch { /* unele browsere refuză; textul rămâne selectabil */ }
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }
  return (
    <button type="button" onClick={copy} className="tp-copy" aria-label={`Copiază ${label || ''}`.trim()}>
      {copied ? <Check className="w-4 h-4" style={{ color: '#14804a' }} /> : <Copy className="w-4 h-4" />}
      <span>{copied ? 'Copiat' : 'Copiază'}</span>
    </button>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
function BrandWalletPageInner() {
  const searchParams = useSearchParams()
  const [wallet, setWallet] = useState<BrandWallet>({ credits_balance: 0, credits_reserved: 0, total_spent: 0, credits_expires_at: null })
  const [brand, setBrand] = useState<BrandInfo | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<'transactions' | 'campaigns'>('transactions')
  const [filterType, setFilterType] = useState('ALL')

  // Fereastra de încărcare: 'amount' (sumă + facturare) → 'transfer' (detalii plată, referință unică)
  const [modal, setModal] = useState<null | 'amount' | 'transfer' | 'card' | 'paid'>(null)
  const [cardBilling, setCardBilling] = useState<Record<string, string> | null>(null)
  const [paidRef, setPaidRef] = useState<string | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<string>(PAYMENT_METHODS[0]?.id ?? 'bank_transfer')
  const [amount, setAmount] = useState<number | null>(500)
  const [customAmount, setCustomAmount] = useState('')
  const [billingType, setBillingType] = useState<'pf' | 'pj'>('pj')
  const [billingName, setBillingName] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [billingVat, setBillingVat] = useState('')
  const [billingRegCom, setBillingRegCom] = useState('')
  const [savedBilling, setSavedBilling] = useState<{ type: 'pf' | 'pj'; name: string; vat: string; address: string } | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [requestTx, setRequestTx] = useState<Transaction | null>(null)
  const [invoiceMsg, setInvoiceMsg] = useState<string | null>(null)

  useEffect(() => { fetchAll() }, [])
  // ?topup=1 deschide direct încărcarea (din alte pagini)
  useEffect(() => { if (searchParams.get('topup') === '1') setModal('amount') }, [searchParams])
  // întoarcere după confirmarea cardului în aplicația băncii (3D Secure cu redirect)
  useEffect(() => {
    if (searchParams.get('payment') !== 'card') return
    if (searchParams.get('redirect_status') === 'failed') { setInvoiceMsg('Plata cu cardul nu a reușit. Poți încerca din nou.'); return }
    setPaidRef(searchParams.get('ref')); setModal('paid')
    const t1 = setTimeout(fetchAll, 3000), t2 = setTimeout(fetchAll, 9000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [searchParams])
  // pe telefon: pagina din spate nu se mai derulează cât e deschisă fereastra
  useEffect(() => {
    if (!modal) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [modal])

  async function fetchAll() {
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

      // Datele de facturare salvate în Setări → Facturare
      const saved = b.billing_company || b.billing_cui
        ? { type: 'pj' as const, name: b.billing_company || b.name || '', vat: b.billing_cui || '', address: b.billing_address || '' }
        : { type: 'pj' as const, name: b.name || '', vat: '', address: '' }
      setSavedBilling(saved)
      setBrand(b)
      setWallet({ credits_balance: b.credits_balance ?? 0, credits_reserved: b.credits_reserved ?? 0, total_spent: b.total_spent ?? 0, credits_expires_at: b.credits_expires_at ?? null })

      const [txRes, campRes] = await Promise.all([
        supabase.from('brand_transactions').select('*').eq('brand_id', b.id)
          .order('created_at', { ascending: false }).limit(100),
        supabase.from('campaigns').select('id, title, offer_name, product_name, budget, status')
          .eq('brand_id', b.id).order('created_at', { ascending: false }),
      ])

      setTransactions((txRes.data as Transaction[]) ?? [])
      setCampaigns((campRes.data as CampaignRow[]) ?? [])
    } finally {
      setLoading(false)
    }
  }

  function applySavedBilling() {
    if (!savedBilling) return
    setBillingType(savedBilling.type); setBillingName(savedBilling.name)
    setBillingVat(savedBilling.vat); setBillingAddress(savedBilling.address); setBillingRegCom('')
  }

  function openTopup() {
    applySavedBilling()
    setAmount(500); setCustomAmount(''); setSubmitError(null); setRequestTx(null)
    setModal('amount')
  }

  const customParsed = customAmount ? Number(customAmount.replace(/\s/g, '').replace(',', '.')) : NaN
  const resolvedAmount = amount ?? (Number.isFinite(customParsed) ? Math.round(customParsed * 100) / 100 : 0)
  const amountValid = resolvedAmount >= TOPUP_MIN && resolvedAmount <= TOPUP_MAX
  const methodObj = PAYMENT_METHODS.find(m => m.id === selectedMethod) ?? PAYMENT_METHODS[0]
  const isVerified = brand?.verification_status === 'verified'

  async function handleSubmitPayment() {
    setSubmitError(null)
    if (!amountValid) { setSubmitError(`Suma trebuie să fie între ${TOPUP_MIN} și ${TOPUP_MAX.toLocaleString('ro-RO')} RON.`); return }
    if (!billingName.trim()) { setSubmitError(billingType === 'pj' ? 'Completează denumirea firmei.' : 'Completează numele complet.'); return }
    if (billingType === 'pj' && !billingVat.trim()) { setSubmitError('CUI-ul este obligatoriu pentru firme.'); return }
    if (billingType === 'pj' && !billingAddress.trim()) { setSubmitError('Adresa sediului este obligatorie pentru firme.'); return }

    if (selectedMethod === 'card') {
      setCardBilling({ type: billingType, name: billingName, address: billingAddress, vat: billingVat, reg_com: billingRegCom })
      setModal('card')
      return
    }

    setSubmitLoading(true)
    try {
      const res = await fetch('/api/wallet/submit-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: resolvedAmount,
          method: methodObj.id,
          billing: { type: billingType, name: billingName, address: billingAddress, vat: billingVat, reg_com: billingRegCom },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Cererea nu a putut fi trimisă.')
      setRequestTx({
        id: data.transaction_id, type: 'TOPUP', amount: resolvedAmount,
        description: `Încărcare credite — ${fmt(resolvedAmount)}`, status: 'pending',
        payment_method: methodObj.id, invoice_number: data.invoice_number, created_at: data.created_at,
      })
      setModal('transfer')
      fetchAll()
    } catch (err: any) {
      setSubmitError(err.message || 'Trimitere eșuată. Încearcă din nou.')
    } finally {
      setSubmitLoading(false)
    }
  }

  /** Reafișează detaliile de transfer pentru o cerere încă neconfirmată. */
  function showTransfer(tx: Transaction) {
    setRequestTx(tx)
    if (tx.payment_method && PAYMENT_METHODS.some(m => m.id === tx.payment_method)) setSelectedMethod(tx.payment_method)
    setModal('transfer')
  }

  function openInvoice(tx: Transaction) {
    if (!hasInvoice(tx)) {
      setInvoiceMsg(tx.status === 'completed'
        ? 'Factura se emite în câteva minute. Revino puțin mai târziu.'
        : 'Factura se emite automat după ce confirmăm plata.')
      setTimeout(() => setInvoiceMsg(null), 4000)
      return
    }
    window.open(`/api/smartbill/invoice-pdf?transaction_id=${tx.id}`, '_blank', 'noopener')
  }

  function closeModal() {
    setModal(null); setSubmitError(null); setRequestTx(null); setCardBilling(null)
  }

  function exportCSV() {
    const rows = [['Data', 'Tip', 'Descriere', 'Suma (RON)', 'Status', 'Referință', 'Factură'],
    ...transactions.map(tx => [fmtDate(tx.created_at), tx.type, `"${(tx.description || '').replace(/"/g, "'")}"`,
    Math.abs(tx.amount).toFixed(2), tx.status, tx.invoice_number ?? '', hasInvoice(tx) ? tx.smartbill_invoice_number : ''])]
    const blob = new Blob(['\ufeff' + rows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `addfame-wallet-${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthSpend = transactions
    .filter(tx => (tx.type === 'SPEND' || tx.type === 'CAMPAIGN_FEE' || tx.type === 'ESCROW_LOCK') && new Date(tx.created_at) >= monthStart)
    .reduce((s, tx) => s + Math.abs(tx.amount), 0)

  const pendingTx = transactions.filter(tx => tx.type === 'TOPUP' && tx.status === 'pending')
  const filteredTx = transactions.filter(tx => filterType === 'ALL' || tx.type === filterType)

  const TX_CHIP: Record<string, { bg: string; fg: string }> = {
    completed: { bg: '#dcf5ec', fg: '#14532d' },
    pending: { bg: '#fff1c2', fg: '#854d0e' },
    failed: { bg: '#fde8e6', fg: '#b42318' },
  }
  const TX_STATUS_RO: Record<string, string> = { completed: 'Finalizat', pending: 'În așteptare', failed: 'Respins' }
  const TX_ICO: Record<string, { bg: string; fg: string }> = {
    TOPUP: { bg: '#dcf5ec', fg: '#14532d' },
    REFUND: { bg: '#e6f0ff', fg: '#1d4fb8' },
    SPEND: { bg: '#efeaff', fg: '#4423c4' },
    RESERVE: { bg: '#fff1c2', fg: '#854d0e' },
    ESCROW_LOCK: { bg: '#fff1c2', fg: '#854d0e' },
    ESCROW_RETURN: { bg: '#e6f0ff', fg: '#1d4fb8' },
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
        .bw-inv { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 12px; border-radius: 10px; border: 1.5px solid #e5e3f3; background: #fff; color: #4423c4; font: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; white-space: nowrap; }
        .bw-inv:hover { background: #f7f4ff; border-color: #c9b9fb; }
        .bw-inv.muted { color: #6a6690; }
        .bw-toast { position: fixed; left: 50%; bottom: calc(24px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); z-index: 70; background: #14123a; color: #fff; border-radius: 14px; padding: 12px 16px; font-size: 13.5px; font-weight: 600; box-shadow: 0 18px 40px -16px rgba(20,18,58,.6); max-width: calc(100vw - 32px); }

        /* ── Fereastra de încărcare: centrată pe desktop, foaie de jos pe telefon ── */
        .tp-ov { position: fixed; inset: 0; z-index: 60; background: rgba(20,18,58,.55); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 20px; }
        .tp-sheet { width: 100%; max-width: 540px; max-height: min(92vh, 860px); background: #fff; border-radius: 24px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 40px 80px -30px rgba(20,18,58,.55); color: #14123a; }
        .tp-head { display: flex; align-items: center; gap: 10px; padding: 18px 20px 14px; border-bottom: 1px solid #eeecf7; flex: none; }
        .tp-head h2 { margin: 0; font-size: 18px; font-weight: 800; }
        .tp-steps { display: flex; gap: 6px; margin-top: 6px; }
        .tp-steps i { height: 4px; width: 22px; border-radius: 9px; background: #eeecf7; }
        .tp-steps i.on { background: linear-gradient(90deg, #2f6fe0, #5a35e6); width: 34px; }
        .tp-x { width: 40px; height: 40px; border-radius: 12px; border: 0; background: #f6f6fc; color: #4a4770; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex: none; }
        .tp-x:hover { background: #efeaff; color: #4423c4; }
        .tp-body { padding: 18px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 18px; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
        .tp-foot { padding: 14px 20px calc(14px + env(safe-area-inset-bottom, 0px)); border-top: 1px solid #eeecf7; background: #fff; flex: none; display: flex; flex-direction: column; gap: 8px; }
        .tp-foot .bu-btn { width: 100%; }
        .tp-sec { display: flex; flex-direction: column; gap: 10px; }
        .tp-amts { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 8px; }
        .tp-amt { position: relative; height: 52px; border-radius: 14px; border: 1.5px solid #e5e3f3; background: #fff; font: inherit; font-weight: 800; font-size: 15px; color: #14123a; cursor: pointer; font-variant-numeric: tabular-nums; }
        .tp-amt:hover { border-color: #c9b9fb; }
        .tp-amt.on { border-color: #5a35e6; background: #f4f0ff; color: #4423c4; box-shadow: 0 0 0 3px rgba(90,53,230,.12); }
        .tp-amt .pop { position: absolute; top: -9px; left: 50%; transform: translateX(-50%); background: #5a35e6; color: #fff; font-size: 9.5px; font-weight: 800; letter-spacing: .06em; padding: 2px 8px; border-radius: 99px; }
        .tp-money { display: flex; align-items: center; border: 1.5px solid #e5e3f3; border-radius: 14px; height: 52px; padding: 0 14px; gap: 8px; background: #fff; }
        .tp-money:focus-within { border-color: #5a35e6; box-shadow: 0 0 0 3px rgba(90,53,230,.1); }
        .tp-money input { border: 0; outline: 0; font: inherit; font-size: 17px; font-weight: 700; flex: 1; min-width: 0; color: #14123a; background: transparent; font-variant-numeric: tabular-nums; }
        .tp-money span { color: #8783a8; font-weight: 700; font-size: 14px; }
        .tp-seg { display: grid; grid-template-columns: 1fr 1fr; background: #f6f6fc; border-radius: 12px; padding: 4px; gap: 4px; }
        .tp-seg button { height: 40px; border: 0; border-radius: 9px; background: transparent; font: inherit; font-weight: 700; font-size: 14px; color: #6a6690; cursor: pointer; }
        .tp-seg button.on { background: #fff; color: #14123a; box-shadow: 0 1px 3px rgba(20,18,58,.12); }
        .tp-field { display: flex; flex-direction: column; gap: 6px; }
        .tp-field label { font-size: 12.5px; font-weight: 700; color: #4a4770; }
        .tp-field label em { font-style: normal; font-weight: 500; color: #8783a8; }
        .tp-field .bu-input { width: 100%; height: 46px; }
        .tp-two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .tp-sum { border-radius: 16px; background: #f7f4ff; border: 1px solid #e0d6ff; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; font-size: 14px; }
        .tp-sum div { display: flex; justify-content: space-between; gap: 10px; }
        .tp-sum b { font-variant-numeric: tabular-nums; }
        .tp-method { display: flex; align-items: center; gap: 12px; border: 1.5px solid #e5e3f3; border-radius: 14px; padding: 12px 14px; background: #fff; font: inherit; text-align: left; cursor: pointer; width: 100%; color: #14123a; }
        .tp-method.on { border-color: #5a35e6; background: #f4f0ff; }
        .tp-method.off { cursor: not-allowed; opacity: .6; border-style: dashed; }
        .tp-method p { margin: 0; }
        .tp-alert { display: flex; gap: 10px; align-items: flex-start; border-radius: 14px; padding: 12px 14px; font-size: 13px; line-height: 1.5; }
        .tp-alert p { margin: 0; }
        .tp-hero { border-radius: 18px; background: #14123a; color: #fff; padding: 18px; display: flex; flex-direction: column; gap: 4px; position: relative; overflow: hidden; }
        .tp-hero::after { content: ''; position: absolute; right: -60px; top: -70px; width: 200px; height: 200px; border-radius: 50%; background: linear-gradient(135deg, #22c8f0, #7040f0); opacity: .35; filter: blur(36px); }
        .tp-hero > * { position: relative; }
        .tp-hero .v { font-family: var(--font-display, system-ui), system-ui, sans-serif; font-weight: 800; font-size: 32px; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
        .tp-rows { border: 1px solid #e5e3f3; border-radius: 16px; overflow: hidden; }
        .tp-r { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-top: 1px solid #eeecf7; }
        .tp-r:first-child { border-top: 0; }
        .tp-r .k { font-size: 12px; color: #6a6690; font-weight: 600; width: 92px; flex: none; }
        .tp-r .val { flex: 1; min-width: 0; font-weight: 700; font-size: 14.5px; word-break: break-word; font-variant-numeric: tabular-nums; user-select: all; }
        .tp-r.ref { background: #f7f4ff; }
        .tp-r.ref .val { color: #4423c4; font-size: 16px; letter-spacing: .02em; }
        .tp-copy { display: inline-flex; align-items: center; gap: 5px; height: 34px; padding: 0 10px; border-radius: 10px; border: 1.5px solid #e5e3f3; background: #fff; color: #4a4770; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; flex: none; }
        .tp-copy:hover { border-color: #c9b9fb; color: #4423c4; }
        .tp-ol { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; font-size: 13.5px; color: #4a4770; }
        @media (max-width: 560px) {
          .tp-ov { padding: 0; align-items: flex-end; }
          .tp-sheet { max-width: none; border-radius: 22px 22px 0 0; max-height: 94dvh; animation: tpUp .22s ease-out; }
          .tp-head { padding: 10px 16px 12px; flex-wrap: wrap; }
          .tp-head::before { content: ''; flex-basis: 100%; height: 4px; margin: 0 auto 6px; max-width: 40px; border-radius: 9px; background: #d8d5ec; }
          .tp-body { padding: 16px; }
          .tp-foot { padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px)); }
          .tp-two { grid-template-columns: 1fr; }
          .tp-field .bu-input, .tp-money input { font-size: 16px; } /* fără zoom automat pe iPhone */
          .tp-r { flex-wrap: wrap; } .tp-r .k { width: 100%; }
          .tp-hero .v { font-size: 28px; }
          .bw-tx > .bw-inv { margin-left: 52px; }
        }
        @keyframes tpUp { from { transform: translateY(40px); opacity: .6; } to { transform: none; opacity: 1; } }
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

      {/* Încărcări în așteptare */}
      {pendingTx.length > 0 && (
        <div className="bw-banner" style={{ background: '#fff8dc', border: '1px solid #f3dc8a', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="bu-ico" style={{ background: '#fff1c2', color: '#854d0e' }}><Clock className="w-5 h-5" /></div>
          <div style={{ flex: '1 1 220px', minWidth: 0, color: '#854d0e' }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 14 }}>
              {pendingTx.length > 1 ? `${pendingTx.length} încărcări așteaptă confirmarea` : `${fmt(pendingTx[0].amount)} așteaptă confirmarea`}
            </p>
            <p className="bu-xs" style={{ margin: '2px 0 0' }}>
              Adăugăm creditele după ce transferul ajunge în cont (de obicei în 1 zi lucrătoare). Referință: <b>{pendingTx[0]?.invoice_number}</b>
            </p>
          </div>
          <button onClick={() => showTransfer(pendingTx[0])} className="bu-btn">Detalii transfer</button>
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

          <button onClick={() => openTopup()} className="bw-cta"><Plus className="w-4 h-4" /> Adaugă credite</button>
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
              <option value="TOPUP">Încărcări</option>
              <option value="CAMPAIGN_FEE">Taxe campanii</option>
              <option value="ESCROW_LOCK">Plăți influenceri blocate</option>
              <option value="REFUND">Returnări</option>
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
              <button onClick={() => openTopup()} className="bu-btn p big" style={{ marginTop: 8 }}>Adaugă credite</button>
            </div>
          ) : (
            <div>
              {filteredTx.map(tx => {
                const ico = TX_ICO[tx.type] ?? TX_ICO.SPEND
                const isCredit = tx.type === 'TOPUP' || tx.type === 'REFUND' || tx.type === 'ESCROW_RETURN'
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
                        {tx.type === 'TOPUP' && tx.invoice_number && ` · Ref. ${tx.invoice_number}`}
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
                    {tx.type === 'TOPUP' && tx.status === 'completed' && (
                      <button onClick={() => openInvoice(tx)} className={`bw-inv${hasInvoice(tx) ? '' : ' muted'}`}>
                        <FileText className="w-4 h-4" />
                        {hasInvoice(tx) ? `Factura ${tx.smartbill_invoice_number}` : 'Factura în curs'}
                      </button>
                    )}
                    {tx.type === 'TOPUP' && tx.status === 'pending' && (
                      <button onClick={() => showTransfer(tx)} className="bw-inv"><Building2 className="w-4 h-4" /> Detalii transfer</button>
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
                            <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{campaignName(c, c.title)}</p>
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


      {invoiceMsg && <div className="bw-toast" role="status">{invoiceMsg}</div>}

      {/* ══ Încărcare credite ══════════════════════════════════════════════ */}
      {modal && (
        <div className="tp-ov" onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div className="tp-sheet" role="dialog" aria-modal="true" aria-labelledby="tp-title">
            <div className="tp-head">
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 id="tp-title">{modal === 'amount' ? 'Adaugă credite' : modal === 'card' ? 'Plată cu cardul' : modal === 'paid' ? 'Plată reușită' : 'Fă transferul'}</h2>
                <div className="tp-steps" aria-hidden><i className="on" /><i className={modal !== 'amount' ? 'on' : ''} /></div>
              </div>
              <button className="tp-x" onClick={closeModal} aria-label="Închide"><X className="w-4 h-4" /></button>
            </div>

            {/* ── Pasul 1: suma și datele de facturare ── */}
            {modal === 'amount' && (
              <>
                <div className="tp-body">
                  {!isVerified && (
                    <div className="tp-alert" style={{ background: '#fff8dc', border: '1px solid #f3dc8a', color: '#854d0e' }}>
                      <AlertCircle className="w-4 h-4" style={{ flex: 'none', marginTop: 2 }} />
                      <p><b>Contul nu e verificat încă.</b> Poți încărca credite după verificare. <a href="/brand/verify" style={{ color: 'inherit', fontWeight: 800 }}>Verifică acum →</a></p>
                    </div>
                  )}

                  <div className="tp-sec">
                    <span className="bu-label">Suma</span>
                    <div className="tp-amts">
                      {PRESET_AMOUNTS.map(v => (
                        <button key={v} type="button" onClick={() => { setAmount(v); setCustomAmount('') }} className={`tp-amt${amount === v ? ' on' : ''}`}>
                          {v === POPULAR && <span className="pop">POPULAR</span>}
                          {v.toLocaleString('ro-RO')}
                        </button>
                      ))}
                    </div>
                    <div className="tp-money">
                      <input inputMode="decimal" placeholder="Altă sumă" aria-label="Altă sumă în RON"
                        value={customAmount} onChange={e => { setCustomAmount(e.target.value.replace(/[^0-9.,]/g, '')); setAmount(null) }} />
                      <span>RON</span>
                    </div>
                    <p className="bu-xs bu-muted" style={{ margin: 0 }}>Între {TOPUP_MIN} și {TOPUP_MAX.toLocaleString('ro-RO')} RON · creditele sunt valabile 6 luni</p>
                  </div>

                  <div className="tp-sec">
                    <span className="bu-label">Metoda de plată</span>
                    {PAYMENT_METHODS.map(m => (
                      <button key={m.id} type="button" onClick={() => setSelectedMethod(m.id)} className={`tp-method${selectedMethod === m.id ? ' on' : ''}`}>
                        <div className="bu-ico" style={{ background: '#e6f0ff', color: '#1d4fb8' }}><Building2 className="w-5 h-5" /></div>
                        <div style={{ flex: 1, minWidth: 0 }}><p style={{ fontWeight: 700, fontSize: 14 }}>{m.label}</p><p className="bu-xs bu-muted">{m.sub}</p></div>
                        {selectedMethod === m.id && <CheckCircle className="w-5 h-5" style={{ color: '#5a35e6' }} />}
                      </button>
                    ))}
                    {CARD_PAYMENTS_ENABLED ? (
                      <button type="button" onClick={() => setSelectedMethod('card')} className={`tp-method${selectedMethod === 'card' ? ' on' : ''}`}>
                        <div className="bu-ico" style={{ background: '#efeaff', color: '#4423c4' }}><CreditCard className="w-5 h-5" /></div>
                        <div style={{ flex: 1, minWidth: 0 }}><p style={{ fontWeight: 700, fontSize: 14 }}>Card bancar</p><p className="bu-xs bu-muted">Visa, Mastercard · creditele intră imediat</p></div>
                        {selectedMethod === 'card' && <CheckCircle className="w-5 h-5" style={{ color: '#5a35e6' }} />}
                      </button>
                    ) : (
                      <div className="tp-method off" aria-disabled>
                        <div className="bu-ico" style={{ background: '#f0eff7', color: '#8783a8' }}><CreditCard className="w-5 h-5" /></div>
                        <div style={{ flex: 1, minWidth: 0 }}><p style={{ fontWeight: 700, fontSize: 14 }}>Card bancar</p><p className="bu-xs bu-muted">Visa, Mastercard</p></div>
                        <span className="bu-chip" style={{ background: '#f0eff7', color: '#4a4770' }}>În curând</span>
                      </div>
                    )}
                  </div>

                  <div className="tp-sec">
                    <span className="bu-label">Date pentru factură</span>
                    <div className="tp-seg" role="tablist">
                      <button type="button" className={billingType === 'pj' ? 'on' : ''} onClick={() => setBillingType('pj')}>Firmă</button>
                      <button type="button" className={billingType === 'pf' ? 'on' : ''} onClick={() => setBillingType('pf')}>Persoană fizică</button>
                    </div>
                    {billingType === 'pj' ? (
                      <>
                        <div className="tp-field">
                          <label htmlFor="tp-name">Denumire firmă</label>
                          <input id="tp-name" className="bu-input" placeholder="FIRMA SRL" autoComplete="organization" value={billingName} onChange={e => setBillingName(e.target.value)} />
                        </div>
                        <div className="tp-two">
                          <div className="tp-field">
                            <label htmlFor="tp-cui">CUI</label>
                            <input id="tp-cui" className="bu-input" placeholder="RO12345678" value={billingVat} onChange={e => setBillingVat(e.target.value)} />
                          </div>
                          <div className="tp-field">
                            <label htmlFor="tp-reg">Nr. Reg. Comerțului <em>(opțional)</em></label>
                            <input id="tp-reg" className="bu-input" placeholder="J40/1234/2020" value={billingRegCom} onChange={e => setBillingRegCom(e.target.value)} />
                          </div>
                        </div>
                        <div className="tp-field">
                          <label htmlFor="tp-addr">Adresa sediului</label>
                          <input id="tp-addr" className="bu-input" placeholder="Strada, nr., oraș, județ" autoComplete="street-address" value={billingAddress} onChange={e => setBillingAddress(e.target.value)} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="tp-field">
                          <label htmlFor="tp-pname">Nume complet</label>
                          <input id="tp-pname" className="bu-input" placeholder="Ion Popescu" autoComplete="name" value={billingName} onChange={e => setBillingName(e.target.value)} />
                        </div>
                        <div className="tp-two">
                          <div className="tp-field">
                            <label htmlFor="tp-cnp">CNP <em>(opțional)</em></label>
                            <input id="tp-cnp" className="bu-input" inputMode="numeric" placeholder="13 cifre" value={billingVat} onChange={e => setBillingVat(e.target.value)} />
                          </div>
                          <div className="tp-field">
                            <label htmlFor="tp-paddr">Adresa <em>(opțional)</em></label>
                            <input id="tp-paddr" className="bu-input" placeholder="Oraș, județ" value={billingAddress} onChange={e => setBillingAddress(e.target.value)} />
                          </div>
                        </div>
                      </>
                    )}
                    <p className="bu-xs bu-muted" style={{ margin: 0 }}>Factura fiscală (seria ADDF) se emite pe aceste date după confirmarea plății. Le poți salva în Setări → Facturare.</p>
                  </div>

                  {submitError && (
                    <div className="tp-alert" style={{ background: '#fde8e6', border: '1px solid #f3c9c4', color: '#b42318' }}>
                      <AlertCircle className="w-4 h-4" style={{ flex: 'none', marginTop: 2 }} /><p>{submitError}</p>
                    </div>
                  )}
                </div>

                <div className="tp-foot">
                  {amountValid && (
                    <div className="bu-row bu-sm" style={{ justifyContent: 'space-between', gap: 10 }}>
                      <span className="bu-muted">Sold după încărcare</span>
                      <b style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(wallet.credits_balance + resolvedAmount)}</b>
                    </div>
                  )}
                  <button className="bu-btn p big" onClick={handleSubmitPayment} disabled={submitLoading || !amountValid || !isVerified}>
                    {submitLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Se pregătește…</>
                      : amountValid ? `Continuă — plătești ${fmt(resolvedAmount)}` : 'Alege o sumă'}
                  </button>
                </div>
              </>
            )}

            {/* ── Pasul 2 (card): plata prin Stripe ── */}
            {modal === 'card' && cardBilling && (
              <CardCheckout amount={resolvedAmount} billing={cardBilling}
                onBack={() => setModal('amount')}
                onPaid={ref => { setPaidRef(ref); setModal('paid'); setTimeout(fetchAll, 2500); setTimeout(fetchAll, 8000) }} />
            )}

            {/* ── Plată cu cardul reușită ── */}
            {modal === 'paid' && (
              <>
                <div className="tp-body" style={{ alignItems: 'center', textAlign: 'center', padding: '32px 20px' }}>
                  <div className="bu-ico" style={{ width: 64, height: 64, borderRadius: 20, background: '#dcf5ec', color: '#14804a' }}><CheckCircle className="w-8 h-8" /></div>
                  <h3 style={{ margin: '6px 0 0' }}>Plata a fost primită</h3>
                  <p className="bu-sm bu-muted" style={{ margin: 0, maxWidth: 380 }}>
                    Creditele apar în wallet în câteva secunde, iar factura fiscală <b>seria ADDF</b> o găsești la Tranzacții.{paidRef ? <> Referință: <b>{paidRef}</b>.</> : null}
                  </p>
                </div>
                <div className="tp-foot">
                  <button className="bu-btn p big" onClick={() => { closeModal(); fetchAll() }}>Gata</button>
                </div>
              </>
            )}

            {/* ── Pasul 2: detaliile transferului, cu referința unică ── */}
            {modal === 'transfer' && requestTx && (
              <>
                <div className="tp-body">
                  <div className="tp-hero">
                    <span className="bw-lbl">De plătit</span>
                    <span className="v">{fmt(requestTx.amount)}</span>
                    <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,.75)' }}>Trimite exact această sumă, cu referința de mai jos.</span>
                  </div>

                  <div className="tp-rows">
                    {methodObj.details.map(([k, v]) => (
                      <div key={k} className="tp-r"><span className="k">{k}</span><span className="val">{v}</span><CopyButton text={k === 'IBAN' ? v.replace(/\s/g, '') : v} label={k} /></div>
                    ))}
                    <div className="tp-r"><span className="k">Suma</span><span className="val">{requestTx.amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</span><CopyButton text={requestTx.amount.toFixed(2)} label="suma" /></div>
                    <div className="tp-r ref"><span className="k">Referință / detalii plată</span><span className="val">{requestTx.invoice_number}</span><CopyButton text={requestTx.invoice_number || ''} label="referința" /></div>
                  </div>

                  <div className="tp-alert" style={{ background: '#f7f4ff', border: '1px solid #e0d6ff', color: '#14123a' }}>
                    <Info className="w-4 h-4" style={{ flex: 'none', marginTop: 2, color: '#5a35e6' }} />
                    <ol className="tp-ol">
                      <li>Scrie referința <b>{requestTx.invoice_number}</b> la detaliile plății — așa o găsim imediat.</li>
                      <li>Adăugăm creditele după ce banii ajung în cont (de obicei în 1 zi lucrătoare) și primești notificare.</li>
                      <li>Factura fiscală <b>seria ADDF</b> apare apoi în Wallet → Tranzacții.</li>
                    </ol>
                  </div>

                  <div className="tp-alert" style={{ background: '#f6f6fc', color: '#4a4770' }}>
                    <Shield className="w-4 h-4" style={{ flex: 'none', marginTop: 2 }} />
                    <p className="bu-xs">AddFame nu îți cere niciodată date bancare prin telefon, email sau chat. Întrebări: <b style={{ userSelect: 'all' }}>ciprian@addfame.ro</b> · <b style={{ userSelect: 'all' }}>+40 724 796 883</b></p>
                  </div>
                </div>

                <div className="tp-foot">
                  <button className="bu-btn p big" onClick={closeModal}><CheckCircle className="w-4 h-4" /> Am înțeles</button>
                  <p className="bu-xs bu-muted" style={{ margin: 0, textAlign: 'center' }}>Cererea e salvată — găsești oricând aceste detalii în Wallet.</p>
                </div>
              </>
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
