import { describe, it, expect } from 'vitest'
import { campaignName, stripCampaignTags } from '@/lib/campaign-name'

describe('numele campaniei pentru influencer', () => {
  it('barter cu titlu generat → numele ofertei', () => {
    expect(campaignName({ title: '[Barter] Vioi.ro — Produs gratuit (Instagram)', offer_name: 'Set ceaiuri Vioi de toamnă' })).toBe('Set ceaiuri Vioi de toamnă')
    expect(campaignName({ title: '[Barter] [Barter] AddFame.ro — Serviciu gratuit (Instagram)', offer_name: 'Ședință foto' })).toBe('Ședință foto')
  })
  it('titlu scris de brand → titlul, fără etichete', () => {
    expect(campaignName({ title: '[Barter] Ser concentrat ten gras anti-coșuri', offer_name: 'Ser 30 ml' })).toBe('Ser concentrat ten gras anti-coșuri')
    expect(campaignName({ title: '[Managed] Promovează AddFame.ro — Devino ambasador!' })).toBe('Promovează AddFame.ro — Devino ambasador!')
    expect(campaignName({ title: 'Lansare colecție toamnă' })).toBe('Lansare colecție toamnă')
  })
  it('fără nume de ofertă → titlul curățat sau rezerva', () => {
    expect(campaignName({ title: '[Barter] Vioi.ro — Produs gratuit (Instagram)' })).toBe('Vioi.ro — Produs gratuit (Instagram)')
    expect(campaignName(null)).toBe('Campanie')
    expect(stripCampaignTags('[Draft] X')).toBe('X')
  })
})
