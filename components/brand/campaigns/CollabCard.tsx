// Carduri și bară de filtre pentru lista de colaborări (pagina campaniei, brand).
// Prezentaționale: logica rămâne în pagină. Stilurile sunt proprii (prefix cx-), nu depind de Tailwind.
import React from 'react'

export const collabCss = `
.cx-tb{display:flex;flex-direction:column;gap:12px;margin-bottom:14px}
.cx-tb-title{font-size:18px;font-weight:800;letter-spacing:-0.01em;color:#14123a;margin:0}
.cx-tb-sub{font-size:12px;color:#6a6690;margin-top:3px}
.cx-tb-actions{display:flex;gap:8px;flex-wrap:wrap}
.cx-tb-actions>*{flex:1 1 130px}
.cx-filters{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
.cx-filters::-webkit-scrollbar{display:none}
.cx-fchip{flex:0 0 auto;height:36px;padding:0 14px;border-radius:999px;border:1px solid #e5e3f3;background:#fff;color:#6a6690;font-size:13px;font-weight:700;display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-family:inherit}
.cx-fchip.on{background:#14123a;border-color:#14123a;color:#fff;font-weight:800}
.cx-fchip i{font-style:normal;font-size:11px;font-weight:800;padding:1px 7px;border-radius:999px;background:#efeaff;color:#4423c4}
.cx-fchip.on i{background:rgba(255,255,255,.22);color:#fff}
.cx-sort{display:flex;background:#f1f0f8;border-radius:12px;padding:3px;gap:2px}
.cx-sort button{flex:1;height:34px;border:0;border-radius:9px;background:transparent;color:#6a6690;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit}
.cx-sort button.on{background:#fff;color:#14123a;font-weight:800;box-shadow:0 1px 3px rgba(20,18,58,.12)}

.cx-btn{height:40px;padding:0 14px;border-radius:12px;border:1.5px solid #e5e3f3;background:#fff;color:#14123a;font-size:13px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;text-decoration:none;font-family:inherit;white-space:nowrap}
.cx-btn:hover{background:#faf9ff}
.cx-btn.p{background:#5a35e6;border-color:#5a35e6;color:#fff;font-weight:800}
.cx-btn.p:hover{background:#4a28cc}
.cx-btn.d{color:#b42318;border-color:#f3c9c4}
.cx-btn.s{height:34px;font-size:12px;border-radius:10px;padding:0 12px}
.cx-btn:disabled{opacity:.55;cursor:default}

.cx-card{background:#fff;border:1px solid #e5e3f3;border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:10px;min-width:0;flex-shrink:0}
.cx-card.attn{border-color:#f0c85a;background:#fffdf6}
.cx-top{display:flex;gap:12px;align-items:center;min-width:0}
.cx-av{width:44px;height:44px;border-radius:13px;overflow:hidden;background:#efeaff;color:#5a35e6;font-weight:800;font-size:17px;border:0;padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.cx-av img{width:100%;height:100%;object-fit:cover}
.cx-id{flex:1;min-width:0}
.cx-name{font-size:15px;font-weight:800;color:#14123a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:none;border:0;padding:0;text-align:left;cursor:pointer;font-family:inherit;max-width:100%;display:block}
.cx-sub{font-size:12px;color:#6a6690;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cx-chip{flex-shrink:0;border-radius:999px;padding:4px 10px;font-size:11px;font-weight:800}
.cx-chip.blue{background:#e8f0ff;color:#1d4ed8}
.cx-chip.amber{background:#fff1c2;color:#854d0e}
.cx-chip.purple{background:#efeaff;color:#4423c4}
.cx-chip.green{background:#dcf5ec;color:#14532d}
.cx-chip.gray{background:#f1f0f8;color:#6a6690}
.cx-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.cx-pill{font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;background:#f1f0f8;color:#6a6690}
.cx-pill.blue{background:#e8f0ff;color:#1d4ed8}
.cx-pill.green{background:#dcf5ec;color:#14532d}
.cx-pill.indigo{background:#eef0ff;color:#3730a3}
.cx-link{font-size:12px;font-weight:800;color:#5a35e6;text-decoration:none;margin-left:auto}
.cx-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.cx-actions>.cx-btn{flex:1 1 120px}
.cx-actions.end>.cx-btn{flex:0 0 auto}
.cx-note{font-size:12px;font-weight:700;color:#854d0e;background:#fff1c2;border-radius:10px;padding:7px 10px}
.cx-foot{display:flex;align-items:center;justify-content:space-between;gap:8px}
.cx-meta{font-size:12px;color:#6a6690;min-width:0}
.cx-more{background:none;border:0;padding:6px 0;font-size:12px;font-weight:800;color:#5a35e6;cursor:pointer;font-family:inherit}
.cx-details{display:flex;flex-direction:column;gap:10px;border-top:1px solid #e5e3f3;padding-top:12px;min-width:0}
.cx-check{width:18px;height:18px;flex-shrink:0;accent-color:#5a35e6;cursor:pointer}
.cx-list{display:flex;flex-direction:column;gap:10px;max-height:640px;overflow-y:auto;padding-right:6px;scrollbar-width:thin;scrollbar-color:#cfcce6 transparent}
.cx-list::-webkit-scrollbar{width:5px}
.cx-list::-webkit-scrollbar-thumb{background:#cfcce6;border-radius:3px}
.cx-hint{text-align:center;font-size:12px;font-weight:700;color:#6a6690;margin-top:8px}
@media (max-width:640px){.cx-list{max-height:460px}}
`

export interface Filter { key: string; label: string; count: number }

export function CollabToolbar({ title, subtitle, actions, filters, tab, onTab, sortBy, onSort }: {
  title: string; subtitle: React.ReactNode; actions: React.ReactNode
  filters: Filter[]; tab: string; onTab: (k: any) => void
  sortBy: string; onSort: (k: any) => void
}) {
  return (
    <div className="cx-tb">
      <div>
        <h2 className="cx-tb-title">{title}</h2>
        <div className="cx-tb-sub">{subtitle}</div>
      </div>
      <div className="cx-tb-actions">{actions}</div>
      <div className="cx-filters" role="tablist">
        {filters.map(f => (
          <button key={f.key} type="button" role="tab" aria-selected={tab === f.key} className={`cx-fchip ${tab === f.key ? 'on' : ''}`} onClick={() => onTab(f.key)}>
            {f.label}{f.count > 0 && <i>{f.count}</i>}
          </button>
        ))}
      </div>
      <div className="cx-sort">
        {[{ k: 'date', l: 'Cele mai noi' }, { k: 'followers', l: 'Urmăritori' }, { k: 'rating', l: 'Rating' }].map(s => (
          <button key={s.k} type="button" className={sortBy === s.k ? 'on' : ''} onClick={() => onSort(s.k)}>{s.l}</button>
        ))}
      </div>
    </div>
  )
}

export function CollabCard({ id, attention, select, avatar, onAvatar, name, onName, sub, status, tone, badges, profileHref, notice, actions, actionsEnd, meta, expanded, onToggle, children }: {
  id: string; attention?: boolean; select?: React.ReactNode
  avatar: React.ReactNode; onAvatar?: () => void
  name: string; onName?: () => void; sub?: string
  status: string; tone: 'blue' | 'amber' | 'purple' | 'green' | 'gray'
  badges?: React.ReactNode; profileHref?: string; notice?: React.ReactNode
  actions?: React.ReactNode; actionsEnd?: boolean
  meta?: React.ReactNode; expanded: boolean; onToggle: () => void; children?: React.ReactNode
}) {
  return (
    <div id={`collab-${id}`} className={`cx-card ${attention ? 'attn' : ''}`} style={{ scrollMarginTop: 90 }}>
      <div className="cx-top">
        {select}
        <button type="button" className="cx-av" onClick={onAvatar} aria-label={`Profil ${name}`}>{avatar}</button>
        <div className="cx-id">
          <button type="button" className="cx-name" onClick={onName}>{name}</button>
          {sub && <div className="cx-sub">{sub}</div>}
        </div>
        <span className={`cx-chip ${tone}`}>{status}</span>
      </div>
      {badges && <div className="cx-row">{badges}</div>}
      {notice}
      {actions && <div className={`cx-actions ${actionsEnd ? 'end' : ''}`}>{actions}</div>}
      <div className="cx-foot">
        <div className="cx-meta">{meta}</div>
        <div className="cx-row" style={{ gap: 14, flexShrink: 0 }}>
          {profileHref && <a className="cx-link" style={{ margin: 0 }} href={profileHref} target="_blank" rel="noopener noreferrer">Profil</a>}
          <button type="button" className="cx-more" aria-expanded={expanded} onClick={onToggle}>{expanded ? 'Mai puțin ▲' : 'Vezi mai mult ▼'}</button>
        </div>
      </div>
      {expanded && <div className="cx-details">{children}</div>}
    </div>
  )
}
