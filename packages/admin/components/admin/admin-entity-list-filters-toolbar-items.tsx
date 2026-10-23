"use client"

import { AdminEntityListFiltersToolbarFiltersLead } from "./admin-entity-list-filters-toolbar-filters-lead"
import { AdminEntityListFiltersToolbarFiltersTail } from "./admin-entity-list-filters-toolbar-filters-tail"
import type { AdminEntityListFiltersToolbarItemsProps } from "./admin-entity-list-filters-toolbar-props"

export type { AdminEntityListFiltersToolbarItemsProps } from "./admin-entity-list-filters-toolbar-props"

export function AdminEntityListFiltersToolbarItems(
  props: AdminEntityListFiltersToolbarItemsProps,
) {
  return (
    <>
      <AdminEntityListFiltersToolbarFiltersLead {...props} />
      <AdminEntityListFiltersToolbarFiltersTail {...props} />
    </>
  )
}
