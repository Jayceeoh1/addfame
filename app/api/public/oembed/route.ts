import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 })

  try {
    let oembedUrl = ''

    if (url.includes('tiktok.com')) {
      oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
    } else if (url.includes('instagram.com')) {
      oembedUrl = `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${process.env.INSTAGRAM_ACCESS_TOKEN || ''}&fields=thumbnail_url,title`
    } else {
      return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })
    }

    const res = await fetch(oembedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 }, // cache 1 ora
    })

    if (!res.ok) return NextResponse.json({ thumbnail_url: null }, { status: 200 })

    const data = await res.json()
    return NextResponse.json({
      thumbnail_url: data.thumbnail_url || null,
      title: data.title || null,
      author_name: data.author_name || null,
    })
  } catch {
    return NextResponse.json({ thumbnail_url: null })
  }
}
