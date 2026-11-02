// Stilurile și formularul de căutare pentru verificarea certificatelor (pagini publice).
export const CERT_CSS = `
.cf-wrap { padding: 48px 16px 72px; display: flex; justify-content: center; }
.cf-card { width: 100%; max-width: 620px; box-sizing: border-box; background: #fdfcfa; border: 2px solid #5b2fd0; border-radius: 22px; padding: 32px 24px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; color: #14123a; }
.cf-card h1 { margin: 0; font-size: clamp(28px, 5vw, 40px); line-height: 1.1; letter-spacing: -.02em; text-wrap: balance; }
.cf-card p { margin: 0; font-size: 16px; line-height: 1.6; color: #2c2950; max-width: 46ch; }
.cf-ok { display: inline-flex; align-items: center; height: 30px; padding: 0 12px; border-radius: 999px; background: #dcf5ec; color: #14532d; font-weight: 800; font-size: 13px; }
.cf-bad { display: inline-flex; align-items: center; height: 30px; padding: 0 12px; border-radius: 999px; background: #fde8e8; color: #9b1c1c; font-weight: 800; font-size: 13px; }
.cf-k { font-size: 12px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #6b6890; }
.cf-ava { position: relative; width: 200px; height: 200px; }
.cf-photo { position: absolute; left: 27px; top: 25px; width: 144px; height: 144px; border-radius: 50%; object-fit: cover; }
.cf-ini { background: #5b2fd0; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: 800; }
.cf-frame { position: absolute; inset: 0; width: 200px; height: 200px; }
.cf-meta { margin: 6px 0 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 10px 28px; }
.cf-meta div { display: flex; flex-direction: column; gap: 2px; }
.cf-meta dt { font-size: 11.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #6b6890; }
.cf-meta dd { margin: 0; font-weight: 800; font-variant-numeric: tabular-nums; }
.cf-btn { margin-top: 6px; min-height: 48px; padding: 0 18px; border-radius: 14px; background: #5b2fd0; color: #fff; font-weight: 800; display: inline-flex; align-items: center; text-decoration: none; border: 0; font: inherit; cursor: pointer; }
.cf-form { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; width: 100%; }
.cf-form input { flex: 1 1 220px; min-width: 0; height: 48px; border: 1.5px solid #d9d4ee; border-radius: 14px; padding: 0 14px; font: inherit; font-size: 16px; text-transform: uppercase; }
`

export function CertForm() {
  return (
    <form className="cf-form" action="/certificat/cauta" method="get">
      <label htmlFor="cf-code" style={{ position: 'absolute', left: -9999 }}>Cod certificat</label>
      <input id="cf-code" name="cod" placeholder="AF-2026-0042" required autoComplete="off" />
      <button className="cf-btn" type="submit" style={{ marginTop: 0 }}>Verifică</button>
    </form>
  )
}
