import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'

const EAWB_BASE = 'https://api.europarcel.com/api/public'

function getApiKey() { return process.env.EAWB_API_KEY || '' }

function eawbHeaders() {
  return {
    'X-API-Key': getApiKey(),
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
}

const DEFAULT_SENDER = {
  contact: 'AddFame', phone: '', email: '',
  postal_code: '', city: '', county: '',
  street: '', street_number: '1',
  billing_address_id: 332111,
}

async function getSenderAddress() {
  try {
    const admin = createAdminSupabase(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data } = await admin
      .from('platform_settings')
      .select('value')
      .eq('key', 'eawb_sender')
      .single()
    if (data?.value) return { ...DEFAULT_SENDER, ...data.value }
  } catch {}
  return DEFAULT_SENDER
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    if (!getApiKey()) return NextResponse.json({ error: 'EAWB_API_KEY not configured' }, { status: 500 })

    // ── TEST ──────────────────────────────────────────────
    if (action === 'test') {
      const res = await fetch(`${EAWB_BASE}/account/profile`, { headers: eawbHeaders() })
      const data = await res.json().catch(() => ({}))
      return NextResponse.json({ status: res.status, ok: res.ok, data, apiKeySet: !!getApiKey() })
    }

    // ── PRICE ─────────────────────────────────────────────
    if (action === 'price') {
      const toPostal = searchParams.get('to_postal') || ''
      const weight = parseFloat(searchParams.get('weight') || '1')
      const sender = await getSenderAddress()

      const CARRIERS = [
        { carrier_id: 1, service_id: 1 },
        { carrier_id: 2, service_id: 1 },
        { carrier_id: 3, service_id: 1 },
        { carrier_id: 4, service_id: 1 },
        { carrier_id: 6, service_id: 1 },
      ]

      const baseBody = {
        billing_to: { billing_address_id: 332111 },
        address_from: {
          contact: sender.contact,
          phone: sender.phone,
          email: sender.email || undefined,
          country_code: 'RO',
          locality_name: sender.city,
          county_name: sender.county,
          street_name: sender.street,
          street_number: sender.street_number,
        },
        address_to: {
          contact: 'Destinatar',
          phone: '0700000000',
          email: 'destinatar@addfame.ro',
          country_code: 'RO',
          postal_code: toPostal,
          locality_name: '',
          county_name: '',
          street_name: 'Strada',
          street_number: '1',
        },
        content: {
          envelopes_count: 0, pallets_count: 0, parcels_count: 1,
          total_weight: weight,
          parcels: [{ sequence_no: 1, size: { weight, width: 20, height: 15, length: 30 } }],
        },
        extra: { parcel_content: 'Produs barter', sms_recipient: true },
      }

      const results = await Promise.allSettled(
        CARRIERS.map(c =>
          fetch(`${EAWB_BASE}/orders/prices`, {
            method: 'POST',
            headers: eawbHeaders(),
            body: JSON.stringify({ ...baseBody, carrier_id: c.carrier_id, service_id: c.service_id }),
          }).then(r => r.json())
        )
      )

      const allPrices = results
        .filter(r => r.status === 'fulfilled' && (r as any).value?.data?.length > 0)
        .flatMap(r => (r as any).value.data)
        .sort((a: any, b: any) => a.price.total - b.price.total)

      return NextResponse.json({ data: allPrices })
    }

    // ── TRACK ─────────────────────────────────────────────
    if (action === 'track') {
      const awb = searchParams.get('awb')
      if (!awb) return NextResponse.json({ error: 'AWB required' }, { status: 400 })
      const res = await fetch(`${EAWB_BASE}/orders/track-by-awb`, {
        method: 'POST', headers: eawbHeaders(), body: JSON.stringify({ awbs: [awb] }),
      })
      const data = await res.json()
      if (!res.ok) return NextResponse.json({ error: data?.message || 'Track error' }, { status: res.status })
      return NextResponse.json(data)
    }

    // ── LABEL ─────────────────────────────────────────────
    if (action === 'label') {
      const orderId = searchParams.get('order_id')
      if (!orderId) return NextResponse.json({ error: 'order_id required' }, { status: 400 })
      const res = await fetch(`${EAWB_BASE}/orders/labels`, {
        method: 'POST', headers: eawbHeaders(),
        body: JSON.stringify({ order_ids: [parseInt(orderId)] }),
      })
      if (!res.ok) return NextResponse.json({ error: 'Label error' }, { status: res.status })
      const blob = await res.blob()
      return new NextResponse(blob, {
        headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="awb-${orderId}.pdf"` }
      })
    }

    // ── DEBUG SENDER ──────────────────────────────────────
    if (action === 'debug-sender') {
      const sender = await getSenderAddress()
      return NextResponse.json({ sender })
    }

    // ── SEARCH POSTAL CODE ─────────────────────────────────
    if (action === 'search-postal') {
      const postal = searchParams.get('postal') || ''
      const res = await fetch(`${EAWB_BASE}/search/postal-code-reverse/RO/${postal}`, { headers: eawbHeaders() })
      const data = await res.json().catch(() => ({}))
      return NextResponse.json({ status: res.status, data })
    }

    // ── GET BILLING ADDRESSES ──────────────────────────────
    if (action === 'billing-addresses') {
      const res = await fetch(`${EAWB_BASE}/addresses/billing`, { headers: eawbHeaders() })
      const data = await res.json().catch(() => ({}))
      return NextResponse.json({ status: res.status, data })
    }

    // ── GET SHIPPING ADDRESSES ─────────────────────────────
    if (action === 'shipping-addresses') {
      const res = await fetch(`${EAWB_BASE}/addresses/shipping`, { headers: eawbHeaders() })
      const data = await res.json().catch(() => ({}))
      return NextResponse.json({ status: res.status, data })
    }

    // ── TEST BILLING ID ────────────────────────────────────
    if (action === 'test-billing') {
      const bid = parseInt(searchParams.get('id') || '332111')
      const testBody = {
        carrier_id: 1, service_id: 1,
        billing_to: { billing_address_id: bid },
        address_from: { contact: 'Test', phone: '0700000000', email: 'test@test.ro', country_code: 'RO', locality_name: 'Morteni', county_name: 'Dambovita', street_name: 'strada principala', street_number: '858' },
        address_to: { contact: 'Test', phone: '0700000000', email: 'test@test.ro', country_code: 'RO', locality_name: 'Bucuresti', county_name: 'Bucuresti', street_name: 'Strada Exemplu', street_number: '1' },
        content: { envelopes_count: 0, pallets_count: 0, parcels_count: 1, total_weight: 1, parcels: [{ sequence_no: 1, size: { weight: 1, width: 20, height: 15, length: 30 } }] },
        extra: { parcel_content: 'Test', sms_recipient: false },
      }
      const res = await fetch(`${EAWB_BASE}/orders/prices`, { method: 'POST', headers: eawbHeaders(), body: JSON.stringify(testBody) })
      const data = await res.json().catch(() => ({}))
      return NextResponse.json({ status: res.status, billing_id_tested: bid, data })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!getApiKey()) return NextResponse.json({ error: 'EAWB_API_KEY not configured' }, { status: 500 })

    const body = await req.json()
    const { action } = body

    if (action === 'create') {
      const defaultSender = await getSenderAddress()
      const {
        carrier_id, service_id,
        to_contact, to_phone, to_email,
        to_street, to_street_number, to_postal_code,
        to_locality_name, to_county_name, to_street_details,
        weight, parcel_content, internal_identifier, sms_recipient,
        sender_override,
      } = body

      // Folosim sender_override dacă e trimis din UI (switch Ghita/Stancu), altfel adresa default
      const sender = sender_override ? { ...defaultSender, ...sender_override } : defaultSender

      const w = parseFloat(weight) || 0.5
      const orderPayload = {
        carrier_id: carrier_id || 1,
        service_id: service_id || 1,
        billing_to: { billing_address_id: sender.billing_address_id || 332111 },
        address_from: {
          contact: sender.contact,
          phone: sender.phone,
          email: sender.email || undefined,
          country_code: 'RO',
          locality_name: sender.city,
          county_name: sender.county,
          street_name: sender.street,
          street_number: sender.street_number,
          street_details: sender.street_extra || undefined,
        },
        address_to: {
          contact: to_contact,
          phone: to_phone,
          email: to_email || 'destinatar@addfame.ro',
          country_code: 'RO',
          postal_code: to_postal_code || '',
          locality_name: to_locality_name || '',
          county_name: to_county_name || '',
          street_name: to_street || '',
          street_number: to_street_number && to_street_number !== '0' ? to_street_number : '1',
          street_details: to_street_details || undefined,
        },
        content: {
          envelopes_count: 0, pallets_count: 0, parcels_count: 1, total_weight: w,
          parcels: [{ sequence_no: 1, size: { weight: w, width: 20, height: 15, length: 30 } }],
        },
        extra: {
          parcel_content: parcel_content || 'Produs barter AddFame',
          internal_identifier: internal_identifier || undefined,
          sms_recipient: sms_recipient !== false,
        },
      }

      const res = await fetch(`${EAWB_BASE}/orders`, {
        method: 'POST', headers: eawbHeaders(), body: JSON.stringify(orderPayload),
      })
      const text = await res.text()
      let data: any
      try { data = JSON.parse(text) } catch { data = { raw: text } }
      if (!res.ok) return NextResponse.json({ error: data?.message || `Create error ${res.status}`, details: data }, { status: res.status })
      return NextResponse.json(data)
    }

    if (action === 'cancel') {
      const { order_id } = body
      const res = await fetch(`${EAWB_BASE}/orders/${order_id}`, {
        method: 'DELETE', headers: eawbHeaders(),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return NextResponse.json({ error: data?.message || 'Cancel error' }, { status: res.status })
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 })
  }
}
