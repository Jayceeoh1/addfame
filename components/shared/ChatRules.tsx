'use client'

// Regula de chat brand ↔ influencer: discuțiile și înțelegerile în afara AddFame sunt interzise.
// ChatRulesBanner — mereu vizibil în conversație. ContactWarning — apare când mesajul scris pare să
// conțină telefon, email, WhatsApp etc. și cere o confirmare înainte de trimitere.
// Semnalarea pentru admin se face oricum în baza de date (SQL 30), indiferent de ce se alege aici.

import React from 'react'
import { ShieldAlert, AlertTriangle } from 'lucide-react'
import { CONTACT_REASON_LABEL, type ContactReason } from '@/lib/contact-guard'

export const CHAT_RULE_TEXT =
  'discuțiile și înțelegerile în afara AddFame sunt interzise. Schimbul de telefon, email sau mutarea discuției pe WhatsApp, Instagram ori altă aplicație se sancționează cu excluderea definitivă.'

export function ChatRulesBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div role="note" style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      background: '#fff7e6', border: '1px solid #f5d48a', borderRadius: 14,
      padding: compact ? '8px 12px' : '10px 14px', margin: '0 auto 10px', maxWidth: 560,
      fontSize: 12, lineHeight: 1.5, color: '#6b4a07',
    }}>
      <ShieldAlert size={16} style={{ flex: 'none', marginTop: 1, color: '#b7791f' }} aria-hidden="true" />
      <span>
        <b style={{ color: '#5a3d05' }}>Regulă AddFame: </b>
        {CHAT_RULE_TEXT}
      </span>
    </div>
  )
}

export function ContactWarning({ reasons, onSendAnyway, sending = false }: {
  reasons: ContactReason[]
  onSendAnyway: () => void
  sending?: boolean
}) {
  if (!reasons.length) return null
  const what = reasons.map(r => CONTACT_REASON_LABEL[r]).join(', ')
  return (
    <div role="alert" style={{
      display: 'flex', flexDirection: 'column', gap: 8,
      background: '#fdecea', border: '1px solid #f3b4ac', borderRadius: 14,
      padding: '10px 14px', margin: '0 12px 8px', fontSize: 12.5, lineHeight: 1.5, color: '#7a1d12',
    }}>
      <span style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <AlertTriangle size={16} style={{ flex: 'none', marginTop: 1, color: '#c0392b' }} aria-hidden="true" />
        <span>
          <b>Atenție:</b> mesajul pare să conțină {what}. Discuțiile în afara AddFame sunt interzise și se sancționează
          cu <b>excluderea definitivă</b>. Stabilește aici locația, ora și orice detaliu de întâlnire.
        </span>
      </span>
      <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ color: '#9b3b2f' }}>Șterge datele de contact din mesaj sau</span>
        <button type="button" onClick={onSendAnyway} disabled={sending} style={{
          border: '1px solid #e0897d', background: '#fff', color: '#9b1c1c', borderRadius: 10,
          padding: '6px 12px', fontWeight: 700, fontSize: 12, cursor: sending ? 'default' : 'pointer', minHeight: 36,
        }}>
          Trimite oricum (va fi verificat de AddFame)
        </button>
      </span>
    </div>
  )
}
