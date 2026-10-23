"use client"

import { useOptionalAdminListViewportChrome } from "../../admin-list-viewport-chrome-context"
import { AdminEntityPageHeader } from "./admin-entity-page-header"
import { useCompactAdminListViewport } from "@repo/ui/use-compact-admin-list-viewport"

export type AdminEntityPageHeaderClientProps = {
  title: string
  entitySlug: string
  /** Per-entity: omit the `<h1>` on compact viewports (nav still shows the page in context). */
  hideTitleOnCompact?: boolean
  /** Per-entity: omit the `<h1>` on all viewports (card toolbar provides enough context). */
  hideTitle?: boolean
}

/** Hides the page title when optional full-viewport list mode is active (Vibram Sales). */
export function AdminEntityPageHeaderClient({
  title,
  entitySlug,
  hideTitleOnCompact = false,
  hideTitle = false,
}: AdminEntityPageHeaderClientProps) {
  const chrome = useOptionalAdminListViewportChrome()
  const isCompactList = useCompactAdminListViewport()
  if (hideTitle) {
    return null
  }
  if (chrome?.fullViewportList) {
    return null
  }
  if (hideTitleOnCompact && isCompactList) {
    return null
  }
  return <AdminEntityPageHeader title={title} entitySlug={entitySlug} />
}
