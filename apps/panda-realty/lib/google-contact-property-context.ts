/**
 * Builds the `propertyAddress` segment passed to {@link upsertGoogleContact} for **entities**
 * linked to one or more properties: dedupe, stable sort, join with "; ", then truncate.
 * Google display names are limited; we cap the **address aggregate** only (see spec).
 */
export const GOOGLE_CONTACT_PROPERTY_CONTEXT_MAX_CHARS = 220

function trimNonempty(s: string): string | null {
  const t = s.trim()
  return t.length > 0 ? t : null
}

/**
 * @param rawAddresses Street (or full) address strings from `panda_properties` rows — may contain duplicates.
 * @returns Single string used as street/property context after the role label (`Seller:` / `Contact:` / …) in Google Contacts, or empty string if none.
 */
export function formatGoogleContactPropertyContext(rawAddresses: readonly string[]): string {
  const unique = [...new Set(rawAddresses.map((a) => trimNonempty(String(a))).filter(Boolean) as string[])]
  unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
  let joined = unique.join("; ")
  if (joined.length <= GOOGLE_CONTACT_PROPERTY_CONTEXT_MAX_CHARS) return joined
  const ellipsis = "…"
  const cap = GOOGLE_CONTACT_PROPERTY_CONTEXT_MAX_CHARS - ellipsis.length
  return joined.slice(0, Math.max(0, cap)) + ellipsis
}
