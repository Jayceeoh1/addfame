import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function sendMessage(chatId: number, text: string, options: any = {}) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...options }),
  })
}

async function askAI(question: string, influencerName: string): Promise<string> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: `Ești asistentul AI al platformei AddFame — cea mai mare platformă de influencer marketing din România.
Ajuți influencerii români să crească, să înțeleagă platforma și să obțină colaborări mai bune.
Răspunde ÎNTOTDEAUNA în română, concis și practic. Maximum 3-4 propoziții.
Influencerul cu care vorbești se numește ${influencerName}.
Nu inventa date sau statistici. Fii prietenos și motivant.`
            }]
          },
          contents: [{
            parts: [{ text: question }]
          }],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
          }
        }),
      }
    )
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Îmi pare rău, nu am putut procesa întrebarea ta.'
  } catch {
    return 'Îmi pare rău, serviciul AI e momentan indisponibil. Încearcă din nou în câteva minute.'
  }
}

async function getInfluencerByChatId(chatId: number) {
  const { data } = await supabase
    .from('influencers')
    .select('id, name, user_id, wallet_balance, telegram_chat_id')
    .eq('telegram_chat_id', chatId)
    .single()
  return data
}

async function linkTelegram(chatId: number, code: string) {
  // Find influencer with this link code
  const { data: inf } = await supabase
    .from('influencers')
    .select('id, name, user_id')
    .eq('telegram_link_code', code)
    .single()

  if (!inf) return null

  await supabase
    .from('influencers')
    .update({ telegram_chat_id: chatId, telegram_linked_at: new Date().toISOString() })
    .eq('id', inf.id)

  return inf
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = body.message
    if (!message) return NextResponse.json({ ok: true })

    const chatId = message.chat.id
    const text = message.text || ''
    const firstName = message.from?.first_name || 'Influencer'

    // /start command - with or without link code
    if (text.startsWith('/start')) {
      const parts = text.split(' ')
      const code = parts[1] // /start LINK_CODE

      if (code) {
        // Try to link account
        const inf = await linkTelegram(chatId, code)
        if (inf) {
          await sendMessage(chatId,
            `🎉 <b>Contul tău AddFame a fost conectat cu succes!</b>\n\n` +
            `Bună, <b>${inf.name}</b>! De acum vei primi notificări instant pe Telegram pentru:\n` +
            `✅ Campanii noi potrivite pentru tine\n` +
            `✅ Colaborări aprobate sau respinse\n` +
            `✅ Plăți primite\n` +
            `✅ Mesaje noi în inbox\n\n` +
            `Poți să îmi pui și întrebări despre influencer marketing! 🚀\n\n` +
            `<b>Comenzi disponibile:</b>\n` +
            `/sold — vezi soldul tău\n` +
            `/campanii — campanii active\n` +
            `/help — ajutor`
          )
          return NextResponse.json({ ok: true })
        } else {
          await sendMessage(chatId,
            `❌ <b>Cod invalid sau expirat.</b>\n\n` +
            `Mergi pe <a href="${APP_URL}/influencer/settings">AddFame → Settings</a> și generează un cod nou.`
          )
          return NextResponse.json({ ok: true })
        }
      }

      // No code - check if already linked
      const inf = await getInfluencerByChatId(chatId)
      if (inf) {
        await sendMessage(chatId,
          `👋 Bună din nou, <b>${inf.name}</b>!\n\n` +
          `Contul tău AddFame e conectat. Cum te pot ajuta?\n\n` +
          `/sold — soldul tău\n` +
          `/campanii — campanii active\n` +
          `Sau pune-mi orice întrebare! 🎯`
        )
      } else {
        await sendMessage(chatId,
          `👋 Bună, <b>${firstName}</b>! Sunt asistentul AI al <b>AddFame</b> 🚀\n\n` +
          `Pentru a conecta contul tău de influencer, mergi pe:\n` +
          `<b>${APP_URL}/influencer/settings</b>\n\n` +
          `Și apasă <b>"Conectează Telegram"</b> pentru a primi notificări instant.`
        )
      }
      return NextResponse.json({ ok: true })
    }

    // /sold command
    if (text === '/sold') {
      const inf = await getInfluencerByChatId(chatId)
      if (!inf) {
        await sendMessage(chatId, `❌ Contul nu e conectat. Folosește linkul din Settings pe AddFame.`)
        return NextResponse.json({ ok: true })
      }

      const balance = (inf.wallet_balance || 0).toLocaleString('ro-RO')
      await sendMessage(chatId,
        `💰 <b>Soldul tău AddFame</b>\n\n` +
        `<b>${balance} RON</b> disponibili\n\n` +
        `<a href="${APP_URL}/influencer/wallet">Vezi portofelul complet →</a>`
      )
      return NextResponse.json({ ok: true })
    }

    // /campanii command
    if (text === '/campanii') {
      const inf = await getInfluencerByChatId(chatId)
      if (!inf) {
        await sendMessage(chatId, `❌ Contul nu e conectat. Folosește linkul din Settings pe AddFame.`)
        return NextResponse.json({ ok: true })
      }

      const { data: collabs } = await supabase
        .from('collaborations')
        .select('id, status, campaigns(title, budget_per_influencer)')
        .eq('influencer_id', inf.id)
        .in('status', ['pending', 'active', 'approved'])
        .order('created_at', { ascending: false })
        .limit(5)

      if (!collabs?.length) {
        await sendMessage(chatId,
          `📋 <b>Nu ai colaborări active momentan.</b>\n\n` +
          `<a href="${APP_URL}/influencer/campaigns">Vezi campaniile disponibile →</a>`
        )
      } else {
        const list = collabs.map((c: any) => {
          const status = c.status === 'pending' ? '⏳ În așteptare' : c.status === 'active' ? '✅ Activă' : '🔄 Aprobată'
          return `• <b>${c.campaigns?.title}</b> — ${status}`
        }).join('\n')

        await sendMessage(chatId,
          `📋 <b>Colaborările tale recente:</b>\n\n${list}\n\n` +
          `<a href="${APP_URL}/influencer/collaborations">Vezi toate →</a>`
        )
      }
      return NextResponse.json({ ok: true })
    }

    // /help command
    if (text === '/help') {
      await sendMessage(chatId,
        `🤖 <b>Asistentul AddFame</b>\n\n` +
        `<b>Comenzi:</b>\n` +
        `/sold — soldul tău\n` +
        `/campanii — colaborările active\n` +
        `/help — această listă\n\n` +
        `<b>AI:</b> Poți să îmi pui orice întrebare despre influencer marketing, cum să crești, prețuri, colaborări etc.\n\n` +
        `<a href="${APP_URL}">Deschide AddFame →</a>`
      )
      return NextResponse.json({ ok: true })
    }

    // Free AI question
    const inf = await getInfluencerByChatId(chatId)
    const name = inf?.name || firstName

    // Show typing indicator
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
    })

    const answer = await askAI(text, name)
    await sendMessage(chatId, `🤖 ${answer}\n\n<i>Powered by AddFame AI</i>`)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[telegram-bot]', e)
    return NextResponse.json({ ok: true })
  }
}