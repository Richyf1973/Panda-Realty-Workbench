export interface SuburbMatch {
  suburb: string
  state: string
}

export function extractAddressSuffixCandidates(address: string): string[] {
  const stripped = address.trim()
    .toUpperCase()
    .replace(/\s+[A-Z]{2,3}\s+\d{4}\s*$/, "")
    .replace(/\s+\d{4}\s*$/, "")
    .trim()
  const words = stripped.split(/\s+/)
  const result: string[] = []
  for (let len = 1; len <= Math.min(4, words.length); len++) {
    result.push(words.slice(-len).join(" "))
  }
  return result
}

/**
 * Extracts a suburb from an Australian street address by matching the end of
 * the address against a list of known suburbs (case-insensitive, longest match
 * wins). Handles trailing state+postcode tokens (e.g. "QLD 4506") before
 * matching so both "180/46 AMY STREET MORAYFIELD" and
 * "PO BOX 1 MORAYFIELD QLD 4506" resolve correctly.
 */
export function extractSuburbFromAddress(
  address: string,
  suburbs: SuburbMatch[],
): SuburbMatch | null {
  const normalized = address.trim().toUpperCase()
  const stripped = normalized
    .replace(/\s+[A-Z]{2,3}\s+\d{4}\s*$/, "")
    .replace(/\s+\d{4}\s*$/, "")
    .trim()

  const sorted = [...suburbs].sort((a, b) => b.suburb.length - a.suburb.length)

  for (const candidate of sorted) {
    const upper = candidate.suburb.toUpperCase()
    if (stripped.endsWith(upper) || normalized.endsWith(upper)) {
      return candidate
    }
  }
  return null
}
