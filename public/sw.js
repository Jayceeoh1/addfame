// addfame-v9 — notificări push
const CACHE_NAME = 'addfame-v9'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Lasa browserul sa gestioneze direct (fara SW) pentru:
  if (request.method !== 'GET') return
  if (url.hostname !== self.location.hostname) return
  if (url.hostname.includes('supabase.co')) return
  if (url.pathname.startsWith('/api/')) return
  if (url.pathname.startsWith('/admin')) return
  if (url.pathname.startsWith('/contract/')) return
  if (url.pathname.startsWith('/auth/')) return
  if (url.pathname.startsWith('/brand/')) return
  if (url.pathname.startsWith('/influencer/')) return
  if (url.pathname.startsWith('/_next/data')) return
  if (url.pathname.includes('__nextjs')) return

  // Doar assets statice cu hash se cacheza
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((c) => c.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Tot restul — direct din retea, fara cache
  event.respondWith(fetch(request))
})

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (_) { data = { body: event.data ? event.data.text() : '' } }
  const url = typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/'
  event.waitUntil(
    self.registration.showNotification(data.title || 'AddFame', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || undefined,
      data: { url },
    })
  )
})

// Click pe notificare: folosește fereastra AddFame deja deschisă, altfel deschide una nouă
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil((async () => {
    const wins = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const w of wins) {
      if (new URL(w.url).origin === self.location.origin && 'focus' in w) {
        await w.focus()
        if ('navigate' in w) { try { await w.navigate(target) } catch (_) {} }
        return
      }
    }
    await clients.openWindow(target)
  })())
})

// Browserul a reînnoit abonamentul → îl salvăm din nou pe server
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      const key = event.oldSubscription && event.oldSubscription.options && event.oldSubscription.options.applicationServerKey
      const sub = event.newSubscription || (key ? await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }) : null)
      if (!sub) return
      await fetch('/api/push/subscribe', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })
    } catch (_) {}
  })())
})
