'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Check, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { generateSlug, validateSlugFormat } from '@/lib/slug-utils'

interface InfluencerFormProps {
  initialData?: any
  onSubmit: (data: any) => Promise<{ success?: boolean; error?: string }>
  isLoading?: boolean
}

export function InfluencerForm({ initialData, onSubmit, isLoading }: InfluencerFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    email: initialData?.email || '',
    slug: initialData?.slug || '',
    bio: initialData?.bio || '',
    phone: initialData?.phone || '',
    country: initialData?.country || '',
    price_from: initialData?.price_from || '',
    price_to: initialData?.price_to || '',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [slugSuggestion, setSlugSuggestion] = useState<string | null>(null)
  const [showSlugHelper, setShowSlugHelper] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError(null)

    // Auto-suggest slug when name changes
    if (name === 'name' && value.trim()) {
      const suggested = generateSlug(value)
      const validation = validateSlugFormat(suggested)
      if (validation.valid) {
        setSlugSuggestion(suggested)
        setShowSlugHelper(true)
      }
    }
  }

  const applySuggestedSlug = () => {
    if (slugSuggestion) {
      setFormData((prev) => ({ ...prev, slug: slugSuggestion }))
      setShowSlugHelper(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(false)

    // Validate required fields
    if (!formData.name.trim()) {
      setError('Name is required')
      setSubmitting(false)
      return
    }
    if (!formData.email.trim()) {
      setError('Email is required')
      setSubmitting(false)
      return
    }
    
    // Auto-generate slug from name if empty
    let finalSlug = formData.slug.trim()
    if (!finalSlug) {
      finalSlug = generateSlug(formData.name)
      console.log('[v0] Auto-generated slug from name:', finalSlug)
    }

    // Validate slug
    const slugValidation = validateSlugFormat(finalSlug)
    if (!slugValidation.valid) {
      setError(`Invalid slug: ${slugValidation.error}`)
      setSubmitting(false)
      return
    }

    const result = await onSubmit({
      ...formData,
      slug: finalSlug.toLowerCase(),
      price_from: formData.price_from ? parseInt(formData.price_from) : undefined,
      price_to: formData.price_to ? parseInt(formData.price_to) : undefined,
    })

    setSubmitting(false)

    if (result.success) {
      setSuccess(true)
      setTimeout(() => {
        router.push('/admin/influencers')
      }, 1500)
    } else {
      setError(result.error || 'Failed to save influencer')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Essential influencer details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Name *</label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., John Doe"
                  disabled={submitting || isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email *</label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g., john@example.com"
                  disabled={submitting || isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Slug *
                <span className="text-xs text-muted-foreground ml-2">(Unique identifier, lowercase + hyphens)</span>
              </label>
              <Input
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                placeholder="e.g., john-doe-fitness"
                disabled={submitting || isLoading}
              />
              {formData.slug && (
                <p className="text-xs text-muted-foreground mt-1">
                  Profile URL: /influencers/<span className="font-mono text-foreground">{formData.slug.toLowerCase()}</span>
                </p>
              )}
              
              {/* Slug suggestion helper */}
              {showSlugHelper && slugSuggestion && !formData.slug && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">Auto-generate slug from name?</p>
                    <p className="text-blue-700 font-mono">{slugSuggestion}</p>
                  </div>
                  <button
                    type="button"
                    onClick={applySuggestedSlug}
                    className="ml-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1 whitespace-nowrap"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Use
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="About this influencer..."
                rows={4}
                disabled={submitting || isLoading}
                className="w-full px-3 py-2 border border-input rounded-lg text-sm font-sans"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Phone and location details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g., +1 (555) 123-4567"
                  disabled={submitting || isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Country</label>
                <Input
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder="e.g., United States"
                  disabled={submitting || isLoading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription>Service rate range in EUR</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">From (EUR)</label>
                <Input
                  type="number"
                  name="price_from"
                  value={formData.price_from}
                  onChange={handleChange}
                  placeholder="e.g., 500"
                  disabled={submitting || isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">To (EUR)</label>
                <Input
                  type="number"
                  name="price_to"
                  value={formData.price_to}
                  onChange={handleChange}
                  placeholder="e.g., 5000"
                  disabled={submitting || isLoading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-100 border border-green-200 text-green-800">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">Successfully saved! Redirecting...</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="submit" disabled={submitting || isLoading || success} className="gap-2 flex-1 md:flex-none">
            {submitting || isLoading ? 'Saving...' : 'Save Influencer'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting || isLoading}
          >
            Cancel
          </Button>
        </div>
      </div>
    </form>
  )
}
