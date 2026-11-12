// Pagina publică de demo (Google Ads) — fără cont până la ultimul pas. Vezi app/actions/demo-proposal.ts
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { submitDemoProposal } from '@/app/actions/demo-proposal'

const CSS = `
.dm{min-height:100dvh;box-sizing:border-box;background:#f6f6fc;color:#14123a;font-family:var(--font-body,'Figtree'),system-ui,sans-serif;font-size:15px;line-height:1.5;position:relative;padding-bottom:96px}
.dm *{box-sizing:border-box}
.dm h1,.dm h2,.dm h3,.dsp{font-family:var(--font-display,'Bricolage Grotesque'),system-ui,sans-serif}
.top{display:flex;align-items:center;justify-content:space-between;height:62px;padding:0 40px;background:#fff;border-bottom:1px solid #e5e3f3}
.logo{display:flex;align-items:center;gap:10px;font-family:var(--font-display,'Bricolage Grotesque');font-weight:800;font-size:21px;letter-spacing:-.02em}
.logo img{width:34px;height:34px;border-radius:9px}
.chip{display:inline-flex;align-items:center;height:26px;padding:0 11px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:46px;padding:0 20px;border-radius:12px;border:1.5px solid #d8d5ec;background:#fff;color:#14123a;font:inherit;font-weight:700;font-size:14px}
.btn.p{background:#5a35e6;border-color:#5a35e6;color:#fff;box-shadow:0 10px 22px -12px rgba(90,53,230,.7)}
.body{padding:20px 40px;display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:22px;align-items:start}
.main{display:flex;flex-direction:column;gap:14px;min-width:0}
.card{background:#fff;border:1px solid #e5e3f3;border-radius:20px}
.stepper{display:flex;align-items:center;padding:12px 18px}
.st{display:flex;align-items:center;flex:1;gap:8px;font-size:13px;font-weight:700;color:#6a6690}
.st:last-child{flex:none}
.st.cur,.st.ok{color:#14123a}
.dot{width:30px;height:30px;flex:none;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;background:#f0eff7;color:#6a6690}
.dot.cur{background:#5a35e6;color:#fff;box-shadow:0 0 0 4px rgba(90,53,230,.16)}
.dot.ok{background:#14123a;color:#fff}
.line{flex:1;height:2px;margin:0 10px;background:#e5e3f3;border-radius:2px}
.line.ok{background:#14123a}
.bar{height:6px;background:#eeecf7;overflow:hidden}.bar i{display:block;height:100%;background:linear-gradient(90deg,#2f6fe0,#5a35e6);border-radius:99px}
.sec{padding:20px 22px;display:flex;flex-direction:column;gap:16px}
.sech{display:flex;gap:12px;align-items:flex-start}
.sech h2{margin:0;font-weight:700;font-size:19px;letter-spacing:-.01em;line-height:1.2}
.sech p{margin:2px 0 0;font-size:13px;color:#6a6690}
.badge{width:32px;height:32px;flex:none;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:#fff;background:linear-gradient(135deg,#2f6fe0,#5a35e6);font-family:var(--font-display,'Bricolage Grotesque')}
.f{display:flex;flex-direction:column;gap:6px;min-width:0}
.lbl{font-size:13px;font-weight:700}.lbl small{font-weight:500;color:#8783a8;font-size:12px}
.inp{height:46px;border:1.5px solid #e5e3f3;border-radius:12px;padding:0 14px;display:flex;align-items:center;font-size:14px;background:#fff;color:#8783a8}
.inp.v{color:#14123a}
.inp.ta{height:78px;align-items:flex-start;padding-top:12px}
.inp.focus{border-color:#5a35e6;box-shadow:0 0 0 3px rgba(90,53,230,.1)}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.drop{border:2px dashed #cfcbe6;background:#faf9ff;border-radius:16px;min-height:96px;display:flex;align-items:center;justify-content:center;gap:12px;color:#6a6690;font-size:13px}
.ico{width:40px;height:40px;border-radius:12px;background:#efeaff;color:#4423c4;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800}
.opt{display:flex;align-items:center;gap:12px;min-height:62px;padding:12px 16px;border-radius:16px;border:1.5px solid #e5e3f3;background:#fff;position:relative}
.opt.on{border-color:#5a35e6;background:#f5f2ff;box-shadow:0 0 0 3px rgba(90,53,230,.08)}
.opt b{font-size:14px;font-weight:700;display:block;line-height:1.25}.opt small{font-size:12px;color:#6a6690;display:block}
.box{width:22px;height:22px;flex:none;border-radius:7px;border:2px solid #cfcbe6;background:#fff;display:flex;align-items:center;justify-content:center;color:#fff}
.opt.on .box{background:#5a35e6;border-color:#5a35e6}
.plat{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.plat div{position:relative;min-height:74px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border-radius:16px;border:1.5px solid #e5e3f3;background:#fff;font-size:12px;font-weight:700;color:#6a6690}
.plat div.on{border-color:#5a35e6;background:#f5f2ff;color:#4423c4}
.plat i{width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-style:normal;color:#fff;font-size:13px;font-weight:800}
.plat em{position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:#16a34a;border:2px solid #fff;color:#fff;display:flex;align-items:center;justify-content:center}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.cb{height:38px;padding:0 15px;border-radius:999px;border:1.5px solid #e5e3f3;background:#fff;color:#4a4770;font-size:13px;font-weight:700;display:flex;align-items:center}
.cb.on{background:#14123a;border-color:#14123a;color:#fff}
.cnt{display:flex;align-items:center;justify-content:center;gap:22px}
.cnt b{width:42px;height:42px;border-radius:50%;border:1.5px solid #5a35e6;background:#fff;color:#5a35e6;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:600}
.cnt span{font-family:var(--font-display,'Bricolage Grotesque');font-size:38px;font-weight:800;color:#5a35e6;min-width:56px;text-align:center}
.note{border-radius:14px;padding:12px 14px;display:flex;gap:10px;font-size:13px;line-height:1.45}
.note.green{background:#dcf5ec;color:#14532d}.note.amber{background:#fff1c2;color:#854d0e}.note.blue{background:#e6f0ff;color:#1d4fb8}
.foot{position:fixed;left:16px;right:16px;max-width:1020px;margin:0 auto;bottom:12px;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:rgba(255,255,255,.96);border:1px solid #e5e3f3;border-radius:18px;box-shadow:0 -10px 30px -18px rgba(20,18,58,.35)}
.side{display:flex;flex-direction:column;gap:12px}
.lab{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#8783a8}
.rf{display:flex;justify-content:space-between;gap:14px;padding:10px 0;border-bottom:1px solid #eeecf7;font-size:14px}
.rf:last-child{border-bottom:0}.rf span:first-child{color:#6a6690}.rf span:last-child{font-weight:600;text-align:right}
.prev{height:130px;border-radius:14px;background:linear-gradient(135deg,#efeaff,#e6f0ff);display:flex;align-items:center;justify-content:center;font-size:13px;color:#4423c4;font-weight:700}
.modal-bg{position:absolute;inset:0;background:rgba(20,18,58,.45);display:flex;align-items:center;justify-content:center}
.modal{width:460px;background:#fff;border-radius:22px;padding:26px;box-shadow:0 30px 70px -20px rgba(20,18,58,.6);display:flex;flex-direction:column;gap:14px}

.dm .body{max-width:1100px;margin:0 auto}
.dm .opt,.dm .plat div,.dm .cb,.dm .cnt b{cursor:pointer;font-family:inherit}
.dm input,.dm textarea{all:unset;box-sizing:border-box;width:100%;color:#14123a}
.dm .inp input::placeholder,.dm .inp textarea::placeholder{color:#8783a8}
.dm .inp.ta{height:auto;min-height:78px}.dm .inp.ta textarea{min-height:54px;resize:vertical;display:block}
.dm .err{color:#b42318;font-size:13px;font-weight:600}
.dm .modal-bg{position:fixed;z-index:50;padding:16px;overflow:auto}
.dm .modal{max-width:100%}
.dm button.btn{cursor:pointer}.dm button.btn:disabled{opacity:.55;cursor:not-allowed}
@media (max-width:860px){.dm .body{grid-template-columns:minmax(0,1fr);padding:16px}.dm .side{display:none}.dm .top{padding:0 16px}.dm .g2{grid-template-columns:1fr}.dm .plat{grid-template-columns:repeat(2,1fr)}.dm .st span.nm{display:none}.dm .line{margin:0 4px}}
`

const STEPS = ['Produsul', 'Creatori', 'Brief', 'Review']
const PLATFORMS = [
  { id: 'INSTAGRAM', n: 'Instagram', l: 'IG', c: 'linear-gradient(135deg,#f58529,#dd2a7b,#8134af)' },
  { id: 'TIKTOK', n: 'TikTok', l: 'TT', c: '#14123a' },
  { id: 'YOUTUBE', n: 'YouTube', l: 'YT', c: '#e62117' },
  { id: 'FACEBOOK', n: 'Facebook', l: 'f', c: '#1877f2' },
]
const TASKS = [
  { id: 'ig_reel', t: 'Reel Instagram', s: 'Video scurt, 15–30 sec', e: '🎬' },
  { id: 'ig_stories', t: 'Stories Instagram', s: '2 stories', e: '📱' },
  { id: 'tt_video', t: 'Video TikTok', s: 'Video scurt', e: '🎵' },
  { id: 'ig_post', t: 'Postare foto', s: 'Pe feed', e: '🖼️' },
]
const NICHES = ['Beauty', 'Lifestyle', 'Mâncare', 'Fitness', 'Modă', 'Travel', 'Familie', 'Tech']
const KEY = 'addfame_demo_campanie_v1'

const Chk = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>

interface S { product: string; value: string; link: string; description: string; creators: number; platforms: string[]; tasks: string[]; niches: string[]; brief: string }
const INIT: S = { product: '', value: '', link: '', description: '', creators: 5, platforms: ['INSTAGRAM', 'TIKTOK'], tasks: ['ig_reel', 'ig_stories'], niches: [], brief: '' }

export default function DemoCampaniePage() {
  const [step, setStep] = useState(0)
  const [s, setS] = useState<S>(INIT)
  const [modal, setModal] = useState(false)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [acc, setAcc] = useState({ firm: '', email: '', phone: '', password: '', website: '' })

  useEffect(() => {
    try { const r = localStorage.getItem(KEY); if (r) { const j = JSON.parse(r); setS({ ...INIT, ...j.s }); setStep(Math.min(3, j.step || 0)) } } catch {}
  }, [])
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify({ s, step })) } catch {} }, [s, step])

  const set = (p: Partial<S>) => setS(v => ({ ...v, ...p }))
  const toggle = (k: 'platforms' | 'tasks' | 'niches', id: string) => set({ [k]: s[k].includes(id) ? s[k].filter(x => x !== id) : [...s[k], id] } as any)
  const canNext = step === 0 ? s.product.trim().length >= 2 && Number(s.value) > 0 : step === 1 ? s.tasks.length > 0 && s.platforms.length > 0 : true

  async function submit() {
    setErr('')
    const pw = acc.password
    if (acc.firm.trim().length < 2) return setErr('Scrie numele firmei.')
    if (!/^\S+@\S+\.\S+$/.test(acc.email)) return setErr('Adresa de email nu este validă.')
    if (acc.phone.replace(/\D/g, '').length < 9) return setErr('Numărul de telefon pare invalid.')
    if (pw.length < 8 || !/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw) || !/[@$!%*?&]/.test(pw))
      return setErr('Parola: minim 8 caractere, literă mare, literă mică, cifră și unul dintre @ $ ! % * ? &')
    setBusy(true)
    const r = await submitDemoProposal({ ...acc, product: s.product, value: Number(s.value), link: s.link, description: s.description, creators: s.creators, platforms: s.platforms, tasks: s.tasks, niches: s.niches, brief: s.brief })
    setBusy(false)
    if ('error' in r) return setErr(r.error)
    try { localStorage.removeItem(KEY) } catch {}
    setModal(false); setDone(true)
  }

  const taskNames = TASKS.filter(t => s.tasks.includes(t.id)).map(t => t.t).join(' + ') || '—'
  const rows: [string, string][] = [['Tip', 'Barter'], ['Valoare', s.value ? `${s.value} RON` : '—'], ['Creatori', String(s.creators)], ['Conținut', taskNames]]

  const Top = (
    <div className="top"><div className="logo"><img src="/logo.png" alt="" />AddFame</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}><span className="chip" style={{ background: '#fff1c2', color: '#854d0e' }}>Demo gratuit · fără card</span><Link href="/login" style={{ color: '#5a35e6', fontWeight: 700, fontSize: 14 }}>Ai cont? Intră</Link></div></div>
  )

  if (done) return (
    <div className="dm"><style>{CSS}</style>{Top}
      <div style={{ maxWidth: 620, margin: '36px auto 0', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card" style={{ padding: 30, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#dcf5ec', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></div>
          <h1 className="dsp" style={{ margin: 0, fontSize: 30, fontWeight: 800, letterSpacing: '-.03em' }}>Propunerea ta a fost trimisă!</h1>
          <p style={{ margin: 0, color: '#4a4770', fontSize: 15, maxWidth: 480 }}>Un membru al echipei Addfame te va contacta în maximum 12 ore de la trimitere pentru a pune la punct detaliile și a pregăti lansarea campaniei.</p>
          <p style={{ margin: 0, color: '#6a6690', fontSize: 13 }}>Ți-am trimis un email ca să-ți confirmi contul.</p>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}><div className="lab">Campania ta</div><span className="chip" style={{ background: '#fff1c2', color: '#854d0e' }}>În verificare</span></div>
          <div className="rf"><span>Produs</span><span>{s.product}</span></div>{rows.slice(2).map(([a, b]) => <div className="rf" key={a}><span>{a}</span><span>{b}</span></div>)}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}><Link href="/login" className="btn p">Mergi în contul tău</Link></div>
      </div></div>
  )

  return (
    <div className="dm"><style>{CSS}</style>{Top}
      <div className="body"><div className="main">
        {step === 0 && <div><div className="lab" style={{ color: '#5a35e6' }}>Campanie barter · demo</div><h1 style={{ margin: '2px 0 2px', fontSize: 30, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.1 }}>Creează-ți campania în 3 minute</h1><p style={{ margin: 0, color: '#6a6690', fontSize: 14 }}>Oferi produsul, creatorii îl prezintă pe Instagram și TikTok. Fără cont până la final.</p></div>}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="stepper">{STEPS.map((n, i) => { const c = i < step ? 'ok' : i === step ? 'cur' : ''; return <div key={n} className={`st ${c}`}><div className={`dot ${c}`}>{i < step ? <Chk /> : i + 1}</div><span className="nm">{n}</span>{i < STEPS.length - 1 && <div className={`line ${i < step ? 'ok' : ''}`} />}</div> })}</div>
          <div className="bar"><i style={{ width: `${(step + 1) / 4 * 100}%` }} /></div>
        </div>

        {step === 0 && <div className="card sec"><div className="sech"><div className="badge">1</div><div><h2>Ce oferi creatorilor?</h2><p>Spune-ne despre produs, restul îl completăm împreună.</p></div></div>
          <div className="g2"><div className="f"><div className="lbl">Numele produsului</div><div className="inp"><input value={s.product} onChange={e => set({ product: e.target.value })} placeholder="Ex: Ser hidratant cu acid hialuronic" maxLength={120} /></div></div>
            <div className="f"><div className="lbl">Valoarea produsului <small>(RON)</small></div><div className="inp"><input inputMode="numeric" value={s.value} onChange={e => set({ value: e.target.value.replace(/[^\d]/g, '') })} placeholder="Ex: 120" /></div></div></div>
          <div className="f"><div className="lbl">Link produs <small>(opțional)</small></div><div className="inp"><input value={s.link} onChange={e => set({ link: e.target.value })} placeholder="https://" maxLength={300} /></div></div>
          <div className="f"><div className="lbl">Descriere scurtă</div><div className="inp ta"><textarea value={s.description} onChange={e => set({ description: e.target.value })} placeholder="Ce face produsul și pentru cine e" maxLength={600} /></div></div></div>}

        {step === 1 && <div className="card sec"><div className="sech"><div className="badge">2</div><div><h2>Câți creatori și ce postează?</h2><p>Alege ce se potrivește brandului tău.</p></div></div>
          <div className="f"><div className="lbl">Număr de creatori</div><div className="cnt"><b onClick={() => set({ creators: Math.max(1, s.creators - 1) })}>−</b><span>{s.creators}</span><b onClick={() => set({ creators: Math.min(50, s.creators + 1) })}>+</b></div></div>
          <div className="f"><div className="lbl">Platforme</div><div className="plat">{PLATFORMS.map(p => { const on = s.platforms.includes(p.id); return <div key={p.id} className={on ? 'on' : ''} onClick={() => toggle('platforms', p.id)}>{on && <em><Chk /></em>}<i style={{ background: p.c }}>{p.l}</i>{p.n}</div> })}</div></div>
          <div className="f"><div className="lbl">Ce trebuie să posteze fiecare creator</div><div className="g2">{TASKS.map(t => { const on = s.tasks.includes(t.id); return <div key={t.id} className={`opt ${on ? 'on' : ''}`} onClick={() => toggle('tasks', t.id)}><span className="box">{on && <Chk />}</span><span style={{ fontSize: 20 }}>{t.e}</span><div><b>{t.t}</b><small>{t.s}</small></div></div> })}</div></div>
          <div className="f"><div className="lbl">Nișe preferate <small>(opțional)</small></div><div className="chips">{NICHES.map(n => <span key={n} className={`cb ${s.niches.includes(n) ? 'on' : ''}`} onClick={() => toggle('niches', n)}>{n}</span>)}</div></div></div>}

        {step === 2 && <div className="card sec"><div className="sech"><div className="badge">3</div><div><h2>Brief pentru creatori</h2><p>Ce vrei să spună sau să arate în conținut? Poți sări peste, îl completăm cu echipa.</p></div></div>
          <div className="f"><div className="lbl">Brief <small>(opțional)</small></div><div className="inp ta" style={{ minHeight: 160 }}><textarea style={{ minHeight: 130 }} value={s.brief} onChange={e => set({ brief: e.target.value })} placeholder="Ex: Arată produsul în rutina de dimineață, menționează că e fără parfum, folosește hashtagul #brandultau" maxLength={1500} /></div></div></div>}

        {step === 3 && <div className="card sec"><div className="sech"><div className="badge">4</div><div><h2>Rezumatul campaniei</h2><p>Verifică totul înainte să pornești.</p></div></div>
          <div><div className="rf"><span>Produs</span><span>{s.product}</span></div>{rows.slice(1).map(([a, b]) => <div className="rf" key={a}><span>{a}</span><span>{b}</span></div>)}<div className="rf"><span>Platforme</span><span>{s.platforms.map(p => PLATFORMS.find(x => x.id === p)?.n).join(', ')}</span></div><div className="rf"><span>Brief</span><span>{s.brief.trim() ? 'Completat' : 'Îl completăm cu echipa'}</span></div></div>
          <div className="note green"><span>✅</span><span>Nu plătești nimic acum. Echipa AddFame verifică propunerea înainte să apară creatorilor.</span></div></div>}
      </div>
        <div className="side"><div className="card" style={{ padding: 18 }}><div className="lab" style={{ marginBottom: 10 }}>Previzualizare campanie</div><div className="prev">Poza produsului</div><div className="dsp" style={{ fontWeight: 800, fontSize: 18, margin: '12px 0 4px' }}>{s.product || '[Produsul tău]'}</div><div style={{ color: '#6a6690', fontSize: 13, marginBottom: 6 }}>Barter</div>{rows.map(([a, b]) => <div className="rf" key={a}><span>{a}</span><span>{b}</span></div>)}</div>
          <div className="note blue"><span>💡</span><span>Ce completezi se salvează pe parcurs.</span></div></div>
      </div>

      <div className="foot">{step > 0 ? <button className="btn" onClick={() => setStep(step - 1)}>← Înapoi</button> : <span style={{ fontSize: 13, color: '#6a6690', fontWeight: 600 }}>Pasul 1 din 4</span>}
        {step < 3 ? <button className="btn p" disabled={!canNext} onClick={() => setStep(step + 1)}>Continuă →</button> : <button className="btn p" onClick={() => { setErr(''); setModal(true) }}>Pornește campania</button>}</div>

      {modal && <div className="modal-bg"><div className="modal">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="ico" style={{ background: '#dcf5ec', color: '#14532d' }}><Chk /></span><span className="chip" style={{ background: '#dcf5ec', color: '#14532d' }}>Campania ta e salvată</span></div>
        <h2 className="dsp" style={{ margin: 0, fontSize: 25, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.15 }}>Creează-ți contul ca să pornești campania</h2>
        <p style={{ margin: 0, color: '#6a6690', fontSize: 14 }}>Durează sub un minut. Nu plătești nimic acum.</p>
        <div className="f"><div className="lbl">Numele firmei</div><div className="inp"><input value={acc.firm} onChange={e => setAcc({ ...acc, firm: e.target.value })} placeholder="Ex: Brandul Meu SRL" maxLength={100} autoComplete="organization" /></div></div>
        <div className="g2"><div className="f"><div className="lbl">E-mail</div><div className="inp"><input type="email" value={acc.email} onChange={e => setAcc({ ...acc, email: e.target.value })} placeholder="nume@firma.ro" autoComplete="email" /></div></div>
          <div className="f"><div className="lbl">Telefon</div><div className="inp"><input type="tel" value={acc.phone} onChange={e => setAcc({ ...acc, phone: e.target.value })} placeholder="07xx xxx xxx" autoComplete="tel" /></div></div></div>
        <div className="f"><div className="lbl">Parolă</div><div className="inp"><input type="password" value={acc.password} onChange={e => setAcc({ ...acc, password: e.target.value })} placeholder="Minim 8 caractere" autoComplete="new-password" /></div><small style={{ color: '#8783a8', fontSize: 12 }}>Literă mare, literă mică, cifră și unul dintre @ $ ! % * ? &</small></div>
        <input aria-hidden tabIndex={-1} autoComplete="off" value={acc.website} onChange={e => setAcc({ ...acc, website: e.target.value })} style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }} />
        {err && <div className="err">{err}</div>}
        <button className="btn p" style={{ width: '100%', height: 50 }} disabled={busy} onClick={submit}>{busy ? 'Se trimite…' : 'Creează cont și trimite campania'}</button>
        <div style={{ textAlign: 'center', fontSize: 13, color: '#6a6690' }}>Ai deja cont? <Link href="/login" style={{ color: '#5a35e6', fontWeight: 700 }}>Intră în cont</Link> <span style={{ margin: '0 6px' }}>·</span><button style={{ all: 'unset', cursor: 'pointer', color: '#6a6690', textDecoration: 'underline' }} onClick={() => setModal(false)}>Înapoi</button></div>
      </div></div>}
    </div>
  )
}
