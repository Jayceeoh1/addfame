'use client'

import { InfluencerForm } from '@/components/admin/influencer-form'
import { createInfluencer } from '@/app/actions/admin'

export default function CreateInfluencerPage() {
  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Create Influencer</h1>
        <p className="text-muted-foreground mt-1">Add a new influencer profile to the platform</p>
      </div>

      <InfluencerForm
        onSubmit={async (data) => {
          return await createInfluencer(data)
        }}
      />
    </div>
  )
}
