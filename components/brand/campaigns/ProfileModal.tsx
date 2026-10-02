// @ts-nocheck
'use client'
import { Instagram, X, MapPin, ExternalLink } from 'lucide-react'
import { fmtNum } from './types'

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" />
  </svg>
)

export function ProfileModal({ profileModal, onClose }: { profileModal: any; onClose: () => void }) {
  if (!profileModal) return null
  const p = profileModal

  const igHandle = (p.instagram_handle || p.ig_handle || '').replace(/^@/, '').trim()
  const ttHandle = (p.tiktok_handle || p.tt_handle || '').replace(/^@/, '').trim()

  // Citește din platforms JSON (sursa principală de date)
  const igPlatform = p.platforms?.find((x: any) => x.platform?.toLowerCase() === 'instagram')
  const ttPlatform = p.platforms?.find((x: any) => x.platform?.toLowerCase() === 'tiktok')

  const igUrl = igPlatform?.url || (igHandle ? `https://instagram.com/${igHandle}` : null)
  const ttUrl = ttPlatform?.url || (ttHandle ? `https://tiktok.com/@${ttHandle}` : null)
  const igFollowers = igPlatform?.followers ? parseInt(igPlatform.followers) : (p.ig_followers || p.instagram_followers || 0)
  const ttFollowers = ttPlatform?.followers ? parseInt(ttPlatform.followers) : (p.tt_followers || 0)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header cu gradient + avatar mare */}
        <div className="relative h-32 bg-gradient-to-br from-orange-400 to-pink-500 flex-shrink-0">
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white transition z-10">
            <X className="w-4 h-4" />
          </button>
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center">
              {p.avatar
                ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                : <span className="font-black text-orange-500 text-3xl">{p.name?.[0]?.toUpperCase() ?? '?'}</span>}
            </div>
          </div>
        </div>

        {/* Body scrollabil */}
        <div className="px-6 pt-16 pb-6 overflow-y-auto text-center">
          <h3 className="font-black text-xl text-gray-900">{p.name ?? 'Influencer necunoscut'}</h3>

          {p.avg_rating > 0 && (
            <p className="text-sm font-bold text-amber-500 mt-1">
              ⭐ {p.avg_rating.toFixed(1)}
              {p.review_count ? <span className="text-gray-400 font-medium"> ({p.review_count} recenzii)</span> : ''}
            </p>
          )}

          {p.city && (
            <div className="flex items-center justify-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-400 font-medium">{p.city}</span>
            </div>
          )}

          {p.bio && <p className="text-sm text-gray-500 mt-3 leading-relaxed">{p.bio}</p>}

          {p.niches?.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {p.niches.map((n: string) => (
                <span key={n} className="text-[11px] font-bold bg-orange-50 text-orange-500 border border-orange-100 px-2.5 py-1 rounded-full">{n}</span>
              ))}
            </div>
          )}

          {/* Social cards */}
          <div className="grid grid-cols-2 gap-3 mt-5">
            {igUrl ? (
              <a href={igUrl} target="_blank" rel="noopener noreferrer"
                className="rounded-2xl border-2 border-pink-100 bg-pink-50 p-4 flex flex-col items-center gap-1 hover:border-pink-300 hover:bg-pink-100 transition group">
                <Instagram className="w-6 h-6 text-pink-500" />
                <p className="font-black text-lg text-gray-900">{fmtNum(igFollowers)}</p>
                <div className="flex items-center gap-1">
                  <p className="text-[10px] text-pink-400 font-bold uppercase">Instagram</p>
                  <ExternalLink className="w-3 h-3 text-pink-400 opacity-0 group-hover:opacity-100 transition" />
                </div>
                {igHandle && <p className="text-[10px] text-gray-400">@{igHandle}</p>}
              </a>
            ) : (
              <div className="rounded-2xl border-2 border-gray-100 bg-gray-50 p-4 flex flex-col items-center gap-1">
                <Instagram className="w-6 h-6 text-gray-300" />
                <p className="font-black text-lg text-gray-400">{fmtNum(igFollowers)}</p>
                <p className="text-[10px] text-gray-300 font-bold uppercase">Instagram</p>
              </div>
            )}

            {ttUrl ? (
              <a href={ttUrl} target="_blank" rel="noopener noreferrer"
                className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-4 flex flex-col items-center gap-1 hover:border-gray-400 hover:bg-gray-100 transition group">
                <TikTokIcon className="w-6 h-6 text-gray-800" />
                <p className="font-black text-lg text-gray-900">{fmtNum(ttFollowers)}</p>
                <div className="flex items-center gap-1">
                  <p className="text-[10px] text-gray-500 font-bold uppercase">TikTok</p>
                  <ExternalLink className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition" />
                </div>
                {ttHandle && <p className="text-[10px] text-gray-400">@{ttHandle}</p>}
              </a>
            ) : (
              <div className="rounded-2xl border-2 border-gray-100 bg-gray-50 p-4 flex flex-col items-center gap-1">
                <TikTokIcon className="w-6 h-6 text-gray-300" />
                <p className="font-black text-lg text-gray-400">{fmtNum(ttFollowers)}</p>
                <p className="text-[10px] text-gray-300 font-bold uppercase">TikTok</p>
              </div>
            )}
          </div>

          {/* Stats */}
          {p._stats && p._stats.total > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-3">
              <div className="text-center"><p className="font-black text-blue-600 text-lg">{p._stats.total}</p><p className="text-[10px] text-gray-400 font-bold">Aplicate</p></div>
              <div className="text-center"><p className="font-black text-green-600 text-lg">{p._stats.completed}</p><p className="text-[10px] text-gray-400 font-bold">Complete</p></div>
              <div className="text-center"><p className="font-black text-amber-500 text-lg">{p._stats.successRate}%</p><p className="text-[10px] text-gray-400 font-bold">Succes</p></div>
              <div className="text-center"><p className="font-black text-purple-600 text-lg">{(p._stats.earned || 0).toFixed(0)}</p><p className="text-[10px] text-gray-400 font-bold">Castigat</p></div>
            </div>
          )}

          {/* Tarife */}
          {(p.price_min || p.price_reel || p.price_story || p.price_post || p.price_youtube) && (
            <div className="mt-4">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Tarife</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {p.price_min && <span className="text-xs font-bold bg-orange-50 text-orange-600 border border-orange-100 px-2.5 py-1.5 rounded-xl">Min. {p.price_min} RON</span>}
                {p.price_story && <span className="text-xs font-bold bg-pink-50 text-pink-600 border border-pink-100 px-2.5 py-1.5 rounded-xl">Story {p.price_story} RON</span>}
                {p.price_reel && <span className="text-xs font-bold bg-purple-50 text-purple-600 border border-purple-100 px-2.5 py-1.5 rounded-xl">Reel {p.price_reel} RON</span>}
                {p.price_post && <span className="text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1.5 rounded-xl">Post {p.price_post} RON</span>}
                {p.price_youtube && <span className="text-xs font-bold bg-red-50 text-red-600 border border-red-100 px-2.5 py-1.5 rounded-xl">YouTube {p.price_youtube} RON</span>}
              </div>
            </div>
          )}

          {/* Portofoliu */}
          {((p.portfolio_urls?.length > 0) || (p.recent_posts_urls?.length > 0)) && (
            <div className="mt-4">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Portofoliu</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {[...(p.recent_posts_urls || []), ...(p.portfolio_urls || [])].slice(0, 6).map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-2.5 py-1.5 rounded-xl transition flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Link {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
