// @ts-nocheck
// Real SVG brand icons for social platforms
// Usage: <PlatformIcon platform="instagram" className="w-5 h-5" />

type IconProps = { className?: string }

export function InstagramIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
      <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none" />
      <circle cx="17" cy="7" r="1.2" fill="white" />
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="white" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

export function TikTokIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#010101" />
      <path d="M17.5 7.2a4.2 4.2 0 01-4.2-4.2h-2.8v12.4a2.1 2.1 0 11-2.1-2.1c.2 0 .38.03.56.08V10.5a4.9 4.9 0 00-.56-.03 4.9 4.9 0 000 9.8 4.9 4.9 0 004.9-4.9V9.6a7 7 0 004.2 1.4V8.2a4.2 4.2 0 01-4.2-4.2" fill="none" />
      <path d="M16.5 6.5a3.5 3.5 0 01-3.5-3.5h-2v10.8a1.8 1.8 0 11-1.8-1.8l.4.04V9.15l-.4-.02a4.65 4.65 0 000 9.3 4.65 4.65 0 004.65-4.65V8.95A6.5 6.5 0 0017.5 9.7V7.72a3.52 3.52 0 01-1-.22" fill="#EE1D52" />
      <path d="M15.5 5.5a3.5 3.5 0 003.5 3.5v2a6.5 6.5 0 01-3.5-1.05v4.48a4.65 4.65 0 01-4.65 4.65 4.65 4.65 0 01-4.65-4.65 4.65 4.65 0 014.65-4.65l.4.02v2.03l-.4-.04a1.8 1.8 0 00-1.8 1.8 1.8 1.8 0 001.8 1.8 1.8 1.8 0 001.8-1.8V3h2a3.5 3.5 0 003.5 3.5" fill="white" />
      <path d="M19 9V7.72A3.52 3.52 0 0115.5 5.5H13.5V13.43a1.8 1.8 0 01-1.8 1.8 1.8 1.8 0 01-1.8-1.8 1.8 1.8 0 011.8-1.8l.4.04V9.15l-.4-.02a4.65 4.65 0 00-4.65 4.65 4.65 4.65 0 004.65 4.65A4.65 4.65 0 0016.35 13.43V8.95A6.5 6.5 0 0019 9z" fill="#69C9D0" />
    </svg>
  )
}

export function YoutubeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#FF0000" />
      <path d="M20.5 8.2s-.2-1.4-.8-2c-.8-.8-1.7-.8-2-.9C15.4 5 12 5 12 5s-3.4 0-5.7.3c-.4 0-1.3.1-2 .9-.6.6-.8 2-.8 2S3 9.8 3 11.4v1.5c0 1.5.2 3.1.2 3.1s.2 1.4.8 2c .7.8 1.7.8 2.2.9C7.6 19 12 19 12 19s3.4 0 5.7-.3c.4-.1 1.3-.1 2-.9.6-.6.8-2 .8-2s.2-1.5.2-3.1v-1.5C20.7 9.7 20.5 8.2 20.5 8.2z" fill="white" fillOpacity="0" />
      <polygon points="10,9 10,15 15.5,12" fill="white" />
    </svg>
  )
}

export function TwitterXIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#000000" />
      <path d="M17.75 4h-2.6L12 8.4 8.85 4H3l6.1 8.2L3.2 20h2.6l3.5-4.8 3.5 4.8H19l-6.4-8.6L17.75 4z" fill="white" />
    </svg>
  )
}

export function LinkedInIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#0A66C2" />
      <path d="M7.5 9.5h-3v9h3v-9zm-1.5-1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm13.5 10h-3v-4.5c0-1.1-.4-1.8-1.3-1.8-.7 0-1.1.5-1.3 1-.1.2-.1.5-.1.8v4.5h-3s.04-7.5 0-9h3v1.3c.4-.6 1.1-1.5 2.7-1.5 2 0 3.4 1.3 3.4 4.1l-.4 5.1z" fill="white" />
    </svg>
  )
}

export function FacebookIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#1877F2" />
      <path d="M16 8h-2c-.6 0-1 .4-1 1v2h3l-.5 3H13v7h-3v-7H8v-3h2V9a4 4 0 014-4h2v3z" fill="white" />
    </svg>
  )
}

export function SnapchatIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#FFFC00" />
      <path d="M12 4c-2.5 0-4 1.7-4 4v1.2c-.3.1-.8.2-1 .4-.2.3 0 .6.2.8.5.5 1.2.5 1.5 1 .2.4-.1.8-.3 1-.5.7-1.5 1-2.4.8-.1.4.3.7.7.8 1.2.3 1.4.6 1.5 1l.1.3h.7c.7 1 2 1.7 3 1.7s2.3-.7 3-1.7h.7l.1-.3c.1-.4.3-.7 1.5-1 .4-.1.8-.4.7-.8-.9.2-1.9-.1-2.4-.8-.2-.2-.5-.6-.3-1 .3-.5 1-.5 1.5-1 .2-.2.4-.5.2-.8-.2-.2-.7-.3-1-.4V8c0-2.3-1.5-4-4-4z" fill="#333" />
    </svg>
  )
}

export function PinterestIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#E60023" />
      <path d="M12 3C7 3 3 7 3 12c0 3.8 2.3 7.1 5.6 8.6-.1-.7-.1-1.8.1-2.6.2-.7 1.4-5.9 1.4-5.9s-.4-.7-.4-1.7c0-1.6 1-2.8 2.2-2.8 1 0 1.5.8 1.5 1.7 0 1-.7 2.6-1 4-.3 1.2.6 2.2 1.7 2.2 2 0 3.6-2.1 3.6-5.2 0-2.7-1.9-4.6-4.7-4.6-3.2 0-5 2.4-5 4.9 0 1 .4 2 .9 2.5.1.1.1.2.1.3l-.3 1.4c-.1.2-.2.3-.4.2-1.5-.7-2.4-2.9-2.4-4.6 0-3.7 2.7-7.2 7.8-7.2 4.1 0 7.3 2.9 7.3 6.8 0 4-2.5 7.3-6.1 7.3-1.2 0-2.3-.6-2.7-1.3l-.7 2.7c-.3 1-1 2.3-1.5 3 1.1.3 2.3.5 3.5.5 5 0 9-4 9-9S17 3 12 3z" fill="white" />
    </svg>
  )
}

// Map of platform key → icon component
export const PLATFORM_ICONS: Record<string, (props: IconProps) => React.ReactElement> = {
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  youtube: YoutubeIcon,
  twitter: TwitterXIcon,
  x: TwitterXIcon,
  linkedin: LinkedInIcon,
  facebook: FacebookIcon,
  snapchat: SnapchatIcon,
  pinterest: PinterestIcon,
  INSTAGRAM: InstagramIcon,
  TIKTOK: TikTokIcon,
  YOUTUBE: YoutubeIcon,
  TWITTER: TwitterXIcon,
  LINKEDIN: LinkedInIcon,
  FACEBOOK: FacebookIcon,
}

// Convenience component
export function PlatformIcon({ platform, className = 'w-5 h-5' }: { platform: string; className?: string }) {
  const Icon = PLATFORM_ICONS[platform?.toLowerCase()] ?? PLATFORM_ICONS[platform]
  if (!Icon) return <span className="text-base">{platform}</span>
  return <Icon className={className} />
}
