"use client"

import type { ReactNode } from "react"
import { flexRender, type Cell } from "@tanstack/react-table"

export function buildPropertyFormsQuickCardBody<TData>(args: {
  readonly rowKey: string
  readonly entitySlug: string
  readonly bodyCells: Cell<TData, unknown>[]
}): ReactNode {
  const { entitySlug, bodyCells } = args
  const m = new Map(bodyCells.map((c) => [c.column.id, c]))
  const formName = m.get("formName")
  const category = m.get("category")
  const isActive = m.get("isActive")
  const fileName = m.get("fileName")
  const fileLink = m.get("fileLink")

  const categoryVal = category != null ? (category.getValue() as string | null | undefined) : null
  const fileNameVal = fileName != null ? (fileName.getValue() as string | null | undefined) : null
  const fileLinkVal = fileLink != null ? (fileLink.getValue() as string | null | undefined) : null
  const hasFile = (fileNameVal != null && fileNameVal !== "") || (fileLinkVal != null && fileLinkVal !== "")

  return (
    <>
      <div className="flex min-w-0 items-start justify-between gap-2">
        {formName != null ? (
          <span
            className="min-w-0 flex-1 text-sm font-semibold leading-snug text-foreground [overflow-wrap:anywhere]"
            data-testid={`admin-entity-quick-card-field--${entitySlug}--formName`}
          >
            {flexRender(formName.column.columnDef.cell, formName.getContext())}
          </span>
        ) : null}
        {isActive != null ? (
          <div
            className="shrink-0"
            data-testid={`admin-entity-quick-card-field--${entitySlug}--isActive`}
          >
            {flexRender(isActive.column.columnDef.cell, isActive.getContext())}
          </div>
        ) : null}
      </div>
      {category != null && categoryVal != null && categoryVal !== "" ? (
        <div
          className="text-xs text-muted-foreground"
          data-testid={`admin-entity-quick-card-field--${entitySlug}--category`}
        >
          {flexRender(category.column.columnDef.cell, category.getContext())}
        </div>
      ) : null}
      {hasFile ? (
        <div className="flex min-w-0 items-center gap-2">
          {fileName != null && fileNameVal != null && fileNameVal !== "" ? (
            <span
              className="min-w-0 truncate text-xs text-muted-foreground"
              data-testid={`admin-entity-quick-card-field--${entitySlug}--fileName`}
            >
              {flexRender(fileName.column.columnDef.cell, fileName.getContext())}
            </span>
          ) : null}
          {fileLink != null && fileLinkVal != null && fileLinkVal !== "" ? (
            <div
              className="shrink-0"
              data-testid={`admin-entity-quick-card-field--${entitySlug}--fileLink`}
            >
              {flexRender(fileLink.column.columnDef.cell, fileLink.getContext())}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
