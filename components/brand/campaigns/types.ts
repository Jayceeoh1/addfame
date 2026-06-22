// @ts-nocheck
export type Tab = 'all' | 'pending' | 'invited' | 'active' | 'completed' | 'rejected'

export const STATUS_CFG: Record<string, { label: string; bg: string; text: string; dot: string; border: string }> = {
  DRAFT:     { label: 'Draft',      bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400', border: 'border-amber-200' },
  ACTIVE:    { label: 'Activ',      bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500', border: 'border-green-200' },
  PAUSED:    { label: 'Pauzat',     bg: 'bg-gray-100',  text: 'text-gray-500',   dot: 'bg-gray-400',  border: 'border-gray-200' },
  COMPLETED: { label: 'Finalizat',  bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400',  border: 'border-blue-200' },
}

export const COLLAB_CFG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  INVITED:   { label: 'Invitat',   bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  PENDING:   { label: 'Aplicat',   bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  ACTIVE:    { label: 'Activ',     bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  COMPLETED: { label: 'Finalizat', bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500' },
  REJECTED:  { label: 'Refuzat',   bg: 'bg-gray-100',  text: 'text-gray-400',   dot: 'bg-gray-300' },
}

export const fmt = (n: number) => `${(n || 0).toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON`
export const fmtDate = (d: string) => new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })
export const fmtNum = (n: number) => {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}
export const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 864e5)
