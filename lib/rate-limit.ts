/**
 * Rate limiter cu fallback in-memory.
 *
 * Ordinea straturilor:
 *   1. Upstash Redis (dacă UPSTASH_REDIS_REST_URL/TOKEN sunt setate în Vercel);
 *   2. Postgres (funcția rate_limit_hit, SQL 21) — persistent între instanțele serverless;
 *   3. memorie (ultima soluție: dacă și baza de date e indisponibilă, nu blocăm utilizatorii).
 */

// ── In-memory store (fallback când Redis nu e configurat) ──────────────────
interface RateLimitEntry {
  count: number
  resetAt: number
  blockedAt?: number
}

const memStore = new Map<string, RateLimitEntry>()

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    memStore.forEach((v, k) => { if (v.resetAt < now) memStore.delete(k) })
  }, 10 * 60 * 1000)
}

export type RateLimitConfig = {
  maxRequests: number
  windowMs: number
  blockMs?: number
}

export type RateLimitResult = {
  ok: boolean
  remaining: number
  retryAfter?: number
}

// ── Redis rate limit via Upstash REST API ──────────────────────────────────
async function redisRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null // fallback to in-memory

  try {
    const windowSec = Math.ceil(config.windowMs / 1000)
    const blockSec = Math.ceil((config.blockMs ?? config.windowMs) / 1000)
    const redisKey = `rl:${key}`
    const blockKey = `rl:blocked:${key}`

    // Check if blocked
    const blockRes = await fetch(`${url}/get/${blockKey}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const blockData = await blockRes.json()
    if (blockData.result) {
      return { ok: false, remaining: 0, retryAfter: blockSec }
    }

    // Increment counter with sliding window
    const incrRes = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', redisKey],
        ['EXPIRE', redisKey, windowSec],
      ]),
    })
    const incrData = await incrRes.json()
    const count = incrData?.[0]?.result ?? 1

    if (count > config.maxRequests) {
      // Set block key
      await fetch(`${url}/set/${blockKey}/1/ex/${blockSec}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return { ok: false, remaining: 0, retryAfter: blockSec }
    }

    return { ok: true, remaining: config.maxRequests - count }
  } catch {
    return null // fallback to in-memory on Redis error
  }
}

// ── In-memory fallback ─────────────────────────────────────────────────────
function memRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const blockMs = config.blockMs ?? config.windowMs
  const entry = memStore.get(key)

  if (entry?.blockedAt) {
    const unblockAt = entry.blockedAt + blockMs
    if (now < unblockAt) {
      return { ok: false, remaining: 0, retryAfter: Math.ceil((unblockAt - now) / 1000) }
    }
    memStore.delete(key)
  }

  if (!entry || entry.resetAt <= now) {
    memStore.set(key, { count: 1, resetAt: now + config.windowMs })
    return { ok: true, remaining: config.maxRequests - 1 }
  }

  entry.count++
  if (entry.count > config.maxRequests) {
    entry.blockedAt = now
    return { ok: false, remaining: 0, retryAfter: Math.ceil(blockMs / 1000) }
  }

  return { ok: true, remaining: config.maxRequests - entry.count }
}

// ── Postgres (persistent, fără servicii externe) ───────────────────────────
async function pgRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult | null> {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const { data, error } = await createAdminClient().rpc('rate_limit_hit', {
      p_key: key,
      p_max: config.maxRequests,
      p_window_seconds: Math.ceil(config.windowMs / 1000),
      p_block_seconds: Math.ceil((config.blockMs ?? config.windowMs) / 1000),
    })
    if (error || !data) return null            // funcția lipsește (SQL 21 nerulat) sau DB indisponibilă
    const d = data as { ok: boolean; remaining: number; retry_after?: number }
    return { ok: d.ok, remaining: d.remaining, retryAfter: d.retry_after }
  } catch {
    return null
  }
}

// ── Public API ─────────────────────────────────────────────────────────────
export async function rateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const redisResult = await redisRateLimit(key, config)
  if (redisResult !== null) return redisResult
  const pgResult = await pgRateLimit(key, config)
  if (pgResult !== null) return pgResult
  return memRateLimit(key, config)
}

/** Pentru rute API: întoarce un răspuns 429 când limita e depășită, altfel null. */
export async function limitRequest(req: Request, name: string, config: RateLimitConfig, id?: string | null) {
  const { NextResponse } = await import('next/server')
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
  const r = await rateLimit(`${name}:${id || ip}`, config)
  if (r.ok) return null
  return NextResponse.json(
    { error: 'Prea multe cereri. Încearcă din nou în câteva minute.' },
    { status: 429, headers: { 'Retry-After': String(r.retryAfter ?? 60) } },
  )
}

/** Pentru server actions: întoarce un mesaj de eroare când limita e depășită, altfel null. */
export async function limitAction(name: string, userId: string, config: RateLimitConfig): Promise<string | null> {
  const r = await rateLimit(`${name}:${userId}`, config)
  return r.ok ? null : 'Prea multe încercări într-un timp scurt. Așteaptă puțin și încearcă din nou.'
}

// Presets
export const LIMITS = {
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000, blockMs: 30 * 60 * 1000 },
  register: { maxRequests: 3, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 },
  passwordReset: { maxRequests: 3, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 },
  api: { maxRequests: 30, windowMs: 60 * 1000 },
  email: { maxRequests: 5, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 },
  emailBulk: { maxRequests: 500, windowMs: 60 * 60 * 1000 },
  // Limite generoase: opresc abuzul, nu utilizatorii reali
  apply: { maxRequests: 15, windowMs: 10 * 60 * 1000, blockMs: 10 * 60 * 1000 },
  createCampaign: { maxRequests: 20, windowMs: 60 * 60 * 1000, blockMs: 30 * 60 * 1000 },
  contact: { maxRequests: 5, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 },
  upload: { maxRequests: 30, windowMs: 10 * 60 * 1000, blockMs: 10 * 60 * 1000 },
  comment: { maxRequests: 40, windowMs: 10 * 60 * 1000, blockMs: 10 * 60 * 1000 },
  payment: { maxRequests: 10, windowMs: 10 * 60 * 1000, blockMs: 30 * 60 * 1000 },
  signup: { maxRequests: 5, windowMs: 60 * 60 * 1000, blockMs: 60 * 60 * 1000 },
  ai: { maxRequests: 20, windowMs: 10 * 60 * 1000, blockMs: 10 * 60 * 1000 },
}

export async function getClientIP(): Promise<string> {
  try {
    const { headers } = await import('next/headers')
    const h = await headers()
    return (
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      h.get('x-real-ip') ||
      h.get('cf-connecting-ip') ||
      'unknown'
    )
  } catch {
    return 'unknown'
  }
}