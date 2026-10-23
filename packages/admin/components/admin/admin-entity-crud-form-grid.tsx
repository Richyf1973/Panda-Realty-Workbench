"use client"

import { useState, useLayoutEffect, type CSSProperties, type ReactNode } from "react"
import { cn } from "@repo/ui/utils"
import {
  ADMIN_ENTITY_CRUD_FORM_FIELDS_GRID_CLASS,
  ADMIN_ENTITY_CRUD_FORM_GRID_TEMPLATE_COLUMNS_WIDE,
} from "../../admin-entity-form-grid"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityDefinition, AdminEntityColumn } from "../../admin-entity-types"
import type { AdminEntityCrudListRelationFieldOptionsMap } from "../../admin-entity-crud-relation-field-options-types"
import type {
  AdminRenderCrudFormAfterMainFieldsArgs,
  AdminRenderCrudFormGroupBodyArgs,
} from "../../admin-client-registry-context"
import { adminCrudFormGridMediaQuery, crudFormFieldGridSpan } from "./admin-entity-crud-form-column-utils"

export function renderAdminEntityCrudFormGroupFieldsGrid(args: {
  readonly renderCrudFormGroupBody?: (
    a: AdminRenderCrudFormGroupBodyArgs,
  ) => ReactNode | null | undefined
  readonly slug: AdminEntitySlug
  readonly variant: "create" | "edit"
  readonly entityRowId: string | null
  readonly entityDefinition: AdminEntityDefinition
  readonly listDetailSeed?: Record<string, unknown>
  readonly group: { key: string; label: string; cols: AdminEntityColumn[] }
  readonly form: NonNullable<AdminRenderCrudFormAfterMainFieldsArgs["form"]>
  readonly crudListRelationFieldOptions: AdminEntityCrudListRelationFieldOptionsMap
  readonly wideGrid: boolean
  readonly isCompact: boolean
  readonly extraGridClassName?: string
  readonly renderField: (
    col: AdminEntityColumn,
    wrapperStyle: CSSProperties,
  ) => ReactNode
}): ReactNode {
  const custom = args.renderCrudFormGroupBody?.({
    slug: args.slug,
    variant: args.variant,
    entityRowId: args.entityRowId,
    entityDefinition: args.entityDefinition,
    listDetailSeed: args.listDetailSeed,
    group: args.group,
    form: args.form,
    crudListRelationFieldOptions: args.crudListRelationFieldOptions,
    wideGrid: args.wideGrid,
    isCompact: args.isCompact,
    extraGridClassName: args.extraGridClassName,
    renderGroupField: args.renderField,
  })
  if (custom != null) return custom

  return (
    <div
      className={cn(
        ADMIN_ENTITY_CRUD_FORM_FIELDS_GRID_CLASS,
        args.isCompact && "admin-entity-crud-form-fields-grid--compact",
        args.extraGridClassName,
      )}
      data-testid={`admin-entity-crud-form-group-grid--${args.variant}--${args.slug}--${args.group.key}`}
      style={{
        gridTemplateColumns: args.wideGrid
          ? ADMIN_ENTITY_CRUD_FORM_GRID_TEMPLATE_COLUMNS_WIDE
          : "1fr",
      }}
    >
      {args.group.cols.map((col) => {
        const span = crudFormFieldGridSpan(col) ?? 12
        return args.renderField(col, {
          gridColumn: args.wideGrid
            ? `span ${span} / span ${span}`
            : undefined,
        })
      })}
    </div>
  )
}

/**
 * Wide vs stacked field templates follow viewport width (Tailwind `sm`), not the dialog width.
 * `grid-template-areas` is applied inline — CSS custom properties are unreliable for this in some engines.
 */
export function useAdminCrudFormWideGridLayout(): boolean {
  const [wide, setWide] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia(adminCrudFormGridMediaQuery).matches
      : false,
  )
  useLayoutEffect(() => {
    const mq = window.matchMedia(adminCrudFormGridMediaQuery)
    const sync = () => setWide(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])
  return wide
}
