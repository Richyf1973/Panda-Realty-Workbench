export type ShareToggleField = "sharedWithPortal" | "sharedWithSeller"

export const SHARE_TOGGLE_ERROR = "Could not update sharing"

/** Toast message for a share toggle, naming the audience portal and the new state. */
export function shareToggleMessage(field: ShareToggleField, value: boolean): string {
  const portal = field === "sharedWithPortal" ? "buyer portal" : "seller portal"
  return value ? `Shared with ${portal}` : `Removed from ${portal}`
}
