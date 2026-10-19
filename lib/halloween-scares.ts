// Jump scare-uri pentru quiz-ul de Halloween (doar în „Modul Fricos”, ales de creator).
// Fără imagini în plus: sunetele sunt generate în browser cu WebAudio.

export type ScareKind = 'ghost' | 'zombie' | 'algo'

/** Alege 3 întrebări (nu prima, nu ultima, la distanță una de alta) și câte o sperietură diferită pentru fiecare. */
export function planScares(total: number, rnd: () => number = Math.random): Record<number, ScareKind> {
  const kinds: ScareKind[] = ['ghost', 'zombie', 'algo']
  for (let k = kinds.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [kinds[k], kinds[j]] = [kinds[j], kinds[k]] }
  const pool: number[] = []
  for (let i = 1; i <= total - 2; i++) pool.push(i)
  let picked: number[] = []
  for (let tries = 0; tries < 60; tries++) {
    const p = pool.slice()
    for (let k = p.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [p[k], p[j]] = [p[j], p[k]] }
    const c = p.slice(0, 3).sort((a, b) => a - b)
    if (c.length === 3 && c[1] - c[0] >= 2 && c[2] - c[1] >= 2) { picked = c; break }
  }
  if (picked.length < 3) picked = [1, 3, 5].filter(n => n <= total - 2)
  const out: Record<number, ScareKind> = {}
  picked.forEach((q, n) => { out[q] = kinds[n % kinds.length] })
  return out
}

export function createAudio(): AudioContext | null {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AC) return null
    const ctx: AudioContext = new AC()
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    return ctx
  } catch { return null }
}

function noise(ctx: AudioContext, dur: number) {
  const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource(); src.buffer = buf
  return src
}

function env(ctx: AudioContext, node: AudioNode, t0: number, peak: number, attack: number, dur: number) {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  node.connect(g); g.connect(ctx.destination)
  return g
}

function tone(ctx: AudioContext, type: OscillatorType, f0: number, f1: number, t0: number, dur: number, peak: number) {
  const o = ctx.createOscillator(); o.type = type
  o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur)
  env(ctx, o, t0, peak, 0.02, dur)
  o.start(t0); o.stop(t0 + dur + 0.05)
}

function thud(ctx: AudioContext, t0: number, peak = 0.5) {
  tone(ctx, 'sine', 140, 40, t0, 0.35, peak)
  const n = noise(ctx, 0.25); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400
  n.connect(lp); env(ctx, lp, t0, peak * 0.6, 0.01, 0.25); n.start(t0)
}

/** Sunetele sunt scurte și nu trec de volumul moderat (max ~0.4). */
export function sfx(ctx: AudioContext | null, kind: ScareKind | 'cackle' | 'boom') {
  if (!ctx) return
  try {
    const t = ctx.currentTime + 0.01
    if (kind === 'ghost') {
      tone(ctx, 'sawtooth', 1100, 320, t, 0.7, 0.28)
      const n = noise(ctx, 0.5); const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500
      n.connect(hp); env(ctx, hp, t, 0.22, 0.02, 0.5); n.start(t)
    } else if (kind === 'zombie') {
      thud(ctx, t, 0.45)
      tone(ctx, 'sawtooth', 90, 55, t + 0.08, 0.9, 0.22)
    } else if (kind === 'algo') {
      tone(ctx, 'sine', 880, 880, t, 0.18, 0.2)
      tone(ctx, 'sine', 880, 880, t + 0.45, 0.18, 0.2)
      tone(ctx, 'sawtooth', 70, 45, t + 1.4, 1.1, 0.26)
    } else if (kind === 'cackle') {
      const notes = [520, 760, 540, 800, 560, 840, 520]
      notes.forEach((f, i) => tone(ctx, 'square', f, f * 0.8, t + i * 0.11, 0.1, 0.1))
    } else if (kind === 'boom') {
      thud(ctx, t, 0.5)
    }
  } catch { /* fără sunet nu se întâmplă nimic rău */ }
}

export function buzz(pattern: number | number[]) {
  try { (navigator as any).vibrate?.(pattern) } catch { /* nu toate telefoanele au vibrație */ }
}
