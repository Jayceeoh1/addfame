/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║          ADDFAME — CONFIGURARE PLĂȚI CENTRALIZATĂ           ║
 * ║                                                              ║
 * ║  Când ai SRL/PFA, modifică DOAR acest fișier.               ║
 * ║  Toate paginile (wallet, facturi, admin) se actualizează     ║
 * ║  automat.                                                    ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

export const COMPANY = {
  name: 'Add Fame Digital S.R.L.',
  cui: '54992560',
  vat: 'RO54992560',
  address: 'Bulevardul Nicolae Bălcescu, Bl. C5, Scara B, Etaj 2, Ap. 9, Municipiul Pitești, Jud. Argeș',
  country: 'România',
  email: 'payments@addfame.ro',
  support: 'support@addfame.ro',
  website: 'www.addfame.ro',
}

export const BANK = {
  name: 'Banca Transilvania',
  iban: 'RO38 BTRL RONC RT0D F823 7101',
  bic: 'BTRLRO22',
  holder: 'Add Fame Digital S.R.L.',
}

export const REVOLUT = {
  tag: '@addfame',               // ← tag-ul tău Revolut Business
  account: COMPANY.name,
  active: false,                 // ← pune true când ai cont Revolut Business
}

export const WISE = {
  email: COMPANY.email,
  holder: COMPANY.name,
  active: false,                 // ← pune true când ai cont Wise Business
}

export const PAYPAL = {
  email: COMPANY.email,
  active: false,                 // ← pune true când ai cont PayPal Business
}

export const CRYPTO = {
  network: 'TRC-20 (Tron)',
  address: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE', // ← adresa ta crypto
  also: 'ERC-20, BEP-20',
  active: false,                 // ← pune true dacă vrei să accepți crypto
}

// ─── Limite sume ────────────────────────────────────────────────────────────
export const TOPUP_MIN = 50      // RON minim per încărcare
export const TOPUP_MAX = 250000  // RON maxim per încărcare

// ─── Platformă fără comisioane ───────────────────────────────────────────────
// Nu se aplică comisioane brandurilor sau influencerilor.