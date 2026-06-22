'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NewManagedCampaign() {
  const router = useRouter()
  useEffect(() => { router.replace('/brand/campaigns') }, [router])
  return null
}
