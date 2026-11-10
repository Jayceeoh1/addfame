import { describe, it, expect } from 'vitest'
import { buildShowcase } from '@/lib/showcase'

describe('branduri partenere', () => {
  const brands = [{ id: 'b1', name: 'Smartino', logo: null, credits_balance: 999 }, { id: 'b2', name: 'Gol', logo: null }]
  const campaigns = [
    { id: 'c1', brand_id: 'b1', title: '[Barter] Smartino', status: 'COMPLETED', offer_image_url: 'x.jpg', budget_per_influencer: 500, description: 'secret' },
    { id: 'c2', brand_id: 'b1', title: 'Activă', status: 'ACTIVE', offer_images: ['y.jpg'] },
    { id: 'c3', brand_id: 'b1', title: 'Draft', status: 'DRAFT' },
  ]
  const collabs = [
    { campaign_id: 'c1', status: 'COMPLETED' }, { campaign_id: 'c1', status: 'COMPLETED' },
    { campaign_id: 'c1', status: 'REJECTED' }, { campaign_id: 'c2', status: 'ACTIVE' },
  ]
  const out = buildShowcase(brands, campaigns, collabs)

  it('arată doar campaniile active și finalizate, cu creatorii selectați', () => {
    expect(out).toHaveLength(1)
    expect(out[0].campaigns.map(c => [c.title, c.status, c.creators])).toEqual([['Activă', 'ACTIVE', 1], ['Smartino', 'COMPLETED', 2]])
    expect([out[0].active, out[0].completed, out[0].creators]).toEqual([1, 1, 3])
  })
  it('nu scapă buget, descriere, id-uri de campanie sau alte câmpuri', () => {
    const json = JSON.stringify(out)
    for (const k of ['budget', 'secret', 'credits', 'description', 'c1', 'c2']) expect(json).not.toContain(k)
  })
})
