'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { requestWithdrawal } from '@/app/actions/collaborations'
import {
  Wallet, TrendingUp, ArrowUpRight, ArrowDownLeft, Clock,
  CheckCircle, XCircle, AlertCircle, X, Plus, Trash2,
  Building2, CreditCard, Smartphone, Star, Edit2, Shield, Info
, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const WITHDRAWAL_MIN = 250       // 250 RON prag minim
const WITHDRAWAL_FEE = 0.05      // 5% taxă
const WITHDRAWAL_CYCLE_DAYS = 15  // ciclu retragere 15 zile


function generateInfluencerInvoice(tx: any, influencer: any) {
  const date = new Date(tx.created_at)
  const invoiceNum = `AF-INF-${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}-${tx.id.slice(0,6).toUpperCase()}`
  const net = Math.abs(tx.amount)
  const commission = parseFloat((net / 0.85 * 0.15).toFixed(2))
  const gross = parseFloat((net + commission).toFixed(2))
  return `<!DOCTYPE html><html lang="ro"><head><meta charset="utf-8"><title>Chitanta ${invoiceNum} — AddFame</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2937;padding:40px;background:white}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}.logo{font-size:24px;font-weight:900;color:#7c3aed}.badge{background:#f3f0ff;border:1px solid #ddd6fe;border-radius:8px;padding:10px 16px;text-align:right}.badge .label{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em}.badge .number{font-size:18px;font-weight:800;color:#7c3aed;margin-top:2px}.parties{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:32px;padding:24px;background:#f9fafb;border-radius:12px}.party-label{font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px}.party-name{font-size:15px;font-weight:800;color:#1f2937;margin-bottom:4px}.party-detail{font-size:13px;color:#6b7280;margin-bottom:2px}table{width:100%;border-collapse:collapse;margin-bottom:24px}th{background:#7c3aed;color:white;padding:10px 14px;text-align:left;font-size:12px;font-weight:700}td{padding:12px 14px;border-bottom:1px solid #f3f4f6;font-size:13px}tr:last-child td{border-bottom:none}.totals{margin-left:auto;width:280px}.totals-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}.totals-row.total{border-top:2px solid #7c3aed;padding-top:10px;margin-top:4px;font-size:16px;font-weight:800;color:#7c3aed}.footer{margin-top:40px;padding-top:20px;border-top:1px solid #f3f4f6;text-align:center;font-size:12px;color:#9ca3af}</style></head><body><div class="header"><div><div class="logo">AddFame</div><p style="font-size:12px;color:#9ca3af;margin-top:4px;">addfame.ro · contact@addfame.ro</p></div><div class="badge"><div class="label">Chitanta</div><div class="number">${invoiceNum}</div></div></div><div class="parties"><div><div class="party-label">Platitor</div><div class="party-name">AddFame SRL</div><div class="party-detail">addfame.ro</div><div class="party-detail">contact@addfame.ro</div></div><div><div class="party-label">Beneficiar (Creator)</div><div class="party-name">${influencer?.name || 'Creator'}</div><div class="party-detail">${influencer?.city ? influencer.city + ', ' : ''}Romania</div></div></div><table><thead><tr><th>Descriere</th><th>Data</th><th style="text-align:right">Suma bruta</th><th style="text-align:right">Comision (15%)</th><th style="text-align:right">Net primit</th></tr></thead><tbody><tr><td>${tx.description || 'Colaborare campanie'}</td><td>${date.toLocaleDateString('ro-RO',{day:'numeric',month:'long',year:'numeric'})}</td><td style="text-align:right">${gross.toFixed(2)} RON</td><td style="text-align:right;color:#ef4444">-${commission.toFixed(2)} RON</td><td style="text-align:right;font-weight:700;color:#15803d">${net.toFixed(2)} RON</td></tr></tbody></table><div class="totals"><div class="totals-row"><span style="color:#6b7280">Suma bruta colaborare</span><span>${gross.toFixed(2)} RON</span></div><div class="totals-row"><span style="color:#6b7280">Comision platforma (15%)</span><span style="color:#ef4444">-${commission.toFixed(2)} RON</span></div><div class="totals-row total"><span>Total primit</span><span>${net.toFixed(2)} RON</span></div></div><div class="footer"><p>Aceasta chitanta este generata automat de platforma AddFame.</p><p style="margin-top:4px;">contact@addfame.ro · addfame.ro</p></div></body></html>`
}

function downloadInfluencerInvoice(tx: any, influencer: any) {
  const html = generateInfluencerInvoice(tx, influencer)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const date = new Date(tx.created_at)
  a.download = `chitanta-addfame-${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}-${tx.id.slice(0,6)}.html`
  a.click()
  URL.revokeObjectURL(url)
}

function getWithdrawalStatus(lastPayoutAt?: string | null) {
  if (!lastPayoutAt) return { canWithdraw: true, daysLeft: 0, nextAvailable: null }
  const lastPayout = new Date(lastPayoutAt)
  const nextAvailable = new Date(lastPayout.getTime() + WITHDRAWAL_CYCLE_DAYS * 24 * 60 * 60 * 1000)
  const daysLeft = Math.ceil((nextAvailable.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return {
    canWithdraw: daysLeft <= 0,
    daysLeft: Math.max(0, daysLeft),
    nextAvailable,
  }
}

type Transaction = {
  id: string
  type: 'EARN' | 'PAYOUT'
  amount: number
  description: string
  status: 'completed' | 'pending' | 'failed'
  created_at: string
}

type PaymentMethod = {
  id: string
  type: 'bank_transfer' | 'paypal' | 'revolut' | 'wise' | 'crypto'
  label: string
  details: Record<string, string>
  is_default: boolean
  created_at: string
}

type WalletData = {
  available_balance: number
  total_earned: number
  pending_payout: number
  last_payout_at?: string | null
}

const PAYMENT_TYPES = [
  {
    id: 'bank_transfer', label: 'Transfer Bancar', icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10',
    fields: [
      { key: 'account_holder', label: 'Titular Cont', placeholder: 'Ion Popescu' },
      { key: 'iban', label: 'IBAN', placeholder: 'DE89 3704 0044 0532 0130 00' },
      { key: 'bic', label: 'BIC / SWIFT', placeholder: 'COBADEFFXXX' },
      { key: 'bank_name', label: 'Nume Bancă', placeholder: 'Banca Transilvania' },
    ]
  },
  {
    id: 'paypal', label: 'PayPal', icon: CreditCard, color: 'text-indigo-500', bg: 'bg-indigo-500/10',
    fields: [
      { key: 'email', label: 'Email PayPal', placeholder: 'tu@exemplu.com' },
    ]
  },
  {
    id: 'revolut', label: 'Revolut', icon: Smartphone, color: 'text-cyan-500', bg: 'bg-cyan-500/10',
    fields: [
      { key: 'username', label: 'Username / Tag Revolut', placeholder: '@ionpopescu' },
      { key: 'phone', label: 'Număr de Telefon (opțional)', placeholder: '+40 712 345 678' },
    ]
  },
  {
    id: 'wise', label: 'Wise', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10',
    fields: [
      { key: 'email', label: 'Email Wise', placeholder: 'tu@exemplu.com' },
      { key: 'account_number', label: 'Număr Cont (opțional)', placeholder: 'P12345678' },
    ]
  },
  {
    id: 'crypto', label: 'Crypto (USDT/USDC)', icon: Shield, color: 'text-orange-500', bg: 'bg-orange-500/10',
    fields: [
      { key: 'network', label: 'Rețea', placeholder: 'TRC-20 / ERC-20 / BEP-20' },
      { key: 'wallet_address', label: 'Adresă Wallet', placeholder: '0x...' },
    ]
  },
]

type ActiveTab = 'overview' | 'payment_methods'

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [wallet, setWallet] = useState<WalletData>({ available_balance: 0, total_earned: 0, pending_payout: 0 })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [influencerInfo, setInfluencerInfo] = useState<any>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)

  // Payout modal
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null)
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [payoutError, setPayoutError] = useState<string | null>(null)
  const [payoutSuccess, setPayoutSuccess] = useState(false)

  // Add payment method
  const [showAddMethod, setShowAddMethod] = useState(false)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [methodFields, setMethodFields] = useState<Record<string, string>>({})
  const [methodLabel, setMethodLabel] = useState('')
  const [methodSaving, setMethodSaving] = useState(false)
  const [methodError, setMethodError] = useState<string | null>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [influencerRes, txRes, infInfoRes, pmRes] = await Promise.all([
        supabase.from('influencers').select('wallet_balance, total_earned, pending_payout, last_payout_at').eq('user_id', user.id).single(),
        supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('influencers').select('name, city').eq('user_id', user.id).single(),
        supabase.from('influencer_payment_methods').select('*').eq('user_id', user.id).order('is_default', { ascending: false }),
      ])

      if (influencerRes.data) {
        setWallet({
          available_balance: influencerRes.data.wallet_balance ?? 0,
          total_earned: influencerRes.data.total_earned ?? 0,
          pending_payout: influencerRes.data.pending_payout ?? 0,
          last_payout_at: influencerRes.data.last_payout_at ?? null,
        })
      }
      if (txRes.data) setTransactions(txRes.data)
      if (infInfoRes.data) setInfluencerInfo(infInfoRes.data)
      if (pmRes.data) setPaymentMethods(pmRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handlePayoutRequest() {
    setPayoutError(null)
    // Verifică ciclul de 15 zile
    const { canWithdraw, daysLeft, nextAvailable } = getWithdrawalStatus(wallet.last_payout_at)
    if (!canWithdraw) {
      const nextDate = nextAvailable!.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
      return setPayoutError(`Poți retrage o dată la 15 zile. Următoarea retragere disponibilă: ${nextDate} (${daysLeft} zile).`)
    }

    const amount = parseFloat(payoutAmount)
    if (!amount || amount <= 0) return setPayoutError('Introdu o sumă validă.')
    if (amount < WITHDRAWAL_MIN) return setPayoutError(`Suma minimă de retragere este ${WITHDRAWAL_MIN} RON.`)
    if (amount > wallet.available_balance) return setPayoutError(`Depășești soldul disponibil de ${wallet.available_balance.toLocaleString('ro-RO')} RON.`)
    if (!selectedMethodId) return setPayoutError('Selectează o metodă de plată.')

    const method = paymentMethods.find(m => m.id === selectedMethodId)
    setPayoutLoading(true)
    try {
      const result = await requestWithdrawal(amount, selectedMethodId) as any
      if (result.error) throw new Error(result.error)
      setPayoutSuccess(true)
      await fetchAll()
    } catch (err: any) {
      setPayoutError(err.message || 'Eroare la trimiterea cererii de retragere.')
    } finally {
      setPayoutLoading(false)
    }
  }

  async function handleSaveMethod() {
    setMethodError(null)
    if (!selectedType) return setMethodError('Selectează un tip de plată.')
    const typeConfig = PAYMENT_TYPES.find(t => t.id === selectedType)!
    for (const field of typeConfig.fields) {
      if (!field.placeholder.includes('optional') && !methodFields[field.key]) {
        return setMethodError(`Completează câmpul: ${field.label}.`)
      }
    }

    setMethodSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Neautentificat')

      const isFirst = paymentMethods.length === 0
      const { error } = await supabase.from('influencer_payment_methods').insert({
        user_id: user.id,
        type: selectedType,
        label: methodLabel || typeConfig.label,
        details: methodFields,
        is_default: isFirst,
      })
      if (error) throw error

      setShowAddMethod(false)
      setSelectedType(null)
      setMethodFields({})
      setMethodLabel('')
      await fetchAll()
    } catch (err: any) {
      setMethodError(err.message || 'Eroare la salvarea metodei de plată.')
    } finally {
      setMethodSaving(false)
    }
  }

  async function handleSetDefault(id: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('influencer_payment_methods').update({ is_default: false }).eq('user_id', user.id)
    await supabase.from('influencer_payment_methods').update({ is_default: true }).eq('id', id)
    await fetchAll()
  }

  async function handleDeleteMethod(id: string) {
    const supabase = createClient()
    await supabase.from('influencer_payment_methods').delete().eq('id', id)
    await fetchAll()
  }

  function closePayoutModal() {
    setShowPayoutModal(false)
    setPayoutAmount('')
    setPayoutError(null)
    setPayoutSuccess(false)
    setSelectedMethodId(null)
  }

  const TX_CHIP: Record<string, { bg: string; fg: string; label: string }> = {
    completed: { bg: '#dcf5ec', fg: '#14532d', label: 'Finalizat' },
    pending: { bg: '#fff1c2', fg: '#854d0e', label: 'În așteptare' },
    failed: { bg: '#fde8e6', fg: '#b42318', label: 'Eșuat' },
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })

  const getTypeConfig = (type: string) => PAYMENT_TYPES.find(t => t.id === type) ?? PAYMENT_TYPES[0]

  if (loading) return (
    <div className="iu">
      <div className="iw-empty" style={{ padding: '80px 12px' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#7040f0' }} />
        <p className="iu-muted iu-sm" style={{ margin: 0 }}>Se încarcă portofelul...</p>
      </div>
    </div>
  )

  const canPayout = wallet.available_balance >= WITHDRAWAL_MIN && paymentMethods.length > 0
  const wStatus = getWithdrawalStatus(wallet.last_payout_at)

  return (
    <div className="iu">
      <style>{`
        .iw-grid { display: grid; grid-template-columns: minmax(0,1.5fr) minmax(0,1fr); gap: 18px; align-items: stretch; }
        .iw-wallet { position: relative; overflow: hidden; background: #14123a; color: #fff; border-radius: 20px; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .iw-glow { position: absolute; right: -70px; top: -90px; width: 260px; height: 260px; border-radius: 50%; background: linear-gradient(135deg, #9030f0, #7040f0); opacity: .45; filter: blur(40px); pointer-events: none; }
        .iw-wallet > *:not(.iw-glow) { position: relative; }
        .iw-bal { font-family: var(--font-display, system-ui), system-ui, sans-serif; font-weight: 800; font-size: 44px; letter-spacing: -0.03em; line-height: 1.05; }
        .iw-bal small { font-size: 20px; color: rgba(255,255,255,.6); margin-left: 6px; }
        .iw-lbl { font-size: 11px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,.6); }
        .iw-cta { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 46px; padding: 0 22px; border-radius: 12px; border: 0; background: linear-gradient(135deg, #7040f0, #9030f0); color: #fff; font-weight: 700; font-size: 15px; cursor: pointer; font-family: inherit; align-self: flex-start; }
        .iw-cta:disabled { opacity: .45; cursor: not-allowed; }
        .iw-note { display: flex; gap: 10px; align-items: flex-start; border-radius: 12px; padding: 10px 12px; font-size: 12.5px; background: rgba(255,255,255,.08); color: rgba(255,255,255,.85); }
        .iw-stats { display: grid; grid-template-rows: 1fr 1fr; gap: 18px; }
        .iw-stat { padding: 20px; display: flex; flex-direction: column; gap: 6px; justify-content: center; }
        .iw-stat .v { font-family: var(--font-display, system-ui), system-ui, sans-serif; font-weight: 800; font-size: 26px; letter-spacing: -0.02em; }
        .iw-tx { display: flex; align-items: center; gap: 12px; padding: 14px 0; border-top: 1px solid #eeecf7; }
        .iw-tx:first-child { border-top: 0; }
        .iw-tx-main { min-width: 0; flex: 1; }
        .iw-tx-main p { margin: 0; }
        .iw-tx-d { font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .iw-tx-r { text-align: right; flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .iw-tx-amt { font-family: var(--font-display, system-ui), system-ui, sans-serif; font-weight: 800; font-size: 15px; }
        .iw-ib { width: 44px; height: 44px; border-radius: 12px; border: 0; background: transparent; color: #6a6690; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex: none; }
        .iw-ib:hover { background: #f7f4ff; color: #5a35e6; }
        .iw-ib.del { color: #b42318; }
        .iw-ib.del:hover { background: #fff4f2; color: #b42318; }
        .iw-empty { text-align: center; padding: 48px 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .iw-pm { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
        .iw-pm.def { border-color: #cdb8ff; background: #fcfaff; }
        .iw-pm-main { min-width: 0; flex: 1; }
        .iw-pm-main p { margin: 0; }
        .iw-ov { position: fixed; inset: 0; background: rgba(20,18,58,.55); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 16px; }
        .iw-modal { background: #fff; border-radius: 20px; padding: 24px; width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto; box-shadow: 0 30px 80px -20px rgba(20,18,58,.5); color: #14123a; font-family: var(--font-body, system-ui), system-ui, sans-serif; }
        .iw-modal.lg { max-width: 520px; }
        .iw-modal h2 { font-family: var(--font-display, system-ui), system-ui, sans-serif; margin: 0; font-weight: 800; font-size: 21px; letter-spacing: -0.01em; }
        .iw-modal h3 { font-family: var(--font-display, system-ui), system-ui, sans-serif; margin: 0; font-weight: 700; font-size: 17px; }
        .iw-mh { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .iw-field { display: flex; flex-direction: column; gap: 6px; }
        .iw-field .iu-input { width: 100%; height: 46px; }
        .iw-banner { display: flex; align-items: flex-start; gap: 10px; border-radius: 14px; padding: 12px 14px; font-size: 13px; }
        .iw-opt { width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 14px; border: 1.5px solid #e5e3f3; background: #fff; text-align: left; cursor: pointer; font-family: inherit; color: #14123a; min-height: 56px; }
        .iw-opt:hover { border-color: #cdb8ff; }
        .iw-opt.on { border-color: #7040f0; background: #f7f4ff; }
        .iw-types { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 8px; }
        .iw-type { padding: 12px 6px; border-radius: 14px; border: 1.5px solid #e5e3f3; background: #fff; display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; font-family: inherit; color: #14123a; font-size: 12px; font-weight: 700; text-align: center; min-height: 44px; }
        .iw-type:hover { border-color: #cdb8ff; }
        .iw-type.on { border-color: #7040f0; background: #f7f4ff; }
        @media (max-width: 860px) { .iw-grid { grid-template-columns: minmax(0,1fr); } .iw-stats { grid-template-rows: none; grid-template-columns: 1fr 1fr; } }
        @media (max-width: 560px) {
          .iw-bal { font-size: 36px; } .iw-wallet { padding: 20px; } .iw-cta { width: 100%; align-self: stretch; }
          .iw-tx { flex-wrap: wrap; } .iw-tx-r { flex-direction: row; align-items: center; margin-left: 56px; width: calc(100% - 56px); justify-content: space-between; }
          .iw-stat { padding: 16px; } .iw-stat .v { font-size: 20px; }
          .iw-types { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .iw-modal { padding: 20px; }
        }
      `}</style>

      {/* Header */}
      <div className="iu-head">
        <div>
          <div className="iu-label" style={{ marginBottom: 6 }}>Finanțe</div>
          <h1>Wallet</h1>
          <p className="iu-muted iu-sm" style={{ margin: '6px 0 0' }}>Câștigurile tale, retrageri și metode de plată</p>
        </div>
      </div>

      {/* Sold + statistici */}
      <div className="iw-grid">
        <div className="iw-wallet">
          <div className="iw-glow" />
          <div className="iw-lbl" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Wallet className="w-4 h-4" /> Sold disponibil</div>
          <div className="iw-bal">{wallet.available_balance.toFixed(2)}<small>RON</small></div>

          <div className="iw-note">
            <Info className="w-4 h-4" style={{ flex: 'none', marginTop: 2 }} />
            <span>
              Retragere minimă <strong>{WITHDRAWAL_MIN} RON</strong> · taxă {Math.round(WITHDRAWAL_FEE * 100)}% · o dată la {WITHDRAWAL_CYCLE_DAYS} zile
              {!wStatus.canWithdraw && wStatus.nextAvailable && <> · următoarea: <strong>{wStatus.nextAvailable.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })}</strong></>}
            </span>
          </div>

          <button onClick={() => setShowPayoutModal(true)} disabled={!canPayout} className="iw-cta">
            <ArrowUpRight className="w-4 h-4" /> Retrage fonduri
          </button>
          {paymentMethods.length === 0 && <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,.65)' }}>Adaugă o metodă de plată mai întâi</p>}
        </div>

        <div className="iw-stats">
          <div className="iu-card iw-stat">
            <div className="iu-row" style={{ gap: 10 }}>
              <div className="iu-ico" style={{ background: '#dcf5ec', color: '#14532d', width: 34, height: 34, borderRadius: 10 }}><TrendingUp className="w-4 h-4" /></div>
              <span className="iu-label">Total câștigat</span>
            </div>
            <div className="v">{wallet.total_earned.toFixed(2)} RON</div>
          </div>
          <div className="iu-card iw-stat">
            <div className="iu-row" style={{ gap: 10 }}>
              <div className="iu-ico" style={{ background: '#fff1c2', color: '#854d0e', width: 34, height: 34, borderRadius: 10 }}><Clock className="w-4 h-4" /></div>
              <span className="iu-label">În așteptare</span>
            </div>
            <div className="v">{wallet.pending_payout.toFixed(2)} RON</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="iu-tabs">
        {[
          { id: 'overview', label: 'Tranzacții', icon: Wallet },
          { id: 'payment_methods', label: 'Metode plată', icon: CreditCard },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as ActiveTab)} className={`iu-pill${activeTab === tab.id ? ' on' : ''}`} style={{ minHeight: 44 }}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* Transactions Tab */}
      {activeTab === 'overview' && (
        <div className="iu-card iu-card-pad">
          {transactions.length === 0 ? (
            <div className="iw-empty">
              <div className="iu-ico" style={{ background: '#efeaff', color: '#5b2fd0', width: 56, height: 56, borderRadius: 16 }}><Wallet className="w-6 h-6" /></div>
              <h3>Nicio tranzacție încă</h3>
              <p className="iu-muted iu-sm" style={{ margin: 0 }}>Aplică la campanii să câștigi primii bani!</p>
            </div>
          ) : (
            <div>
              {transactions.map((tx) => {
                const isEarn = tx.type === 'EARN'
                const chip = TX_CHIP[tx.status] ?? TX_CHIP.pending
                return (
                  <div key={tx.id} className="iw-tx">
                    <div className="iu-ico" style={{ background: isEarn ? '#dcf5ec' : '#f0eff7', color: isEarn ? '#14532d' : '#4a4770' }}>
                      {isEarn ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="iw-tx-main">
                      <p className="iw-tx-d">{tx.description || (isEarn ? 'Câștig colaborare' : 'Retragere')}</p>
                      <p className="iu-xs iu-muted">{formatDate(tx.created_at)}</p>
                    </div>
                    <div className="iw-tx-r">
                      <span className="iw-tx-amt" style={{ color: isEarn ? '#14532d' : '#14123a' }}>
                        {isEarn ? '+' : '-'}{Math.abs(tx.amount).toFixed(2)} RON
                      </span>
                      <span className="iu-chip" style={{ background: chip.bg, color: chip.fg }}>{chip.label}</span>
                    </div>
                    {isEarn && tx.status === 'completed' && (
                      <button className="iw-ib" onClick={() => downloadInfluencerInvoice(tx, influencerInfo)} title="Descarcă chitanță" aria-label="Descarcă chitanță">
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Payment Methods Tab */}
      {activeTab === 'payment_methods' && (
        <div className="iu-col" style={{ gap: 14 }}>
          <div className="iu-row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <h2>Metodele tale de plată</h2>
            <button onClick={() => setShowAddMethod(true)} className="iu-btn p" style={{ height: 44 }}>
              <Plus className="w-4 h-4" /> Adaugă
            </button>
          </div>

          {paymentMethods.length === 0 ? (
            <div className="iu-card iw-empty">
              <div className="iu-ico" style={{ background: '#efeaff', color: '#5b2fd0', width: 56, height: 56, borderRadius: 16 }}><CreditCard className="w-6 h-6" /></div>
              <h3>Nicio metodă adăugată</h3>
              <p className="iu-muted iu-sm" style={{ margin: 0 }}>Adaugă un cont bancar, PayPal, Revolut sau altă metodă</p>
              <button onClick={() => setShowAddMethod(true)} className="iu-btn p big" style={{ marginTop: 8 }}>
                <Plus className="w-4 h-4" /> Adaugă metodă
              </button>
            </div>
          ) : (
            <div className="iu-col" style={{ gap: 12 }}>
              {paymentMethods.map((method) => {
                const config = getTypeConfig(method.type)
                const Icon = config.icon
                return (
                  <div key={method.id} className={`iu-card iw-pm${method.is_default ? ' def' : ''}`}>
                    <div className="iu-ico" style={{ background: '#efeaff', color: '#5b2fd0' }}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="iw-pm-main">
                      <div className="iu-row" style={{ gap: 8, flexWrap: 'wrap' }}>
                        <p style={{ fontWeight: 700, fontSize: 14 }}>{method.label}</p>
                        {method.is_default && <span className="iu-chip" style={{ background: '#efeaff', color: '#5b2fd0' }}>Implicit</span>}
                      </div>
                      {Object.entries(method.details).slice(0, 1).map(([key, value]) => (
                        <p key={key} className="iu-xs iu-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value as string}</p>
                      ))}
                    </div>
                    <div className="iu-row" style={{ gap: 4, flex: 'none' }}>
                      {!method.is_default && (
                        <button onClick={() => handleSetDefault(method.id)} className="iw-ib" title="Setează implicit" aria-label="Setează implicit">
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDeleteMethod(method.id)} className="iw-ib del" title="Șterge" aria-label="Șterge">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Payout Modal */}
      {showPayoutModal && (
        <div className="iw-ov">
          <div className="iw-modal">
            <div className="iw-mh">
              <h2>Retrage fonduri</h2>
              <button onClick={closePayoutModal} className="iw-ib" aria-label="Închide"><X className="w-5 h-5" /></button>
            </div>

            {payoutSuccess ? (
              <div className="iw-empty" style={{ padding: '20px 0 4px' }}>
                <div className="iu-ico" style={{ background: '#dcf5ec', color: '#14532d', width: 56, height: 56, borderRadius: 16 }}><CheckCircle className="w-6 h-6" /></div>
                <h3>Cerere trimisă!</h3>
                <p className="iu-muted iu-sm" style={{ margin: '0 0 12px' }}>Cererea ta a fost trimisă. Procesăm plata până pe data de 10 a lunii.</p>
                <button className="iu-btn p big" style={{ width: '100%' }} onClick={closePayoutModal}>Gata</button>
              </div>
            ) : (
              <>
                <div style={{ background: '#f6f6fc', borderRadius: 14, padding: 16, marginBottom: 14 }}>
                  <div className="iu-label">Sold disponibil</div>
                  <div className="iu-d" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: '#5b2fd0' }}>{wallet.available_balance.toFixed(2)} RON</div>
                </div>

                {(() => {
                  const { canWithdraw, daysLeft, nextAvailable } = getWithdrawalStatus(wallet.last_payout_at)
                  return canWithdraw ? (
                    <div className="iw-banner" style={{ background: '#dcf5ec', color: '#14532d', marginBottom: 14, alignItems: 'center' }}>
                      <CheckCircle className="w-4 h-4" style={{ flex: 'none' }} />
                      <div>
                        <p style={{ margin: 0, fontWeight: 800 }}>Retragere disponibilă acum</p>
                        <p className="iu-xs" style={{ margin: 0 }}>
                          {wallet.last_payout_at
                            ? `Ultima retragere: ${new Date(wallet.last_payout_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })}`
                            : 'Nu ai mai retras până acum'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="iw-banner" style={{ background: '#fff1c2', color: '#854d0e', marginBottom: 14, flexDirection: 'column', gap: 8 }}>
                      <div className="iu-row" style={{ gap: 8 }}>
                        <Clock className="w-4 h-4" style={{ flex: 'none' }} />
                        <p style={{ margin: 0, fontWeight: 800 }}>Retragerea nu este disponibilă încă</p>
                      </div>
                      <p className="iu-xs" style={{ margin: 0 }}>
                        Poți retrage o dată la 15 zile. Următoarea dată disponibilă:{' '}
                        <strong>{nextAvailable!.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                      </p>
                      <div style={{ width: '100%' }}>
                        <div className="iu-bar" style={{ background: 'rgba(133,77,14,.18)' }}>
                          <i style={{ width: `${Math.round(((15 - daysLeft) / 15) * 100)}%`, background: '#d4a017' }} />
                        </div>
                        <p className="iu-xs" style={{ margin: '4px 0 0', textAlign: 'right' }}>{15 - daysLeft}/15 zile</p>
                      </div>
                    </div>
                  )
                })()}

                {payoutError && (
                  <div className="iw-banner" style={{ background: '#fde8e6', color: '#b42318', marginBottom: 14, alignItems: 'center' }}>
                    <AlertCircle className="w-4 h-4" style={{ flex: 'none' }} />
                    <span>{payoutError}</span>
                  </div>
                )}

                <div className="iu-col" style={{ gap: 16 }}>
                  <div className="iw-field">
                    <label className="iu-label">Sumă (RON)</label>
                    <input
                      className="iu-input"
                      type="number"
                      placeholder="0.00"
                      min="10"
                      step="0.01"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      disabled={payoutLoading}
                    />
                    {parseFloat(payoutAmount) >= 50 ? (
                      <p className="iu-xs" style={{ margin: 0, color: '#14532d', fontWeight: 700 }}>
                        Primești: {(parseFloat(payoutAmount) * 0.95).toFixed(2)} RON (după 5% taxă)
                      </p>
                    ) : (
                      <p className="iu-xs iu-muted" style={{ margin: 0 }}>Minim 250 RON · taxă 5%</p>
                    )}
                  </div>

                  <div className="iw-field">
                    <label className="iu-label">Plătește în</label>
                    <div className="iu-col" style={{ gap: 8 }}>
                      {paymentMethods.map((method) => {
                        const config = getTypeConfig(method.type)
                        const Icon = config.icon
                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setSelectedMethodId(method.id)}
                            className={`iw-opt${selectedMethodId === method.id ? ' on' : ''}`}
                          >
                            <div className="iu-ico" style={{ background: '#efeaff', color: '#5b2fd0', width: 34, height: 34, borderRadius: 10 }}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{method.label}</p>
                              <p className="iu-xs iu-muted" style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{Object.values(method.details)[0]}</p>
                            </div>
                            {method.is_default && <span className="iu-chip" style={{ background: '#efeaff', color: '#5b2fd0' }}>Implicit</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <button
                    className="iu-btn p big"
                    style={{ width: '100%' }}
                    onClick={handlePayoutRequest}
                    disabled={payoutLoading || !payoutAmount || !selectedMethodId}
                  >
                    {payoutLoading ? 'Se trimite...' : 'Trimite cererea'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Payment Method Modal */}
      {showAddMethod && (
        <div className="iw-ov">
          <div className="iw-modal lg">
            <div className="iw-mh">
              <h2>Adaugă metodă de plată</h2>
              <button onClick={() => { setShowAddMethod(false); setSelectedType(null); setMethodFields({}); setMethodError(null) }}
                className="iw-ib" aria-label="Închide">
                <X className="w-5 h-5" />
              </button>
            </div>

            {methodError && (
              <div className="iw-banner" style={{ background: '#fde8e6', color: '#b42318', marginBottom: 14, alignItems: 'center' }}>
                <AlertCircle className="w-4 h-4" style={{ flex: 'none' }} />
                <span>{methodError}</span>
              </div>
            )}

            {/* Type Selection */}
            <div className="iw-field" style={{ marginBottom: 18 }}>
              <label className="iu-label">Alege tipul</label>
              <div className="iw-types">
                {PAYMENT_TYPES.map((type) => {
                  const Icon = type.icon
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => { setSelectedType(type.id); setMethodFields({}) }}
                      className={`iw-type${selectedType === type.id ? ' on' : ''}`}
                    >
                      <div className="iu-ico" style={{ background: '#efeaff', color: '#5b2fd0', width: 34, height: 34, borderRadius: 10 }}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span>{type.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {selectedType && (
              <div className="iu-col" style={{ gap: 14 }}>
                <div className="iw-field">
                  <label className="iu-label">Poreclă (opțional)</label>
                  <input
                    className="iu-input"
                    placeholder={`ex. ${getTypeConfig(selectedType).label} personal`}
                    value={methodLabel}
                    onChange={(e) => setMethodLabel(e.target.value)}
                    disabled={methodSaving}
                  />
                </div>

                {PAYMENT_TYPES.find(t => t.id === selectedType)!.fields.map((field) => (
                  <div key={field.key} className="iw-field">
                    <label className="iu-label">{field.label}</label>
                    <input
                      className="iu-input"
                      placeholder={field.placeholder}
                      value={methodFields[field.key] || ''}
                      onChange={(e) => setMethodFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                      disabled={methodSaving}
                    />
                  </div>
                ))}

                <button
                  className="iu-btn p big"
                  style={{ width: '100%' }}
                  onClick={handleSaveMethod}
                  disabled={methodSaving}
                >
                  {methodSaving ? 'Se salvează...' : 'Salvează metoda'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
