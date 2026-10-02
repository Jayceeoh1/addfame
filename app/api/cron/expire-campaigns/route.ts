import { NextRequest, NextResponse } from 'next/server'
import { expireOverdueCampaigns } from '@/app/actions/campaigns'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await expireOverdueCampaigns()
  return NextResponse.json(result)
}