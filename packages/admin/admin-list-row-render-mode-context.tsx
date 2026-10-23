"use client"

import { createContext, useContext, type ReactNode } from "react"

/**
 * Which list layout is currently rendering a row's actions cell. The same
 * actions cell (and its `renderAdminEntityListRowExtraActions` content) is
 * flex-rendered by the desktop table, the quick-desktop cards, and the mobile
 * cards. Controls that should only appear in one layout (e.g. the table-only
 * "remove from view" checkbox) read this to opt out of the others.
 *
 * Defaults to "table" so the desktop table needs no provider.
 */
export type AdminListRowRenderMode =
  | "table"
  | "quick-card"
  | "mobile-card"
  | "grid"

const AdminListRowRenderModeContext =
  createContext<AdminListRowRenderMode>("table")

export function AdminListRowRenderModeProvider({
  mode,
  children,
}: {
  mode: AdminListRowRenderMode
  children: ReactNode
}) {
  return (
    <AdminListRowRenderModeContext.Provider value={mode}>
      {children}
    </AdminListRowRenderModeContext.Provider>
  )
}

export function useAdminListRowRenderMode(): AdminListRowRenderMode {
  return useContext(AdminListRowRenderModeContext)
}
