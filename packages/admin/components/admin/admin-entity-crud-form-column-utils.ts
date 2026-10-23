import type { AdminEntityColumn, AdminEntityDefinition } from "../../admin-entity-types"
import type {
  AdminCrudFormFieldChangeEffect,
  AdminCrudFormFieldChangeEffectArgs,
} from "../../admin-client-registry-context"
import type { AdminEntityCrudFormSubscribeApi } from "../../admin-entity-crud-form-subscribe-api"
import { ADMIN_ENTITY_CRUD_FORM_GRID_BREAKPOINT_MIN_PX } from "../../admin-entity-form-grid"

export function chainAdminCrudFieldStringChange(
  effect: AdminCrudFormFieldChangeEffect | undefined,
  base: Omit<AdminCrudFormFieldChangeEffectArgs, "fieldKey" | "nextValue">,
  fieldKey: string,
  handleChange: (v: string) => void,
) {
  return (v: string) => {
    handleChange(v)
    effect?.({ ...base, fieldKey, nextValue: v })
  }
}

export function partitionCrudDeferredColumns(
  cols: AdminEntityColumn[],
  entityDefinition: AdminEntityDefinition,
): { mainCols: AdminEntityColumn[]; deferredCols: AdminEntityColumn[] } {
  const keys = entityDefinition.crudFormAfterRelatedColumnKeys
  if (keys == null || keys.length === 0) {
    return { mainCols: cols, deferredCols: [] }
  }
  const deferredSet = new Set(keys)
  return {
    mainCols: cols.filter((c) => !deferredSet.has(c.key)),
    deferredCols: cols.filter((c) => deferredSet.has(c.key)),
  }
}

export function buildAdminEntityCrudFormGroupPartition(
  cols: AdminEntityColumn[],
  entityDefinition: AdminEntityDefinition,
): {
  ungroupedCols: AdminEntityColumn[]
  groups: Array<{ key: string; label: string; cols: AdminEntityColumn[] }>
} {
  const groups = entityDefinition.crudFormGroups
  if (!groups?.length) return { ungroupedCols: cols, groups: [] }
  const groupedKeySet = new Set(groups.flatMap((g) => [...g.columnKeys]))
  return {
    ungroupedCols: cols.filter((c) => !groupedKeySet.has(c.key)),
    groups: groups
      .map((g) => ({
        key: g.key,
        label: g.label,
        cols: g.columnKeys
          .map((k) => cols.find((c) => c.key === k))
          .filter((c): c is AdminEntityColumn => c != null),
      }))
      .filter((g) => g.cols.length > 0),
  }
}

export function adminEntityCreateFormKeySeedDigest(
  seeds: Record<string, string> | undefined,
): string {
  if (seeds == null || Object.keys(seeds).length === 0) return "_"
  const keys = Object.keys(seeds).sort()
  return keys.map((k) => `${k}=${seeds[k] ?? ""}`).join("|")
}

/** TanStack Form shape for dynamic admin entity columns (all string inputs). */
export type AdminEntityStringMapForm = Record<string, string>

/** Read current values after synchronous `setFieldValue` in submit hooks (`@tanstack/react-store`). */
export function adminCrudFormLatestStringMapValues(
  form: { readonly store: { readonly state: { readonly values: unknown } } },
  submitSnapshot: AdminEntityStringMapForm,
): AdminEntityStringMapForm {
  const v = form.store.state.values
  if (v != null && typeof v === "object" && !Array.isArray(v)) {
    return v as AdminEntityStringMapForm
  }
  return submitSnapshot
}

export const adminCrudFormGridMediaQuery = `(min-width: ${ADMIN_ENTITY_CRUD_FORM_GRID_BREAKPOINT_MIN_PX}px)`

export function crudFormFieldGridSpan(col: AdminEntityColumn): number | undefined {
  return col.listManyRelation?.form?.formGridSpan ?? col.formGridSpan
}

export function adminEntityFieldRequiredOnCreate(col: AdminEntityColumn): boolean {
  return !col.optionalOnCreate
}

export function adminEntityFieldRequiredOnEdit(
  col: AdminEntityColumn,
  isBool: boolean,
): boolean {
  if (col.crudEditReadOnly === true) return false
  if (isBool) return false
  return !col.patchEmptyClears
}

export function adminEntityCrudRelationFilterSelections(
  col: AdminEntityColumn,
  formValues: AdminEntityStringMapForm,
): Record<string, string> | undefined {
  const parentKey = col.listRelation?.crudRelationFilterFromFormColumnKey
  if (!parentKey) return undefined
  const relatedKey = col.listRelation?.crudRelationFilterRelatedColumnKey ?? parentKey
  const v = (formValues[parentKey] ?? "").trim()
  if (!v) return undefined
  return { [relatedKey]: v }
}

export function adminEntityColumnShownInCrudForm(
  col: AdminEntityColumn,
  formValues: Record<string, string>,
): boolean {
  if (col.crudFormVisibleOnlyWhen) {
    const w = col.crudFormVisibleOnlyWhen
    if (String(formValues[w.columnKey] ?? "") !== w.equals) return false
  }
  if (col.formHiddenWhen) {
    return !col.formHiddenWhen(formValues)
  }
  return true
}
