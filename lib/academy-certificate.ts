// Certificatul de absolvire al Academiei (modelul clasic), desenat în browser pe A4 orizontal:
// PNG la ~300 dpi și PDF (aceeași imagine pe o pagină A4).

import { createElement } from 'react'
import { TIERS, type AcademyTier } from '@/lib/academy'

const W = 3508, H = 2480            // A4 orizontal la 300 dpi
const s = W / 1123                   // scara față de machetă (1123×794)

const TIER_COLORS: Record<AcademyTier, { accent: string; text: string }> = {
  bronze:   { accent: '#b0703c', text: '#8a4f22' },
  silver:   { accent: '#8a94a6', text: '#4f5868' },
  gold:     { accent: '#c98a0c', text: '#8f6206' },
  platinum: { accent: '#6a52e0', text: '#4a36b8' },
}

export type CertificateData = { name: string; tier: AcademyTier; correct: number; total: number; date: string | Date; code: string; avatar?: string | null }

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })
}

async function loadFonts() {
  try {
    if (!document.querySelector('link[data-af-cert-font]')) {
      const l = document.createElement('link')
      l.rel = 'stylesheet'; l.dataset.afCertFont = '1'
      l.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,500&family=Plus+Jakarta+Sans:wght@500;700;800&display=swap'
      document.head.appendChild(l)
      await new Promise(r => { l.onload = r; l.onerror = r; setTimeout(r, 2500) })
    }
    await Promise.all([
      document.fonts.load('700 60px "Playfair Display"'), document.fonts.load('italic 500 60px "Playfair Display"'),
      document.fonts.load('800 30px "Plus Jakarta Sans"'), document.fonts.load('500 30px "Plus Jakarta Sans"'),
    ])
  } catch { /* rămân fonturile de rezervă */ }
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/); const lines: string[] = []; let line = ''
  for (const w of words) {
    const t = line ? line + ' ' + w : w
    if (ctx.measureText(t).width > max && line) { lines.push(line); line = w } else line = t
  }
  if (line) lines.push(line)
  return lines
}

function fmtDate(d: string | Date) {
  try { return new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return '' }
}

export async function drawCertificate(d: CertificateData): Promise<HTMLCanvasElement> {
  await loadFonts()
  const t = TIERS[d.tier], col = TIER_COLORS[d.tier]
  const [frame, logo, photo] = await Promise.all([loadImage(t.frame), loadImage('/logo.png').catch(() => null), d.avatar ? loadImage(d.avatar).catch(() => null) : Promise.resolve(null)])
  const SERIF = '"Playfair Display", Georgia, serif', SANS = '"Plus Jakarta Sans", system-ui, sans-serif'

  const c = document.createElement('canvas'); c.width = W; c.height = H
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fdfcfa'; ctx.fillRect(0, 0, W, H)

  // chenar dublu în culoarea nivelului
  ctx.strokeStyle = col.accent
  ctx.lineWidth = 3 * s; ctx.strokeRect(28 * s + 1.5 * s, 28 * s + 1.5 * s, W - 59 * s, H - 59 * s)
  ctx.globalAlpha = 0.55; ctx.lineWidth = 1 * s; ctx.strokeRect(38 * s, 38 * s, W - 76 * s, H - 76 * s); ctx.globalAlpha = 1

  const cx = W / 2
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'

  // antet: logo + AddFame · ACADEMIA
  let y = 120 * s
  ctx.font = `800 ${20 * s}px ${SANS}`
  const brand = 'AddFame', sub = '  ·  ACADEMIA'
  const bw = ctx.measureText(brand).width
  ctx.font = `700 ${13 * s}px ${SANS}`
  const sw = ctx.measureText(sub).width
  const logoW = logo ? 34 * s : 0, gap = logo ? 10 * s : 0
  let x = cx - (logoW + gap + bw + sw) / 2
  if (logo) { ctx.drawImage(logo, x, y - 26 * s, logoW, logoW * (logo.height / logo.width)); x += logoW + gap }
  ctx.textAlign = 'left'
  ctx.fillStyle = '#14123a'; ctx.font = `800 ${20 * s}px ${SANS}`; ctx.fillText(brand, x, y)
  ctx.fillStyle = '#6b6890'; ctx.font = `700 ${13 * s}px ${SANS}`; ctx.fillText(sub, x + bw, y)
  ctx.textAlign = 'center'

  // titlu
  y = 206 * s
  ctx.fillStyle = '#14123a'; ctx.font = `700 ${58 * s}px ${SERIF}`
  ctx.fillText('Certificat de absolvire', cx, y)
  y += 40 * s
  ctx.fillStyle = col.text; ctx.font = `800 ${13 * s}px ${SANS}`
  if ('letterSpacing' in ctx) (ctx as any).letterSpacing = `${3 * s}px`
  ctx.fillText(`NIVEL ${t.label.toUpperCase()}`, cx, y)
  if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0px'

  // „Acest certificat confirmă că” + nume
  y += 62 * s
  ctx.fillStyle = '#4a4770'; ctx.font = `500 ${16 * s}px ${SANS}`
  ctx.fillText('Acest certificat confirmă că', cx, y)
  y += 64 * s
  let nameSize = 52
  ctx.font = `italic 500 ${nameSize * s}px ${SERIF}`
  while (ctx.measureText(d.name).width > 820 * s && nameSize > 30) { nameSize -= 2; ctx.font = `italic 500 ${nameSize * s}px ${SERIF}` }
  ctx.fillStyle = '#14123a'; ctx.fillText(d.name, cx, y)
  const nw = Math.max(ctx.measureText(d.name).width + 80 * s, 360 * s)
  ctx.strokeStyle = col.accent; ctx.lineWidth = 1.5 * s
  ctx.beginPath(); ctx.moveTo(cx - nw / 2, y + 20 * s); ctx.lineTo(cx + nw / 2, y + 20 * s); ctx.stroke()

  // text
  y += 70 * s
  ctx.fillStyle = '#2c2950'; ctx.font = `500 ${16 * s}px ${SANS}`
  const body = `a absolvit Academia AddFame, cu răspunsuri corecte la ${d.correct} din ${d.total} de întrebări din prima încercare, despre crearea de conținut, lucrul cu brandurile și încrederea comunității.`
  wrap(ctx, body, 620 * s).forEach((l, i) => ctx.fillText(l, cx, y + i * 26 * s))

  // jos: dată | ramă | semnătură + cod
  const by = H - 92 * s
  const lx = 108 * s, rx = W - 108 * s
  ctx.textAlign = 'left'
  ctx.fillStyle = '#14123a'; ctx.font = `700 ${15 * s}px ${SANS}`; ctx.fillText(fmtDate(d.date), lx, by - 30 * s)
  ctx.fillStyle = '#c9c5dc'; ctx.fillRect(lx, by - 18 * s, 200 * s, 1 * s)
  ctx.fillStyle = '#6b6890'; ctx.font = `500 ${12 * s}px ${SANS}`; ctx.fillText('Data absolvirii', lx, by)

  ctx.textAlign = 'right'
  ctx.fillStyle = '#2a1673'; ctx.font = `italic 500 ${24 * s}px ${SERIF}`; ctx.fillText('Echipa AddFame', rx, by - 30 * s)
  ctx.fillStyle = '#c9c5dc'; ctx.fillRect(rx - 200 * s, by - 18 * s, 200 * s, 1 * s)
  ctx.fillStyle = '#6b6890'; ctx.font = `500 ${12 * s}px ${SANS}`; ctx.fillText(`Cod ${d.code} · addfame.ro/certificat`, rx, by)

  const F = 150 * s, fx = cx - F / 2, fy = H - 40 * s - F
  if (photo) {
    // poza creatorului în golul ramei
    const pd = F * 0.72, pcx = fx + F * 0.4933, pcy = fy + F * 0.4833
    ctx.save(); ctx.beginPath(); ctx.arc(pcx, pcy, pd / 2, 0, Math.PI * 2); ctx.closePath(); ctx.clip()
    const k = Math.max(pd / photo.width, pd / photo.height)
    ctx.drawImage(photo, pcx - photo.width * k / 2, pcy - photo.height * k / 2, photo.width * k, photo.height * k)
    ctx.restore()
  }
  ctx.drawImage(frame, fx, fy, F, F)

  return c
}

export async function certificatePng(d: CertificateData): Promise<Blob> {
  const c = await drawCertificate(d)
  return await new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('Nu am putut crea imaginea'))), 'image/png'))
}

export async function certificatePdf(d: CertificateData): Promise<Blob> {
  const c = await drawCertificate(d)
  const src = c.toDataURL('image/jpeg', 0.92)
  const { pdf, Document, Page, Image } = await import('@react-pdf/renderer')
  const doc = createElement(Document, { title: `Certificat AddFame ${TIERS[d.tier].label} · ${d.name}`, author: 'AddFame' } as any,
    createElement(Page, { size: 'A4', orientation: 'landscape', style: { padding: 0 } } as any,
      createElement(Image as any, { src, style: { width: '100%', height: '100%' } })))
  return await pdf(doc as any).toBlob()
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
