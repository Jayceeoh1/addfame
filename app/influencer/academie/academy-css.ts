// Stilurile comune ale paginilor din Academie (creator).
export const ACADEMY_CSS = `
.ac { min-height: 100%; padding: 24px 16px 48px; box-sizing: border-box; font-family: var(--font-body, system-ui), system-ui, sans-serif; color: #14123a; }
.ac-wrap { max-width: 1080px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
.ac h1, .ac h2, .ac h3 { font-family: var(--font-display, system-ui), system-ui, sans-serif; margin: 0; letter-spacing: -0.02em; text-wrap: balance; }
.ac p { margin: 0; }
.ac-muted { font-size: 13px; color: #5a5780; }
.ac-card { background: #fff; border: 1px solid #e8e5f3; border-radius: 22px; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.ac-top { display: flex; flex-wrap: wrap; gap: 18px; align-items: stretch; }
.ac-hero { flex: 999 1 520px; min-width: 0; border-radius: 26px; padding: 28px 24px; background: linear-gradient(150deg, #2a1673 0%, #5b2fd0 70%, #7c5cff 100%); color: #fff; display: flex; flex-direction: column; gap: 16px; }
.ac-hero h1 { font-size: clamp(26px, 4vw, 36px); line-height: 1.1; font-weight: 800; }
.ac-hero p { color: #e4ddff; font-size: 15.5px; line-height: 1.55; max-width: 60ch; }
.ac-tag { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 11px; border-radius: 999px; background: rgba(255,255,255,.14); font-size: 12px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }
.ac-prog { display: flex; flex-direction: column; gap: 8px; max-width: 460px; }
.ac-prog-row { display: flex; justify-content: space-between; font-size: 13.5px; color: #e4ddff; font-variant-numeric: tabular-nums; }
.ac-prog-row b { color: #fff; }
.ac-bar { height: 10px; border-radius: 999px; background: rgba(255,255,255,.18); overflow: hidden; }
.ac-bar i { display: block; height: 100%; border-radius: 999px; background: #ffd166; transition: width .3s; }
.ac-btn { align-self: flex-start; min-height: 50px; padding: 0 20px; border-radius: 14px; border: 0; background: #fff; color: #2a1673; font: inherit; font-weight: 800; font-size: 15px; display: inline-flex; align-items: center; gap: 8px; text-decoration: none; cursor: pointer; }
.ac-done { align-self: flex-start; display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 16px; border-radius: 14px; background: rgba(255,255,255,.16); font-weight: 800; }
.ac-gain { flex: 1 1 280px; min-width: 0; }
.ac-label { font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #6b6890; }
.ac-gain-row { display: flex; gap: 12px; align-items: center; }
.ac-gain-row div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ac-gain-row b { font-size: 14.5px; }
.ac-gain-row div span { font-size: 13px; color: #5a5780; }
.ac-ico { width: 42px; height: 42px; flex: none; border-radius: 13px; background: #efeaff; color: #5b2fd0; display: grid; place-items: center; }
.ac-warn { font-size: 13px; font-weight: 700; color: #854d0e; background: #fff6d6; border-radius: 12px; padding: 10px 12px; }
.ac-sec { display: flex; flex-direction: column; gap: 12px; }
.ac-sec-h { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.ac-sec-h h2 { font-size: 20px; font-weight: 800; }
.ac-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.ac-lesson { background: #fff; border: 1px solid #e8e5f3; border-radius: 20px; padding: 18px; display: flex; flex-direction: column; gap: 8px; color: inherit; text-decoration: none; transition: border-color .15s, box-shadow .15s; }
.ac-lesson:hover { border-color: #c9bdf7; box-shadow: 0 6px 20px rgba(91,47,208,.08); }
.ac-lesson.is-next { border: 2px solid #5b2fd0; }
.ac-lesson.is-done { background: #fbfaff; }
.ac-lesson h3 { font-size: 17px; font-weight: 800; }
.ac-lesson p { font-size: 14px; line-height: 1.5; color: #4a4770; }
.ac-lesson-h { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.ac-lesson-f { margin-top: auto; padding-top: 6px; display: flex; justify-content: space-between; font-size: 13.5px; color: #5b2fd0; font-weight: 700; }
.ac-lesson-f b { color: #14123a; }
.ac-chip { height: 24px; padding: 0 9px; border-radius: 999px; background: #f1f0f8; color: #4a4770; font-size: 11.5px; font-weight: 800; display: inline-flex; align-items: center; gap: 4px; flex: none; white-space: nowrap; }
.ac-chip.ok { background: #dcf5ec; color: #14532d; }
.ac-chip.v { background: #efeaff; color: #4423c4; }

/* lecția */
.al { max-width: 720px; }
.al-back { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; min-height: 40px; color: #5b2fd0; font-weight: 700; font-size: 14px; text-decoration: none; }
.al-head { display: flex; flex-direction: column; gap: 8px; }
.al-head h1 { font-size: clamp(24px, 4vw, 32px); line-height: 1.12; font-weight: 800; }
.al-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.al-body { display: flex; flex-direction: column; gap: 14px; font-size: 16px; line-height: 1.65; color: #2a2850; }
.al-body p { max-width: 65ch; }
.al-body b { color: #14123a; }
.al-note { background: #fff6d6; border-left: 4px solid #f5a524; border-radius: 12px; padding: 12px 14px; color: #5a3d06; }
.al-list { margin: 0; padding-left: 22px; display: flex; flex-direction: column; gap: 6px; }
.al-video { position: relative; width: 100%; max-width: 100%; aspect-ratio: 16 / 9; border-radius: 18px; overflow: hidden; background: #14123a; }
.al-video iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.al-quiz { display: flex; flex-direction: column; gap: 14px; }
.al-qtop { display: flex; align-items: center; gap: 12px; }
.al-qtop .ac-bar { flex: 1; background: #ece9f5; }
.al-qtop .ac-bar i { background: linear-gradient(90deg, #7c5cff, #5b2fd0); }
.al-step { font-weight: 800; font-size: 14px; color: #5a5780; min-width: 44px; text-align: right; font-variant-numeric: tabular-nums; }
.al-q { font-size: 19px; line-height: 1.35; font-weight: 800; }
.al-opts { display: flex; flex-direction: column; gap: 10px; }
.al-opt { min-height: 56px; width: 100%; display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 14px; font: inherit; font-size: 15.5px; font-weight: 600; color: #14123a; cursor: pointer; text-align: left; background: #fff; border: 2px solid #e3e0f0; }
.al-opt:hover { border-color: #c9bdf7; }
.al-opt.on { background: #f1edff; border-color: #5b2fd0; }
.al-opt b { width: 30px; height: 30px; flex: none; border-radius: 9px; display: grid; place-items: center; font-size: 14px; background: #f1f0f8; color: #4a4770; }
.al-opt.on b { background: #5b2fd0; color: #fff; }
.al-nav { display: flex; gap: 10px; }
.al-btn { min-height: 52px; flex: 1; border-radius: 14px; border: 0; background: #5b2fd0; color: #fff; font: inherit; font-weight: 800; font-size: 16px; cursor: pointer; padding: 0 16px; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; }
.al-btn:disabled { background: #e3e0f0; color: #8b87ad; cursor: default; }
.al-btn2 { min-height: 52px; border-radius: 14px; border: 1.5px solid #e3e0f0; background: #fff; color: #14123a; font: inherit; font-weight: 800; font-size: 15px; cursor: pointer; padding: 0 16px; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; }
.al-msg { font-size: 14px; font-weight: 700; color: #9b1c1c; }
.al-result { text-align: center; align-items: center; }
.al-score { font-size: 46px; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: -0.03em; }
.al-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.al-rev { display: flex; flex-direction: column; gap: 10px; }
.al-rev-i { border: 1px solid #ece9f5; border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 6px; background: #fff; }
.al-rev-i.bad { border-color: #f5c2c2; background: #fff8f8; }
.al-rev-i b { font-size: 15px; }
.al-rev-i span { font-size: 14px; line-height: 1.5; color: #4a4770; }
.al-cert { border-radius: 22px; padding: 22px; background: linear-gradient(150deg, #2a1673, #5b2fd0); color: #fff; display: flex; flex-direction: column; gap: 8px; align-items: center; text-align: center; }
.al-cert h2 { font-size: 24px; font-weight: 800; }
.al-cert p { color: #e4ddff; }

/* v2: pași interactivi, verificare pe loc, certificat cu ramă */
.al-top { display: flex; flex-direction: column; gap: 8px; }
.al-top .al-back { min-height: 36px; }
.al-pbar { height: 8px; background: #ece9f5; }
.al-pbar i { background: linear-gradient(90deg, #7c5cff, #5b2fd0); }
.al-step-c { display: flex; flex-direction: column; gap: 14px; }
.al-h2 { font-size: clamp(24px, 4vw, 30px); line-height: 1.15; font-weight: 800; }
.al-sec { display: flex; flex-direction: column; gap: 4px; }
.al-sec p { font-size: 16px; line-height: 1.6; color: #2c2950; max-width: 65ch; }
.al-k { font-size: 11.5px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #6b6890; }
.al-pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; }
.al-ex { border-radius: 16px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
.al-ex > span { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 800; }
.al-ex p { font-size: 14.5px; line-height: 1.5; }
.al-ex.bad { background: #fff4f2; border: 1.5px solid #f3c9c2; color: #4a2018; }
.al-ex.bad > span { color: #9b2c1c; }
.al-ex.good { background: #effaf4; border: 1.5px solid #b9e6cf; color: #123d26; }
.al-ex.good > span { color: #14532d; }
.al-check { gap: 10px; }
.al-check label { display: flex; gap: 10px; align-items: center; font-size: 14.5px; line-height: 1.4; color: #2c2950; min-height: 34px; cursor: pointer; }
.al-check input { width: 20px; height: 20px; accent-color: #5b2fd0; flex: none; }
.al-choice { display: flex; flex-direction: column; gap: 8px; width: 100%; text-align: left; font: inherit; font-size: 15px; line-height: 1.5; color: #14123a; padding: 14px; border-radius: 18px; background: #fff; border: 2px solid #e3e0f0; cursor: pointer; }
.al-choice:hover:not(:disabled) { border-color: #c9bdf7; }
.al-choice.ok { background: #ecf9f2; border-color: #1f9d6b; }
.al-choice.dim { opacity: .7; }
.al-choice:disabled { cursor: default; }
.al-choice-h { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.al-ta { border: 1.5px solid #d9d4ee; border-radius: 14px; padding: 12px; font: inherit; font-size: 15px; font-weight: 500; line-height: 1.5; color: #14123a; resize: vertical; background: #fff; text-transform: none; letter-spacing: 0; }
.al-opt.ok { background: #ecf9f2; border-color: #1f9d6b; color: #14532d; font-weight: 800; }
.al-opt.ok b { background: #1f9d6b; color: #fff; }
.al-opt.bad { background: #fff1e8; border-color: #c2410c; color: #7a2e08; }
.al-opt.bad b { background: #c2410c; color: #fff; }
.al-opt.dim { opacity: .65; }
.al-opt:disabled { cursor: default; }
.al-fb { border-radius: 16px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; font-size: 14.5px; line-height: 1.5; }
.al-fb b { font-size: 15px; }
.al-fb.ok { background: #dcf5ec; color: #14532d; }
.al-fb.bad { background: #fff1e8; color: #7a2e08; }
.al-sticky { position: sticky; bottom: 0; padding: 10px 0 calc(10px + env(safe-area-inset-bottom, 0px)); background: linear-gradient(to top, #f6f6fc 70%, rgba(246,246,252,0)); }
.al-done { align-items: center; text-align: center; }
.al-medal { width: 104px; height: 104px; border-radius: 999px; background: #5b2fd0; color: #fff; display: grid; place-items: center; font-size: 42px; font-weight: 800; box-shadow: 0 0 0 8px #e6dfff; }
.al-learned { display: flex; gap: 10px; align-items: center; font-size: 14.5px; color: #2c2950; }
.al-learned svg { color: #1f9d6b; flex: none; }
.al-cert { gap: 10px; padding: 26px 20px; }
.al-cert .ac-btn { margin-top: 6px; }
.ac-tiers { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
.ac-tier { display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; padding: 8px; }
.ac-tier img { width: 96px; height: 96px; }
.ac-tier b { font-size: 15px; }
.al-cert-btns { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.al-cert-b2 { min-height: 46px; padding: 0 16px; border-radius: 14px; border: 1.5px solid rgba(255,255,255,.45); background: transparent; color: #fff; font: inherit; font-weight: 800; font-size: 14.5px; cursor: pointer; }
.al-cert-b2:disabled, .al-cert .ac-btn:disabled { opacity: .6; cursor: default; }
.al-how { margin-top: 4px; background: #fff; border: 1px solid #e8e5f3; border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 6px; font-size: 14.5px; line-height: 1.5; color: #2c2950; }
.al-how b { color: #14123a; }
.al-link { align-self: flex-start; background: none; border: 0; padding: 4px 0; font: inherit; font-weight: 800; font-size: 14px; color: #5b2fd0; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
.al-stepinfo { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 13px; font-weight: 700; color: #6b6890; }
.al-check ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.al-check li { display: flex; gap: 10px; align-items: flex-start; font-size: 14.5px; line-height: 1.45; color: #2c2950; }
.al-check li svg { color: #5b2fd0; flex: none; margin-top: 3px; }
`
