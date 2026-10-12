import { redirect } from 'next/navigation'

// „Campanie nouă” → lista de campanii cu alegerea tipului deschisă (Plătită, Barter, Open Call, Managed).
// Aici era un formular Managed vechi (cu „Buget total campanie”), dublură pentru /brand/campaigns/new/managed.
export default function NewCampaignRedirect() {
  redirect('/brand/campaigns?new=1')
}
