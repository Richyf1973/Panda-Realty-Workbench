"use client"

import * as React from "react"

export type AdminListViewportChromeValue = {
  fullViewportList: boolean
  setFullViewportList: (next: boolean) => void
}

const AdminListViewportChromeContext =
  React.createContext<AdminListViewportChromeValue | null>(null)

export function AdminListViewportChromeProvider({
  value,
  children,
}: {
  value: AdminListViewportChromeValue
  children: React.ReactNode
}) {
  return (
    <AdminListViewportChromeContext.Provider value={value}>
      {children}
    </AdminListViewportChromeContext.Provider>
  )
}

/** When no provider is mounted (e.g. Galaxy admin), returns `null`. */
export function useOptionalAdminListViewportChrome(): AdminListViewportChromeValue | null {
  return React.useContext(AdminListViewportChromeContext)
}
