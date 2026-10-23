"use client"

import { AdminEntityListFiltersToolbarItems } from "./admin-entity-list-filters-toolbar-items"
import type { AdminEntityListFiltersToolbarProps } from "./admin-entity-list-filters-toolbar-props"
import { resolveListFiltersToolbarLayout } from "./admin-entity-list-filters-toolbar-layout"
import { cn } from "@repo/ui/utils"

export type { AdminEntityListFiltersToolbarProps } from "./admin-entity-list-filters-toolbar-props"

export function AdminEntityListFiltersToolbar(
  props: AdminEntityListFiltersToolbarProps,
) {
  const {
    className,
    compactVertical = false,
    listFiltersToolbarDense = false,
    ...rest
  } = props
  const layout = resolveListFiltersToolbarLayout(
    compactVertical,
    listFiltersToolbarDense,
  )
  return (
    <div className={cn(layout.rowWrap, className)}>
      <AdminEntityListFiltersToolbarItems
        {...rest}
        compactVertical={compactVertical}
        denseDesktop={layout.denseDesktop}
        labelClass={layout.labelClass}
        fieldWrap={layout.fieldWrap}
      />
    </div>
  )
}
