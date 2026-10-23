import type { InlineMessageToken } from "@/components/admin/inline-portal-messages"

/** GET the buyer's current portal token (no create). Returns null when none exists or the request fails. */
export async function loadBuyerPortalToken(propertyEntityId: number): Promise<InlineMessageToken | null> {
  try {
    const res = await fetch(`/api/admin/portal-tokens?propertyEntityId=${propertyEntityId}`)
    if (!res.ok) return null
    const token = (await res.json()) as InlineMessageToken | null
    return token ? { portalTokenId: token.portalTokenId, revokedAt: token.revokedAt } : null
  } catch {
    return null
  }
}

/**
 * Resolve the buyer portal token, creating one when none is active (mirrors `openBuyerPortal`).
 * Returns null only when both the lookup and the create fail.
 */
export async function ensureBuyerPortalToken(
  propertyEntityId: number,
  propertyListId: number,
): Promise<InlineMessageToken | null> {
  const existing = await loadBuyerPortalToken(propertyEntityId)
  if (existing && !existing.revokedAt) return existing
  try {
    const res = await fetch("/api/admin/portal-tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyEntityId, propertyListId }),
    })
    if (!res.ok) return null
    const token = (await res.json()) as InlineMessageToken
    return { portalTokenId: token.portalTokenId, revokedAt: token.revokedAt }
  } catch {
    return null
  }
}
