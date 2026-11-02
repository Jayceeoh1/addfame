// Cardul de Instagram Story (1080×1920) pentru certificatul din Academie, desenat în browser:
// poza creatorului în rama nivelului, „Sunt creator certificat AddFame” și addfame.ro.

import { TIERS, type AcademyTier } from '@/lib/academy'

const W = 1080, H = 1920

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
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

export async function makeAcademyStory(opts: { tier: AcademyTier; handle: string; name?: string | null; avatar?: string | null; lessons: number; fontDisplay?: string; fontBody?: string }): Promise<Blob> {
  const disp = (opts.fontDisplay || '').trim() || 'system-ui, sans-serif'
  const body = (opts.fontBody || '').trim() || 'system-ui, sans-serif'
  try { await Promise.all([document.fonts.load(`800 100px ${disp}`), document.fonts.load(`700 40px ${body}`)]); await document.fonts.ready } catch { /* fonturile de rezervă merg și ele */ }
  const t = TIERS[opts.tier]
  const [frame, logo, photo] = await Promise.all([
    loadImage(t.frame),
    loadImage('/logo.png').catch(() => null),
    opts.avatar ? loadImage(opts.avatar).catch(() => null) : Promise.resolve(null),
  ])

  const c = document.createElement('canvas'); c.width = W; c.height = H
  const ctx = c.getContext('2d')!

  // fundal violet închis cu puncte fine
  ctx.fillStyle = '#2a1673'; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(255,255,255,0.10)'
  for (let y = 24; y < H; y += 54) for (let x = 24; x < W; x += 54) { ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill() }

  ctx.textAlign = 'center'
  // logo sus
  if (logo) {
    const lh = 84, lw = logo.width * (lh / logo.height)
    ctx.drawImage(logo, (W - lw) / 2, 120, lw, lh)
  } else {
    ctx.fillStyle = '#ffffff'; ctx.font = `800 64px ${disp}`; ctx.fillText('AddFame', W / 2, 180)
  }

  // poza în ramă
  const F = 640, fx = (W - F) / 2, fy = 300
  const d = F * 0.72, cx = fx + F * 0.4933, cy = fy + F * 0.4833
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, d / 2, 0, Math.PI * 2); ctx.closePath(); ctx.clip()
  if (photo) {
    const s = Math.max(d / photo.width, d / photo.height)
    ctx.drawImage(photo, cx - photo.width * s / 2, cy - photo.height * s / 2, photo.width * s, photo.height * s)
  } else {
    ctx.fillStyle = '#5b2fd0'; ctx.fillRect(cx - d / 2, cy - d / 2, d, d)
    ctx.fillStyle = '#ffffff'; ctx.font = `800 150px ${disp}`; ctx.textBaseline = 'middle'
    const ini = (opts.name || opts.handle || '?').replace(/^@/, '').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase()
    ctx.fillText(ini || '?', cx, cy); ctx.textBaseline = 'alphabetic'
  }
  ctx.restore()
  ctx.drawImage(frame, fx, fy, F, F)

  // @handle
  let y = fy + F + 70
  ctx.fillStyle = '#ddd5ff'; ctx.font = `700 46px ${body}`
  ctx.fillText(opts.handle || '', W / 2, y)

  // titlu
  y += 110
  ctx.fillStyle = '#ffd166'; ctx.font = `800 40px ${body}`
  ctx.fillText('SUNT CREATOR CERTIFICAT', W / 2, y)
  y += 120
  ctx.fillStyle = '#ffffff'; ctx.font = `800 120px ${disp}`
  ctx.fillText('AddFame', W / 2, y)
  y += 110
  ctx.font = `800 80px ${disp}`; ctx.fillStyle = '#ffffff'
  ctx.fillText(t.label, W / 2, y)

  // text
  y += 90
  ctx.font = `500 40px ${body}`; ctx.fillStyle = '#ddd5ff'
  wrap(ctx, `Am terminat Academia AddFame: ${opts.lessons} lecții despre conținut, branduri și încredere.`, 860).slice(0, 3)
    .forEach((l, i) => ctx.fillText(l, W / 2, y + i * 54))

  // îndemn jos
  ctx.font = `800 42px ${body}`
  const cta = 'addfame.ro · @addfame.ro'
  const cw = ctx.measureText(cta).width + 88
  roundRect(ctx, (W - cw) / 2, H - 220, cw, 104, 52)
  ctx.fillStyle = '#ffffff'; ctx.fill()
  ctx.fillStyle = '#2a1673'; ctx.fillText(cta, W / 2, H - 153)

  return await new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('Nu am putut crea imaginea'))), 'image/png'))
}

/** Pe telefon deschide meniul de distribuire (Instagram → Story); altfel descarcă imaginea. */
export async function shareStory(blob: Blob, filename: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: 'image/png' })
  const nav: any = typeof navigator !== 'undefined' ? navigator : null
  if (nav?.canShare && nav.canShare({ files: [file] })) {
    try { await nav.share({ files: [file], title: 'Sunt creator certificat AddFame' }); return 'shared' }
    catch (e: any) { if (e?.name === 'AbortError') return 'cancelled' }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
  return 'downloaded'
}
