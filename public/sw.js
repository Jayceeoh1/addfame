// addfame-v7 — forteaza reinstalare completa
const CACHE_NAME = 'addfame-v7'

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
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || 'AddFame', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'))
})
