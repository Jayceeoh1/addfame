// O campanie „de test” (cuvântul „test” sau „demo” de sine stătător în titlu/ofertă) nu se anunță la influenceri reali.
// „testare”, „teste”, „Testosteron”, „Contest” NU contează — ca să nu blocăm campanii reale de testare a produselor.
export function isTestCampaign(c: { title?: string | null; offer_name?: string | null; product_name?: string | null } | null | undefined): boolean {
  if (!c) return false
  const text = [c.title, c.offer_name, c.product_name].filter(Boolean).join(' ').toLowerCase()
  return /(^|[^a-z0-9ăâîșțşţ])(test|demo)([^a-z0-9ăâîșțşţ]|$)/i.test(text)
}
