"use client"

import { useCallback } from "react"
import { UserPlus } from "lucide-react"
import { Button } from "@repo/ui/button"
import { emptyDraftLine } from "@repo/admin/admin-entity-crud-related-collections-draft"
import type { AdminRenderCrudRelatedTableToolbarArgs } from "@repo/admin/admin-client-registry-context"
import { useOptionalAdminNestedEntityCrud } from "@repo/admin/components/admin/admin-nested-entity-crud-context"

type Props = AdminRenderCrudRelatedTableToolbarArgs & {
  readonly categoryId: number
  readonly buttonLabel: string
  readonly dialogAddTitle?: string
  /** Passed into nested **entities** create (e.g. **Create & Edit** for buyers). */
  readonly createPrimarySubmitLabel?: string
}

/**
 * Toolbar button rendered in the Buyers / Contacts / Tenants inline tables on the property
 * edit dialog. Clicking opens the **entities** create form pre-seeded with the correct
 * `entityCategoryId`, and on success appends a filled draft line so the new entity is
 * synced to `property_entities` when the parent property form is saved.
 */
export function PandaPropertyAddEntityToolbar({
  categoryId,
  buttonLabel,
  dialogAddTitle,
  createPrimarySubmitLabel,
  childCfg,
  collection,
  implicitLineFieldsFromParentFk,
  setLines,
  variant,
}: Props) {
  const nestedCrud = useOptionalAdminNestedEntityCrud()

  const handleAdd = useCallback(() => {
    if (!nestedCrud) return
    nestedCrud.openNestedEntityCreate({
      slug: "entities",
      seedValues: { entityCategoryId: String(categoryId) },
      ...(dialogAddTitle != null ? { overrideAddCardTitle: dialogAddTitle } : {}),
      ...(createPrimarySubmitLabel != null
        ? { createPrimarySubmitLabel }
        : {}),
      onSuccess: (row) => {
        const entityId = String(row.entityId ?? "").trim()
        if (!entityId) return
        const newLine = emptyDraftLine(
          childCfg,
          collection.inlineEditableColumnKeys as readonly string[],
          implicitLineFieldsFromParentFk ?? undefined,
        )
        setLines((prev) => {
          // Insert the filled line before the trailing empty draft (if present)
          const last = prev[prev.length - 1]
          const lastIsEmpty =
            last != null && !String(last.entityId ?? "").trim()
          const filledLine = { ...newLine, entityId }
          if (lastIsEmpty) {
            return [...prev.slice(0, -1), filledLine, last]
          }
          return [...prev, filledLine]
        })
      },
    })
  }, [
    nestedCrud,
    categoryId,
    childCfg,
    collection,
    createPrimarySubmitLabel,
    dialogAddTitle,
    implicitLineFieldsFromParentFk,
    setLines,
  ])

  // Not available during create (parent not yet saved — no propertyListId to link against)
  if (!nestedCrud || variant === "create") return null

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full shrink-0 sm:w-auto"
      data-testid={`panda-property-add-entity-toolbar--${collection.jsonKey}`}
      onClick={handleAdd}
    >
      <UserPlus className="mr-2 size-4" aria-hidden />
      {buttonLabel}
    </Button>
  )
}
