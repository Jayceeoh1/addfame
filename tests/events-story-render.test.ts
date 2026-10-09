import { describe, it, expect } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Story, Mosaic } from '@/components/events/EventsUI'

const photos = [1, 2, 3, 4].map(i => ({ id: `p${i}`, event_id: 'e', path: `e/${i}.jpg`, caption: i === 2 ? 'Pe scenă' : null, position: i }))
const event: any = {
  id: 'e', slug: 'seara', title: 'Seara AddFame', status: 'published', starts_at: '2026-06-10T16:00:00Z', location: 'Locația X', city: 'București',
  description: null, signup_url: null, cover_photo_id: 'p3', summary: 'O seară cu creatori.', creators_count: 40, brands_count: null,
  story: 'Primul paragraf.\n\n## Ce am făcut\n\n[foto 1 2]\n\n> „Super.” — Ana, creator\n\n[foto 9]\n\nFinal.',
}

describe('Story · randare', () => {
  it('afișează titlul, rezumatul, faptele, textul, citatul și pozele din text; coperta e poza aleasă', () => {
    const html = renderToStaticMarkup(h(Story, { event, photos: photos as any }))
    expect(html).toContain('Seara AddFame')
    expect(html).toContain('O seară cu creatori.')
    expect(html).toContain('10 iunie 2026')
    expect(html).toContain('Locația X, București')
    expect(html).toContain('Creatori prezenți')
    expect(html).not.toContain('Branduri prezente')            // cifră lipsă = nu apare
    expect(html).toContain('Ce am făcut')
    expect(html).toContain('„Super.”')
    expect(html).toContain('Ana, creator')
    expect(html).toContain('st-row-2')                         // [foto 1 2]
    expect(html.match(/aria-label="Poză:/g)!.length).toBe(2)   // [foto 9] nu există → nu apare nimic
    expect(html.match(/<img /g)!.length).toBe(3)               // copertă + 2 poze în text
    expect(html).toContain('e/3.jpg')                          // coperta aleasă
    expect(html).toContain('sunt în galerie')
  })
  it('h1 pe pagina albumului, h2 pe /evenimente; fără poze nu pune poza mare', () => {
    expect(renderToStaticMarkup(h(Story, { event, photos: photos as any, headingLevel: 1 }))).toContain('<h1 class="st-h">')
    const none = renderToStaticMarkup(h(Story, { event: { ...event, story: 'Doar text.' }, photos: [] }))
    expect(none).not.toContain('<img'); expect(none).toContain('<h2 class="st-h">'); expect(none).not.toContain('sunt în galerie')
  })
  it('mozaicul are legendă sau numele evenimentului', () => {
    const html = renderToStaticMarkup(h(Mosaic, { photos: photos.map(p => ({ ...p, eventTitle: 'Seara' })) as any }))
    expect(html).toContain('Pe scenă'); expect(html).toContain('>Seara<')
  })
})
