'use client'
// Animații la scroll pentru paginile publice: elementele cu clasa `rv` apar când intră în ecran,
// iar cele cu `data-count` numără până la valoarea lor. Fără JS (sau cu „reduce motion”) totul e vizibil din start.
import { useEffect } from 'react'

export default function RevealOnScroll() {
  useEffect(() => {
    const root = document.documentElement
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const els = Array.from(document.querySelectorAll<HTMLElement>('.rv'))
    const counters = Array.from(document.querySelectorAll<HTMLElement>('[data-count]'))
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('in'))
      return
    }
    root.classList.add('rv-on')

    const count = (el: HTMLElement) => {
      const end = Number(el.dataset.count || 0)
      const suffix = el.dataset.suffix || ''
      const t0 = performance.now(), dur = 1400
      const step = (t: number) => {
        const p = Math.min(1, (t - t0) / dur)
        const v = Math.round(end * (1 - Math.pow(1 - p, 3)))
        el.textContent = v.toLocaleString('ro-RO') + suffix
        if (p < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }

    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const el = e.target as HTMLElement
        el.classList.add('in')
        if (el.dataset.count) count(el)
        el.querySelectorAll<HTMLElement>('[data-count]').forEach(count)
        io.unobserve(el)
      }
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' })

    els.forEach(el => io.observe(el))
    counters.filter(c => !c.closest('.rv')).forEach(c => io.observe(c))
    return () => { io.disconnect(); root.classList.remove('rv-on') }
  }, [])
  return null
}
