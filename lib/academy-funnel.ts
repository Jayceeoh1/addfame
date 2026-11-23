// Pașii urmăriți în Academie (pâlnia până la abonare).
export const ACADEMY_EVENTS = ['page_view', 'offer_view', 'locked_click', 'consent_checked', 'checkout_open', 'checkout_close'] as const
export type AcademyEvent = typeof ACADEMY_EVENTS[number]

export const FUNNEL_STEPS: { key: AcademyEvent | 'paid'; label: string; hint: string }[] = [
  { key: 'page_view', label: 'Au deschis Academia', hint: 'au intrat pe pagina Academie' },
  { key: 'offer_view', label: 'Au văzut oferta', hint: 'au ajuns la cardul Academy Member (fără să fie membri)' },
  { key: 'consent_checked', label: 'Au bifat acordul', hint: 'au bifat căsuța de dinaintea plății' },
  { key: 'checkout_open', label: 'Au deschis plata', hint: 'li s-a deschis fereastra Stripe' },
  { key: 'paid', label: 'Au plătit', hint: 'prima plată reușită' },
]

/** Cel mai avansat pas atins de un creator (pentru lista „interesați”). */
export function furthestStep(events: Set<string>, paid: boolean): string {
  if (paid) return 'Au plătit'
  for (const k of ['checkout_open', 'consent_checked', 'offer_view', 'locked_click', 'page_view'] as const) {
    if (events.has(k)) return k === 'locked_click' ? 'A încercat o lecție cu lacăt' : FUNNEL_STEPS.find(s => s.key === k)!.label
  }
  return '—'
}

export const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0)
