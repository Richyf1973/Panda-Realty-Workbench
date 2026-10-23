export interface ResolvedBuyerContact {
  resolvedPhone: string | null
  resolvedEmail: string | null
  resolvedName: string | null
  primaryPhoneBuyerName: string | null
  primaryEmailBuyerName: string | null
}

function trimmed(row: Record<string, unknown>, key: string): string | null {
  const v = row[key]
  return typeof v === "string" ? v.trim() || null : null
}

/**
 * Resolves the primary phone/email contact for the property list row buyer quick-action buttons.
 * primaryBuyerPhone / primaryBuyerEmail / primaryBuyerName / primaryBuyerEmailName are injected
 * by the properties list API enrichment step when primaryPhoneBuyerPropertyEntityId is set.
 */
export function resolvePropertyBuyerContact(row: Record<string, unknown>): ResolvedBuyerContact {
  return {
    resolvedPhone: trimmed(row, "primaryBuyerPhone"),
    resolvedEmail: trimmed(row, "primaryBuyerEmail"),
    resolvedName: trimmed(row, "primaryBuyerName"),
    primaryPhoneBuyerName: trimmed(row, "primaryBuyerName"),
    primaryEmailBuyerName: trimmed(row, "primaryBuyerEmailName"),
  }
}
