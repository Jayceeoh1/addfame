// Textul clauzelor din contractul de cesiune, pe versiuni.
// Un contract semnat se afișează mereu cu versiunea pe care a semnat-o creatorul (cesiune_contracts.clauses_version).
//   v1 — cesiune 6 luni (textul inițial)
//   v2 — cesiune pe întreaga durată de protecție; publicitate plătită (ads) 6 luni; drepturi și pentru brand + parteneri;
//        acord pentru imagine, nume și voce
//   v3 — ca v2 + creatorul își păstrează postarea pe profil și o poate folosi în portofoliu

/** Versiunea curentă a textului (cea arătată la semnare). */
export const CESIUNE_CLAUSES_VERSION = 3

/** Luni în care clipul poate rula ca reclamă plătită (v2). */
export const ADS_MONTHS = 6

export interface CesiuneBrand { brand_name?: string | null; brand_cui?: string | null; brand_reg_com?: string | null }

export function brandIdentity(c: CesiuneBrand): string {
  const name = (c.brand_name || '').trim()
  if (!name) return 'brandul partener al campaniei'
  const ids = [c.brand_cui && `CUI ${c.brand_cui}`, c.brand_reg_com && `Reg. Com. ${c.brand_reg_com}`].filter(Boolean).join(', ')
  return ids ? `${name} (${ids})` : name
}

/** Eticheta scurtă a cesiunii, pentru liste (admin). */
export const cesiuneLabel = (version?: number | null) =>
  (version ?? 1) >= 2 ? `Cesiune definitivă · ads ${ADS_MONTHS} luni` : 'Cesiune 6 luni'

/**
 * Art. 7 — Durata și întinderea cesiunii (v2+). Fiecare element e un alineat, numerotat de la (1).
 * `version` = versiunea semnată (implicit cea curentă); v3 adaugă alineatul despre postarea creatorului.
 */
export function art7Clauses(c: CesiuneBrand, version: number = CESIUNE_CLAUSES_VERSION): string[] {
  const brand = brandIdentity(c)
  const out = [
    `Autorul cedează drepturile patrimoniale prevăzute la Art. 2 pe întreaga durată de protecție a drepturilor patrimoniale de autor prevăzută de lege, începând cu data semnării prezentului contract.`,
    `Prin excepție de la alin. (1), utilizarea Înregistrării în publicitate plătită (ads), adică în reclame sponsorizate sau promovate contra cost pe Meta (Facebook, Instagram), TikTok, YouTube, Google sau pe alte platforme, este permisă pe o durată de ${ADS_MONTHS} (șase) luni de la data semnării. După expirarea acestei perioade, Înregistrarea poate fi folosită în continuare, fără limită de timp, numai în mod organic (postări pe paginile și conturile proprii, site, newsletter, materiale de prezentare), fără a fi promovată contra cost. Prelungirea perioadei de publicitate plătită se poate face numai prin act adițional.`,
    `Drepturile cedate prin prezentul contract pot fi exercitate, în aceleași limite și pe aceleași durate prevăzute la alin. (1) și (2), și de ${brand}, precum și de partenerii acestuia (distribuitori, rețele de magazine, agenții de publicitate și alte entități care promovează sau comercializează produsele brandului), exclusiv pentru promovarea brandului și a produselor sale.`,
    `Prin semnarea prezentului contract, Autorul își dă acordul expres ca Beneficiarul să transmită drepturile cedate către brandul partener și către partenerii acestuia, în limitele și pe duratele prevăzute la alin. (1) – (3), fără a fi necesar un alt acord sau o altă remunerație.`,
    `Autorul își dă acordul ca imaginea, numele și vocea sa, astfel cum apar în Înregistrare, să fie folosite de Beneficiar, de brandul partener și de partenerii acestuia, în legătură cu Înregistrarea și în aceleași limite și pe aceleași durate prevăzute la alin. (1) – (3).`,
  ]
  if (version >= 3) out.push(
    `Prin excepție de la caracterul exclusiv al cesiunii, Autorul își poate păstra postarea cu Înregistrarea pe propriile conturi de social media, fără limită de timp, și poate folosi Înregistrarea în portofoliul său personal (prezentări către alți potențiali parteneri), fără a o ceda sau licenția altui brand și fără a o folosi în reclame plătite.`,
  )
  return out
}
