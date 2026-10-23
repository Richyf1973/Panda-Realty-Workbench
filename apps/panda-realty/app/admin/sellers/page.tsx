import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AdminEntityPageShellFrame } from "@repo/admin/components/admin/admin-entity-page-shell-frame"

import { getSessionUser } from "@/lib/auth/session"
import { SellersTable } from "./sellers-table"

export const metadata: Metadata = {
  title: "Sellers · Admin",
}

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function SellersPage({ searchParams }: PageProps) {
  const user = await getSessionUser()
  if (!user) redirect("/login?next=/admin/sellers")

  const sp = await searchParams
  const initialSearch = typeof sp.q === "string" && sp.q.trim() ? sp.q.trim() : undefined

  return (
    <AdminEntityPageShellFrame pageWidthClassName="max-w-7xl">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Sellers</h1>
        <p className="text-sm text-muted-foreground">
          Property owners extracted from the property list.
        </p>
      </div>
      <SellersTable initialSearch={initialSearch} />
    </AdminEntityPageShellFrame>
  )
}
