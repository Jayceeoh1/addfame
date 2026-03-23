// Auto-generate a URL-friendly slug from any text input
export function generateSlug(text: string): string {
  return text
    .toLowerCase() // Convert to lowercase
    .trim() // Remove leading/trailing whitespace
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_]+/g, '-') // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
}

// Validate slug format
export function validateSlugFormat(slug: string): { valid: boolean; error?: string } {
  if (!slug || slug.trim().length === 0) {
    return { valid: false, error: 'Slug cannot be empty' }
  }
  if (slug.length < 3) {
    return { valid: false, error: 'Slug must be at least 3 characters' }
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { valid: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' }
  }
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return { valid: false, error: 'Slug cannot start or end with a hyphen' }
  }
  return { valid: true }
}

// Check if slug would be valid when auto-generated from name
export function canGenerateValidSlug(name: string): boolean {
  const generated = generateSlug(name)
  const validation = validateSlugFormat(generated)
  return validation.valid
}

// Get a human-readable suggestion message
export function getSlugSuggestion(name: string): string {
  const generated = generateSlug(name)
  const validation = validateSlugFormat(generated)

  if (!validation.valid) {
    return `Cannot auto-generate valid slug from name. ${validation.error || 'Please enter manually.'}`
  }

  return `Suggested slug: ${generated}`
}