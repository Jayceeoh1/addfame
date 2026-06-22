'use server'

// Auto-approval workflow: All new accounts are auto-approved immediately upon creation
// This eliminates manual admin intervention while maintaining data integrity and user experience

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSlug } from '@/lib/slug-utils'
import { revalidatePath } from 'next/cache'
import { rateLimit, getClientIP, LIMITS } from '@/lib/rate-limit'
import {
  validateEmail,
  validatePassword,
  sanitizeText,
  validateBrandName,
  validateInfluencerBio,
} from '@/lib/constants/registration'

// Helper: check if an auth user already exists for this email via admin API
async function getExistingAuthUser(email: string) {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.auth.admin.listUsers()
  if (error || !data) return null
  return data.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase()) ?? null
}

// Helper: upsert profile row (avoids duplicate key errors on retry)
async function upsertProfile(userId: string, email: string, role: 'brand' | 'influencer') {
  const adminClient = createAdminClient()
  return adminClient
    .from('profiles')
    .upsert({ id: userId, email: email.toLowerCase(), role }, { onConflict: 'id' })
}

// Helper: Auto-approve account immediately upon creation for seamless access
async function autoApproveAccount(
  userId: string,
  email: string,
  roleType: 'brand' | 'influencer'
) {
  const adminClient = createAdminClient()
  const table = roleType === 'brand' ? 'brands' : 'influencers'

  // Update approval_status to 'approved' immediately
  // This ensures users have instant access without any admin intervention
  const { error: approvalError } = await adminClient
    .from(table)
    .update({
      approval_status: 'pending',
      verification_status: 'unverified',
    })
    .eq('user_id', userId)

  return { error: approvalError }
}

export async function login(email: string, password: string) {
  try {
    const ip = await getClientIP()
    const rl = await rateLimit(`login:${ip}:${email.toLowerCase()}`, LIMITS.login)
    if (!rl.ok) return { error: `Too many login attempts. Try again in ${Math.ceil((rl.retryAfter ?? 60) / 60)} minutes.`, rateLimited: true }

    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      return { error: error.message }
    }

    if (!data.user) {
      return { error: 'No user returned from authentication' }
    }

    // Fetch user's profile to verify role and permissions
    const adminClient = createAdminClient()
    const { data: profileData, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    // Check if this user is an admin (admins may not have a profiles row with role)
    const { data: adminRow } = await adminClient
      .from('admins')
      .select('user_id')
      .eq('user_id', data.user.id)
      .single()

    if (adminRow) {
      // Admin user — skip brand/influencer profile checks entirely
      revalidatePath('/')
      return {
        success: true,
        data: { user: data.user, session: data.session },
        userRole: 'admin' as const,
        approvalStatus: 'approved',
        session: data.session,
      }
    }

    if (profileError || !profileData?.role) {
      return { error: 'Unable to determine user role. Please contact support.' }
    }

    // Verify user has the appropriate role profile (brand or influencer)
    const userRole = profileData.role as 'brand' | 'influencer'
    const profileTable = userRole === 'brand' ? 'brands' : 'influencers'

    const { data: roleProfileData, error: roleProfileError } = await adminClient
      .from(profileTable)
      .select('id, approval_status')
      .eq('user_id', data.user.id)
      .single()

    if (roleProfileError || !roleProfileData) {
      // Profile row is missing — this happens when registration was interrupted
      // after the auth user was created but before the influencer/brand row was saved.
      // Sign the user out so they start fresh, then redirect them to re-register.
      await supabase.auth.signOut()
      return {
        error: `Your ${userRole} profile is incomplete. Please register again to finish setting up your account.`,
        missingProfile: true
      }
    }

    // Check setup status - only rejection-marked accounts are blocked from login
    if (roleProfileData.approval_status === 'rejected') {
      return {
        error: 'This account is no longer active. Please contact support if you have questions.',
        rejected: true
      }
    }

    revalidatePath('/')
    return {
      success: true,
      data: { user: data.user, session: data.session },
      userRole,
      approvalStatus: roleProfileData.approval_status,
      // Return full session so the client can set it via the browser Supabase client
      session: data.session
    }
  } catch (err: any) {
    console.error('[v0] Login error:', err)
    return { error: err.message || 'Authentication failed' }
  }
}

export async function registerBrand(
  email: string,
  password: string,
  brandName: string,
  industry: string,
  companySize?: string,
  website?: string,
  cui?: string,
  companyLegalName?: string,
  companyAddress?: string
) {
  try {
    const ip = await getClientIP()
    const rl = await rateLimit(`register:${ip}`, LIMITS.register)
    if (!rl.ok) return { error: `Too many registration attempts. Try again later.`, rateLimited: true }

    // --- CUI validation (Romanian tax ID: digits only, optionally prefixed with RO) ---
    if (!cui || !/^(RO)?[0-9]{2,10}$/i.test(cui.trim().replace(/\s/g, ''))) {
      return { error: 'CUI/CIF invalid. Introdu codul fiscal real al firmei (ex. RO12345678 sau 12345678).' }
    }

    // --- Denumire legala / adresa: minim 5 caractere, nu doar litere repetate ---
    if (!companyLegalName || companyLegalName.trim().length < 5 || /^(.)\1+$/.test(companyLegalName.trim())) {
      return { error: 'Denumirea legală a firmei pare invalidă.' }
    }
    if (!companyAddress || companyAddress.trim().length < 8 || /^(.)\1+$/.test(companyAddress.trim())) {
      return { error: 'Adresa firmei pare invalidă.' }
    }

    // --- Client-side validation ---
    if (!validateEmail(email)) {
      return { error: 'Invalid email format' }
    }
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return { error: passwordValidation.errors.join(', ') }
    }
    if (!validateBrandName(brandName)) {
      return { error: 'Brand name must be between 2 and 100 characters' }
    }
    if (!industry || industry.trim().length === 0) {
      return { error: 'Please select an industry' }
    }

    const adminClient = createAdminClient()

    // --- Check if auth user already exists to avoid triggering email rate limit ---
    const existingAuthUser = await getExistingAuthUser(email)

    let userId: string

    if (existingAuthUser) {
      // Auth user already exists from a previous attempt — do NOT call signUp again
      // Check if they already have a completed brand profile
      const { data: existingBrand } = await adminClient
        .from('brands')
        .select('id')
        .eq('user_id', existingAuthUser.id)
        .single()

      if (existingBrand) {
        return { error: 'This email is already registered. Please log in instead.' }
      }

      userId = existingAuthUser.id
    } else {
      // New user — create auth account and send confirmation email
      const supabase = await createClient()
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role: 'brand', email_verified: false },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
        },
      })

      if (authError) {
        if (authError.message.toLowerCase().includes('rate limit')) {
          return {
            error:
              'Email rate limit reached. Please wait a few minutes before trying again, or check your inbox for an existing confirmation email.',
            rateLimited: true,
          }
        }
        return { error: authError.message }
      }

      if (!authData.user) {
        return { error: 'Failed to create account. Please try again.' }
      }

      userId = authData.user.id
    }

    // --- Upsert profile (safe on retry) ---
    const { error: profileError } = await upsertProfile(userId, email, 'brand')
    if (profileError) {
      return { error: `Failed to create profile: ${profileError.message}` }
    }

    // --- Insert or update brand-specific record ---
    // Get existing brand ID if it exists, or generate a new one
    const { data: existingBrandData } = await adminClient
      .from('brands')
      .select('id')
      .eq('user_id', userId)
      .single()

    const brandId = existingBrandData?.id
    const brandInsertData = {
      ...(brandId && { id: brandId }), // Include ID if updating existing record
      user_id: userId,
      email: email.toLowerCase(),
      name: sanitizeText(brandName),
      industry: sanitizeText(industry),
      company_size: companySize ? sanitizeText(companySize) : null,
      website: website ? sanitizeText(website) : null,
      cui: cui ? sanitizeText(cui) : null,
      company_legal_name: companyLegalName ? sanitizeText(companyLegalName) : null,
      company_address: companyAddress ? sanitizeText(companyAddress) : null,
      credits_balance: 0,
      approval_status: 'pending',
      verification_status: 'unverified',
    }

    const { error: brandError } = await adminClient.from('brands').upsert(brandInsertData)

    if (brandError) {
      return { error: `Failed to create brand profile: ${brandError.message}` }
    }

    // Trimite email de bun venit brand
    try {
      const { emailWelcomeBrand } = await import('@/lib/email')
      await emailWelcomeBrand(email.toLowerCase(), sanitizeText(brandName))
    } catch (e) { console.error('[Welcome brand email failed]', e) }

    revalidatePath('/')
    return { success: true, role: 'BRAND' }
  } catch (err: any) {
    return { error: err.message || 'Registration failed' }
  }
}

// Generează un cod referral unic de 8 caractere din userId
function UPPER_CODE(userId: string): string {
  return userId.replace(/-/g, '').substring(0, 8).toUpperCase()
}

export async function registerInfluencer(
  email: string,
  password: string,
  name: string,
  bio: string,
  niches: string[],
  country?: string,
  platforms?: Record<string, string>,
  city?: string,
  cityLat?: number,
  cityLon?: number,
  referralCode?: string,
  platformsArray?: { platform: string; url: string }[],
) {
  try {

    // --- Client-side validation ---
    if (!validateEmail(email)) {
      return { error: 'Invalid email format' }
    }
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return { error: passwordValidation.errors.join(', ') }
    }
    if (name.trim().length < 2 || name.trim().length > 50) {
      return { error: 'Name must be between 2 and 50 characters' }
    }
    if (!validateInfluencerBio(bio)) {
      return { error: 'Bio must be between 10 and 500 characters' }
    }
    if (!niches || niches.length === 0) {
      return { error: 'Please select at least one niche' }
    }

    const adminClient = createAdminClient()

    // --- Check if auth user already exists to avoid triggering email rate limit ---
    const existingAuthUser = await getExistingAuthUser(email)

    let userId: string

    if (existingAuthUser) {
      // Auth user already exists from a previous attempt — do NOT call signUp again
      const { data: existingInfluencer } = await adminClient
        .from('influencers')
        .select('id')
        .eq('user_id', existingAuthUser.id)
        .single()

      if (existingInfluencer) {
        return { error: 'This email is already registered. Please log in instead.' }
      }

      userId = existingAuthUser.id
    } else {
      // New user — create auth account fără confirmare email (auto-approved)
      const supabase = await createClient()
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role: 'influencer', email_verified: true },
        },
      })

      if (authError) {
        if (authError.message.toLowerCase().includes('rate limit')) {
          return {
            error:
              'Email rate limit reached. Please wait a few minutes before trying again, or check your inbox for an existing confirmation email.',
            rateLimited: true,
          }
        }
        return { error: authError.message }
      }

      if (!authData.user) {
        return { error: 'Failed to create account. Please try again.' }
      }

      userId = authData.user.id
    }

    // --- Upsert profile (safe on retry) ---
    const { error: profileError } = await upsertProfile(userId, email, 'influencer')
    if (profileError) {
      return { error: `Failed to create profile: ${profileError.message}` }
    }

    // --- Insert or update influencer-specific record ---
    // Get existing influencer ID if it exists, or generate a new one
    const { data: existingInfluencerData } = await adminClient
      .from('influencers')
      .select('id')
      .eq('user_id', userId)
      .single()

    const influencerId = existingInfluencerData?.id

    // Generate a unique slug from the influencer's name + random suffix to ensure uniqueness
    const baseSlug = generateSlug(sanitizeText(name))
    const uniqueSuffix = Math.random().toString(36).substring(2, 7)
    const slug = `${baseSlug}-${uniqueSuffix}`

    const influencerInsertData = {
      ...(influencerId && { id: influencerId }),
      user_id: userId,
      email: email.toLowerCase(),
      name: sanitizeText(name),
      slug,
      bio: sanitizeText(bio),
      niches: niches.map((n) => sanitizeText(n)),
      country: country ? sanitizeText(country) : null,
      city: city ? sanitizeText(city) : null,
      latitude: cityLat || null,
      longitude: cityLon || null,
      platforms: platformsArray && platformsArray.length > 0 ? platformsArray : (platforms || null),
      approval_status: 'approved',
      verification_status: 'unverified',
      // Generează codul referral unic pentru acest influencer
      referral_code: UPPER_CODE(userId),
      // Salvează codul referitorului dacă există
      referred_by: referralCode?.toUpperCase() || null,
      // Acordul termenilor — înregistrat cu timestamp și versiune
      terms_accepted_at: new Date().toISOString(),
      terms_version: 'v1',
    }

    const { error: influencerError } = await adminClient.from('influencers').upsert(influencerInsertData)

    if (influencerError) {
      return { error: `Failed to create influencer profile: ${influencerError.message}` }
    }

    // Trimite email de bun venit influencer
    try {
      const { emailWelcomeInfluencer } = await import('@/lib/email')
      await emailWelcomeInfluencer(email.toLowerCase(), sanitizeText(name))
    } catch (e) { console.error('[Welcome email failed]', e) }

    revalidatePath('/')
    return { success: true, role: 'INFLUENCER' }
  } catch (err: any) {
    return { error: err.message || 'Registration failed' }
  }
}

export async function logout() {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Logout failed' }
  }
}