// Textul clauzelor din contractul de cesiune, pe versiuni.
// Un contract semnat se afișează mereu cu versiunea pe care a semnat-o creatorul (cesiune_contracts.clauses_version).

/** Versiunea curentă a textului (cea arătată la semnare). */
export const CESIUNE_CLAUSES_VERSION = 2

export interface CesiuneBrand { brand_name?: string | null; brand_cui?: string | null; brand_reg_com?: string | null }

export function brandIdentity(c: CesiuneBrand): string {
  const name = (c.brand_name || '').trim()
  if (!name) return 'brandul partener al campaniei'
  const ids = [c.brand_cui && `CUI ${c.brand_cui}`, c.brand_reg_com && `Reg. Com. ${c.brand_reg_com}`].filter(Boolean).join(', ')
  return ids ? `${name} (${ids})` : name
}

/**
 * v2 — Art. 7 (2) și (3): drepturile se exercită, pe aceeași durată de 6 luni, și de brandul partener
 * și de partenerii acestuia, cu acordul expres al Autorului (necesar pentru transmiterea drepturilor către terți).
 */
export function brandRightsClauses(c: CesiuneBrand): string[] {
  const brand = brandIdentity(c)
  return [
    `Drepturile patrimoniale de autor prevăzute la Art. 2 sunt cedate, pe aceeași durată de 6 (șase) luni de la data semnării, și către ${brand}, precum și către partenerii acestuia (distribuitori, rețele de magazine, agenții de publicitate și alte entități care promovează sau comercializează produsele brandului), care pot utiliza Înregistrarea în aceleași modalități prevăzute la Art. 3 și 4, inclusiv în publicitate plătită (ads), exclusiv pentru promovarea brandului și a produselor sale.`,
    `Prin semnarea prezentului contract, Autorul își dă acordul expres ca Beneficiarul să transmită drepturile cedate către brandul partener și către partenerii acestuia, în limitele și pe durata prevăzute la alin. (1) și (2), fără a fi necesar un alt acord sau o altă remunerație.`,
  ]
}
