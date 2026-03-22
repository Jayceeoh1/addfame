'use client'
// @ts-nocheck

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { requestWithdrawal } from '@/app/actions/collaborations'
import {
  Wallet, TrendingUp, ArrowUpRight, ArrowDownLeft, Clock,
  CheckCircle, XCircle, AlertCircle, X, Plus, Trash2,
  Building2, CreditCard, Smartphone, Star, Edit2, Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const WITHDRAWAL_MIN = 250       // 250 RON prag minim
const WITHDRAWAL_FEE = 0.05      // 5% taxă
const WITHDRAWAL_CYCLE_DAYS = 15  // ciclu retragere 15 zile

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
    id: 'bank_transfer', label: 'Bank Transfer', icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10',
    fields: [
      { key: 'account_holder', label: 'Account Holder Name', placeholder: 'John Doe' },
      { key: 'iban', label: 'IBAN', placeholder: 'DE89 3704 0044 0532 0130 00' },
      { key: 'bic', label: 'BIC / SWIFT', placeholder: 'COBADEFFXXX' },
      { key: 'bank_name', label: 'Bank Name', placeholder: 'Deutsche Bank' },
    ]
  },
  {
    id: 'paypal', label: 'PayPal', icon: CreditCard, color: 'text-indigo-500', bg: 'bg-indigo-500/10',
    fields: [
      { key: 'email', label: 'PayPal Email', placeholder: 'you@example.com' },
    ]
  },
  {
    id: 'revolut', label: 'Revolut', icon: Smartphone, color: 'text-cyan-500', bg: 'bg-cyan-500/10',
    fields: [
      { key: 'username', label: 'Revolut Username / Tag', placeholder: '@johndoe' },
      { key: 'phone', label: 'Phone Number (optional)', placeholder: '+40 712 345 678' },
    ]
  },
  {
    id: 'wise', label: 'Wise', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10',
    fields: [
      { key: 'email', label: 'Wise Email', placeholder: 'you@example.com' },
      { key: 'account_number', label: 'Account Number (optional)', placeholder: 'P12345678' },
    ]
  },
  {
    id: 'crypto', label: 'Crypto (USDT/USDC)', icon: Shield, color: 'text-orange-500', bg: 'bg-orange-500/10',
    fields: [
      { key: 'network', label: 'Network', placeholder: 'TRC-20 / ERC-20 / BEP-20' },
      { key: 'wallet_address', label: 'Wallet Address', placeholder: '0x...' },
    ]
  },
]

type ActiveTab = 'overview' | 'payment_methods'

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [wallet, setWallet] = useState<WalletData>({ available_balance: 0, total_earned: 0, pending_payout: 0 })
  const [transactions, setTransactions] = useState<Transaction[]>([])
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

      const [influencerRes, txRes, pmRes] = await Promise.all([
        supabase.from('influencers').select('wallet_balance, total_earned, pending_payout, last_payout_at').eq('user_id', user.id).single(),
        supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
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
      setPayoutError(err.message || 'Failed to submit payout request.')
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
      setMethodError(err.message || 'Failed to save payment method.')
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
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Wallet</h1>
      <p className="text-muted-foreground mb-8">Manage your earnings and payment methods</p>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #533483 100%)',
          borderRadius: 20,
          padding: 24,
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(251,191,36,0.3)',
          boxShadow: '0 8px 32px rgba(251,191,36,0.15), inset 0 1px 0 rgba(251,191,36,0.2)',
        }}>
          <div style={{
            position: 'absolute', top: -40, right: -40,
            width: 140, height: 140, borderRadius: '50%',
            background: 'rgba(251,191,36,0.08)',
          }} />
          <div style={{
            position: 'absolute', bottom: -20, left: 60,
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(251,191,36,0.05)',
          }} />
          <div className="flex items-center gap-2 mb-4" style={{ position: 'relative' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'linear-gradient(135deg,#f59e0b,#fbbf24)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(251,191,36,0.4)',
            }}>
              <Wallet className="w-4 h-4" style={{ color: '#1a1a2e' }} />
            </div>
            <p className="text-sm font-bold" style={{ color: 'rgba(251,191,36,0.8)' }}>Sold disponibil</p>
          </div>
          <p className="text-4xl font-black mb-1" style={{ color: '#fbbf24', position: 'relative', letterSpacing: '-1px' }}>
            {wallet.available_balance.toFixed(2)}
          </p>
          <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.4)', position: 'relative' }}>
            Total câștigat: {wallet.total_earned.toFixed(2)}
          </p>
          <button
            style={{
              width: '100%', padding: '12px', borderRadius: 12,
              background: wallet.available_balance >= 50
                ? 'linear-gradient(135deg,#f59e0b,#fbbf24)'
                : 'rgba(255,255,255,0.1)',
              border: 'none', cursor: wallet.available_balance >= 50 ? 'pointer' : 'not-allowed',
              color: wallet.available_balance >= 50 ? '#1a1a2e' : 'rgba(255,255,255,0.3)',
              fontWeight: 800, fontSize: 14, fontFamily: 'inherit',
              boxShadow: wallet.available_balance >= 50 ? '0 4px 16px rgba(251,191,36,0.4)' : 'none',
              transition: 'all .18s', position: 'relative',
            }}
            onClick={() => setShowPayoutModal(true)}
            disabled={wallet.available_balance < 50 || paymentMethods.length === 0}
          >
            Retrage fonduri
          </button>
          {paymentMethods.length === 0 && (
            <p className="text-xs mt-2 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>Adaugă o metodă de plată mai întâi</p>
          )}
          {paymentMethods.length > 0 && wallet.available_balance < 50 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">Minim 250 RON pentru retragere</p>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <p className="text-sm text-muted-foreground">Total Earned</p>
          </div>
          <p className="text-3xl font-bold">{wallet.total_earned.toFixed(2)}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-amber-500" />
            <p className="text-sm text-muted-foreground">Pending Payout</p>
          </div>
          <p className="text-3xl font-bold">{wallet.pending_payout.toFixed(2)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {[
          { id: 'overview', label: 'Transactions' },
          { id: 'payment_methods', label: 'Payment Methods' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ActiveTab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${activeTab === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transactions Tab */}
      {activeTab === 'overview' && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold mb-6">Transaction History</h2>
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No transactions yet</p>
              <p className="text-sm mt-1">Earnings from completed campaigns will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tx.type === 'EARN' ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
                      {tx.type === 'EARN' ? <ArrowDownLeft className="w-4 h-4 text-green-500" /> : <ArrowUpRight className="w-4 h-4 text-destructive" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {statusIcon(tx.status)}
                      <span className="text-xs text-muted-foreground capitalize">{tx.status}</span>
                    </div>
                    <p className={`font-bold text-sm w-20 text-right ${tx.type === 'EARN' ? 'text-green-500' : 'text-destructive'}`}>
                      {tx.type === 'EARN' ? '+' : '-'}{Math.abs(tx.amount).toFixed(2)}
                    </p>
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
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">Your saved payout methods</p>
            <Button
              onClick={() => setShowAddMethod(true)}
              className="bg-gradient-to-r from-primary to-accent"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Method
            </Button>
          </div>

          {paymentMethods.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium mb-1">No payment methods yet</p>
              <p className="text-sm text-muted-foreground mb-6">Add a bank account, PayPal, Revolut or other method to receive payouts</p>
              <Button onClick={() => setShowAddMethod(true)} className="bg-gradient-to-r from-primary to-accent">
                <Plus className="w-4 h-4 mr-2" /> Add Payment Method
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((method) => {
                const config = getTypeConfig(method.type)
                const Icon = config.icon
                return (
                  <div key={method.id} className={`bg-card border rounded-xl p-5 transition ${method.is_default ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${config.bg}`}>
                          <Icon className={`w-5 h-5 ${config.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{method.label}</p>
                            {method.is_default && (
                              <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                <Star className="w-3 h-3" /> Default
                              </span>
                            )}
                          </div>
                          <div className="mt-1 space-y-0.5">
                            {Object.entries(method.details).map(([key, value]) => (
                              <p key={key} className="text-xs text-muted-foreground">
                                <span className="capitalize">{key.replace(/_/g, ' ')}: </span>
                                <span className="font-medium text-foreground">{value}</span>
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!method.is_default && (
                          <button
                            onClick={() => handleSetDefault(method.id)}
                            className="text-xs text-muted-foreground hover:text-primary transition px-2 py-1 rounded border border-border hover:border-primary/50"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteMethod(method.id)}
                          className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
                              <span className="ml-auto text-xs text-primary">Default</span>
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
                    {payoutLoading ? 'Submitting...' : 'Submit Request'}
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
                  <label className="block text-sm font-medium mb-2">Nickname (optional)</label>
                  <Input
                    placeholder={`e.g. My ${getTypeConfig(selectedType).label}`}
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
                  {methodSaving ? 'Saving...' : 'Save Payment Method'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
