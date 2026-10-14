import { redirect } from 'next/navigation'

// Verificarea identității cu buletinul a fost eliminată.
// Linkurile vechi (din emailuri, notificări) duc direct în dashboard.
export default function InfluencerVerifyPage() {
  redirect('/influencer/dashboard')
}
