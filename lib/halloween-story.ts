// Cardul de Instagram Story (1080×1920) pentru rezultatul quiz-ului de Halloween, desenat în browser.
// Are logo-ul și adresa addfame.ro, ca toată lumea să știe de unde e quiz-ul.

import type { QuizCharacter } from '@/lib/halloween-quiz'

const W = 1080, H = 1920

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

/** Împarte textul pe rânduri care încap în `max` px. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/); const lines: string[] = []; let line = ''
  for (const w of words) {
    const t = line ? line + ' ' + w : w
    if (ctx.measureText(t).width > max && line) { lines.push(line); line = w } else line = t
  }
  if (line) lines.push(line)
  return lines
}

export async function makeStoryImage(opts: { character: QuizCharacter; handle: string; avatar?: string | null; fontDisplay?: string; fontBody?: string }): Promise<Blob> {
  const disp = (opts.fontDisplay || '').trim() || 'system-ui, sans-serif'
  const body = (opts.fontBody || '').trim() || 'system-ui, sans-serif'
  try { await Promise.all([document.fonts.load(`800 100px ${disp}`), document.fonts.load(`700 40px ${body}`)]); await document.fonts.ready } catch { /* fonturile de rezervă merg și ele */ }
  const [art, logo, photo] = await Promise.all([loadImage(opts.character.img), loadImage('/logo.png').catch(() => null), opts.avatar ? loadImage(opts.avatar).catch(() => null) : Promise.resolve(null)])
  const dy = photo ? 175 : 0 // loc pentru poza creatorului

  const c = document.createElement('canvas'); c.width = W; c.height = H
  const ctx = c.getContext('2d')!

  // fundal: noapte violet + lună
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#1b0f3d'); bg.addColorStop(0.55, '#2d1260'); bg.addColorStop(1, '#14123a')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W / 2, 980, 40, W / 2, 980, 620)
  glow.addColorStop(0, 'rgba(120,60,200,.55)'); glow.addColorStop(1, 'rgba(120,60,200,0)')
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H)
  const moon = ctx.createRadialGradient(980, 100, 10, 980, 100, 300)
  moon.addColorStop(0, 'rgba(255,233,194,.6)'); moon.addColorStop(0.5, 'rgba(255,179,71,.35)'); moon.addColorStop(1, 'rgba(255,179,71,0)')
  ctx.fillStyle = moon; ctx.fillRect(0, 0, W, H)

  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'

  // logo AddFame + addfame.ro
  ctx.font = `800 64px ${disp}`
  const wordA = 'Add', wordF = 'Fame'
  const wA = ctx.measureText(wordA).width, wF = ctx.measureText(wordF).width
  const logoS = logo ? 96 : 0, gap = logo ? 20 : 0
  const totalW = logoS + gap + wA + wF
  let x = (W - totalW) / 2
  if (logo) ctx.drawImage(logo, x, 112, logoS, logoS)
  x += logoS + gap
  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'; ctx.fillText(wordA, x, 183)
  ctx.fillStyle = '#b79bff'; ctx.fillText(wordF, x + wA, 183)
  ctx.textAlign = 'center'
  ctx.font = `700 32px ${body}`; ctx.fillStyle = '#b9b5dc'; ctx.fillText('addfame.ro', W / 2, 250)

  // eticheta quiz-ului
  ctx.font = `800 36px ${body}`
  const pill = 'Ce influencer de Halloween ești?'
  const pw = ctx.measureText(pill).width + 64
  roundRect(ctx, (W - pw) / 2, 300, pw, 76, 38)
  ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fill()
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,208,138,.6)'; ctx.stroke()
  ctx.fillStyle = '#ffd08a'; ctx.fillText(pill, W / 2, 351)

  // poza de profil a creatorului (cerc cu margine portocalie)
  if (photo) {
    const r = 92, cx = W / 2, cy = 505
    ctx.save(); ctx.shadowColor = 'rgba(255,138,31,.55)'; ctx.shadowBlur = 40
    ctx.beginPath(); ctx.arc(cx, cy, r + 10, 0, Math.PI * 2); ctx.fillStyle = '#ff8a1f'; ctx.fill(); ctx.restore()
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip()
    const sz = Math.min(photo.width, photo.height)
    ctx.drawImage(photo, (photo.width - sz) / 2, (photo.height - sz) / 2, sz, sz, cx - r, cy - r, r * 2, r * 2)
    ctx.restore()
  }

  // „@nume este…” + personajul
  ctx.font = `700 42px ${body}`; ctx.fillStyle = '#d9cff7'
  const who = (opts.handle || 'Eu').slice(0, 40)
  ctx.fillText(`${who} este…`, W / 2, 480 + dy)
  ctx.font = `800 104px ${disp}`; ctx.fillStyle = '#ffffff'
  const nameLines = wrap(ctx, opts.character.name, 960)
  nameLines.forEach((l, i) => ctx.fillText(l, W / 2, 590 + dy + i * 108))
  const afterName = 590 + dy + (nameLines.length - 1) * 108

  // ilustrația (mai mică când avem poza creatorului)
  const size = photo ? (nameLines.length > 1 ? 450 : 530) : 660, top = afterName + 40
  const halo = ctx.createRadialGradient(W / 2, top + size / 2, 20, W / 2, top + size / 2, size / 2)
  halo.addColorStop(0, 'rgba(255,170,60,.45)'); halo.addColorStop(1, 'rgba(255,170,60,0)')
  ctx.fillStyle = halo; ctx.fillRect(0, top, W, size)
  ctx.drawImage(art, (W - size) / 2, top, size, size)

  // descrierea
  ctx.font = `500 42px ${body}`; ctx.fillStyle = '#efe8ff'
  const desc = wrap(ctx, opts.character.text, 880).slice(0, 4)
  desc.forEach((l, i) => ctx.fillText(l, W / 2, top + size + 70 + i * 56))

  // îndemn final
  ctx.font = `800 42px ${body}`
  const cta = 'Fă și tu quiz-ul pe addfame.ro'
  const cw = ctx.measureText(cta).width + 88
  roundRect(ctx, (W - cw) / 2, H - 230, cw, 104, 28)
  ctx.fillStyle = '#ff8a1f'; ctx.fill()
  ctx.fillStyle = '#2a1004'; ctx.fillText(cta, W / 2, H - 163)

  return await new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('Nu am putut crea imaginea'))), 'image/png'))
}

/** Pe telefon deschide meniul de distribuire (Instagram → Story); altfel descarcă imaginea. */
export async function shareOrDownload(blob: Blob, filename: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: 'image/png' })
  const nav: any = typeof navigator !== 'undefined' ? navigator : null
  if (nav?.canShare && nav.canShare({ files: [file] })) {
    try { await nav.share({ files: [file], title: 'Ce influencer de Halloween ești? · AddFame' }); return 'shared' }
    catch (e: any) { if (e?.name === 'AbortError') return 'cancelled' }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
  return 'downloaded'
}
