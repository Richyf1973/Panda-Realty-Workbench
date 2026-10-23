import { pandaPropertiesEntity } from "@/lib/admin/entities/pandaProperties"

import type { ExportColumn } from "./properties-export-toolbar.types"

export const EXPORT_MAX = 5000
export const EXPORT_WARN = 1000

/**
 * Column keys that are excluded from the export by default.
 * Users can still enable them individually in the dialog.
 */
export const DEFAULT_DISABLED_COLUMNS = new Set([
  "propertyListId",
  "openInRpp",
  "propertyImage",
  "createdAt",
  "updatedAt",
])

/** Virtual-only columns (none today) — skipped from the export column list. */
export const NON_EXPORTABLE_COLUMNS = new Set<string>()

export const DEFAULT_COLUMNS: ExportColumn[] = pandaPropertiesEntity.columns
  .filter((c) => !NON_EXPORTABLE_COLUMNS.has(c.key))
  .map((c) => ({
    key: c.key,
    label: c.label,
    enabled: !DEFAULT_DISABLED_COLUMNS.has(c.key),
  }))
