'use client'

import { useLang } from '@/lib/i18n/context'

export function LangToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLang()

  return (
    <>
      <style>{`
        .lang-toggle-track {
          position: relative;
          display: inline-flex;
          align-items: center;
          background: #f3f4f6;
          border-radius: 14px;
          padding: 4px;
          gap: 2px;
          border: 1.5px solid #e5e7eb;
        }
        .lang-toggle-slider {
          position: absolute;
          top: 4px;
          bottom: 4px;
          width: calc(50% - 4px);
          border-radius: 10px;
          background: linear-gradient(135deg, #f97316, #ec4899);
          box-shadow: 0 2px 8px rgba(249,115,22,0.35);
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
          pointer-events: none;
        }
        .lang-toggle-slider.ro {
          transform: translateX(calc(100% + 2px));
        }
        .lang-toggle-btn {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 11px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: color 0.2s ease;
          border: none;
          background: transparent;
          white-space: nowrap;
          user-select: none;
        }
        .lang-toggle-btn.active {
          color: white;
        }
        .lang-toggle-btn.inactive {
          color: #9ca3af;
        }
        .lang-toggle-btn.inactive:hover {
          color: #6b7280;
        }
        .lang-flag {
          font-size: 14px;
          line-height: 1;
        }
      `}</style>
      <div className={`lang-toggle-track ${className}`}>
        <div className={`lang-toggle-slider ${lang === 'ro' ? 'ro' : ''}`} />
        {(['en', 'ro'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`lang-toggle-btn ${lang === l ? 'active' : 'inactive'}`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </>
  )
}
