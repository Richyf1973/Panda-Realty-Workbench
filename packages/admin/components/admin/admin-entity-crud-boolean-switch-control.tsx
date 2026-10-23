"use client"

import { Switch } from "@repo/ui/switch"
import { adminEntityBooleanFormChecked } from "../../admin-entity-crud-boolean-form"
import type { AdminEntityColumn } from "../../admin-entity-types"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import { adminEntityColumnFormLabel } from "../../admin-entity-column-form-label"

export function AdminEntityCrudBooleanSwitchControl({
  variant,
  slug,
  col,
  htmlForId,
  value,
  onChange,
  onBlur,
  readOnly,
}: {
  variant: "create" | "edit"
  slug: AdminEntitySlug
  col: AdminEntityColumn
  htmlForId: string
  value: string
  onChange: (next: string) => void
  onBlur: () => void
  readOnly?: boolean
}) {
  const testIdPrefix =
    variant === "create" ? "admin-entity-create" : "admin-entity-edit"
  return (
    <div className="flex h-9 items-center">
      <Switch
        id={htmlForId}
        checked={adminEntityBooleanFormChecked(value)}
        onCheckedChange={(c) => onChange(c ? "true" : "false")}
        onBlur={onBlur}
        disabled={readOnly === true}
        data-testid={`${testIdPrefix}-switch--${slug}--${col.key}`}
        aria-label={adminEntityColumnFormLabel(col)}
        aria-readonly={readOnly === true ? true : undefined}
      />
    </div>
  )
}
