// Imaginea de Instagram Story (1080×1920) cu rezultatele creatorului dintr-o colaborare,
// desenată în browser (designul „Spotlight”): brandul, vizualizările, engagement-ul și addfame.ro.

export type ReportStoryData = {
  brand: string
  campaign: string
  handle: string | null
  name: string
  avatar: string | null
  views: number
  er: number | null
  reach: number | null
  clicks: number
}

const W = 1080, H = 1920

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

function fit(ctx: CanvasRenderingContext2D, text: string, weight: number, start: number, max: number, family: string) {
  let size = start
  ctx.font = `${weight} ${size}px ${family}`
  while (ctx.measureText(text).width > max && size > 28) { size -= 4; ctx.font = `${weight} ${size}px ${family}` }
  return size
}

const fmt = (n: number) => Math.round(n).toLocaleString('ro-RO')

export async function makeReportStory(d: ReportStoryData, fontFamily = 'system-ui, sans-serif'): Promise<Blob> {
  try { await Promise.all([document.fonts.load(`800 120px ${fontFamily}`), document.fonts.load(`600 40px ${fontFamily}`)]); await document.fonts.ready } catch { /* fonturi de rezervă */ }
  const [logo, photo] = await Promise.all([
    loadImage('/logo.png').catch(() => null),
    d.avatar ? loadImage(d.avatar).catch(() => null) : Promise.resolve(null),
  ])
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const ctx = c.getContext('2d')!
  const F = fontFamily

  // fundal
  ctx.fillStyle = '#110c2b'; ctx.fillRect(0, 0, W, H)
  roundRect(ctx, 60, 60, W - 120, H - 120, 56); ctx.fillStyle = '#2a1673'; ctx.fill()
  ctx.strokeStyle = 'rgba(165,139,255,0.35)'; ctx.lineWidth = 3; ctx.stroke()

  // antet
  let x = 140
  if (logo) { const lh = 64, lw = logo.width * (lh / logo.height); ctx.drawImage(logo, x, 150, lw, lh); x += lw + 18 }
  ctx.fillStyle = '#ffffff'; ctx.font = `800 52px ${F}`; ctx.textBaseline = 'middle'; ctx.fillText('AddFame', x, 184)

  // creator
  const cy = 420, r = 96
  ctx.save(); ctx.beginPath(); ctx.arc(140 + r, cy, r, 0, Math.PI * 2); ctx.closePath(); ctx.clip()
  if (photo) {
    const s = Math.max((2 * r) / photo.width, (2 * r) / photo.height)
    ctx.drawImage(photo, 140 + r - photo.width * s / 2, cy - photo.height * s / 2, photo.width * s, photo.height * s)
  } else {
    ctx.fillStyle = '#5b2fd0'; ctx.fillRect(140, cy - r, 2 * r, 2 * r)
    ctx.fillStyle = '#ffffff'; ctx.font = `800 80px ${F}`; ctx.textAlign = 'center'
    const ini = (d.name || d.handle || '?').replace(/^@/, '').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase()
    ctx.fillText(ini || '?', 140 + r, cy + 4); ctx.textAlign = 'left'
  }
  ctx.restore()
  ctx.beginPath(); ctx.arc(140 + r, cy, r + 5, 0, Math.PI * 2); ctx.strokeStyle = '#a58bff'; ctx.lineWidth = 8; ctx.stroke()
  ctx.fillStyle = '#ffffff'; fit(ctx, d.name, 800, 56, W - 140 - 2 * r - 200, F); ctx.fillText(d.name, 140 + 2 * r + 40, cy - 30)
  ctx.fillStyle = '#d9d0ff'; ctx.font = `600 40px ${F}`; ctx.fillText(d.handle || '', 140 + 2 * r + 40, cy + 36)

  // titlu
  ctx.textBaseline = 'alphabetic'
  let y = 760
  ctx.fillStyle = '#d9d0ff'; ctx.font = `800 40px ${F}`
  if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '4px'
  ctx.fillText('REZULTATELE MELE CU', 140, y)
  if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '0px'
  y += 110
  ctx.fillStyle = '#ffffff'; fit(ctx, d.brand, 800, 96, W - 280, F); ctx.fillText(d.brand, 140, y)

  // cifra mare
  y += 300
  ctx.fillStyle = '#ffc857'; fit(ctx, fmt(d.views), 800, 260, W - 280, F); ctx.fillText(fmt(d.views), 140, y)
  y += 90
  ctx.fillStyle = '#ffffff'; ctx.font = `700 52px ${F}`; ctx.fillText('vizualizări', 140, y)

  // cifre mici
  const stats: [string, string][] = []
  if (d.er != null) stats.push([`${d.er.toLocaleString('ro-RO', { maximumFractionDigits: 1 })}%`, 'engagement'])
  if (d.reach) stats.push([fmt(d.reach), 'conturi atinse'])
  if (d.clicks) stats.push([fmt(d.clicks), 'clicuri pe link'])
  y += 110
  const colW = (W - 280) / Math.max(1, Math.min(3, stats.length))
  stats.slice(0, 3).forEach(([v, l], i) => {
    const sx = 140 + i * colW
    ctx.fillStyle = '#ffffff'; ctx.font = `800 64px ${F}`; ctx.fillText(v, sx, y + 60)
    ctx.fillStyle = '#d9d0ff'; ctx.font = `600 34px ${F}`; ctx.fillText(l, sx, y + 112)
  })

  // jos
  ctx.font = `800 40px ${F}`
  const cta = 'addfame.ro'
  const cw = ctx.measureText(cta).width + 96
  roundRect(ctx, (W - cw) / 2, H - 260, cw, 100, 50); ctx.fillStyle = '#ffffff'; ctx.fill()
  ctx.fillStyle = '#2a1673'; ctx.textAlign = 'center'; ctx.fillText(cta, W / 2, H - 196)

  return await new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('Nu am putut crea imaginea'))), 'image/png'))
}
