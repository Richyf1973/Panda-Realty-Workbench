import type { AdminEntitySlug } from "../../admin-entity-slug-client"

const QUICK_DESKTOP_CARDS_SLUGS: readonly AdminEntitySlug[] = ["properties", "property-forms"]

/**
 * Desktop quick-card mode: cards instead of the compact table.
 * Active for slugs in QUICK_DESKTOP_CARDS_SLUGS when on desktop, table mode, with quick column keys resolved.
 * Exported for Vitest; keep in sync with {@link useAdminEntityListTableColumns}.
 */
export function adminEntityPropertiesQuickDesktopCardsActive(args: {
  readonly slug: AdminEntitySlug
  readonly isCompactListViewport: boolean
  readonly listLayoutMode: "table" | "grid"
  readonly hasQuickColumnKeys: boolean
}): boolean {
  return (
    QUICK_DESKTOP_CARDS_SLUGS.includes(args.slug) &&
    !args.isCompactListViewport &&
    args.listLayoutMode === "table" &&
    args.hasQuickColumnKeys
  )
}
