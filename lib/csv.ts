// Export CSV compatibil cu Excel în română: separator „;”, UTF-8 cu BOM (diacriticele apar corect).
// Celulele care încep cu = + - @ sunt prefixate cu ' ca Excel să nu le execute ca formule.

export type Cell = string | number | boolean | null | undefined | Date

export function csvCell(v: Cell): string {
  if (v === null || v === undefined) return ''
  let s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v)
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = `'${s}`
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(headers: string[], rows: Cell[][]): string {
  return '﻿' + [headers, ...rows].map(r => r.map(csvCell).join(';')).join('\r\n')
}

/** Nume de fișier sigur: litere fără diacritice, cifre și cratime. */
export function csvFilename(...parts: (string | null | undefined)[]): string {
  const base = parts.filter(Boolean).join('-')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'export'
  return `${base}.csv`
}

export const COLLAB_STATUS_RO: Record<string, string> = {
  PENDING: 'În așteptare', INVITED: 'Invitat', ACTIVE: 'Acceptat', COMPLETED: 'Finalizat',
  REJECTED: 'Respins', CANCELLED: 'Anulat', DECLINED: 'Refuzat', EXPIRED: 'Expirat',
}

export const fmtDateRo = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Bucharest' }) : ''
