import { NextRequest, NextResponse } from 'next/server'
import { expireOverdueBadges } from '@/app/actions/badge'

export async function GET(req: NextRequest) {
  // Protecție cu secret header
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await expireOverdueBadges()
  return NextResponse.json(result)
}

// Permite și POST pentru flexibilitate
export async function POST(req: NextRequest) {
  return GET(req)
}