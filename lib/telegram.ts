// lib/telegram.ts
// Folosit pentru a trimite notificări din orice parte a platformei

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://addfame.ro'

async function sendTelegram(chatId: number, text: string) {
  if (!BOT_TOKEN || !chatId) return
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    })
  } catch (e) {
    console.error('[telegram notify]', e)
  }
}

export async function notifyNewCampaign(chatId: number, campaignTitle: string, budget: number) {
  await sendTelegram(chatId,
    `🎯 <b>Campanie nouă potrivită pentru tine!</b>\n\n` +
    `<b>${campaignTitle}</b>\n` +
    `💰 Buget: <b>${budget.toLocaleString('ro-RO')} RON</b>\n\n` +
    `<a href="${APP_URL}/influencer/campaigns">Vezi campania →</a>`
  )
}

export async function notifyCollabApproved(chatId: number, campaignTitle: string, amount: number) {
  await sendTelegram(chatId,
    `✅ <b>Colaborare aprobată!</b>\n\n` +
    `Colaborarea ta la campania <b>${campaignTitle}</b> a fost aprobată.\n` +
    `💰 Vei primi: <b>${amount.toLocaleString('ro-RO')} RON</b>\n\n` +
    `<a href="${APP_URL}/influencer/collaborations">Vezi detalii →</a>`
  )
}

export async function notifyCollabRejected(chatId: number, campaignTitle: string, reason?: string) {
  await sendTelegram(chatId,
    `❌ <b>Colaborare respinsă</b>\n\n` +
    `Din păcate, candidatura ta la <b>${campaignTitle}</b> nu a fost acceptată.\n` +
    `${reason ? `Motiv: ${reason}\n` : ''}` +
    `Nu te descuraja — mai sunt campanii disponibile! 💪\n\n` +
    `<a href="${APP_URL}/influencer/campaigns">Vezi alte campanii →</a>`
  )
}

export async function notifyPaymentReceived(chatId: number, amount: number, campaignTitle: string) {
  await sendTelegram(chatId,
    `💰 <b>Plată primită!</b>\n\n` +
    `Ai primit <b>${amount.toLocaleString('ro-RO')} RON</b> pentru campania <b>${campaignTitle}</b>.\n\n` +
    `<a href="${APP_URL}/influencer/wallet">Vezi portofelul →</a>`
  )
}

export async function notifyNewMessage(chatId: number, senderName: string) {
  await sendTelegram(chatId,
    `💬 <b>Mesaj nou!</b>\n\n` +
    `Ai primit un mesaj de la <b>${senderName}</b>.\n\n` +
    `<a href="${APP_URL}/influencer/inbox">Citește mesajul →</a>`
  )
}