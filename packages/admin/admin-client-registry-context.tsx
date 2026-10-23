"use client"

import { createContext, useContext, type ReactNode } from "react"

import type { AdminClientRegistryValue } from "./admin-client-registry-types"

export * from "./admin-client-registry-types"

export const AdminClientRegistryContext =
  createContext<AdminClientRegistryValue | null>(null)

export function AdminClientRegistryProvider({
  value,
  children,
}: {
  value: AdminClientRegistryValue
  children: ReactNode
}) {
  return (
    <AdminClientRegistryContext.Provider value={value}>
      {children}
    </AdminClientRegistryContext.Provider>
  )
}

export function useAdminClientRegistry(): AdminClientRegistryValue {
  const v = useContext(AdminClientRegistryContext)
  if (v == null) {
    throw new Error(
      "useAdminClientRegistry requires AdminClientRegistryProvider — wrap /admin layout (see app lib/admin/admin-client-registry-provider).",
    )
  }
  return v
}
