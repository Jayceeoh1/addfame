import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/api-auth'
import { submitAuthenticatedDeletion } from '@/lib/account-deletion-server'

// Păstrat pentru apelurile vechi din interfață.
// Nu mai șterge tranzacții, colaborări, retrageri sau contul din Auth.
// Înregistrează aceeași cerere sigură ca /api/account/deletion-request.
export async function DELETE() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Neautentificat' }, { status: 401 })
  const out = await submitAuthenticatedDeletion(user, 'app')
  return NextResponse.json(
    { ...out.body, error: out.body.ok ? undefined : out.body.message },
    { status: out.http },
  )
}
