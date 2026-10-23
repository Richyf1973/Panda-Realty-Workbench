import type { Metadata } from "next"

import { AdminEntityPageHeaderClient } from "@repo/admin/components/admin/admin-entity-page-header-client"
import { AdminEntityPageShellFrame } from "@repo/admin/components/admin/admin-entity-page-shell-frame"
import { fetchAllPropertyStatuses } from "./queries"
import { PropertyStatusAdminClient } from "./property-status-admin-client"

export const metadata: Metadata = {
  title: "Property status · Admin",
}

export default async function PropertyStatusPage() {
  const rows = await fetchAllPropertyStatuses()

  return (
    <AdminEntityPageShellFrame pageWidthClassName="max-w-4xl">
      <AdminEntityPageHeaderClient
        title="Property status"
        entitySlug="property-status"
        hideTitleOnCompact={false}
        hideTitle={false}
      />
      <PropertyStatusAdminClient initialRows={rows} />
    </AdminEntityPageShellFrame>
  )
}
