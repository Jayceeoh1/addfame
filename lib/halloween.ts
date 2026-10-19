// Halloween AddFame: calendarul (ora României), punctele dovleacului și bonusul. Funcții pure, testate în tests/halloween.test.ts.

export const TREAT_FIRST_DAY = 25   // 25 octombrie
export const TREAT_LAST_DAY = 31    // 31 octombrie
export const TREAT_DAYS = TREAT_LAST_DAY - TREAT_FIRST_DAY + 1   // 7
export const STREAK_BONUS = 50

/** Data de azi în România, „YYYY-MM-DD”. */
export function bucharestDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

const parts = (day: string) => { const [y, m, d] = day.split('-').map(Number); return { y, m, d } }

/** Zilele jocului din anul dat: 25…31 octombrie. */
export function treatDays(year: number): string[] {
  return Array.from({ length: TREAT_DAYS }, (_, i) => `${year}-10-${String(TREAT_FIRST_DAY + i).padStart(2, '0')}`)
}

/** Se poate deschide dovleacul azi? (25–31 octombrie, ora României) */
export function isTreatDay(now: Date = new Date()): boolean {
  const { m, d } = parts(bucharestDay(now))
  return m === 10 && d >= TREAT_FIRST_DAY && d <= TREAT_LAST_DAY
}

/** Tema de Halloween: 24 octombrie – 1 noiembrie, inclusiv. */
export function isThemeActive(now: Date = new Date()): boolean {
  const { m, d } = parts(bucharestDay(now))
  return (m === 10 && d >= 24) || (m === 11 && d === 1)
}

/** Faza jocului pentru card: înainte (teaser), în timpul jocului, după (rezumat), sau ascuns. */
export function treatPhase(now: Date = new Date()): 'teaser' | 'open' | 'over' | 'hidden' {
  if (isTreatDay(now)) return 'open'
  const { m, d } = parts(bucharestDay(now))
  if (m === 10 && d === 24) return 'teaser'
  if (m === 11 && d === 1) return 'over'
  return 'hidden'
}

// Mai multe șanse la puncte puține, rar la 30 (media ≈ 12 puncte/zi).
const TABLE: [number, number][] = [[5, 30], [10, 25], [15, 18], [20, 12], [25, 9], [30, 6]]

/** Punctele dovleacului; `r` e un număr aleator în [0, 1). */
export function rollTreat(r: number): number {
  const total = TABLE.reduce((s, [, w]) => s + w, 0)
  let x = Math.min(Math.max(r, 0), 0.999999) * total
  for (const [pts, w] of TABLE) { if (x < w) return pts; x -= w }
  return TABLE[0][0]
}

/** Bonusul se dă o singură dată, când a deschis toate cele 7 zile. */
export function earnedStreakBonus(openedDays: string[], year: number): boolean {
  const set = new Set(openedDays)
  return treatDays(year).every(d => set.has(d))
}
