"use client"

import { createContext, useContext } from "react"

import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminNestedEditUiContext } from "./admin-entity-crud-dialog-state"

export type OpenNestedEntityEditArgs = {
  readonly slug: AdminEntitySlug
  /** Stringified row id for `GET/PATCH …/[id]`. */
  readonly rowId: string
  /**
   * Override the edit dialog title singular (e.g. `"Buyer"` → "Edit Buyer").
   * Falls back to the entity definition’s `ui.singular`.
   */
  readonly overrideSingular?: string
  /** Optional UI context for custom form bodies (e.g. Panda link-property prefill). */
  readonly nestedEditUiContext?: AdminNestedEditUiContext
}

export type OpenNestedEntityCreateArgs = {
  readonly slug: AdminEntitySlug
  /** Merged over create form defaults (e.g. map typed search to `itemCode`). */
  readonly seedValues: Readonly<Record<string, string>>
  /**
   * Called after a successful **POST** with the created API row (camelCase keys). The async relation
   * control typically sets the FK from the related entity’s `idColumn`.
   */
  readonly onSuccess: (row: Record<string, unknown>) => void
  /**
   * Override the create dialog title (e.g. `"Add Buyer"`).
   * Falls back to the entity definition’s `ui.addCardTitle`.
   */
  readonly overrideAddCardTitle?: string
  /**
   * Overrides the default primary submit label (e.g. **Create & Edit** for nested buyer entity
   * create). Omit → **Create** / **Creating…** unchanged from `AdminEntityCreateCrudForm`.
   */
  readonly createPrimarySubmitLabel?: string
}

export type AdminNestedEntityCrudContextValue = {
  readonly openNestedEntityEdit: (args: OpenNestedEntityEditArgs) => Promise<void>
  /**
   * Open a second-stack **create** dialog for any admin entity (e.g. inventories from sales line item
   * async search). Must wrap admin with `AdminNestedEntityCrudProvider`.
   */
  readonly openNestedEntityCreate: (args: OpenNestedEntityCreateArgs) => void
  /**
   * Promote the currently open nested create dialog into edit mode using the created API row.
   * The caller uses this after any post-create linking work that needs to happen before edit opens.
   */
  readonly promoteNestedCreateDialogToEditFromApiRow: (row: Record<string, unknown>) => void
  /** While a nested dialog is loading detail, the row id being fetched (for button UX). */
  readonly nestedCrudBusyRowId: string | null
}

export const AdminNestedEntityCrudContext =
  createContext<AdminNestedEntityCrudContextValue | null>(null)

export function useOptionalAdminNestedEntityCrud(): AdminNestedEntityCrudContextValue | null {
  return useContext(AdminNestedEntityCrudContext)
}
