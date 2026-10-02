'use server'

import { login } from '@/app/actions/auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
    }

    const result = await login(email, password)
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[v0] API login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
