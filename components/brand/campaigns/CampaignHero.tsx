// @ts-nocheck
'use client'
import { Calendar, DollarSign, Edit2, Eye, MoreHorizontal, Pause, Play, RefreshCw, Save, TrendingUp, Users, X, EyeOff, Archive } from 'lucide-react'
import { STATUS_CFG, fmt, fmtDate, daysLeft } from './types'

const PLATFORM_ICON: Record<string, React.ReactElement> = {
  instagram: <span className="text-pink-500">IG</span>,
  tiktok: <span className="text-gray-800">TT</span>,
  youtube: <span className="text-red-500">YT</span>,
}

export function CampaignHero({ campaign, collabs, counts, editing, editForm, setEditForm, saving, statusLoading, menuOpen, setMenuOpen, menuRef, onRefresh, onSaveEdit, onCancelEdit, onStartEdit, onChangeStatus, onShowPause, onShowDraft }: any) {
  const cfg = STATUS_CFG[campaign.status] ?? STATUS_CFG.DRAFT
  const days = daysLeft(campaign.deadline)
  const expired = days < 0
  const urgent = !expired && days <= 3

  return (
    <div className="card p-6 mb-5 card-anim">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`badge ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} /> {cfg.label}
            </span>
            {campaign.status === 'ACTIVE' && <span className="text-xs font-black text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">✓ Vizibil influencerilor</span>}
            {campaign.status === 'DRAFT' && <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">⚠ Nevizibil influencerilor</span>}
          </div>
          {editing
            ? <input className="field text-xl font-black mb-1 w-full" value={editForm.title || ''} onChange={e => setEditForm((p: any) => ({ ...p, title: e.target.value }))} placeholder="Titlu campanie" />
            : <h1 className="text-xl font-black text-gray-900 mb-0.5 leading-snug">{campaign.title}</h1>}
          <p className="text-gray-500 font-medium text-sm">{campaign.brand_name}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={onRefresh} className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          {editing ? (
            <>
              <button className="btn-sec" onClick={onCancelEdit} disabled={saving}><X className="w-4 h-4" /> Anulează</button>
              <button className="btn-pub" onClick={onSaveEdit} disabled={saving}>
                {saving ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Salvează
              </button>
            </>
          ) : (
            <>
              <button className="btn-sec" onClick={onStartEdit}><Edit2 className="w-4 h-4" /> Editează</button>
              {campaign.status === 'DRAFT' && (
                <button className="btn-pub" onClick={() => onChangeStatus('ACTIVE')} disabled={statusLoading} style={{ boxShadow: '0 4px 14px rgba(249,115,22,.35)' }}>
                  {statusLoading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Eye className="w-4 h-4" />}
                  Publică
                </button>
              )}
              {campaign.status === 'ACTIVE' && (
                <button className="btn-sec" onClick={onShowPause} disabled={statusLoading}>
                  {statusLoading ? <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" /> : <Pause className="w-4 h-4" />}
                  Pauză
                </button>
              )}
              {campaign.status === 'PAUSED' && (
                <button className="btn-pub" onClick={() => onChangeStatus('ACTIVE')} disabled={statusLoading}>
                  {statusLoading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Play className="w-4 h-4" />}
                  Reia
                </button>
              )}
              <div className="relative" ref={menuRef}>
                <button className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition" onClick={() => setMenuOpen((o: boolean) => !o)}>
                  <MoreHorizontal className="w-4 h-4 text-gray-600" />
                </button>
                {menuOpen && (
                  <div className="dropdown dd-anim">
                    {campaign.status !== 'ACTIVE' && <button className="d-item" onClick={() => onChangeStatus('ACTIVE')}><Play className="w-4 h-4 text-green-500" /> Publică</button>}
                    {campaign.status !== 'DRAFT' && <button className="d-item" onClick={() => campaign.status === 'ACTIVE' ? onShowDraft() : onChangeStatus('DRAFT')}><EyeOff className="w-4 h-4 text-amber-500" /> Mută în Draft</button>}
                    {campaign.status !== 'PAUSED' && campaign.status !== 'COMPLETED' && <button className="d-item" onClick={onShowPause}><Pause className="w-4 h-4 text-gray-500" /> Pauză</button>}
                    {campaign.status !== 'COMPLETED' && <button className="d-item red" onClick={() => onChangeStatus('COMPLETED')}><Archive className="w-4 h-4" /> Marchează Finalizat</button>}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: DollarSign, label: campaign.campaign_type === 'BARTER' ? 'Valoare ofertă' : 'Buget total', color: 'text-green-600', bg: 'bg-green-50',
            value: editing ? null : campaign.campaign_type === 'BARTER' ? `${(campaign.offer_value || 0).toLocaleString('ro-RO')} RON` : fmt(campaign.budget),
            edit: <input type="number" className="field" value={editForm.budget ?? ''} onChange={e => setEditForm((p: any) => ({ ...p, budget: Number(e.target.value) }))} placeholder="Buget" /> },
          { icon: Calendar, label: expired ? 'Expirat' : 'Deadline', color: expired ? 'text-red-500' : urgent ? 'text-orange-500' : 'text-gray-700', bg: expired ? 'bg-red-50' : urgent ? 'bg-orange-50' : 'bg-gray-50',
            value: editing ? null : fmtDate(campaign.deadline),
            edit: <input type="date" className="field" value={editForm.deadline?.slice(0, 10) ?? ''} onChange={e => setEditForm((p: any) => ({ ...p, deadline: e.target.value }))} />,
            sub: !expired ? (days === 0 ? 'Ultima zi!' : `${days} ${days === 1 ? 'zi rămasă' : 'zile rămase'}`) : undefined, subColor: urgent ? 'text-orange-500' : 'text-gray-400' },
          { icon: Users, label: 'Aplicanți', color: 'text-purple-600', bg: 'bg-purple-50', value: `${collabs.length}`, edit: null },
          { icon: TrendingUp, label: 'Activi', color: 'text-blue-600', bg: 'bg-blue-50', value: `${counts.active}`, edit: null },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-2xl p-4`}>
            <div className="flex items-center gap-2 mb-1.5">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <p className="text-xs font-bold text-gray-400">{s.label}</p>
            </div>
            {editing && s.edit ? s.edit : <p className={`text-lg font-black ${s.color}`}>{s.value}</p>}
            {s.sub && !editing && <p className={`text-xs font-bold mt-0.5 ${(s as any).subColor}`}>{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Detalii campanie */}
      <CampaignDetails campaign={campaign} editing={editing} editForm={editForm} setEditForm={setEditForm} />
    </div>
  )
}

function CampaignDetails({ campaign, editing, editForm, setEditForm }: any) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Descriere</p>
        {editing
          ? <textarea className="field" rows={3} value={editForm.description || ''} onChange={e => setEditForm((p: any) => ({ ...p, description: e.target.value }))} placeholder="Descriere campanie…" style={{ resize: 'none' }} />
          : <p className="text-sm text-gray-600 leading-relaxed">{campaign.description || <span className="text-gray-300 italic">Nicio descriere</span>}</p>}
      </div>
      <div>
        <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Livrabile</p>
        {editing
          ? <textarea className="field" rows={3} value={editForm.deliverables || ''} onChange={e => setEditForm((p: any) => ({ ...p, deliverables: e.target.value }))} placeholder="Ce trebuie să livreze influencerul?" style={{ resize: 'none' }} />
          : campaign.deliverables
            ? <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-600 leading-relaxed">{campaign.deliverables}</div>
            : <p className="text-sm text-gray-300 italic">Nespecificate</p>}
      </div>

      {(campaign.offer_name || campaign.offer_description) && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-xs font-black text-amber-700 uppercase tracking-wider mb-2">🎁 Detalii ofertă</p>
          {campaign.offer_name && <p className="text-sm font-bold text-gray-900 mb-1">{campaign.offer_name}</p>}
          {campaign.offer_description && <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{campaign.offer_description}</p>}
          <div className="flex gap-4 mt-3 text-xs">
            {campaign.offer_value > 0 && <p className="font-bold text-amber-700">Valoare: {campaign.offer_value} RON</p>}
            {campaign.offer_count > 0 && <p className="font-bold text-amber-700">Bucăți: {campaign.offer_count}</p>}
            {campaign.delivery_method && <p className="font-bold text-amber-700">{campaign.delivery_method === 'pickup' ? '📍 Pickup' : '📦 Livrare'}</p>}
          </div>
          {campaign.delivery_method === 'pickup' && campaign.checkin_code && (
            <div className="mt-4 pt-4 border-t border-amber-100">
              <p className="text-xs font-black text-amber-700 uppercase tracking-wider mb-3">🔑 Cod check-in</p>
              <div className="bg-white border-2 border-amber-300 rounded-2xl p-5 text-center cursor-pointer"
                onClick={() => navigator.clipboard?.writeText(campaign.checkin_code).then(() => alert('Cod copiat! ✅'))}>
                <p className="text-xs font-bold text-amber-500 mb-2 uppercase tracking-wider">Codul tău unic</p>
                <p className="text-4xl font-black tracking-[.45em] text-amber-700 select-all" style={{ fontFamily: 'monospace' }}>{campaign.checkin_code}</p>
                <p className="text-xs text-amber-400 font-semibold mt-2">📋 Click pentru a copia</p>
              </div>
            </div>
          )}
        </div>
      )}

      {campaign.story_instructions && (
        <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4">
          <p className="text-xs font-black text-pink-700 uppercase tracking-wider mb-2">📱 Instrucțiuni postare</p>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{campaign.story_instructions}</p>
        </div>
      )}

      {campaign.promotion_link && (
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
          <p className="text-xs font-black text-green-700 uppercase tracking-wider mb-2">🔗 Link produs / promovare</p>
          <a href={campaign.promotion_link} target="_blank" rel="noopener noreferrer"
            className="text-sm font-bold text-green-700 hover:text-green-900 underline break-all block bg-white rounded-xl p-2.5 border border-green-100">
            {campaign.promotion_link}
          </a>
        </div>
      )}

      {campaign.required_caption && (
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
          <p className="text-xs font-black text-purple-700 uppercase tracking-wider mb-2">📝 Caption obligatoriu</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white rounded-xl p-3 border border-purple-100 italic">{campaign.required_caption}</p>
        </div>
      )}

      {Array.isArray(campaign.required_hashtags) && campaign.required_hashtags.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs font-black text-blue-700 uppercase tracking-wider mb-2"># Hashtag-uri obligatorii</p>
          <div className="flex flex-wrap gap-1.5">
            {campaign.required_hashtags.map((t: string) => (
              <span key={t} className="text-xs font-bold bg-white border border-blue-200 text-blue-700 px-2.5 py-1 rounded-full">#{t.replace(/^#/, '')}</span>
            ))}
          </div>
        </div>
      )}

      {(campaign.forbidden_content || (Array.isArray(campaign.forbidden_mentions) && campaign.forbidden_mentions.length > 0)) && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <p className="text-xs font-black text-red-700 uppercase tracking-wider mb-2">🚫 Ce să eviți</p>
          {campaign.forbidden_content && <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-2">{campaign.forbidden_content}</p>}
          {Array.isArray(campaign.forbidden_mentions) && campaign.forbidden_mentions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {campaign.forbidden_mentions.map((m: string) => (
                <span key={m} className="text-[10px] font-bold bg-white border border-red-200 text-red-700 px-2 py-0.5 rounded-full">{m}</span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Platforme</p>
          <div className="flex flex-wrap gap-1.5">
            {campaign.platforms?.map((p: string) => (
              <span key={p} className="inline-flex items-center gap-1.5 text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full capitalize">{p.toLowerCase()}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Nișe țintă</p>
          <div className="flex flex-wrap gap-1.5">
            {campaign.niches?.map((n: string) => (
              <span key={n} className="text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200 px-2.5 py-1 rounded-full">{n}</span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Țări</p>
          <div className="flex flex-wrap gap-1.5">
            {campaign.countries?.map((c: string) => (
              <span key={c} className="text-xs font-bold bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full">{c}</span>
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-300 pt-1">Creat: {fmtDate(campaign.created_at)}</p>
    </div>
  )
}
