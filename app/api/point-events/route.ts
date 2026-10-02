import { NextRequest, NextResponse } from 'next/server'
import { getActivePointEvents } from '@/app/actions/point-events'

export async function GET(req: NextRequest) {
  const influencerId = req.nextUrl.searchParams.get('influencer_id') ?? undefined
  const result = await getActivePointEvents(influencerId)
  return NextResponse.json(result)
}
