/**
 * Shared helpers for Google Contacts sync — dialable phone detection and digit normalization.
 * Used by bulk sync, entity/owner sync, and Vitest.
 */

/** Strip to digits only for comparison / map keys (ITU E.164 max 15 digits). */
export function normalizePhoneDigits(raw: string): string {
  const t = raw.trim()
  if (!t) return ""
  return t.replace(/\D/g, "")
}

/**
 * Heuristic: enough digits to be a real phone, not so long as to be garbage.
 * Does not validate country codes; avoids syncing free-text `contact` values.
 */
export function isDialablePhone(raw: string): boolean {
  const digits = normalizePhoneDigits(raw)
  return digits.length >= 7 && digits.length <= 15
}
