import { describe, it, expect } from 'vitest'
import {
  anonymizePatch,
  campaignEscrowHeld,
  collabEscrowHeld,
  deletedEmail,
  deletionBlockers,
  isDeleteConfirm,
  isMissingDeletionTable,
  maskEmail,
} from '@/lib/account-deletion'

const user = '11111111-1111-1111-1111-111111111111'

describe('blocaje la ștergerea contului', () => {
  it('fără bani și fără colaborări deschise nu blochează', () => {
    expect(deletionBlockers({
      walletBalance: 0,
      creditsBalance: 0,
      creditsReserved: 0,
      pendingPayout: 0,
      collaborations: [{ status: 'COMPLETED', pay_reserved: 0 }],
      campaigns: [{ status: 'DRAFT' }, { status: 'EXPIRED' }],
      disputes: [{ status: 'resolved' }],
    })).toEqual([])
  })

  it('soldul din portofel, inclusiv negativ sau de un ban, blochează', () => {
    expect(deletionBlockers({ walletBalance: 0.01 }).map(b => b.code)).toEqual(['wallet'])
    expect(deletionBlockers({ walletBalance: -20 })[0].message).toContain('20,00 RON')
    expect(deletionBlockers({ walletBalance: 0.001 })).toEqual([])
  })

  it('creditele brandului și retragerea în curs blochează', () => {
    const codes = deletionBlockers({ creditsBalance: 15, pendingPayout: 40, creditsReserved: 10 }).map(b => b.code)
    expect(codes).toEqual(['wallet', 'pending_payout', 'escrow'])
  })

  it('escrow pe campanie și pe colaborare blochează, fără să dubleze modelul vechi', () => {
    expect(campaignEscrowHeld({ pay_reserved: 50, pay_released: 20, pay_refunded: 10, escrow_amount: 100 })).toBe(20)
    expect(campaignEscrowHeld({ pay_reserved: 0, escrow_amount: 80 })).toBe(80)
    expect(collabEscrowHeld({ pay_reserved: 350, payment_amount: 0, pay_refunded: 0 })).toBe(350)
    expect(collabEscrowHeld({ pay_reserved: 350, payment_amount: 350, pay_refunded: 0 })).toBe(0)
    const b = deletionBlockers({
      campaigns: [{ status: 'COMPLETED', pay_reserved: 50, pay_released: 20, pay_refunded: 10 }],
      collaborations: [{ status: 'COMPLETED', pay_reserved: 100, payment_amount: 0, pay_refunded: 0 }],
    })
    expect(b.map(b => b.code)).toEqual(['escrow'])
    expect(b[0].message).toContain('120,00 RON')
  })

  it('colaborările și campaniile deschise blochează; cele încheiate nu', () => {
    const open = deletionBlockers({
      collaborations: [{ status: 'ACTIVE' }, { status: 'INVITED' }, { status: 'COMPLETED' }, { status: 'cancelled' }],
      campaigns: [{ status: 'ACTIVE' }, { status: 'PAUSED' }, { status: 'DRAFT' }],
    }).map(b => b.code)
    expect(open).toEqual(['active_campaigns', 'active_collaborations'])
  })

  it('litigiul deschis blochează și după colaborarea finalizată', () => {
    expect(deletionBlockers({
      collaborations: [{ status: 'COMPLETED' }],
      disputes: [{ status: 'awaiting_response' }, { status: 'resolved' }],
    }).map(b => b.code)).toEqual(['open_dispute'])
  })
})

describe('anonimizare', () => {
  it('atinge doar câmpurile personale prezente pe rând', () => {
    const patch = anonymizePatch({
      id: 'abc',
      user_id: user,
      name: 'Ana',
      email: 'ana@example.com',
      phone: '0700000000',
      wallet_balance: 0,
      credits_balance: 0,
      credits_reserved: 0,
      pending_payout: 0,
      stripe_customer_id: 'cus_123',
      approval_status: 'approved',
      total_earned: 500,
      platforms: [{ platform: 'instagram' }],
      settings: { shipping_address: { street: 'Florilor' } },
      instagram_connected: true,
    }, user)
    expect(patch).toMatchObject({
      name: 'Cont șters',
      email: deletedEmail(user),
      phone: null,
      platforms: [],
      settings: {},
      instagram_connected: false,
    })
    expect(patch).not.toHaveProperty('wallet_balance')
    expect(patch).not.toHaveProperty('credits_balance')
    expect(patch).not.toHaveProperty('stripe_customer_id')
    expect(patch).not.toHaveProperty('approval_status')
    expect(patch).not.toHaveProperty('id')
    expect(patch).not.toHaveProperty('total_earned')
  })

  it('confirmarea acceptă ȘTERGE, indiferent de diacritice și spații', () => {
    expect(isDeleteConfirm('ȘTERGE')).toBe(true)
    expect(isDeleteConfirm('  sterge ')).toBe(true)
    expect(isDeleteConfirm('DELETE')).toBe(false)
  })

  it('maschează emailul și recunoaște tabelul lipsă', () => {
    expect(maskEmail('ana@addfame.ro')).toBe('a***@addfame.ro')
    expect(isMissingDeletionTable({ code: 'PGRST205', message: 'Could not find the table account_deletion_requests' })).toBe(true)
    expect(isMissingDeletionTable({ code: '23505', message: 'duplicate' })).toBe(false)
  })
})
