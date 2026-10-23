const DEFAULT_FORM_GRID_SPAN = 12

/** Matches Tailwind `sm`; wide packing uses 12 columns from this min viewport width up. */
export const ADMIN_ENTITY_CRUD_FORM_GRID_BREAKPOINT_MIN_PX = 640

export const ADMIN_ENTITY_CRUD_FORM_GRID_TEMPLATE_COLUMNS_WIDE =
  "repeat(12, minmax(0, 1fr))"

/**
 * Wide CRUD body: main field grid (9 parts) + many-relation checkbox rail (3 parts), like list
 * `admin-entity-list-main-column` vs relation-filters side panel.
 */
export const ADMIN_ENTITY_CRUD_FORM_SIDE_MANY_RELATION_GRID_TEMPLATE_COLUMNS =
  "minmax(0,9fr) minmax(0,3fr)"

/** `grid-area` name for the optional full-width mutation error row. */
export const ADMIN_ENTITY_CRUD_MUTATION_ERROR_GRID_AREA = "formErr"

/**
 * Shell class for admin create/edit dialog field grids (gap/padding).
 * `grid-template-areas` / columns are set inline on the element (`admin-entity-admin-crud-dialog.tsx`).
 */
export const ADMIN_ENTITY_CRUD_FORM_FIELDS_GRID_CLASS =
  "admin-entity-crud-form-fields-grid min-w-0"

/**
 * Root wrapper for each field in the CRUD `grid-template-areas` layout. The parent grid stretches
 * items per row; `h-full` + flex column lets a sibling row with an error grow the row while
 * `mt-auto` on {@link ADMIN_ENTITY_CRUD_FIELD_ERROR_FOOTER_CLASS} keeps controls top-aligned and
 * errors on the baseline — without a fixed empty min-height when all fields are valid.
 */
export const ADMIN_ENTITY_CRUD_FIELD_CELL_CLASS =
  "flex h-full min-h-0 min-w-0 flex-col gap-2"

/** Sits below the control; `mt-auto` pins it to the bottom of the stretched cell. */
export const ADMIN_ENTITY_CRUD_FIELD_ERROR_FOOTER_CLASS =
  "mt-auto min-h-0 shrink-0"

const GRID_TEMPLATE_NONE = "none"

/** Clamp to [1, 12] for grid placement. */
export function adminEntityFormGridSpanClamp(
  span: number | undefined,
): number {
  if (span == null || Number.isNaN(span)) return DEFAULT_FORM_GRID_SPAN
  const n = Math.trunc(span)
  return Math.min(12, Math.max(1, n))
}

function formatGridTemplateAreas(rows: readonly (readonly string[])[]): string {
  if (rows.length === 0) return GRID_TEMPLATE_NONE
  return rows.map((row) => `"${row.join(" ")}"`).join(" ")
}

function fieldAreaName(index: number): string {
  return `f${index}`
}

/**
 * Pack fields into 12-column rows; each cell in a row names the field’s `grid-area`.
 * When a field does not fit the current row, the row is padded with `.` and a new row starts.
 */
function buildWideTemplateAreaRows(
  fieldSpans: readonly (number | undefined)[],
): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cursor = 0

  const flushRow = () => {
    while (row.length < 12) row.push(".")
    rows.push(row)
    row = []
    cursor = 0
  }

  for (let i = 0; i < fieldSpans.length; i++) {
    const raw = fieldSpans[i]
    if (raw === 0) continue // span=0 means hidden — exclude from grid layout
    const s = adminEntityFormGridSpanClamp(raw)
    const name = fieldAreaName(i)
    if (cursor + s > 12) flushRow()
    for (let k = 0; k < s; k++) row.push(name)
    cursor += s
    if (cursor === 12) flushRow()
  }
  if (row.length > 0) flushRow()
  return rows
}

function appendMutationErrorRow(rows: string[][]): void {
  rows.push(Array(12).fill(ADMIN_ENTITY_CRUD_MUTATION_ERROR_GRID_AREA))
}

export type AdminEntityCrudFormGridLayout = {
  /** `grid-template-areas` when viewport ≥ `ADMIN_ENTITY_CRUD_FORM_GRID_BREAKPOINT_MIN_PX`. */
  readonly gridTemplateAreasWide: string
  /** `grid-template-areas` when viewport is narrower (one field per row). */
  readonly gridTemplateAreasNarrow: string
  /** `grid-area` name for each field index (same order as `fieldSpans`). */
  readonly fieldAreaNames: readonly string[]
}

/**
 * Build `grid-template-areas` strings and per-field `grid-area` names for the admin CRUD dialog.
 * Wide layout packs `formGridSpan` into 12 columns; narrow layout stacks one field per row.
 * Many-relation checkbox columns are usually **omitted** here (see
 * `partitionAdminEntityCrudColumnsMainAndManyRelationSide` in the dialog).
 */
export function buildAdminEntityCrudFormGridLayout(
  fieldSpans: readonly (number | undefined)[],
  options: { readonly includeMutationErrorRow: boolean },
): AdminEntityCrudFormGridLayout {
  const fieldAreaNames = fieldSpans.map((_, i) => fieldAreaName(i))

  const wideRows = buildWideTemplateAreaRows(fieldSpans)
  const narrowRows: string[][] = fieldSpans
    .map((s, i) => (s === 0 ? null : [fieldAreaName(i)]))
    .filter((r): r is string[] => r !== null)

  if (options.includeMutationErrorRow) {
    appendMutationErrorRow(wideRows)
    narrowRows.push([ADMIN_ENTITY_CRUD_MUTATION_ERROR_GRID_AREA])
  }

  return {
    gridTemplateAreasWide: formatGridTemplateAreas(wideRows),
    gridTemplateAreasNarrow: formatGridTemplateAreas(narrowRows),
    fieldAreaNames,
  }
}
