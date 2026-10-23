interface BuyerPortalToken {
  token: string
  revokedAt: string | null
}

/**
 * Opens the buyer's portal page in a new tab, creating the portal link first when none is active.
 *
 * A blank tab is opened synchronously (before any await) so the browser treats it as user-initiated
 * and does not block the popup; it is navigated once the token is known. When the buyer has no active
 * token yet, one is generated on the fly (decision 2A in the spec).
 */
export async function openBuyerPortal(propertyEntityId: number): Promise<void> {
  const tab = window.open("", "_blank")
  try {
    const res = await fetch(`/api/admin/portal-tokens?propertyEntityId=${propertyEntityId}`)
    let token: BuyerPortalToken | null = res.ok ? ((await res.json()) as BuyerPortalToken | null) : null
    if (!token || token.revokedAt) {
      const gen = await fetch("/api/admin/portal-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyEntityId, propertyListId: 0 }),
      })
      if (!gen.ok) {
        tab?.close()
        return
      }
      token = (await gen.json()) as BuyerPortalToken
    }
    const url = `${window.location.origin}/portal/${token.token}`
    if (tab) tab.location.href = url
    else window.open(url, "_blank", "noopener,noreferrer")
  } catch {
    tab?.close()
  }
}
