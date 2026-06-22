// @ts-nocheck
'use client'
import { Instagram, X } from 'lucide-react'
import { fmtNum } from './types'

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z" />
  </svg>
)

export function ProfileModal({ profileModal, onClose }: { profileModal: any; onClose: () => void }) {
  if (!profileModal) return null
  const profileFull = profileModal

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="relative h-24 bg-gradient-to-br from-orange-400 to-pink-400">
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 pb-6 overflow-y-auto text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-100 to-pink-100 border-4 border-white shadow-md overflow-hidden flex items-center justify-center -mt-12 mx-auto mb-3 relative">
            {profileModal.avatar
              ? <img src={profileModal.avatar} alt={profileModal.name} className="w-full h-full object-cover" />
              : <span className="font-black text-orange-500 text-2xl">{profileModal.name?.[0]?.toUpperCase() ?? '?'}</span>}
          </div>
          <h3 className="font-black text-lg text-gray-900">{profileModal.name ?? 'Influencer necunoscut'}</h3>
          {profileModal.avg_rating > 0 && (
            <p className="text-xs font-bold text-amber-500 mt-0.5">⭐ {profileModal.avg_rating.toFixed(1)} {profileModal.review_count ? `(${profileModal.review_count} review-uri)` : ''}</p>
          )}
          {profileModal.bio && <p className="text-sm text-gray-500 mt-3 leading-relaxed">{profileModal.bio}</p>}
          {profileModal.niches?.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {profileModal.niches.map((n: string) => (
                <span key={n} className="text-[11px] font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-full">{n}</span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mt-4">
            {(() => {
              const igHandle = (profileModal.instagram_handle || profileModal.ig_handle || '').replace(/^@/, '').trim()
              const igUrl = igHandle ? `https://instagram.com/${igHandle}` : null
              const ttHandle = (profileModal.tiktok_handle || profileModal.tt_handle || '').replace(/^@/, '').trim()
              const ttUrl = ttHandle ? `https://tiktok.com/@${ttHandle}` : null
              const Card = ({ href, children }: { href: string | null; children: React.ReactNode }) =>
                href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-gray-100 p-3 flex items-center gap-2.5 hover:border-orange-200 hover:bg-orange-50/30 transition cursor-pointer">{children}</a>
                ) : (
                  <div className="rounded-2xl border border-gray-100 p-3 flex items-center gap-2.5">{children}</div>
                )
              return (
                <>
                  <Card href={igUrl}>
                    <Instagram className="w-5 h-5 text-pink-500 flex-shrink-0" />
                    <div>
                      <p className="font-black text-sm text-gray-900">{fmtNum(profileModal.ig_followers || profileModal.instagram_followers || 0)}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Instagram{igUrl ? ' ↗' : ''}</p>
                    </div>
                  </Card>
                  <Card href={ttUrl}>
                    <TikTokIcon className="w-5 h-5 text-gray-800 flex-shrink-0" />
                    <div>
                      <p className="font-black text-sm text-gray-900">{fmtNum(profileModal.tt_followers || 0)}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">TikTok{ttUrl ? ' ↗' : ''}</p>
                    </div>
                  </Card>
                </>
              )
            })()}
          </div>

          {profileFull && (profileFull.price_min || profileFull.price_reel || profileFull.price_story || profileFull.price_post || profileFull.price_youtube) && (
            <div className="mt-4">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Tarife</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {profileFull.price_min && <span className="text-xs font-bold bg-orange-50 text-orange-600 border border-orange-100 px-2.5 py-1.5 rounded-xl">🎯 Min. {profileFull.price_min}/campanie</span>}
                {profileFull.price_story && <span className="text-xs font-bold bg-pink-50 text-pink-600 border border-pink-100 px-2.5 py-1.5 rounded-xl">Story {profileFull.price_story}</span>}
                {profileFull.price_reel && <span className="text-xs font-bold bg-purple-50 text-purple-600 border border-purple-100 px-2.5 py-1.5 rounded-xl">Reel {profileFull.price_reel}</span>}
                {profileFull.price_post && <span className="text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1.5 rounded-xl">Post {profileFull.price_post}</span>}
                {profileFull.price_youtube && <span className="text-xs font-bold bg-red-50 text-red-600 border border-red-100 px-2.5 py-1.5 rounded-xl">YouTube {profileFull.price_youtube}</span>}
              </div>
            </div>
          )}

          {profileFull?._stats && profileFull._stats.total > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl border border-gray-100 p-3">
              <div className="text-center"><p className="font-black text-blue-600 text-lg">{profileFull._stats.total}</p><p className="text-[10px] text-gray-400 font-bold">Aplicate</p></div>
              <div className="text-center"><p className="font-black text-green-600 text-lg">{profileFull._stats.completed}</p><p className="text-[10px] text-gray-400 font-bold">Completate</p></div>
              <div className="text-center"><p className="font-black text-amber-500 text-lg">{profileFull._stats.successRate}%</p><p className="text-[10px] text-gray-400 font-bold">Succes</p></div>
              <div className="text-center"><p className="font-black text-purple-600 text-lg">{(profileFull._stats.earned || 0).toFixed(0)}</p><p className="text-[10px] text-gray-400 font-bold">Câștigat</p></div>
            </div>
          )}

          {profileFull && ((profileFull.portfolio_urls?.length > 0) || (profileFull.recent_posts_urls?.length > 0)) && (
            <div className="mt-4">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Portofoliu</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {[...(profileFull.recent_posts_urls || []), ...(profileFull.portfolio_urls || [])].slice(0, 6).map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-2.5 py-1.5 rounded-xl transition">
                    🔗 Link {i + 1}
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
