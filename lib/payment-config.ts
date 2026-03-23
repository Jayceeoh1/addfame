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
  name: 'AddFame SRL',            // ← numele firmei tale
  cui: 'RO12345678',              // ← CUI-ul tău (de la ANAF)
  vat: 'RO12345678',              // ← același cu CUI dacă ești plătitor TVA
  address: 'Str. Victoriei 12, București', // ← adresa sediului social
  country: 'România',
  email: 'payments@addfame.ro',  // ← emailul pentru plăți
  support: 'support@addfame.ro',
  website: 'www.addfame.ro',
}

export const BANK = {
  name: 'Banca Transilvania',    // ← banca ta
  iban: 'RO49 AAAA 1B31 0075 9384 0000', // ← IBAN-ul tău real
  bic: 'BTRLRO22',               // ← BIC/SWIFT al băncii tale
  holder: COMPANY.name,
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

// ─── Comisioane platformă ────────────────────────────────────────────────────
export const COMMISSION_BRAND = 0.15    // 15% comision din bugetul campaniei
export const COMMISSION_WITHDRAWAL = 0.05 // 5% fee la retragere influencer
export const VAT_RATE = 0.19            // TVA România