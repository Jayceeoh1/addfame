// Utilitare geografice — fișier client-safe, fără 'use server'

export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function normalizeCity(city: string): string {
  return city
    .toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/municipiul\s+/i, '').replace(/județul\s+/i, '')
    .replace(/\s+/g, ' ').trim()
}

export function extractCityFromAddress(address: string): string {
  if (!address) return ''
  const parts = address.split(',').map(p => p.trim()).filter(Boolean)
  const filtered = parts.filter(p => !['romania', 'românia', 'ro'].includes(p.toLowerCase()))
  for (let i = filtered.length - 1; i >= 0; i--) {
    const part = filtered[i]
    if (!/^\d+$/.test(part) && part.length > 2) return part
  }
  return filtered[filtered.length - 1] || ''
}