// Metodele de plată ale creatorilor: ce câmpuri sunt obligatorii, ca o retragere să poată fi plătită.
// Folosit și în wallet (browser), și la cererea de retragere (server).

export const REQUIRED_FIELDS: Record<string, string[]> = {
  bank_transfer: ['account_holder', 'iban'],
  paypal: ['email'],
  revolut: ['username'],
  wise: ['email'],
  crypto: ['network', 'wallet_address'],
}

const clean = (v: unknown) => String(v ?? '').trim()

export function validIban(v: unknown): boolean {
  const s = clean(v).replace(/\s+/g, '').toUpperCase()
  return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)
}

export function validEmail(v: unknown): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean(v))
}

/** Ce lipsește dintr-o metodă de plată ca să putem trimite banii (gol = e completă). */
export function methodProblem(type: string, details: Record<string, any> | null | undefined): string | null {
  const req = REQUIRED_FIELDS[type]
  if (!req) return 'Tip de plată necunoscut.'
  const d = details || {}
  for (const k of req) if (!clean(d[k])) return 'Lipsesc date din metoda de plată.'
  if (type === 'bank_transfer' && !validIban(d.iban)) return 'IBAN-ul nu pare corect.'
  if ((type === 'paypal' || type === 'wise') && !validEmail(d.email)) return 'Adresa de e-mail nu pare corectă.'
  return null
}

export function methodIsComplete(m: { type: string; details?: any } | null | undefined): boolean {
  return !!m && !methodProblem(m.type, m.details)
}
