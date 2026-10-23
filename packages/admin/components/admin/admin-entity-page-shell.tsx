import { type ReactNode, Suspense } from "react"

import { AdminEntityAdmin } from "./admin-entity-admin"
import { AdminEntityAdminSkeleton } from "./admin-entity-admin-skeleton"
import { AdminEntityPageHeaderClient } from "./admin-entity-page-header-client"
import { AdminEntityPageShellFrame } from "./admin-entity-page-shell-frame"
import { stripAdminEntityDefinitionForRscProps } from "../../admin-entity-definition-strip-rsc-props"
import type {
  AdminEntityDefinition,
  AdminEntityPageShellCompactPageTitlePolicy,
} from "../../admin-entity-types"

type AdminEntityPageShellProps = {
  slug: string
  /** Query string without `?`, from RSC `searchParams` — keeps client hydration aligned with the URL. */
  listUrlSearch: string
  entityDefinition: AdminEntityDefinition
  /** From `adminEntityPageWidthClass` (server) so this module stays free of `@admin-context`. */
  pageWidthClassName: string
  /**
   * Compact viewport `<h1>` policy. **`showUnlessHidden`** (default) — Galaxy-style opt-out via
   * `listHidePageTitleOnCompact`. **`hideUnlessShown`** — Vibram-style default hide, opt-in via
   * `listShowPageTitleOnCompact`.
   */
  compactPageTitle?: AdminEntityPageShellCompactPageTitlePolicy
  /** Optional actions rendered beside the page title (e.g. a Sync button). */
  headerActions?: ReactNode
}

/** Server layout: title and the client CRUD table. */
export function AdminEntityPageShell({
  slug,
  listUrlSearch,
  entityDefinition,
  pageWidthClassName,
  compactPageTitle = "showUnlessHidden",
  headerActions,
}: AdminEntityPageShellProps) {
  const cfg = entityDefinition
  const hideTitleOnCompact =
    compactPageTitle === "showUnlessHidden"
      ? cfg.listHidePageTitleOnCompact === true
      : cfg.listShowPageTitleOnCompact !== true

  return (
    <AdminEntityPageShellFrame pageWidthClassName={pageWidthClassName}>
      <div className="flex shrink-0 items-center justify-between gap-3">
        <AdminEntityPageHeaderClient
          title={cfg.ui.title}
          entitySlug={slug}
          hideTitleOnCompact={hideTitleOnCompact}
          hideTitle={cfg.listHidePageTitle === true}
        />
        {headerActions}
      </div>
      <Suspense fallback={<AdminEntityAdminSkeleton />}>
        <AdminEntityAdmin
          slug={slug}
          entityDefinition={stripAdminEntityDefinitionForRscProps(entityDefinition)}
          listUrlSearch={listUrlSearch}
        />
      </Suspense>
    </AdminEntityPageShellFrame>
  )
}
