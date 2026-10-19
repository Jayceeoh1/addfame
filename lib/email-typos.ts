// Prinde greșelile de tastare din adresele de email (gmail.con, yahoo.coml, gmial.com…) înainte să se salveze.
// O adresă greșită = mailuri care dau „bounce” = reputație proastă pentru addfame.ro. Funcție pură, testată în tests/email-typos.test.ts.

const DOMAIN_FIX: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmail.cm': 'gmail.com',
  'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yhaoo.com': 'yahoo.com', 'yahoo.co': 'yahoo.com', 'yahoo.cm': 'yahoo.com',
  'hotmal.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.co': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com',
  'icloud.co': 'icloud.com', 'iclod.com': 'icloud.com',
}
const TLD_FIX: Record<string, string> = { con: 'com', coml: 'com', cmo: 'com', comm: 'com', vom: 'com', xom: 'com', 'com1': 'com', ocm: 'com', rp: 'ro', ri: 'ro' }

/** Dacă adresa pare scrisă greșit, întoarce varianta corectă; altfel null. */
export function emailTypoSuggestion(raw: string): string | null {
  const email = String(raw || '').trim().toLowerCase()
  const at = email.lastIndexOf('@')
  if (at < 1) return null
  const local = email.slice(0, at)
  let domain = email.slice(at + 1)
  const parts = domain.split('.')
  const tld = parts[parts.length - 1]
  if (parts.length >= 2 && TLD_FIX[tld]) domain = [...parts.slice(0, -1), TLD_FIX[tld]].join('.')
  if (DOMAIN_FIX[domain]) domain = DOMAIN_FIX[domain]
  const fixed = `${local}@${domain}`
  return fixed !== email ? fixed : null
}

/** Mesajul de eroare pentru formular, sau null dacă adresa e în regulă. */
export function emailTypoError(raw: string): string | null {
  const s = emailTypoSuggestion(raw)
  return s ? `Verifică adresa de email. Ai vrut să scrii ${s}?` : null
}
