import { describe, it, expect } from 'vitest'
import { buildPushPayload, safeLink, isGoneStatus, cleanSubscription, safeEqual, sendToDevices, dispatchNotifications } from '@/lib/push'

/** Client Supabase minimal, în memorie, cât să acopere apelurile din lib/push. */
function fakeAdmin(tables: Record<string, any[]>) {
  const log: string[] = []
  const from = (t: string) => {
    let rows = tables[t] ?? (tables[t] = [])
    let filters: ((r: any) => boolean)[] = []
    let op: 'select' | 'update' | 'delete' = 'select'
    let patch: any = null
    const api: any = {
      select: () => api,
      update: (p: any) => { op = 'update'; patch = p; return api },
      delete: () => { op = 'delete'; return api },
      in: (c: string, v: any[]) => { filters.push(r => v.includes(r[c])); return api },
      eq: (c: string, v: any) => { filters.push(r => r[c] === v); return api },
      is: (c: string, v: any) => { filters.push(r => (r[c] ?? null) === v); return api },
      gte: (c: string, v: any) => { filters.push(r => r[c] >= v); return api },
      then: (res: any) => {
        const hit = rows.filter(r => filters.every(f => f(r)))
        if (op === 'update') hit.forEach(r => Object.assign(r, patch))
        if (op === 'delete') tables[t] = rows = rows.filter(r => !hit.includes(r))
        log.push(`${op}:${t}:${hit.length}`)
        return Promise.resolve({ data: hit, error: null }).then(res)
      },
    }
    return api
  }
  return { from, log } as any
}

describe('push · reguli', () => {
  it('payload scurtat și doar cu link intern', () => {
    const p = JSON.parse(buildPushPayload({ id: '1', title: 'x'.repeat(200), body: null, link: 'https://evil.com' }))
    expect(p.title.length).toBeLessThanOrEqual(80)
    expect(p.url).toBe('/')
    expect(p.tag).toBe('n-1')
    expect(safeLink('//evil.com')).toBe('/')
    expect(safeLink('/influencer/campaigns/1')).toBe('/influencer/campaigns/1')
  })
  it('404/410 înseamnă dispozitiv dezabonat', () => {
    expect(isGoneStatus(410)).toBe(true); expect(isGoneStatus(404)).toBe(true); expect(isGoneStatus(500)).toBe(false)
  })
  it('validează abonamentul primit din browser', () => {
    const ok = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc123', keys: { p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) } }
    expect(cleanSubscription(ok)).not.toBeNull()
    expect(cleanSubscription({ ...ok, endpoint: 'http://x.com/a' })).toBeNull()
    expect(cleanSubscription({ ...ok, keys: { p256dh: '<script>', auth: 'x' } })).toBeNull()
    expect(cleanSubscription(null)).toBeNull()
  })
  it('compararea secretului', () => {
    expect(safeEqual('abc', 'abc')).toBe(true); expect(safeEqual('abc', 'abd')).toBe(false); expect(safeEqual('abc', 'ab')).toBe(false)
  })
})

describe('push · trimitere', () => {
  const subs = () => [
    { id: 's1', user_id: 'u1', endpoint: 'https://a/1', p256dh: 'k', auth: 'a', failure_count: 0 },
    { id: 's2', user_id: 'u1', endpoint: 'https://a/2', p256dh: 'k', auth: 'a', failure_count: 0 },
    { id: 's3', user_id: 'u2', endpoint: 'https://a/3', p256dh: 'k', auth: 'a', failure_count: 4 },
  ]

  it('trimite la toate dispozitivele, șterge pe cele dezabonate și pe cele care eșuează constant', async () => {
    const admin = fakeAdmin({ push_subscriptions: subs() })
    const sent: string[] = []
    const stats = await sendToDevices(admin, [
      { id: 'n1', user_id: 'u1', title: 'T', body: 'B', link: '/' },
      { id: 'n2', user_id: 'u2', title: 'T', body: 'B', link: '/' },
    ], async (sub) => {
      sent.push(sub.id)
      if (sub.id === 's2') return { ok: false, status: 410 }
      if (sub.id === 's3') return { ok: false, status: 500 }
      return { ok: true }
    })
    expect(sent.sort()).toEqual(['s1', 's2', 's3'])
    expect(stats).toMatchObject({ sent: 1, failed: 2, removed: 2 })
    expect(admin.from('push_subscriptions') && (await admin.from('push_subscriptions').select()).data.map((s: any) => s.id)).toEqual(['s1'])
  })

  it('o notificare pleacă o singură dată (revendicare) și doar dacă e recentă', async () => {
    const now = new Date().toISOString()
    const old = new Date(Date.now() - 60 * 60_000).toISOString()
    const admin = fakeAdmin({
      push_subscriptions: subs(),
      notifications: [
        { id: 'n1', user_id: 'u1', title: 'nou', body: '', link: '/', created_at: now, pushed_at: null },
        { id: 'n2', user_id: 'u1', title: 'vechi', body: '', link: '/', created_at: old, pushed_at: null },
      ],
    })
    let count = 0
    const send = async () => { count++; return { ok: true } }
    await dispatchNotifications(admin, ['n1', 'n2', 'n1'], send)
    expect(count).toBe(2) // n1 → 2 dispozitive ale lui u1; n2 e prea vechi
    await dispatchNotifications(admin, ['n1'], send)
    expect(count).toBe(2) // deja trimisă
  })

  it('ignoră id-uri invalide', async () => {
    const admin = fakeAdmin({ notifications: [] })
    const r = await dispatchNotifications(admin, ["1); DROP TABLE x;--", ''], async () => ({ ok: true }))
    expect(r.notifications).toBe(0)
  })
})
