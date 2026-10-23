import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { AdminEntityPageShell } from "@repo/admin/components/admin/admin-entity-page-shell"
import { adminEntityPageWidthClass } from "@repo/admin/admin-entity-page-layout"
import {
  adminEntities,
  adminPageEntitySlugs,
  isAdminPageSlug,
} from "@/lib/admin/admin-entity-registry"
import { frontendConfig } from "@/lib/config/frontend"
import { serializeAdminEntityPageSearchParams } from "@repo/admin/admin-entity-page-search-params"

type PageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export function generateStaticParams() {
  return adminPageEntitySlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  if (!isAdminPageSlug(slug)) {
    return { title: "Admin" }
  }
  return { title: adminEntities[slug].metadataTitle }
}

export default async function AdminEntityPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params
  if (!isAdminPageSlug(slug)) {
    notFound()
  }
  const sp = await searchParams
  const listUrlSearch = serializeAdminEntityPageSearchParams(sp)
  return (
    <AdminEntityPageShell
      slug={slug}
      listUrlSearch={listUrlSearch}
      entityDefinition={adminEntities[slug]}
      pageWidthClassName={adminEntityPageWidthClass({
        entity: adminEntities[slug],
        defaultEntityPageWidth: frontendConfig.admin.entityPageWidth,
      })}
    />
  )
}
