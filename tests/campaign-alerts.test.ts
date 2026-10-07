import { describe, it, expect } from 'vitest'
import { alertDecision, alertTexts, campaignEmailHtml, creatorPlatforms, type AlertCampaign, type AlertCreator } from '@/lib/campaign-alerts'

const camp = (o: Partial<AlertCampaign> = {}): AlertCampaign => ({ id: 'c1', title: 'Alopecia', brand_name: 'Brand', campaign_type: 'BARTER', platforms: ['INSTAGRAM'], ...o })
const creator = (o: Partial<AlertCreator> = {}): AlertCreator => ({
  id: 'i1', user_id: 'u1', name: 'Ana', email: 'ana@x.ro', niches: ['Beauty'],
  instagram_connected: true, ig_followers: 15000, platforms: [{ platform: 'instagram', followers: '15000' }], ...o,
})

describe('alerte campanii · cine primește', () => {
  it('creator potrivit: notificare + email', () => {
    expect(alertDecision(camp(), creator())).toEqual({ send: true, email: true })
  })
  it('platforma: platforms e listă de obiecte (bugul vechi cu overlaps)', () => {
    expect(creatorPlatforms(creator())).toEqual(new Set(['INSTAGRAM']))
    expect(alertDecision(camp({ platforms: ['TIKTOK'] }), creator()).reason).toBe('platform')
    expect(alertDecision(camp({ platforms: ['TIKTOK'] }), creator({ tiktok_connected: true })).send).toBe(true)
    // fără date de platformă nu excludem
    expect(alertDecision(camp({ platforms: ['TIKTOK'] }), creator({ platforms: [], instagram_connected: false })).send).toBe(true)
  })
  it('țintirea pe categorie și nișă (aceeași regulă ca lista de campanii)', () => {
    expect(alertDecision(camp({ elig_tiers: ['micro'] }), creator()).send).toBe(true)
    expect(alertDecision(camp({ elig_tiers: ['mega'] }), creator()).reason).toBe('not_eligible')
    expect(alertDecision(camp({ elig_niches: ['Food'] }), creator()).reason).toBe('not_eligible')
    expect(alertDecision(camp({ elig_niches: ['beauty'] }), creator()).send).toBe(true)
  })
  it('minimul de urmăritori', () => {
    expect(alertDecision(camp({ min_followers_target: 20000 }), creator()).reason).toBe('followers')
    expect(alertDecision(camp({ min_followers_target: 10000 }), creator()).send).toBe(true)
  })
  it('preferințe: fără alerte deloc / fără email', () => {
    expect(alertDecision(camp(), creator({ settings: { notifications: { campaign_opportunities: false } } })).reason).toBe('opted_out')
    expect(alertDecision(camp(), creator({ email_reminders_enabled: false }))).toEqual({ send: true, email: false })
    expect(alertDecision(camp(), creator({ settings: { notifications: { email_notifications: false } } }))).toEqual({ send: true, email: false })
    expect(alertDecision(camp(), creator({ email: null }))).toEqual({ send: true, email: false })
    expect(alertDecision(camp(), creator({ user_id: null })).reason).toBe('no_user')
  })
})

describe('alerte campanii · conținut', () => {
  it('texte pentru barter și plătită', () => {
    expect(alertTexts(camp({ offer_name: 'Șampon' })).body).toContain('Șampon')
    const paid = alertTexts(camp({ campaign_type: 'PAID', budget_per_influencer: 1500 }))
    expect(paid.title).toContain('Campanie nouă')
    expect(paid.body).toMatch(/1\.500 RON/)
    expect(paid.link).toBe('/influencer/campaigns/c1')
  })
  it('emailul escapează conținutul brandului', () => {
    const html = campaignEmailHtml(camp({ title: '<img src=x onerror=alert(1)>', brand_name: 'A&B' }), '<b>Ana</b>')
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img')
    expect(html).toContain('A&amp;B')
    expect(html).toContain('&lt;b&gt;Ana')
  })
})
