import type { Metadata } from "next"
import { Suspense } from "react"
import { redirect } from "next/navigation"

import { AdminLayoutBody } from "@repo/admin/components/admin/admin-layout-body"
import { AdminNestedEntityCrudProvider } from "@repo/admin/components/admin/admin-nested-entity-crud"

import { AdobeSignHealthBanner } from "@/components/admin/adobe-sign-health-banner"
import { GoogleContactsSyncWarningBanner } from "@/components/admin/google-contacts-sync-warning-banner"
import { PandaRealtyAdminClientRegistryProvider } from "@/lib/admin/admin-client-registry-provider"
import { getSessionUser } from "@/lib/auth/session"

export const metadata: Metadata = {
  title: "Admin",
}

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getSessionUser()
  if (!user) {
    redirect("/login?next=/admin")
  }

  return (
    <PandaRealtyAdminClientRegistryProvider>
      <Suspense fallback={null}>
        <AdobeSignHealthBanner />
      </Suspense>
      <GoogleContactsSyncWarningBanner />
      <AdminNestedEntityCrudProvider>
        <AdminLayoutBody>{children}</AdminLayoutBody>
      </AdminNestedEntityCrudProvider>
    </PandaRealtyAdminClientRegistryProvider>
  )
}
