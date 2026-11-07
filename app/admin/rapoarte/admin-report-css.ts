// Stilurile paginilor Admin → Rapoarte (listă + editor).
export const ADMIN_REPORT_CSS = `
.ar{display:flex;flex-direction:column;gap:18px;color:#15123a;font-variant-numeric:tabular-nums}
.ar *{box-sizing:border-box}
.ar h1{margin:0;font-size:24px;font-weight:800;letter-spacing:-.01em}
.ar h2{margin:0;font-size:17px;font-weight:800}
.ar-sub{font-size:13.5px;color:#57537a}
.ar-card{background:#fff;border:1px solid #e6e3f2;border-radius:16px;padding:18px}
.ar-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.ar-btn{min-height:40px;padding:0 14px;border-radius:10px;border:1px solid #d9d5ea;background:#fff;color:#15123a;font-weight:700;font-size:13.5px;display:inline-flex;align-items:center;gap:7px;cursor:pointer;font-family:inherit;text-decoration:none;white-space:nowrap}
.ar-btn:disabled{opacity:.55;cursor:default}
.ar-btn.p{background:#5b2fd0;border-color:#5b2fd0;color:#fff}
.ar-btn.g{background:#0f6b3a;border-color:#0f6b3a;color:#fff}
.ar-btn.d{color:#b42318;border-color:#f3d6d6}
.ar-btn.dash{border-style:dashed;border-color:#c9bdf5;background:#faf8ff;color:#4a24c4}
.ar-in,.ar-sel,.ar-ta{border:1.5px solid #e5e3f3;border-radius:10px;padding:0 10px;font-size:14px;font-family:inherit;background:#fff;color:#15123a;min-width:0}
.ar-in,.ar-sel{height:40px}
.ar-ta{padding:10px;min-height:80px;resize:vertical;width:100%;line-height:1.45}
.ar-in:disabled{background:#f6f6fc}
.ar-lbl{display:grid;gap:4px;font-size:12px;font-weight:700;color:#4a4770}
.ar-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:8px}
.ar-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:99px;font-size:12px;font-weight:700;white-space:nowrap}
.ar-chip.pub{background:#e3f6ec;color:#0f6b3a}.ar-chip.draft{background:#fff1c2;color:#6b4700}.ar-chip.none{background:#efedf7;color:#57537a}
.ar-chip.auto{background:#e3f6ec;color:#0f6b3a}.ar-chip.creator{background:#fff1c2;color:#6b4700}.ar-chip.admin{background:#e6efff;color:#1f4fb8}.ar-chip.pending{background:#efedf7;color:#57537a}
.ar-list{display:flex;flex-direction:column}
.ar-item{display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:12px 4px;border-top:1px solid #eeebf6;text-decoration:none;color:inherit}
.ar-item:first-child{border-top:0}
.ar-item:hover{background:#faf9ff}
.ar-av{width:40px;height:40px;border-radius:50%;background:#ece7ff;color:#3b2a9e;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex:none;overflow:hidden}
.ar-av img{width:100%;height:100%;object-fit:cover}
.ar-main{flex:1 1 260px;min-width:0;display:flex;flex-direction:column;gap:2px}
.ar-main b{font-size:14.5px}
.ar-main span{font-size:13px;color:#57537a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ar-tabs{display:flex;flex-wrap:wrap;gap:6px}
.ar-tab{min-height:36px;padding:0 12px;border-radius:99px;border:1px solid #e6e3f2;background:#fff;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;color:#57537a}
.ar-tab.on{background:#15123a;border-color:#15123a;color:#fff}
.ar-metric{border-top:1px solid #eeebf6;padding-top:14px;display:flex;flex-direction:column;gap:10px}
.ar-metric:first-of-type{border-top:0;padding-top:0}
.ar-metric{border-radius:12px;transition:background .15s, outline-color .15s;outline:2px dashed transparent;outline-offset:4px}
.ar-metric.drop{background:#f6f2ff;outline-color:#7c5cf0}
.ar-shot{width:44px;height:44px;border-radius:8px;overflow:hidden;border:1px solid #e5e3f3;flex:none;display:block}
.ar-shot img{width:100%;height:100%;object-fit:cover}
.ar-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}
.ar-kpi{background:#f6f5fb;border-radius:12px;padding:10px 12px}
.ar-kpi div:first-child{font-size:11.5px;color:#57537a;font-weight:700}.ar-kpi div:last-child{font-size:18px;font-weight:800}
.ar-msg{font-size:13px}.ar-msg.ok{color:#0f6b3a}.ar-msg.err{color:#b42318}
.ar-check{display:flex;gap:8px;align-items:center;font-size:13.5px;font-weight:600;min-height:36px;cursor:pointer}
.ar-check input{width:18px;height:18px;accent-color:#5b2fd0}
.ar-sticky{position:sticky;top:0;z-index:5;background:#f6f5fb;padding:8px 0}
`
