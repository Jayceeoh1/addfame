// Secțiunea „Analize” a fost scoasă din contul de brand. Linkurile vechi duc la Dashboard.
import { redirect } from 'next/navigation'

export default function BrandAnalyticsRemoved() {
  redirect('/brand/dashboard')
}
