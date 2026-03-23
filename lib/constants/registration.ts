// Validation Rules
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

// Brand Industries
export const BRAND_INDUSTRIES = [
  'Fashion & Apparel',
  'Beauty & Cosmetics',
  'Technology',
  'Fitness & Wellness',
  'Food & Beverage',
  'Home & Lifestyle',
  'Travel & Tourism',
  'Entertainment',
  'Automotive',
  'Finance & Banking',
  'Education',
  'Healthcare',
  'Retail',
  'Other',
]

// Company Sizes
export const COMPANY_SIZES = [
  'Startup (1-10)',
  'Small (11-50)',
  'Medium (51-200)',
  'Large (201-1000)',
  'Enterprise (1000+)',
]

// Niches for Influencers
export const INFLUENCER_NICHES = [
  'Fashion',
  'Beauty',
  'Fitness',
  'Lifestyle',
  'Travel',
  'Food',
  'Technology',
  'Gaming',
  'Education',
  'Entertainment',
  'Business',
  'Music',
  'Art & Design',
  'Sports',
  'Wellness',
  'Parenting',
  'DIY & Crafts',
  'Automotive',
  'Real Estate',
  'Finance',
]

// Social Media Platforms
export const PLATFORMS = [
  { value: 'TIKTOK', label: 'TikTok', icon: 'tiktok' },
  { value: 'INSTAGRAM', label: 'Instagram', icon: 'instagram' },
  { value: 'YOUTUBE', label: 'YouTube', icon: 'youtube' },
  { value: 'TWITTER', label: 'Twitter / X', icon: 'twitter' },
  { value: 'LINKEDIN', label: 'LinkedIn', icon: 'linkedin' },
]

// Countries
export const COUNTRIES = [
  'Romania',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Netherlands',
  'Sweden',
  'Switzerland',
  'Belgium',
  'Austria',
  'Denmark',
  'Norway',
  'Finland',
  'Portugal',
  'Ireland',
  'Poland',
  'Czech Republic',
  'Slovakia',
  'Hungary',
  'Bulgaria',
  'Croatia',
  'Serbia',
  'Moldova',
  'Ukraine',
  'Greece',
  'Turkey',
  'Japan',
  'South Korea',
  'China',
  'India',
  'Brazil',
  'Mexico',
  'Argentina',
  'South Africa',
  'UAE',
  'Singapore',
  'Other',
]

// Validation Functions
export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

export function validatePassword(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Must be at least ${PASSWORD_MIN_LENGTH} characters`)
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Must contain lowercase letters')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Must contain uppercase letters')
  }
  if (!/\d/.test(password)) {
    errors.push('Must contain numbers')
  }
  if (!/[@$!%*?&]/.test(password)) {
    errors.push('Must contain special characters (@$!%*?&)')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function sanitizeText(text: string): string {
  return text.trim().replace(/[<>]/g, '')
}

export function validateBrandName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 100
}

export function validateInfluencerBio(bio: string): boolean {
  return bio.trim().length >= 10 && bio.trim().length <= 500
}