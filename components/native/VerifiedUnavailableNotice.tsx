import { VERIFIED_PURCHASE_SLOT } from '@/lib/native-app'

/**
 * Shown only inside the native shell, via CSS on data-native-only.
 * Neutral on purpose: no price, no button, and no pointer to another checkout.
 */
export function VerifiedUnavailableNotice() {
  return (
    <div
      data-native-only={VERIFIED_PURCHASE_SLOT}
      role="status"
      className="bg-card border border-border rounded-xl p-6"
    >
      <p className="text-base font-black text-foreground">Verified Creator nu este disponibil în aplicație.</p>
    </div>
  )
}
