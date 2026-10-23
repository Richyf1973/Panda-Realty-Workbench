import type { Metadata } from "next"

import { AdminEntityPageShell } from "@repo/admin/components/admin/admin-entity-page-shell"
import { adminEntityPageWidthClass } from "@repo/admin/admin-entity-page-layout"
import { serializeAdminEntityPageSearchParams } from "@repo/admin/admin-entity-page-search-params"

import { adminEntities } from "@/lib/admin/admin-entities-bundled"
import { frontendConfig } from "@/lib/config/frontend"

export const metadata: Metadata = {
  title: "Properties · Admin",
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function PropertiesPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const entity = adminEntities["properties"]
  return (
    <AdminEntityPageShell
      slug="properties"
      listUrlSearch={serializeAdminEntityPageSearchParams(sp)}
      entityDefinition={entity}
      pageWidthClassName={adminEntityPageWidthClass({
        entity,
        defaultEntityPageWidth: frontendConfig.admin.entityPageWidth,
      })}
    />
  )
}
