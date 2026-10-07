// Gardă: orice tip de tranzacție scris de cod trebuie permis de constrângerea din baza de date.
// (Eroarea „brand_transactions_type_check” de la publicare a apărut fiindcă `CAMPAIGN_FEE` lipsea.)
import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const root = path.resolve(__dirname, '..')

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git', 'tests'].includes(e.name) || e.name.startsWith('DEPLOY_')) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx|sql)$/.test(e.name)) out.push(p)
  }
  return out
}

const allowed = (() => {
  const sql = fs.readFileSync(path.join(root, 'supabase/security/18_repara_tip_tranzactii.sql'), 'utf8')
  return new Set([...sql.matchAll(/'([A-Z_]+)'/g)].map(m => m[1]))
})()

const used = new Map<string, string>()
for (const f of walk(root)) {
  const src = fs.readFileSync(f, 'utf8')
  const rel = path.relative(root, f)
  if (f.endsWith('.sql')) {
    for (const m of src.matchAll(/INSERT INTO\s+(?:public\.)?brand_transactions\s*\([^)]*\)\s*VALUES\s*\([^,]*,\s*'([A-Z_]+)'/gi)) used.set(m[1], rel)
  } else {
    for (const m of src.matchAll(/from\('brand_transactions'\)\s*\.insert\(\{[^}]*?\btype:\s*'([A-Z_]+)'/g)) used.set(m[1], rel)
  }
}

describe('tipuri brand_transactions', () => {
  it('am găsit tipuri folosite în cod', () => expect(used.size).toBeGreaterThan(3))
  for (const [type, file] of used) {
    it(`${type} (în ${file}) e permis de constrângere`, () => expect(allowed.has(type)).toBe(true))
  }
})
