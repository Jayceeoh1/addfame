// Reguli pure pentru ștergerea contului (fără bază de date).
// Nu ștergem rânduri de bani: decidem doar dacă cererea poate fi procesată
// și ce câmpuri personale pot fi anonimizate.

export const MONEY_EPSILON = 0.005

export const TERMINAL_COLLAB_STATUSES = new Set([
  'COMPLETED', 'CANCELLED', 'CANCELED', 'REJECTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN', 'REFUNDED',
])

export const CLOSED_DISPUTE_STATUSES = new Set([
  'RESOLVED', 'CLOSED', 'DISMISSED', 'CANCELLED', 'CANCELED', 'REJECTED',
])

export const OPEN_CAMPAIGN_STATUSES = new Set(['ACTIVE', 'PAUSED', 'PUBLISHED', 'LIVE'])

export type BlockerCode =
  | 'wallet'
  | 'pending_payout'
  | 'escrow'
  | 'active_campaigns'
  | 'active_collaborations'
  | 'open_dispute'

export type Blocker = { code: BlockerCode; message: string }

export type CollabRow = {
  status?: string | null
  pay_reserved?: unknown
  pay_refunded?: unknown
  payment_amount?: unknown
}

export type CampaignRow = {
  status?: string | null
  pay_reserved?: unknown
  pay_released?: unknown
  pay_refunded?: unknown
  escrow_amount?: unknown
}

export type DeletionCheckInput = {
  walletBalance?: unknown
  pendingPayout?: unknown
  creditsBalance?: unknown
  creditsReserved?: unknown
  collaborations?: CollabRow[] | null
  campaigns?: CampaignRow[] | null
  disputes?: { status?: string | null }[] | null
}

const NAME_KEYS = new Set([
  'name', 'full_name', 'contact_name', 'company_name', 'legal_name', 'billing_company', 'billing_name',
])
const EMAIL_KEYS = new Set(['email', 'billing_email', 'contact_email'])
const SLUG_KEYS = new Set(['slug'])
const EMPTY_STRING_KEYS = new Set(['bio', 'description', 'ig_bio'])
const FALSE_KEYS = new Set(['instagram_connected', 'tiktok_connected'])
const EMPTY_ARRAY_KEYS = new Set(['platforms', 'niches', 'social_links'])
const EMPTY_OBJECT_KEYS = new Set(['settings'])

/** Câmpuri personale. Orice altceva (sold, escrow, stripe, id) rămâne neatins. */
export const PII_KEYS = new Set([
  ...NAME_KEYS,
  ...EMAIL_KEYS,
  ...SLUG_KEYS,
  ...EMPTY_STRING_KEYS,
  ...FALSE_KEYS,
  ...EMPTY_ARRAY_KEYS,
  ...EMPTY_OBJECT_KEYS,
  'phone', 'contact_phone', 'billing_phone',
  'city', 'country', 'address', 'street', 'street_number', 'postal_code', 'county', 'billing_address',
  'avatar', 'logo', 'ig_avatar', 'profile_picture',
  'website', 'industry', 'company_size',
  'instagram_handle', 'instagram_user_id', 'instagram_access_token', 'instagram_token_expires',
  'ig_account_type', 'ig_followers', 'ig_following', 'ig_posts_count', 'ig_engagement_rate', 'ig_last_sync',
  'tiktok_handle', 'tt_handle', 'tt_followers', 'tt_username', 'tt_user_id',
  'telegram_chat_id', 'telegram_link_code', 'telegram_username',
  'iban', 'bank_name', 'bank_account', 'account_holder', 'holder_name', 'account_name', 'swift', 'bic',
  'cnp', 'date_of_birth', 'birth_date', 'ci_serie', 'ci_numar',
  'id_front_url', 'id_back_url', 'selfie_url', 'document_url', 'verification_document',
  'facebook', 'youtube', 'linkedin', 'youtube_handle',
])

export function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function isNonZeroMoney(v: unknown): boolean {
  return Math.abs(num(v)) > MONEY_EPSILON
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function formatRon(v: unknown): string {
  const n = round2(Math.abs(num(v)))
  return `${n.toFixed(2).replace('.', ',')} RON`
}

export function isActiveCollab(status: unknown): boolean {
  const s = String(status || '').trim().toUpperCase()
  if (!s) return false
  return !TERMINAL_COLLAB_STATUSES.has(s)
}

export function isOpenDispute(status: unknown): boolean {
  const s = String(status || '').trim().toUpperCase()
  if (!s) return true
  return !CLOSED_DISPUTE_STATUSES.has(s)
}

export function isOpenCampaign(status: unknown): boolean {
  return OPEN_CAMPAIGN_STATUSES.has(String(status || '').trim().toUpperCase())
}

/** Bani încă blocați pe o colaborare (ofertă rezervată, neplătită și nerambursată). */
export function collabEscrowHeld(c: CollabRow): number {
  const own = num(c.pay_reserved)
  const refunded = num(c.pay_refunded)
  const amount = num(c.payment_amount)
  if (own > MONEY_EPSILON && amount <= MONEY_EPSILON && refunded <= MONEY_EPSILON) return round2(own)
  return 0
}

/**
 * Bani încă blocați pe o campanie.
 * escrow_amount (model vechi) se numără doar când pay_reserved e gol, ca să nu dublăm aceeași sumă.
 */
export function campaignEscrowHeld(c: CampaignRow): number {
  const reserved = num(c.pay_reserved)
  const pool = Math.max(0, reserved - num(c.pay_released) - num(c.pay_refunded))
  const legacy = reserved > MONEY_EPSILON ? 0 : Math.max(0, num(c.escrow_amount))
  return round2(pool + legacy)
}

export function deletionBlockers(input: DeletionCheckInput): Blocker[] {
  const out: Blocker[] = []
  const wallet = num(input.walletBalance)
  const credits = num(input.creditsBalance)
  if (isNonZeroMoney(wallet)) {
    out.push({
      code: 'wallet',
      message: `Portofelul are sold ${formatRon(wallet)}. Retrage sau folosește suma, apoi trimite din nou cererea.`,
    })
  }
  if (isNonZeroMoney(credits)) {
    out.push({
      code: 'wallet',
      message: `Portofelul de credite are sold ${formatRon(credits)}. Folosește sau retrage creditele, apoi trimite din nou cererea.`,
    })
  }
  if (isNonZeroMoney(input.pendingPayout)) {
    out.push({
      code: 'pending_payout',
      message: `Ai o retragere în curs de ${formatRon(input.pendingPayout)}. Așteaptă finalizarea plății, apoi trimite din nou cererea.`,
    })
  }
  if (isNonZeroMoney(input.creditsReserved)) {
    out.push({
      code: 'escrow',
      message: `Ai ${formatRon(input.creditsReserved)} credite rezervate în escrow pentru colaborări. Contul se poate închide după ce suma este eliberată.`,
    })
  }

  const campaigns = input.campaigns || []
  const collabs = input.collaborations || []
  const held = round2(
    campaigns.reduce((s, c) => s + campaignEscrowHeld(c), 0) +
    collabs.reduce((s, c) => s + collabEscrowHeld(c), 0),
  )
  if (held > MONEY_EPSILON) {
    out.push({
      code: 'escrow',
      message: `Ai ${formatRon(held)} blocați în garanție (escrow) pe campanii sau colaborări. Suma trebuie eliberată sau rambursată înainte de ștergere.`,
    })
  }

  const openCampaigns = campaigns.filter(c => isOpenCampaign(c.status)).length
  if (openCampaigns > 0) {
    out.push({
      code: 'active_campaigns',
      message: openCampaigns === 1
        ? 'Ai o campanie încă deschisă (activă sau în pauză). Închide-o înainte de ștergere.'
        : `Ai ${openCampaigns} campanii încă deschise (active sau în pauză). Închide-le înainte de ștergere.`,
    })
  }

  const openCollabs = collabs.filter(c => isActiveCollab(c.status)).length
  if (openCollabs > 0) {
    out.push({
      code: 'active_collaborations',
      message: openCollabs === 1
        ? 'Ai o colaborare încă deschisă. Încheie-o sau anuleaz-o înainte de ștergere.'
        : `Ai ${openCollabs} colaborări încă deschise. Încheie-le sau anulează-le înainte de ștergere.`,
    })
  }

  const openDisputes = (input.disputes || []).filter(d => isOpenDispute(d.status)).length
  if (openDisputes > 0) {
    out.push({
      code: 'open_dispute',
      message: openDisputes === 1
        ? 'Ai un litigiu deschis. Contul poate fi închis după ce litigiul este rezolvat.'
        : `Ai ${openDisputes} litigii deschise. Contul poate fi închis după ce sunt rezolvate.`,
    })
  }

  return out
}

export function deletedEmail(userId: string): string {
  const id = String(userId || '').replace(/[^a-z0-9]/gi, '').slice(0, 24) || 'cont'
  return `sters+${id}@invalid.addfame.ro`
}

export function deletedSlug(userId: string): string {
  const id = String(userId || '').replace(/[^a-z0-9]/gi, '').slice(0, 12) || 'cont'
  return `sters-${id}`
}

export function anonymizedValue(key: string, userId: string): unknown {
  if (NAME_KEYS.has(key)) return 'Cont șters'
  if (EMAIL_KEYS.has(key)) return deletedEmail(userId)
  if (SLUG_KEYS.has(key)) return deletedSlug(userId)
  if (EMPTY_STRING_KEYS.has(key)) return ''
  if (FALSE_KEYS.has(key)) return false
  if (EMPTY_ARRAY_KEYS.has(key)) return []
  if (EMPTY_OBJECT_KEYS.has(key)) return {}
  return null
}

/** Doar cheile personale prezente pe rând. Soldurile și id-urile nu intră în patch. */
export function anonymizePatch(row: Record<string, unknown> | null | undefined, userId: string): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  if (!row) return patch
  for (const key of Object.keys(row)) {
    if (!PII_KEYS.has(key)) continue
    patch[key] = anonymizedValue(key, userId)
  }
  return patch
}

export function isDeleteConfirm(v: unknown): boolean {
  const s = String(v || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return s === 'STERGE'
}

export function maskEmail(email: string | null | undefined): string {
  const e = String(email || '').trim()
  const at = e.indexOf('@')
  if (at < 1) return ''
  const name = e.slice(0, at)
  const host = e.slice(at)
  const visible = name.slice(0, 1)
  return `${visible}***${host}`
}

export function isMissingDeletionTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  const code = String(error.code || '')
  const msg = `${code} ${error.message || ''}`.toLowerCase()
  if (code === '42P01' || code === 'PGRST205') return true
  return msg.includes('account_deletion_requests') && (
    msg.includes('does not exist') || msg.includes('schema cache') || msg.includes('could not find')
  )
}
