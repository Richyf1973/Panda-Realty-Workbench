import { adminEntityBooleanFormChecked } from "./admin-entity-crud-boolean-form"
import type {
  AdminEntityColumn,
  AdminEntityDefinition,
} from "./admin-entity-types"

/**
 * Plain integer inline fields (e.g. bill counts) may be stored as Postgres `numeric` and arrive as
 * `"1.0000000000"`. Normalize for display and POST payloads.
 */
export function normalizeAdminEntityIntegerLineFieldFromServer(
  col: Pick<AdminEntityColumn, "valueType" | "listRelation"> | undefined,
  v: unknown,
): string {
  if (col?.valueType !== "integer" || col.listRelation) {
    return v == null ? "" : String(v)
  }
  const s = v == null ? "" : String(v).trim()
  if (s === "") return ""
  const n = Number(s)
  if (!Number.isFinite(n)) return s
  return String(Math.trunc(n))
}

export type LineRow = Record<string, unknown> & { readonly clientKey: string }

/**
 * Key on `adminEntityCrudExtrasForSaveRef.current` for client-only messages when an inline related
 * table has “orphan” draft rows (persist key empty but other fields have content). Not listed in
 * `extraCreateBodyKeys` / `extraPatchBodyKeys`, so it never POSTs.
 */
export const ADMIN_CRUD_INLINE_DRAFT_ISSUES_REF_KEY =
  "_inlineDraftIssues" as const

export type AdminCrudInlineDraftIssuesMap = Record<string, string>

/** True when the string parses to zero (draft amounts default to `"0"`). */
export function numericStringIsEffectivelyZero(s: string): boolean {
  if (s === "") return true
  const n = Number(s)
  return Number.isFinite(n) && n === 0
}

export function emptyDraftLine(
  childCfg: AdminEntityDefinition,
  editableKeys: readonly string[],
  implicitLineFields?: Readonly<Record<string, string>>,
  /** Merged after type defaults; keys must be in `editableKeys`. */
  presetEditableValues?: Readonly<Record<string, string>>,
): LineRow {
  const idKey = childCfg.idColumn.jsonKey
  const line: LineRow = { clientKey: crypto.randomUUID() }
  for (const k of editableKeys) {
    if (k === idKey) continue
    const col = childCfg.columns.find((c) => c.key === k)
    if (col?.valueType === "numeric") {
      line[k] = "0"
    } else if (col?.valueType === "integer" && !col.listRelation) {
      line[k] = "0"
    }
  }
  if (presetEditableValues) {
    for (const [k, v] of Object.entries(presetEditableValues)) {
      if (!editableKeys.includes(k)) continue
      line[k] = v
    }
  }
  if (implicitLineFields) {
    for (const [k, v] of Object.entries(implicitLineFields)) {
      if (editableKeys.includes(k)) continue
      const t = v.trim()
      if (t === "") continue
      line[k] = v
    }
  }
  return line
}

export type LineIsEmptyForPersistOptions = {
  /**
   * Only for **new** drafts (`clientKey` does not start with `saved-`). Field values equal to these
   * strings are ignored when detecting user-entered content (auto-default dates / boolean false).
   */
  newDraftTreatFieldValuesAsEmpty?: Readonly<Record<string, string>>
}

export function lineIsEmptyForPersist(
  line: LineRow,
  persistKey: string,
  zeroSentinelKeys: ReadonlySet<string>,
  /** Preset parent-FK / hydrate keys that should not count as “user content” for empty-row checks. */
  ignoreKeysForEmpty?: ReadonlySet<string>,
  options?: LineIsEmptyForPersistOptions,
): boolean {
  const p = String(line[persistKey] ?? "").trim()
  if (p !== "") {
    const persistKeyIsDefaultNumericZero =
      zeroSentinelKeys.has(persistKey) && numericStringIsEffectivelyZero(p)
    if (!persistKeyIsDefaultNumericZero) {
      return false
    }
  }
  const isNewDraft = !String(line.clientKey ?? "").startsWith("saved-")
  const treatEmpty = options?.newDraftTreatFieldValuesAsEmpty
  for (const k of Object.keys(line)) {
    if (k === "clientKey" || k === persistKey) continue
    if (ignoreKeysForEmpty?.has(k)) continue
    const v = line[k]
    const s = typeof v === "string" ? v.trim() : String(v ?? "").trim()
    if (
      isNewDraft &&
      treatEmpty != null &&
      Object.hasOwn(treatEmpty, k) &&
      treatEmpty[k] === s
    ) {
      continue
    }
    if (
      s !== "" &&
      !(zeroSentinelKeys.has(k) && numericStringIsEffectivelyZero(s))
    ) {
      return false
    }
  }
  return true
}

export function normalizeTrailingDrafts(
  lines: LineRow[],
  persistKey: string,
  zeroSentinelKeys: ReadonlySet<string>,
  childCfg: AdminEntityDefinition,
  editableKeys: readonly string[],
  implicitLineFields?: Readonly<Record<string, string>>,
  presetEditableValues?: Readonly<Record<string, string>>,
  lineEmptyOptions?: LineIsEmptyForPersistOptions,
): LineRow[] {
  const ignoreImplicit =
    implicitLineFields == null
      ? undefined
      : new Set(Object.keys(implicitLineFields))
  if (lines.length === 0) {
    return [
      emptyDraftLine(
        childCfg,
        editableKeys,
        implicitLineFields,
        presetEditableValues,
      ),
    ]
  }
  const last = lines[lines.length - 1]!
  if (
    !lineIsEmptyForPersist(
      last,
      persistKey,
      zeroSentinelKeys,
      ignoreImplicit,
      lineEmptyOptions,
    )
  ) {
    return [
      ...lines,
      emptyDraftLine(
        childCfg,
        editableKeys,
        implicitLineFields,
        presetEditableValues,
      ),
    ]
  }
  return lines
}

/**
 * When GET detail arrives, merge server-normalized rows with any **unsaved** inline drafts the user
 * already typed (same logic as the related inline table `setLines` updater).
 */
export function mergeRelatedInlineDetailHydrateLines(
  prev: LineRow[],
  normalized: LineRow[],
  persistKey: string,
  zeroSentinelKeys: ReadonlySet<string>,
  implicitIgnore: ReadonlySet<string> | undefined,
  lineEmptyOptions: LineIsEmptyForPersistOptions | undefined,
): LineRow[] {
  const unsavedDrafts = prev.filter(
    (l) =>
      !String(l.clientKey ?? "").startsWith("saved-") &&
      !lineIsEmptyForPersist(
        l,
        persistKey,
        zeroSentinelKeys,
        implicitIgnore,
        lineEmptyOptions,
      ),
  )
  if (unsavedDrafts.length === 0) return normalized
  const serverRows = normalized.filter((l) =>
    String(l.clientKey ?? "").startsWith("saved-"),
  )
  const trailingDrafts = normalized.filter(
    (l) => !String(l.clientKey ?? "").startsWith("saved-"),
  )
  return [...serverRows, ...unsavedDrafts, ...trailingDrafts]
}

/**
 * Same JSON shape as each element of {@link linesToExtrasPayload}, for one draft row.
 * Exported for app-specific sparse PATCH builders that diff against server baseline rows.
 */
export function serializeLineRowForExtrasPayload(
  l: LineRow,
  childCfg: AdminEntityDefinition,
  editableKeys: readonly string[],
  options?: {
    extrasPayloadKeys?: readonly string[]
  },
): Record<string, unknown> {
  const idKey = childCfg.idColumn.jsonKey
  const o: Record<string, unknown> = {}
  const rawId = l[idKey]
  if (typeof rawId === "bigint") {
    const n = Number(rawId)
    if (Number.isFinite(n)) o[idKey] = n
  } else if (typeof rawId === "number" && Number.isFinite(rawId)) {
    o[idKey] = rawId
  } else if (typeof rawId === "string" && /^\d+$/.test(rawId.trim())) {
    o[idKey] = Number(rawId.trim())
  }
  const copyKey = (k: string) => {
    if (k === idKey) return
    const col = childCfg.columns.find((c) => c.key === k)
    const raw = l[k]
    if (col?.valueType === "numeric") {
      o[k] =
        typeof raw === "string" ? raw.trim() || "0" : String(raw ?? "0")
      return
    }
    if (col?.valueType === "integer" && !col.listRelation) {
      const rawStr =
        typeof raw === "string" ? raw.trim() : String(raw ?? "").trim()
      if (rawStr === "") {
        o[k] = "0"
        return
      }
      const n = Number(rawStr)
      o[k] = Number.isFinite(n) ? String(Math.trunc(n)) : rawStr
      return
    }
    if (col?.valueType === "boolean") {
      o[k] = adminEntityBooleanFormChecked(
        typeof raw === "string" ? raw : String(raw ?? ""),
      )
      return
    }
    if (col != null) {
      o[k] = typeof raw === "string" ? raw : String(raw ?? "")
      return
    }
    if (raw != null && typeof raw === "object" && !(raw instanceof Date)) {
      o[k] = structuredClone(raw as object)
      return
    }
    o[k] = typeof raw === "string" ? raw : String(raw ?? "")
  }
  for (const k of editableKeys) {
    copyKey(k)
  }
  for (const k of options?.extrasPayloadKeys ?? []) {
    if (Object.hasOwn(o, k)) continue
    copyKey(k)
  }
  return o
}

export function linesToExtrasPayload(
  lines: LineRow[],
  childCfg: AdminEntityDefinition,
  editableKeys: readonly string[],
  persistKey: string,
  options?: {
    zeroSentinelKeys?: ReadonlySet<string>
    persistWhenAnyEditableContent?: boolean
    implicitLineFields?: Readonly<Record<string, string>>
    /** Merged into each line object after `editableKeys` (read-only columns that must still POST). */
    extrasPayloadKeys?: readonly string[]
    newDraftTreatFieldValuesAsEmpty?: Readonly<Record<string, string>>
  },
): unknown[] {
  const zeroSentinelKeys = options?.zeroSentinelKeys ?? new Set<string>()
  const anyContent = options?.persistWhenAnyEditableContent === true
  const implicitIgnore =
    options?.implicitLineFields == null
      ? undefined
      : new Set(Object.keys(options.implicitLineFields))
  const extrasOpts =
    options?.extrasPayloadKeys != null && options.extrasPayloadKeys.length > 0
      ? { extrasPayloadKeys: options.extrasPayloadKeys }
      : undefined
  return lines
    .filter((l) =>
      anyContent
        ? !lineIsEmptyForPersist(
            l,
            persistKey,
            zeroSentinelKeys,
            implicitIgnore,
            options?.newDraftTreatFieldValuesAsEmpty != null
              ? {
                  newDraftTreatFieldValuesAsEmpty:
                    options.newDraftTreatFieldValuesAsEmpty,
                }
              : undefined,
          )
        : String(l[persistKey] ?? "").trim() !== "",
    )
    .map((l) =>
      serializeLineRowForExtrasPayload(l, childCfg, editableKeys, extrasOpts),
    )
}

function copyRowFieldToLine(
  line: LineRow,
  row: Record<string, unknown>,
  k: string,
  idKey: string,
  childCfg: AdminEntityDefinition,
): void {
  if (k === idKey) return
  const col = childCfg.columns.find((c) => c.key === k)
  const v = row[k]
  if (col?.valueType === "numeric") {
    line[k] = v == null ? "" : String(v)
    return
  }
  if (col?.valueType === "integer") {
    line[k] = normalizeAdminEntityIntegerLineFieldFromServer(col, v)
    return
  }
  if (col?.valueType === "boolean") {
    if (typeof v === "boolean") {
      line[k] = v ? "true" : "false"
      return
    }
    const s = v == null ? "" : String(v).trim().toLowerCase()
    line[k] = s === "true" ? "true" : s === "false" ? "false" : ""
    return
  }
  line[k] = v == null ? "" : String(v)
}

export function serverRowsToLines(
  rows: unknown[],
  childCfg: AdminEntityDefinition,
  editableKeys: readonly string[],
  readonlyKeys?: readonly string[],
  /** FK / virtual operands not shown as inline columns — still copied for client computations. */
  hydrateKeys?: readonly string[],
): LineRow[] {
  const idKey = childCfg.idColumn.jsonKey
  const readKeys = readonlyKeys ?? []
  const extraKeys = hydrateKeys ?? []
  const mapped: LineRow[] = rows.map((r) => {
    const row = r as Record<string, unknown>
    const line: LineRow = {
      clientKey: `saved-${String(row[idKey] ?? "")}`,
    }
    line[idKey] = row[idKey]
    for (const k of editableKeys) {
      copyRowFieldToLine(line, row, k, idKey, childCfg)
    }
    for (const k of readKeys) {
      copyRowFieldToLine(line, row, k, idKey, childCfg)
    }
    const merged = new Set<string>([...editableKeys, ...readKeys])
    for (const k of extraKeys) {
      if (merged.has(k)) continue
      const col = childCfg.columns.find((c) => c.key === k)
      const v = row[k]
      if (
        col == null &&
        v != null &&
        typeof v === "object" &&
        !(v instanceof Date)
      ) {
        line[k] = v as LineRow[string]
        continue
      }
      copyRowFieldToLine(line, row, k, idKey, childCfg)
    }
    return line
  })
  return mapped
}
