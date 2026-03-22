'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, requireSuperAdmin } from '@/lib/supabase/verify-admin'
import { revalidatePath } from 'next/cache'
import { emailInfluencerApproved, emailInfluencerRejected, emailBrandVerified, emailBrandVerificationRejected } from '@/lib/email'

// Helper: Generate URL-friendly slug
function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
}

// Validation helper for slug
function validateSlug(slug: string): { valid: boolean; error?: string } {
  if (!slug || slug.trim().length === 0) {
    return { valid: false, error: 'Slug is required and cannot be empty' }
  }
  if (slug.length < 3) {
    return { valid: false, error: 'Slug must be at least 3 characters long' }
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { valid: false, error: 'Slug must contain only lowercase letters, numbers, and hyphens' }
  }
  return { valid: true }
}

// Create new influencer profile
export async function createInfluencer(data: {
  name: string
  email: string
  slug?: string
  bio?: string
  phone?: string
  country?: string
  niches?: string[]
  platforms?: Record<string, string>
  price_from?: number
  price_to?: number
}) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth
    // Validate required fields
    if (!data.name?.trim()) {
      return { error: 'Name is required' }
    }
    if (!data.email?.trim()) {
      return { error: 'Email is required' }
    }

    // Handle slug - auto-generate from name if not provided or invalid
    let finalSlug = data.slug?.trim().toLowerCase() || ''

    if (!finalSlug) {
      console.log('[v0] Slug not provided, generating from name:', data.name)
      finalSlug = generateSlugFromName(data.name)
    }

    // Validate slug (final check)
    const slugValidation = validateSlug(finalSlug)
    if (!slugValidation.valid) {
      console.error('[v0] Slug validation failed:', slugValidation.error)
      return { error: `Invalid slug: ${slugValidation.error}. Please provide a valid slug.` }
    }

    console.log('[v0] Using slug:', finalSlug)

    const adminClient = createAdminClient()

    // Check if slug already exists
    const { data: existingInfluencer, error: slugCheckError } = await adminClient
      .from('influencers')
      .select('id')
      .eq('slug', finalSlug)
      .single()

    if (existingInfluencer) {
      console.log('[v0] Slug already exists:', finalSlug)
      return { error: `Slug "${finalSlug}" is already taken. Please choose a different one.` }
    }

    // Check if email already exists
    const { data: existingEmail } = await adminClient
      .from('influencers')
      .select('id')
      .eq('email', data.email.trim().toLowerCase())
      .single()

    if (existingEmail) {
      return { error: 'Email already exists' }
    }

    // Ensure slug is not null before inserting
    if (!finalSlug || finalSlug.length === 0) {
      console.error('[v0] CRITICAL: Slug is empty before insert')
      return { error: 'Critical error: Slug validation failed. Please contact support.' }
    }

    // Create influencer record with non-null slug
    const { data: newInfluencer, error: createError } = await adminClient
      .from('influencers')
      .insert({
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        slug: finalSlug, // Guaranteed non-null at this point
        bio: data.bio?.trim() || null,
        phone: data.phone?.trim() || null,
        country: data.country?.trim() || null,
        niches: data.niches || [],
        platforms: data.platforms || null,
        price_from: data.price_from || null,
        price_to: data.price_to || null,
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: null,
      })
      .select()
      .single()

    if (createError) {
      console.error('[v0] Database error creating influencer:', createError)
      return { error: `Failed to create influencer: ${createError.message}` }
    }

    console.log('[v0] Influencer created successfully:', newInfluencer.id)
    revalidatePath('/admin/influencers')
    return { success: true, data: newInfluencer }
  } catch (err: any) {
    console.error('[v0] Error in createInfluencer:', err)
    return { error: err.message || 'Failed to create influencer' }
  }
}

// Update influencer profile
export async function updateInfluencer(
  id: string,
  data: {
    name?: string
    email?: string
    slug?: string
    bio?: string
    phone?: string
    country?: string
    niches?: string[]
    platforms?: Record<string, string>
    price_from?: number
    price_to?: number
  }
) {
  try {
    const adminClient = createAdminClient()

    // If slug is being updated, validate it
    if (data.slug) {
      const slugValidation = validateSlug(data.slug)
      if (!slugValidation.valid) {
        return { error: slugValidation.error }
      }

      // Check if new slug is already taken by another influencer
      const { data: existingSlug } = await adminClient
        .from('influencers')
        .select('id')
        .eq('slug', data.slug.toLowerCase())
        .neq('id', id)
        .single()

      if (existingSlug) {
        return { error: `Slug "${data.slug}" is already taken` }
      }
    }

    // If name is being updated but slug is not, auto-generate slug from new name
    if (data.name && !data.slug) {
      const generatedSlug = generateSlugFromName(data.name)
      const slugValidation = validateSlug(generatedSlug)
      if (slugValidation.valid) {
        // Check if auto-generated slug is available
        const { data: existingAutoSlug } = await adminClient
          .from('influencers')
          .select('id')
          .eq('slug', generatedSlug)
          .neq('id', id)
          .single()

        if (!existingAutoSlug) {
          console.log('[v0] Auto-generating slug from updated name:', generatedSlug)
          data.slug = generatedSlug
        }
      }
    }

    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name.trim()
    if (data.email !== undefined) updateData.email = data.email.trim().toLowerCase()
    if (data.slug !== undefined) updateData.slug = data.slug.trim().toLowerCase()
    if (data.bio !== undefined) updateData.bio = data.bio?.trim() || null
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null
    if (data.country !== undefined) updateData.country = data.country?.trim() || null
    if (data.niches !== undefined) updateData.niches = data.niches
    if (data.platforms !== undefined) updateData.platforms = data.platforms
    if (data.price_from !== undefined) updateData.price_from = data.price_from
    if (data.price_to !== undefined) updateData.price_to = data.price_to
    updateData.updated_at = new Date().toISOString()

    const { data: updatedInfluencer, error: updateError } = await adminClient
      .from('influencers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[v0] Database error updating influencer:', updateError)
      return { error: `Failed to update influencer: ${updateError.message}` }
    }

    console.log('[v0] Influencer updated successfully:', id)
    revalidatePath('/admin/influencers')
    revalidatePath(`/admin/influencers/${id}`)
    return { success: true, data: updatedInfluencer }
  } catch (err: any) {
    console.error('[v0] Error in updateInfluencer:', err)
    return { error: err.message || 'Failed to update influencer' }
  }
}

// Delete influencer
export async function deleteInfluencer(id: string) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth
    const adminClient = createAdminClient()

    const { error: deleteError } = await adminClient
      .from('influencers')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return { error: `Failed to delete influencer: ${deleteError.message}` }
    }

    revalidatePath('/admin/influencers')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to delete influencer' }
  }
}

// Get all influencers
export async function getAllInfluencers(options?: { search?: string; limit?: number; offset?: number }) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth
    const adminClient = createAdminClient()
    let query = adminClient.from('influencers').select('*', { count: 'exact' })

    if (options?.search) {
      query = query.or(
        `name.ilike.%${options.search}%,email.ilike.%${options.search}%,slug.ilike.%${options.search}%`
      )
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(options?.offset || 0, (options?.offset || 0) + (options?.limit || 50) - 1)

    if (error) {
      return { error: `Failed to fetch influencers: ${error.message}` }
    }

    return { success: true, data, total: count }
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch influencers' }
  }
}

// Get single influencer
export async function getInfluencer(id: string) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('influencers')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return { error: `Influencer not found: ${error.message}` }
    }

    return { success: true, data }
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch influencer' }
  }
}

// ─── BRANDS ───────────────────────────────────────────────────────────────────

export async function getAllBrands() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    const { data, count, error } = await sb
      .from('brands')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (error) return { error: error.message }
    return { success: true, data, total: count }
  } catch (e: any) { return { error: e.message } }
}

export async function adminAdjustCredits(
  brandId: string,
  amount: number,
  type: 'add' | 'subtract',
  reason: string
) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()

    const { data: brand } = await sb.from('brands')
      .select('credits_balance, user_id').eq('id', brandId).single()
    if (!brand) return { error: 'Brand negăsit.' }

    const currentBalance = brand.credits_balance || 0
    const newBalance = type === 'add'
      ? currentBalance + amount
      : Math.max(0, currentBalance - amount)

    await sb.from('brands').update({ credits_balance: newBalance }).eq('id', brandId)

    await sb.from('brand_transactions').insert({
      brand_id: brandId,
      type: type === 'add' ? 'TOPUP' : 'SPEND',
      amount: type === 'add' ? amount : -amount,
      description: `Ajustare manuală admin: ${reason}`,
      status: 'completed',
    })

    // Notifică brandul
    if (brand.user_id) {
      await sb.from('notifications').insert({
        user_id: brand.user_id,
        title: type === 'add' ? '💰 Credite adăugate' : '💸 Credite ajustate',
        body: `${amount.toLocaleString('ro-RO')} RON ${type === 'add' ? 'au fost adăugate în' : 'au fost scăzute din'} wallet-ul tău. Motiv: ${reason}`,
        link: '/brand/wallet',
        read: false,
      })
    }

    revalidatePath('/admin/brands')
    return { success: true, newBalance }
  } catch (e: any) { return { error: e.message } }
}

export async function updateBrandStatus(id: string, status: 'active' | 'suspended') {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    const { error } = await sb.from('brands').update({ status }).eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/brands')
    return { success: true }
  } catch (e: any) { return { error: e.message } }
}

export async function deleteBrand(id: string) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    const { error } = await sb.from('brands').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/brands')
    return { success: true }
  } catch (e: any) { return { error: e.message } }
}

// ─── CAMPAIGNS ────────────────────────────────────────────────────────────────

export async function getAllCampaigns() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    const { data, count, error } = await sb
      .from('campaigns')
      .select('*, brands(id, name, website)', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (error) return { error: error.message }
    // Attach brand_website at top level for easy access
    const enriched = (data || []).map((c: any) => ({
      ...c,
      brand_website: c.brands?.website || null,
    }))
    return { success: true, data: enriched, total: count }
  } catch (e: any) { return { error: e.message } }
}

export async function adminUpdateCampaignStatus(id: string, status: string) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    const { error } = await sb.from('campaigns').update({ status }).eq('id', id)
    if (error) return { error: error.message }

    // La completare — restituie creditele neutilizate brandului
    if (status === 'COMPLETED') {
      try {
        const { data: camp } = await sb.from('campaigns')
          .select('brand_id, budget, max_influencers, current_influencers, campaign_type')
          .eq('id', id).single()

        if (camp && camp.brand_id && camp.budget > 0 && camp.max_influencers > 0) {
          const actualInfluencers = camp.current_influencers || 0
          const plannedInfluencers = camp.max_influencers

          if (actualInfluencers < plannedInfluencers) {
            // Calculează credite de restituit
            const perInfluencer = Math.round(camp.budget / plannedInfluencers)
            const unusedSlots = plannedInfluencers - actualInfluencers
            const refundAmount = perInfluencer * unusedSlots

            if (refundAmount > 0) {
              // Adaugă creditele înapoi în wallet
              const { data: brand } = await sb.from('brands')
                .select('credits_balance').eq('id', camp.brand_id).single()

              if (brand) {
                const newBalance = (brand.credits_balance || 0) + refundAmount
                await sb.from('brands').update({ credits_balance: newBalance }).eq('id', camp.brand_id)

                // Log tranzacție restituire
                await sb.from('brand_transactions').insert({
                  brand_id: camp.brand_id,
                  type: 'REFUND',
                  amount: refundAmount,
                  description: `Restituire credite — campanie completată cu ${actualInfluencers}/${plannedInfluencers} influenceri (${refundAmount.toLocaleString('ro-RO')} RON înapoiați)`,
                  status: 'completed',
                })

                // Notifică brandul
                const { data: brandUser } = await sb.from('brands').select('user_id').eq('id', camp.brand_id).single()
                if (brandUser) {
                  await sb.from('notifications').insert({
                    user_id: brandUser.user_id,
                    title: '💰 Credite restituite',
                    body: `Campania a fost completată cu ${actualInfluencers} din ${plannedInfluencers} influenceri. ${refundAmount.toLocaleString('ro-RO')} RON au fost returnați în wallet-ul tău.`,
                    link: '/brand/wallet',
                    read: false,
                  })
                }
              }
            }
          }
        }
      } catch (refundErr) {
        console.error('[Credit refund failed]', refundErr)
        // Nu blocăm completarea campaniei dacă restituirea eșuează
      }
    }

    revalidatePath('/admin/campaigns')
    return { success: true }
  } catch (e: any) { return { error: e.message } }
}

export async function deleteCampaign(id: string) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    const { error } = await sb.from('campaigns').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/campaigns')
    return { success: true }
  } catch (e: any) { return { error: e.message } }
}

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────

export async function getAllPayments() {
  try {
    const auth = await requireSuperAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    const { data: txs, error } = await sb
      .from('brand_transactions')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return { error: error.message }
    if (!txs?.length) return { success: true, data: [], total: 0 }

    // Fetch brand names separately (no FK dependency)
    const brandIds = [...new Set(txs.map((t: any) => t.brand_id))]
    const { data: brands } = await sb
      .from('brands')
      .select('id, name, email, industry, user_id')
      .in('id', brandIds)
    const brandMap: Record<string, any> = Object.fromEntries((brands ?? []).map((b: any) => [b.id, b]))
    const data = txs.map((tx: any) => ({ ...tx, brand: brandMap[tx.brand_id] ?? null }))
    return { success: true, data, total: data.length }
  } catch (e: any) { return { error: e.message } }
}

export async function confirmPayment(transactionId: string) {
  try {
    const auth = await requireSuperAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    const { data: tx, error: txErr } = await sb
      .from('brand_transactions')
      .select('amount, brand_id')
      .eq('id', transactionId)
      .single()
    if (txErr || !tx) return { error: 'Transaction not found' }

    const { error: updateErr } = await sb
      .from('brand_transactions')
      .update({ status: 'completed' })
      .eq('id', transactionId)
    if (updateErr) return { error: updateErr.message }

    const { data: brand } = await sb.from('brands').select('credits_balance, user_id').eq('id', tx.brand_id).single()
    if (brand) {
      await sb.from('brands').update({ credits_balance: (brand.credits_balance || 0) + tx.amount }).eq('id', tx.brand_id)
      // notify brand user
      if (brand.user_id) {
        try {
          await sb.from('notifications').insert({
            user_id: brand.user_id,
            title: '✅ Credite adăugate în cont!',
            body: `${tx.amount.toFixed(2)} RON au fost adăugați în walletul tău. Poți lansa campanii acum.`,
            link: '/brand/wallet',
            read: false,
          })
        } catch (_) { }
      }
    }
    revalidatePath('/admin/payments')
    return { success: true }
  } catch (e: any) { return { error: e.message } }
}

export async function rejectPayment(transactionId: string) {
  try {
    const auth = await requireSuperAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    const { error } = await sb
      .from('brand_transactions')
      .update({ status: 'failed' })
      .eq('id', transactionId)
    if (error) return { error: error.message }
    revalidatePath('/admin/payments')
    return { success: true }
  } catch (e: any) { return { error: e.message } }
}

// ─── INFLUENCER APPROVAL ──────────────────────────────────────────────────────

export async function approveInfluencer(id: string) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    const { error } = await sb
      .from('influencers')
      .update({ approval_status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/influencers')
    return { success: true }
  } catch (e: any) { return { error: e.message } }
}

export async function rejectInfluencer(id: string, reason?: string) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    const { data: inf } = await sb.from('influencers').select('email, name').eq('id', id).single()
    const update: any = { approval_status: 'rejected' }
    if (reason) update.rejection_reason = reason
    const { error } = await sb.from('influencers').update(update).eq('id', id)
    if (error) return { error: error.message }
    if (inf?.email && reason) emailInfluencerRejected(inf.email, inf.name || 'Influencer', reason).catch(() => { })
    revalidatePath('/admin/influencers')
    return { success: true }
  } catch (e: any) { return { error: e.message } }
}

// ─── STATS ────────────────────────────────────────────────────────────────────

export async function getAdminStats() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    const [infRes, brandRes, campRes, payRes] = await Promise.all([
      sb.from('influencers').select('id, approval_status, created_at', { count: 'exact' }),
      sb.from('brands').select('id, created_at', { count: 'exact' }),
      sb.from('campaigns').select('id, status, created_at', { count: 'exact' }),
      sb.from('brand_transactions').select('amount, status, created_at'),
    ])
    const totalRevenue = (payRes.data ?? []).filter(t => t.status === 'completed').reduce((s, t) => s + (t.amount || 0), 0)
    const pendingRevenue = (payRes.data ?? []).filter(t => t.status === 'pending').reduce((s, t) => s + (t.amount || 0), 0)
    return {
      success: true,
      influencers: { total: infRes.count ?? 0, approved: (infRes.data ?? []).filter(i => i.approval_status === 'approved').length, pending: (infRes.data ?? []).filter(i => i.approval_status === 'pending').length },
      brands: { total: brandRes.count ?? 0 },
      campaigns: { total: campRes.count ?? 0, active: (campRes.data ?? []).filter(c => c.status === 'ACTIVE').length },
      revenue: { total: totalRevenue, pending: pendingRevenue },
    }
  } catch (e: any) { return { error: e.message } }
}

export async function approveBrandVerification(brandId: string) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    const { data: brand } = await sb.from('brands').select('email, name').eq('id', brandId).single()
    const { error } = await sb.from('brands').update({
      verification_status: 'verified',
      approval_status: 'approved',
      verification_reviewed_at: new Date().toISOString(),
      verification_rejection_reason: null,
    }).eq('id', brandId)
    if (error) return { error: error.message }
    if (brand?.email) emailBrandVerified(brand.email, brand.name || 'Brand').catch(() => { })
    revalidatePath('/admin/brands')
    return { success: true }
  } catch (e: any) { return { error: e.message } }
}

export async function rejectBrandVerification(brandId: string, reason: string) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    const { data: brand } = await sb.from('brands').select('email, name').eq('id', brandId).single()
    const { error } = await sb.from('brands').update({
      verification_status: 'rejected',
      verification_reviewed_at: new Date().toISOString(),
      verification_rejection_reason: reason,
    }).eq('id', brandId)
    if (error) return { error: error.message }
    if (brand?.email) emailBrandVerificationRejected(brand.email, brand.name || 'Brand', reason).catch(() => { })
    revalidatePath('/admin/brands')
    return { success: true }
  } catch (e: any) { return { error: e.message } }
}

export async function getBrandVerificationDetails(brandId: string) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    const { data, error } = await sb.from('brands').select('*').eq('id', brandId).single()
    if (error) return { error: error.message }
    return { success: true, data }
  } catch (e: any) { return { error: e.message } }
}

export async function getDocumentSignedUrl(documentPath: string) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    // Normalize path — handle both stored paths and legacy full URLs
    let path = documentPath
    if (documentPath.startsWith('http')) {
      // Legacy: was stored as full public URL — extract path after bucket name
      const match = documentPath.match(/brand-documents\/(.+?)(?:\?|$)/)
      if (match) path = decodeURIComponent(match[1])
      else return { error: 'Could not parse document path from URL' }
    }
    // path should now be like: "user-uuid/verification-timestamp.pdf"
    const { data, error } = await sb.storage
      .from('brand-documents')
      .createSignedUrl(path, 60 * 60) // 1 hour expiry
    if (error) return { error: error.message }
    return { success: true, url: data.signedUrl }
  } catch (e: any) { return { error: e.message } }
}

export async function getAdminChartData() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    const [infRes, brandRes, campRes, txRes, collabRes] = await Promise.all([
      sb.from('influencers').select('created_at').gte('created_at', sixMonthsAgo.toISOString()),
      sb.from('brands').select('created_at').gte('created_at', sixMonthsAgo.toISOString()),
      sb.from('campaigns').select('id, title, status, budget, created_at'),
      sb.from('brand_transactions').select('amount, status, created_at').gte('created_at', sixMonthsAgo.toISOString()),
      sb.from('collaborations').select('campaign_id, status, payment_amount, created_at'),
    ])

    // Build monthly buckets for last 6 months
    const months: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }

    function bucketByMonth(rows: any[], dateField = 'created_at') {
      const map: Record<string, number> = {}
      months.forEach(m => { map[m] = 0 })
        ; (rows ?? []).forEach(r => {
          const m = r[dateField]?.slice(0, 7)
          if (m && map[m] !== undefined) map[m]++
        })
      return months.map(m => map[m])
    }

    function revenueByMonth(rows: any[]) {
      const map: Record<string, number> = {}
      months.forEach(m => { map[m] = 0 })
        ; (rows ?? []).filter(r => r.status === 'completed').forEach(r => {
          const m = r.created_at?.slice(0, 7)
          if (m && map[m] !== undefined) map[m] += (r.amount || 0)
        })
      return months.map(m => map[m])
    }

    // Top performing campaigns (most collaborations)
    const collabsByCampaign: Record<string, number> = {}
    const completedByCampaign: Record<string, number> = {}
      ; (collabRes.data ?? []).forEach(c => {
        collabsByCampaign[c.campaign_id] = (collabsByCampaign[c.campaign_id] || 0) + 1
        if (c.status === 'COMPLETED') completedByCampaign[c.campaign_id] = (completedByCampaign[c.campaign_id] || 0) + 1
      })

    const topCampaigns = (campRes.data ?? [])
      .map(c => ({
        id: c.id, title: c.title, status: c.status, budget: c.budget,
        collabs: collabsByCampaign[c.id] || 0,
        completed: completedByCampaign[c.id] || 0,
      }))
      .sort((a, b) => b.collabs - a.collabs)
      .slice(0, 5)

    const monthLabels = months.map(m => {
      const [y, mo] = m.split('-')
      return new Date(+y, +mo - 1, 1).toLocaleString('en', { month: 'short' })
    })

    return {
      success: true,
      monthLabels,
      influencerGrowth: bucketByMonth(infRes.data ?? []),
      brandGrowth: bucketByMonth(brandRes.data ?? []),
      revenue: revenueByMonth(txRes.data ?? []),
      topCampaigns,
    }
  } catch (e: any) { return { error: e.message } }
}

// ─── WITHDRAWALS (influencer payouts) ────────────────────────────────────────
export async function getAllWithdrawals() {
  try {
    const auth = await requireSuperAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    // Step 1: get all PAYOUT transactions
    const { data: txs, error } = await sb
      .from('transactions')
      .select('*')
      .eq('type', 'PAYOUT')
      .order('created_at', { ascending: false })
    if (error) return { error: error.message }
    if (!txs?.length) return { success: true, data: [] }
    // Step 2: get influencer info + payment methods
    const userIds = [...new Set(txs.map((t: any) => t.user_id))]
    const { data: influencers } = await sb
      .from('influencers')
      .select('user_id, name, email, id')
      .in('user_id', userIds)
    const { data: paymentMethods } = await sb
      .from('influencer_payment_methods')
      .select('*')
      .in('user_id', userIds)
    const infMap: Record<string, any> = Object.fromEntries((influencers ?? []).map((i: any) => [i.user_id, i]))
    const pmMap: Record<string, any[]> = {}
    for (const pm of paymentMethods ?? []) {
      if (!pmMap[pm.user_id]) pmMap[pm.user_id] = []
      pmMap[pm.user_id].push(pm)
    }
    const data = txs.map((tx: any) => ({
      ...tx,
      influencer: infMap[tx.user_id] ?? null,
      payment_methods: pmMap[tx.user_id] ?? [],
      default_method: (pmMap[tx.user_id] ?? []).find((m: any) => m.is_default) ?? (pmMap[tx.user_id]?.[0] ?? null),
    }))
    return { success: true, data }
  } catch (e: any) { return { error: e.message } }
}

export async function approveWithdrawal(txId: string) {
  try {
    const auth = await requireSuperAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    const { error } = await sb.from('transactions').update({ status: 'completed' }).eq('id', txId)
    if (error) return { error: error.message }
    // Also update pending_payout on influencer
    const { data: tx } = await sb.from('transactions').select('amount, user_id').eq('id', txId).single()
    if (tx) {
      const { data: inf } = await sb.from('influencers').select('id, pending_payout').eq('user_id', tx.user_id).single()
      if (inf) {
        await sb.from('influencers').update({
          pending_payout: Math.max(0, (inf.pending_payout || 0) - Math.abs(tx.amount))
        }).eq('id', inf.id)
      }
      // notify user
      await sb.from('notifications').insert({
        user_id: tx.user_id,
        title: '✅ Retragere procesată!',
        body: `Retragerea ta de ${Math.abs(tx.amount).toFixed(2)} RON a fost procesată cu succes.`,
        link: '/influencer/wallet',
        read: false,
      })
    }
    return { success: true }
  } catch (e: any) { return { error: e.message } }
}

export async function rejectWithdrawal(txId: string, reason: string) {
  try {
    const auth = await requireSuperAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    const { data: tx } = await sb.from('transactions').select('amount, user_id').eq('id', txId).single()
    if (!tx) return { error: 'Transaction not found' }
    // Mark as failed
    await sb.from('transactions').update({ status: 'failed' }).eq('id', txId)
    // Refund wallet
    const { data: inf } = await sb.from('influencers').select('id, wallet_balance, pending_payout').eq('user_id', tx.user_id).single()
    if (inf) {
      await sb.from('influencers').update({
        wallet_balance: (inf.wallet_balance || 0) + Math.abs(tx.amount),
        pending_payout: Math.max(0, (inf.pending_payout || 0) - Math.abs(tx.amount))
      }).eq('id', inf.id)
    }
    // Notify user
    await sb.from('notifications').insert({
      user_id: tx.user_id,
      title: '❌ Retragere respinsă',
      body: `Retragerea ta a fost respinsă. Motiv: ${reason}. Suma a fost returnată în wallet.`,
      link: '/influencer/wallet',
      read: false,
    })
    return { success: true }
  } catch (e: any) { return { error: e.message } }
}

// ─── REVENUE OVERVIEW ────────────────────────────────────────────────────────
export async function getRevenueStats() {
  try {
    const auth = await requireSuperAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    const [collabRes, txRes, withdrawRes] = await Promise.all([
      sb.from('collaborations').select('platform_fee, completed_at, payment_amount').eq('status', 'COMPLETED'),
      sb.from('brand_transactions').select('amount, status, created_at, type'),
      sb.from('transactions').select('amount, status, created_at, type').eq('type', 'PAYOUT'),
    ])
    const completedCollabs = collabRes.data ?? []
    const totalCommission = completedCollabs.reduce((s, c) => s + (c.platform_fee || 0), 0)
    const totalPaidOut = completedCollabs.reduce((s, c) => s + (c.payment_amount || 0), 0)
    const totalBrandTopups = (txRes.data ?? []).filter(t => t.type === 'TOPUP' && t.status === 'completed').reduce((s, t) => s + (t.amount || 0), 0)
    const pendingTopups = (txRes.data ?? []).filter(t => t.type === 'TOPUP' && t.status === 'pending').reduce((s, t) => s + (t.amount || 0), 0)
    const pendingWithdrawals = (withdrawRes.data ?? []).filter(t => t.status === 'pending').reduce((s, t) => s + Math.abs(t.amount || 0), 0)
    const completedWithdrawals = (withdrawRes.data ?? []).filter(t => t.status === 'completed').reduce((s, t) => s + Math.abs(t.amount || 0), 0)
    // Monthly breakdown (last 6 months)
    const now = new Date()
    const monthly = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const label = d.toLocaleDateString('ro-RO', { month: 'short' })
      const commission = completedCollabs.filter(c => {
        if (!c.completed_at) return false
        const cd = new Date(c.completed_at)
        return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth()
      }).reduce((s, c) => s + (c.platform_fee || 0), 0)
      return { label, commission }
    })
    return { success: true, totalCommission, totalPaidOut, totalBrandTopups, pendingTopups, pendingWithdrawals, completedWithdrawals, monthly, totalCollabs: completedCollabs.length }
  } catch (e: any) { return { error: e.message } }
}

// ─── ALL COLLABORATIONS ───────────────────────────────────────────────────────
export async function getAllCollaborations(limit = 50) {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    const { data, error } = await sb
      .from('collaborations')
      .select('*, campaigns(title, budget, budget_per_influencer, max_influencers), influencers(name, email), brands(name)')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return { error: error.message }
    return { success: true, data }
  } catch (e: any) { return { error: e.message } }
}

// ─── CSV EXPORTS ─────────────────────────────────────────────────────────────
export async function exportInfluencersCSV() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    const { data } = await sb.from('influencers')
      .select('name, email, country, niches, approval_status, wallet_balance, total_earned, created_at')
      .order('created_at', { ascending: false })
    if (!data) return { error: 'No data' }
    const headers = ['Nume', 'Email', 'Țară', 'Nișe', 'Status', 'Wallet', 'Total Câștigat', 'Data înregistrării']
    const rows = data.map(r => [
      r.name, r.email, r.country || '',
      (r.niches || []).join('; '), r.approval_status,
      (r.wallet_balance || 0).toFixed(2),
      (r.total_earned || 0).toFixed(2),
      new Date(r.created_at).toLocaleDateString('ro-RO'),
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    return { success: true, csv, filename: `influencers-${new Date().toISOString().split('T')[0]}.csv` }
  } catch (e: any) { return { error: e.message } }
}

export async function exportCollaborationsCSV() {
  try {
    const auth = await requireAdmin()
    if ('error' in auth) return auth
    const sb = createAdminClient()
    const { data } = await sb.from('collaborations')
      .select('status, payment_amount, platform_fee, created_at, completed_at, campaigns(title, budget), influencers(name, email), brands(name)')
      .order('created_at', { ascending: false })
    if (!data) return { error: 'No data' }
    const headers = ['Status', 'Brand', 'Influencer', 'Email', 'Campanie', 'Buget', 'Plată influencer', 'Comision platformă', 'Dată creare', 'Dată finalizare']
    const rows = data.map((r: any) => [
      r.status, r.brands?.name || '', r.influencers?.name || '', r.influencers?.email || '',
      r.campaigns?.title || '', (r.campaigns?.budget || 0).toFixed(2),
      (r.payment_amount || 0).toFixed(2), (r.platform_fee || 0).toFixed(2),
      new Date(r.created_at).toLocaleDateString('ro-RO'),
      r.completed_at ? new Date(r.completed_at).toLocaleDateString('ro-RO') : '',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    return { success: true, csv, filename: `colaborari-${new Date().toISOString().split('T')[0]}.csv` }
  } catch (e: any) { return { error: e.message } }
}