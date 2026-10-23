/**
 * Utilities for building external property links:
 * - realestate.com.au property search URL
 * - Google Maps search URL
 */

/**
 * Converts a full street address + suburb/state/postcode into a realestate.com.au property URL.
 *
 * Algorithm:
 * 1. Lowercase all components.
 * 2. Split streetAddress into tokens; find the last token matching an address_text in the
 *    conversion map (e.g. "street" → "st") and replace it with the abbreviation.
 * 3. Join street tokens and suburb parts with "-"; append state and postcode.
 * 4. Return `https://www.realestate.com.au/property/{slug}/`.
 *
 * Example: "8 REICHMAN STREET", "CABOOLTURE", "QLD", "4510"
 *   → https://www.realestate.com.au/property/8-reichman-st-caboolture-qld-4510/
 */
export function buildRealEstateUrl(
  streetAddress: string,
  suburb: string,
  state: string,
  postcode: string,
  conversions: ReadonlyMap<string, string>,
): string | null {
  if (!streetAddress.trim() || !suburb.trim() || !state.trim() || !postcode.trim()) {
    return null
  }

  const streetTokens = streetAddress.toLowerCase().trim().split(/\s+/)

  // Find the last token that matches an address type (e.g. "street", "road")
  let lastMatchIndex = -1
  for (let i = streetTokens.length - 1; i >= 0; i--) {
    if (conversions.has(streetTokens[i])) {
      lastMatchIndex = i
      break
    }
  }

  if (lastMatchIndex !== -1) {
    streetTokens[lastMatchIndex] = conversions.get(streetTokens[lastMatchIndex])!
  }

  const streetSlug = streetTokens.join("-")
  const suburbSlug = suburb.toLowerCase().trim().replace(/\s+/g, "-")
  const stateSlug = state.toLowerCase().trim().replace(/\s+/g, "-")
  const postcodeSlug = postcode.trim()

  const slug = `${streetSlug}-${suburbSlug}-${stateSlug}-${postcodeSlug}`
  return `https://www.realestate.com.au/property/${slug}/`
}

/**
 * Returns a Google Maps search URL for the given address.
 * Uses the standard Maps search URL which requires no API key.
 *
 * Example: https://www.google.com/maps/search/?api=1&query=8+Reichman+St+Caboolture+QLD+4510
 */
export function buildGoogleMapsUrl(
  streetAddress: string,
  suburb: string,
  state: string,
  postcode: string,
): string | null {
  if (!streetAddress.trim() || !suburb.trim() || !state.trim() || !postcode.trim()) {
    return null
  }

  const fullAddress = `${streetAddress.trim()} ${suburb.trim()} ${state.trim()} ${postcode.trim()}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
}
