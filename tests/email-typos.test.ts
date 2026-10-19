import { describe, it, expect } from 'vitest'
import { emailTypoSuggestion, emailTypoError } from '../lib/email-typos'
import { isTestCampaign } from '../lib/test-campaign'

describe('emailTypoSuggestion', () => {
  it('corectează greșelile din baza reală', () => {
    expect(emailTypoSuggestion('adriannalinna7@gmail.con')).toBe('adriannalinna7@gmail.com')
    expect(emailTypoSuggestion('lory327@yahoo.coml')).toBe('lory327@yahoo.com')
    expect(emailTypoSuggestion('mantaandreea71@gmail.com1')).toBe('mantaandreea71@gmail.com')
    expect(emailTypoSuggestion('ana@gmial.com')).toBe('ana@gmail.com')
    expect(emailTypoSuggestion('Ana@Yahooo.com')).toBe('ana@yahoo.com')
  })
  it('lasă adresele corecte în pace', () => {
    for (const e of ['ana@gmail.com', 'contact@vioi.ro', 'x@company.co.uk', 'marketing@nutrivita.ro', 'a@icloud.com'])
      expect(emailTypoSuggestion(e)).toBeNull()
    expect(emailTypoError('ana@gmail.com')).toBeNull()
    expect(emailTypoError('ana@gmail.con')).toContain('ana@gmail.com')
  })
})

describe('isTestCampaign', () => {
  it('prinde campaniile de test', () => {
    expect(isTestCampaign({ title: 'test' })).toBe(true)
    expect(isTestCampaign({ title: 'Campanie TEST Vioi' })).toBe(true)
    expect(isTestCampaign({ title: 'Demo brand' })).toBe(true)
    expect(isTestCampaign({ title: 'Campanie', offer_name: 'test' })).toBe(true)
  })
  it('nu blochează campaniile reale', () => {
    expect(isTestCampaign({ title: '[Barter] Vioi.ro — pachet de testare a produselor', offer_name: null })).toBe(false)
    expect(isTestCampaign({ title: 'Teste gratuite pentru mămici' })).toBe(false)
    expect(isTestCampaign({ title: 'Covorașul din diatomită', offer_name: 'Smartino' })).toBe(false)
    expect(isTestCampaign({ title: 'Testosteron Plus' })).toBe(false)
    expect(isTestCampaign({ title: 'Contest de Crăciun' })).toBe(false)
  })
})
