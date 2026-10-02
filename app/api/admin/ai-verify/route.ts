import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

async function requireAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: adminRow } = await admin.from('admins').select('role').eq('user_id', user.id).single()
  if (!adminRow) return null
  return { admin }
}

// Convertește imagine (URL sau base64 data URI) în format pentru Gemini
async function imageToBase64(urlOrBase64: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    // Dacă e deja base64 data URI (ex: data:image/jpeg;base64,...)
    if (urlOrBase64.startsWith('data:')) {
      const [header, data] = urlOrBase64.split(',')
      const mimeType = header.split(':')[1].split(';')[0]
      return { data, mimeType }
    }
    // Altfel e URL — descarcăm
    const res = await fetch(urlOrBase64)
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
    const base64 = btoa(binary)
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    const mimeType = contentType.split(';')[0].trim()
    return { data: base64, mimeType }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAdmin()
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!GEMINI_API_KEY) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })

    const { doc_url, selfie_url, doc_type, declared_name } = await req.json()
    if (!doc_url) return NextResponse.json({ error: 'doc_url is required' }, { status: 400 })

    // Convertim imaginile în base64
    const docImg = await imageToBase64(doc_url)
    if (!docImg) return NextResponse.json({ error: 'Nu am putut descărca documentul' }, { status: 400 })

    const selfieImg = selfie_url ? await imageToBase64(selfie_url) : null

    // Construim parts-urile pentru Gemini
    const parts: any[] = [
      {
        text: `Ești un sistem de verificare identitate pentru o platformă de influencer marketing din România.
Analizează documentul de identitate și selfie-ul furnizate și returnează un JSON structurat.

Date declarate de utilizator:
- Nume declarat: ${declared_name || 'nedeclarat'}
- Tip document declarat: ${doc_type || 'necunoscut'}

Analizează și returnează STRICT un JSON valid cu această structură (fără text în afara JSON-ului):
{
  "document_valid": true/false,
  "document_type": "CI/Pașaport/Permis de conducere/Altul/Neclar",
  "name_on_doc": "numele exact de pe document sau null dacă nu e lizibil",
  "name_matches": true/false/null,
  "document_expired": true/false/null,
  "document_readable": true/false,
  "suspicions": ["lista de suspiciuni dacă există, sau array gol"],
  "selfie_matches_doc": true/false/null,
  "recommendation": "APPROVE/REJECT/MANUAL_REVIEW",
  "reason": "explicație scurtă în română pentru decizia recomandată",
  "confidence": "HIGH/MEDIUM/LOW"
}`
      },
      {
        inline_data: {
          mime_type: docImg.mimeType,
          data: docImg.data
        }
      }
    ]

    // Adaugă selfie dacă există
    if (selfieImg) {
      parts.push({
        inline_data: {
          mime_type: selfieImg.mimeType,
          data: selfieImg.data
        }
      })
    }

    const geminiRes = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        }
      })
    })

    if (!geminiRes.ok) {
      const err = await geminiRes.text()
      console.error('Gemini error:', err)
      return NextResponse.json({ error: 'Eroare Gemini API' }, { status: 500 })
    }

    const geminiData = await geminiRes.json()
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Parsăm JSON-ul din răspuns
    let analysis: any = null
    try {
      // Eliminăm eventualele ```json ``` din răspuns
      const cleaned = rawText.replace(/```json\n?|\n?```/g, '').trim()
      analysis = JSON.parse(cleaned)
    } catch {
      // Dacă nu putem parsa, returnăm textul brut
      return NextResponse.json({
        success: true,
        raw: rawText,
        parse_error: true
      })
    }

    return NextResponse.json({ success: true, analysis })
  } catch (e: any) {
    console.error('AI verify error:', e)
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
