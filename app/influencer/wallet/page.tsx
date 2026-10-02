'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { requestWithdrawal } from '@/app/actions/collaborations'
import {
  Wallet, TrendingUp, ArrowUpRight, ArrowDownLeft, Clock,
  CheckCircle, XCircle, AlertCircle, X, Plus, Trash2,
  Building2, CreditCard, Smartphone, Star, Edit2, Shield
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
    if (!selectedType) return setMethodError('Please select a payment type.')
    const typeConfig = PAYMENT_TYPES.find(t => t.id === selectedType)!
    for (const field of typeConfig.fields) {
      if (!field.placeholder.includes('optional') && !methodFields[field.key]) {
        return setMethodError(`Please fill in ${field.label}.`)
      }
    }

    setMethodSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

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

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="w-4 h-4 text-green-500" />
    if (status === 'pending') return <Clock className="w-4 h-4 text-amber-500" />
    return <XCircle className="w-4 h-4 text-destructive" />
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const getTypeConfig = (type: string) => PAYMENT_TYPES.find(t => t.id === type) ?? PAYMENT_TYPES[0]

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#f8f7ff', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .fu { animation: fadeUp .3s ease both; }
        .wcard { background:white;border-radius:16px;border:1.5px solid #f0f0f0;transition:border-color .15s; }
        .wcard:hover { border-color:#ddd6fe; }
        .wtab { padding:8px 18px;border-radius:99px;font-size:12px;font-weight:800;border:none;cursor:pointer;transition:all .15s;font-family:inherit; }
        .wfield { width:100%;padding:10px 14px;border:1.5px solid #f0f0f0;border-radius:12px;font-size:14px;outline:none;background:white;font-family:inherit;transition:border-color .2s; }
        .wfield:focus { border-color:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,.08); }
      `}</style>

      {/* Dark Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#312e81,#0f3460)', padding: '20px 20px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(139,92,246,0.2)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(6,182,212,0.15)' }} />
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <p style={{ color: '#a78bfa', fontSize: 11, fontWeight: 800, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>💰 Wallet</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <p style={{ color: 'white', fontSize: 32, fontWeight: 900, margin: 0, lineHeight: 1 }}>
                {wallet.available_balance.toFixed(2)} <span style={{ fontSize: 16, color: '#a78bfa' }}>RON</span>
              </p>
              <p style={{ color: '#6b7280', fontSize: 11, margin: '4px 0 0' }}>Sold disponibil</p>
            </div>
            <button
              onClick={() => setShowPayoutModal(true)}
              disabled={wallet.available_balance < WITHDRAWAL_MIN || paymentMethods.length === 0}
              style={{ padding: '10px 18px', background: wallet.available_balance >= WITHDRAWAL_MIN && paymentMethods.length > 0 ? '#f97316' : 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 12, fontSize: 12, fontWeight: 900, cursor: wallet.available_balance >= WITHDRAWAL_MIN && paymentMethods.length > 0 ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
              💸 Retrage fonduri
            </button>
          </div>
          {paymentMethods.length === 0 && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 }}>Adaugă o metodă de plată mai întâi</p>}
        </div>
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 12px' }}>
            <p style={{ color: '#a78bfa', fontSize: 10, fontWeight: 800, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total câștigat</p>
            <p style={{ color: '#34d399', fontSize: 16, fontWeight: 900, margin: 0 }}>{wallet.total_earned.toFixed(2)} RON</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 12px' }}>
            <p style={{ color: '#a78bfa', fontSize: 10, fontWeight: 800, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>În așteptare</p>
            <p style={{ color: '#fbbf24', fontSize: 16, fontWeight: 900, margin: 0 }}>{wallet.pending_payout.toFixed(2)} RON</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ background: '#faf5ff', padding: 14, border: '1.5px solid #ddd6fe', borderTop: 'none' }}>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { id: 'overview', label: 'Tranzacții' },
          { id: 'payment_methods', label: 'Metode plată' },
        ].map(tab => (
          <button key={tab.id} className="wtab"
            onClick={() => setActiveTab(tab.id as ActiveTab)}
            style={{ background: activeTab === tab.id ? '#8b5cf6' : 'white', color: activeTab === tab.id ? 'white' : '#6b7280', border: activeTab === tab.id ? 'none' : '1.5px solid #f0f0f0' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transactions Tab */}
      {activeTab === 'overview' && (
        <div className="wcard fu" style={{ overflow: 'hidden' }}>
          {transactions.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ fontSize: 32, margin: '0 0 8px' }}>💸</p>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#9ca3af', margin: 0 }}>Nicio tranzacție încă</p>
              <p style={{ fontSize: 12, color: '#d1d5db', margin: '4px 0 0' }}>Aplică la campanii să câștigi primii bani!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: '1px solid #f5f5f5' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: tx.type === 'EARN' ? '#dcfce7' : '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {tx.type === 'EARN' ? <ArrowDownLeft style={{ width: 16, height: 16, color: '#16a34a' }} /> : <ArrowUpRight style={{ width: 16, height: 16, color: '#ef4444' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#1e1b4b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description || (tx.type === 'EARN' ? 'Câștig colaborare' : 'Retragere')}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{formatDate(tx.created_at)}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {statusIcon(tx.status)}
                    <p style={{ fontSize: 14, fontWeight: 900, color: tx.type === 'EARN' ? '#16a34a' : '#ef4444', margin: 0 }}>
                      {tx.type === 'EARN' ? '+' : '-'}{Math.abs(tx.amount).toFixed(2)}
                    </p>
                    {tx.type === 'EARN' && tx.status === 'completed' && (
                      <button onClick={() => downloadInfluencerInvoice(tx, influencerInfo)} title="Descarcă chitanță"
                        style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #ede9fe', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Download style={{ width: 13, height: 13, color: '#7c3aed' }} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payment Methods Tab */}
      {activeTab === 'payment_methods' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#4c1d95', margin: 0 }}>Metodele tale de plată</p>
            <button onClick={() => setShowAddMethod(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Plus style={{ width: 13, height: 13 }} /> Adaugă
            </button>
          </div>

          {paymentMethods.length === 0 ? (
            <div className="wcard" style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ fontSize: 28, margin: '0 0 8px' }}>💳</p>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#9ca3af', margin: 0 }}>Nicio metodă adăugată</p>
              <p style={{ fontSize: 12, color: '#d1d5db', margin: '4px 0 12px' }}>Adaugă un cont bancar, PayPal, Revolut sau altă metodă</p>
              <button onClick={() => setShowAddMethod(true)}
                style={{ padding: '9px 20px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
                + Adaugă metodă
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((method) => {
                const config = getTypeConfig(method.type)
                const Icon = config.icon
                return (
                  <div key={method.id} className="wcard" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, border: method.is_default ? '1.5px solid #ddd6fe' : '1.5px solid #f0f0f0' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon style={{ width: 16, height: 16, color: '#7c3aed' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <p style={{ fontSize: 13, fontWeight: 800, color: '#1e1b4b', margin: 0 }}>{method.label}</p>
                        {method.is_default && <span style={{ background: '#ede9fe', color: '#5b21b6', fontSize: 10, fontWeight: 800, padding: '1px 7px', borderRadius: 99 }}>Implicit</span>}
                      </div>
                      {Object.entries(method.details).slice(0, 1).map(([key, value]) => (
                        <p key={key} style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value as string}</p>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {!method.is_default && (
                        <button onClick={() => handleSetDefault(method.id)}
                          style={{ width: 28, height: 28, borderRadius: 8, border: '1.5px solid #f0f0f0', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Set default">
                          <Star style={{ width: 12, height: 12, color: '#9ca3af' }} />
                        </button>
                      )}
                      <button onClick={() => handleDeleteMethod(method.id)}
                        style={{ width: 28, height: 28, borderRadius: 8, border: '1.5px solid #fecaca', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 style={{ width: 12, height: 12, color: '#ef4444' }} />
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Retrage fonduri</h2>
              <button onClick={closePayoutModal} className="text-muted-foreground hover:text-foreground transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {payoutSuccess ? (
              <div className="text-center py-6">
                <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">Cerere trimisă! ✅</h3>
                <p className="text-muted-foreground text-sm mb-6">Cererea ta a fost trimisă. Procesăm plata până pe data de 10 a lunii.</p>
                <Button className="w-full bg-gradient-to-r from-primary to-accent" onClick={closePayoutModal}>Done</Button>
              </div>
            ) : (
              <>
                <div className="bg-muted/50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-muted-foreground">Sold disponibil</p>
                  <p className="text-2xl font-bold text-primary">{wallet.available_balance.toFixed(2)}</p>
                </div>

                {(() => {
                  const { canWithdraw, daysLeft, nextAvailable } = getWithdrawalStatus(wallet.last_payout_at)
                  return canWithdraw ? (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-black text-green-700">✓ Retragere disponibilă acum</p>
                        <p className="text-xs text-green-600">
                          {wallet.last_payout_at
                            ? `Ultima retragere: ${new Date(wallet.last_payout_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })}`
                            : 'Nu ai mai retras până acum'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <p className="text-xs font-black text-amber-700">Retragerea nu este disponibilă încă</p>
                      </div>
                      <p className="text-xs text-amber-600 mb-2">
                        Poți retrage o dată la 15 zile. Următoarea dată disponibilă:{' '}
                        <strong>{nextAvailable!.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                      </p>
                      {/* Progress bar */}
                      <div className="h-1.5 bg-amber-200 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${Math.round(((15 - daysLeft) / 15) * 100)}%` }} />
                      </div>
                      <p className="text-[10px] text-amber-500 mt-1 text-right">{15 - daysLeft}/15 zile</p>
                    </div>
                  )
                })()}

                {payoutError && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4 flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {payoutError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Amount (RON)</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      min="10"
                      step="0.01"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      disabled={payoutLoading}
                    />
                    {parseFloat(payoutAmount) >= 50 ? (
                      <p className="text-xs text-green-600 font-bold mt-1">
                        Primești: {(parseFloat(payoutAmount) * 0.95).toFixed(2)} (după 5% taxă)
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">Minim 250 RON · taxă 5%</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Payout To</label>
                    <div className="space-y-2">
                      {paymentMethods.map((method) => {
                        const config = getTypeConfig(method.type)
                        const Icon = config.icon
                        return (
                          <button
                            key={method.id}
                            type="button"
                            onClick={() => setSelectedMethodId(method.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition text-left ${selectedMethodId === method.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/40'
                              }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bg}`}>
                              <Icon className={`w-4 h-4 ${config.color}`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{method.label}</p>
                              <p className="text-xs text-muted-foreground">{Object.values(method.details)[0]}</p>
                            </div>
                            {method.is_default && (
                              <span className="ml-auto text-xs text-primary">Implicit</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <Button
                    className="w-full bg-gradient-to-r from-primary to-accent"
                    onClick={handlePayoutRequest}
                    disabled={payoutLoading || !payoutAmount || !selectedMethodId}
                  >
                    {payoutLoading ? 'Se trimite...' : 'Trimite Cererea'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Payment Method Modal */}
      {showAddMethod && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add Payment Method</h2>
              <button onClick={() => { setShowAddMethod(false); setSelectedType(null); setMethodFields({}); setMethodError(null) }}
                className="text-muted-foreground hover:text-foreground transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {methodError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4 flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {methodError}
              </div>
            )}

            {/* Type Selection */}
            <div className="mb-5">
              <label className="block text-sm font-medium mb-3">Select Type</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PAYMENT_TYPES.map((type) => {
                  const Icon = type.icon
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => { setSelectedType(type.id); setMethodFields({}) }}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition ${selectedType === type.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40'
                        }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${type.bg}`}>
                        <Icon className={`w-5 h-5 ${type.color}`} />
                      </div>
                      <span className="text-xs font-medium text-center">{type.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {selectedType && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Poreclă (opțional)</label>
                  <Input
                    placeholder={`ex. ${getTypeConfig(selectedType).label} personal`}
                    value={methodLabel}
                    onChange={(e) => setMethodLabel(e.target.value)}
                    disabled={methodSaving}
                  />
                </div>

                {PAYMENT_TYPES.find(t => t.id === selectedType)!.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium mb-2">{field.label}</label>
                    <Input
                      placeholder={field.placeholder}
                      value={methodFields[field.key] || ''}
                      onChange={(e) => setMethodFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                      disabled={methodSaving}
                    />
                  </div>
                ))}

                <Button
                  className="w-full bg-gradient-to-r from-primary to-accent"
                  onClick={handleSaveMethod}
                  disabled={methodSaving}
                >
                  {methodSaving ? 'Se salvează...' : 'Salvează Metoda'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

    </div>
  )
}