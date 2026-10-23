"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Loader2, Pencil, Trash2 } from "lucide-react"
import type { Dispatch, ReactNode, SetStateAction } from "react"

import type {
  AdminCellAlign,
  AdminEntityCrudRelatedCollectionTable,
  AdminEntityCrudRelatedEmbedPreviewColumn,
  AdminEntityCrudRelatedVirtualColumn,
  AdminEntityDefinition,
} from "../../admin-entity-types"
import type { AdminRelatedRelationNumericMaps } from "../../admin-entity-crud-related-virtual"
import {
  type RelatedInlineCellColumnMeta,
} from "../../admin-entity-crud-related-inline-helpers"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityCrudFormSubscribeApi } from "../../admin-entity-crud-form-subscribe-api"
import type { LineRow } from "../../admin-entity-crud-related-collections-draft"
import type { AdminNestedEditUiContext } from "./admin-entity-crud-dialog-state"
import type { AdminRenderCrudRelatedInlineRowActionsArgs } from "../../admin-client-registry-context"
import type { AdminNestedEntityCrudContextValue } from "./admin-nested-entity-crud-context"
import type { AdminMultiSelectRelationOption } from "./admin-entity-crud-list-relation-multi-select-popover-control"
import { Button } from "@repo/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/tooltip"

import { buildEditableColumn } from "./related-collection-inline-editable-column"
import { buildVirtualColumn } from "./related-collection-inline-virtual-column"
import { buildEmbedPreviewColumn } from "./related-collection-inline-embed-preview-column"
import { buildReadonlyColumn } from "./related-collection-inline-readonly-column"

export function relatedInlineColumnHeaderNode(
  label: string,
  align: AdminCellAlign,
): ReactNode {
  if (align === "center") {
    return <span className="block w-full text-center">{label}</span>
  }
  if (align === "right") {
    return <span className="block w-full text-end">{label}</span>
  }
  return label
}

type RelationOptionsByKey = Record<
  string,
  {
    options: Array<{ value: string; label: string }>
    optionsPending: boolean
    rawListRows: Record<string, unknown>[]
  }
>

/** When opening **entities** from **properties** related rows, seed Panda link-property UI. */
export function nestedEntityEditUiContextFromParentPropertyLine(args: {
  parentSlug: AdminEntitySlug
  relatedEntitySlug: string
  parentFkColumnKey: string
  line: LineRow
  /**
   * Parent edit row id when `parentSlug === "properties"` — equals `propertyListId` if the line
   * omits the FK (e.g. mocked detail rows without `propertyListId` on junction objects).
   */
  parentEntityRowId?: string | null
}): { nestedEditUiContext: AdminNestedEditUiContext } | undefined {
  const { parentSlug, relatedEntitySlug, parentFkColumnKey, line, parentEntityRowId } =
    args
  if (parentSlug !== "properties" || relatedEntitySlug !== "entities") {
    return undefined
  }
  const raw = line[parentFkColumnKey]
  let id =
    typeof raw === "string" ? raw.trim() : String(raw ?? "").trim()
  if (id === "") {
    const fb =
      parentEntityRowId == null ? "" : String(parentEntityRowId).trim()
    if (fb !== "") id = fb
  }
  if (id === "") return undefined
  return { nestedEditUiContext: { sourcePropertyListId: id } }
}

export type RelatedInlineColumnDefsCtx = {
  // ─── non-ref deps (in useMemo deps array) ───────────────────────────────
  adminUiMutationsDisabled: boolean | undefined
  childCfg: AdminEntityDefinition
  collection: AdminEntityCrudRelatedCollectionTable
  adminEntities: Readonly<Record<string, AdminEntityDefinition>>
  renderInlineRowActionsFn:
    | ((args: AdminRenderCrudRelatedInlineRowActionsArgs) => ReactNode | null | undefined)
    | undefined
  inlinePinnedEndColumnKey: string | undefined
  inlinePinnedStartColumnKey: string | undefined
  hasNestedCrudControls: boolean
  hasRelatedTargetNestedControls: boolean
  relatedTargetNestedSpec:
    | AdminEntityCrudRelatedCollectionTable["openRelatedTargetInNestedCrudDialog"]
  suppressRelatedTargetTrailingRowOpenButton: boolean
  idKey: string
  orderedInlineColumnSpecs: ReturnType<
    typeof import("../../admin-entity-crud-related-inline-helpers").orderRelatedInlineTableColumnSpecs
  >
  parentSlug: AdminEntitySlug
  variant: "create" | "edit"
  parentCrossPageViewOnly: boolean

  // ─── captured at memo-time (not in deps — stable or intentionally stale) ─
  entityRowId: string | null
  parentCrudForm: AdminEntityCrudFormSubscribeApi | undefined
  updateLine: (clientKey: string, patch: Record<string, unknown>) => void
  setLines: Dispatch<SetStateAction<LineRow[]>>
  persistKey: string
  zeroSentinelKeys: ReadonlySet<string>
  implicitLineFieldsFromParentFk: Readonly<Record<string, string>> | undefined

  // ─── refs (accessed via .current at cell-render time) ────────────────────
  crudRelatedRelationOptionsByColumnKeyRef: { current: RelationOptionsByKey }
  crudInlineRelationAwaitingParentDetailByRelatedSlugRef: { current: Record<string, boolean> }
  linesRefForEmbedHydrate: { current: LineRow[] }
  wrapRelatedTargetNestedEditBesideControlRef: {
    current: (columnKey: string, line: LineRow, viewRo: boolean, control: ReactNode) => ReactNode
  }
  updateLineRef: { current: (clientKey: string, patch: Record<string, unknown>, focusTarget?: Element | null) => void }
  applyMultiSelectFkLinesRef: {
    current: (
      lineClientKey: string,
      fkKey: string,
      embedKey: string,
      relSlug: string,
      picked: readonly AdminMultiSelectRelationOption[],
    ) => void
  }
  nestedCrudRef: { current: AdminNestedEntityCrudContextValue | null }
  performDeleteLineRef: { current: (line: LineRow) => Promise<void> }
  immediateDeleteBusyClientKey: string | null
  relationAsyncFilterSelectionsByRelatedSlugRef: {
    current: Record<string, Record<string, string>>
  }
  relationNumericMapsRef: { current: AdminRelatedRelationNumericMaps }
  detailPayloadRef: { current: Record<string, unknown> | undefined }
  evalRelatedInlineVirtualRegistryNumericRef: {
    current: ((registryKey: string, line: LineRow) => number | null) | undefined
  }
}

export function buildRelatedInlineTableColumns(
  ctx: RelatedInlineColumnDefsCtx,
): ColumnDef<LineRow>[] {
  const {
    adminUiMutationsDisabled,
    childCfg,
    collection,
    renderInlineRowActionsFn,
    inlinePinnedEndColumnKey,
    inlinePinnedStartColumnKey,
    hasNestedCrudControls,
    hasRelatedTargetNestedControls,
    relatedTargetNestedSpec,
    suppressRelatedTargetTrailingRowOpenButton,
    idKey,
    orderedInlineColumnSpecs,
    parentSlug,
    variant,
    parentCrossPageViewOnly,
    entityRowId,
    parentCrudForm,
    updateLine,
    setLines,
    nestedCrudRef,
    performDeleteLineRef,
    immediateDeleteBusyClientKey,
    detailPayloadRef,
  } = ctx

  const pinEndKey = inlinePinnedEndColumnKey
  const pinStartKey = inlinePinnedStartColumnKey
  const viewRo = parentCrossPageViewOnly === true

  const cols: ColumnDef<LineRow>[] = orderedInlineColumnSpecs.map((spec) => {
    if (spec.kind === "editable") return buildEditableColumn(ctx, pinEndKey, pinStartKey, viewRo, spec.key)
    if (spec.kind === "virtual") return buildVirtualColumn(ctx, pinEndKey, pinStartKey, spec.vc)
    if (spec.kind === "readonly") return buildReadonlyColumn(ctx, pinEndKey, pinStartKey, spec.key)
    return buildEmbedPreviewColumn(ctx, pinEndKey, pinStartKey, spec.ec)
  })

  if (!viewRo) {
    cols.push({
      id: "_actions",
      header: "",
      meta: {
        relatedStickyActions: true,
        cellAlign: "right",
      } satisfies RelatedInlineCellColumnMeta,
      cell: ({ row }) => {
        const line = row.original
        const savedId = line[idKey]
        const isSaved =
          typeof savedId === "number"
            ? Number.isFinite(savedId)
            : typeof savedId === "string" && /^\d+$/.test(savedId.trim())

        const relatedTargetRowId =
          hasRelatedTargetNestedControls && relatedTargetNestedSpec != null
            ? (() => {
                const rowIdKey = relatedTargetNestedSpec.rowIdColumnKey ?? relatedTargetNestedSpec.lineColumnKey
                const raw = line[rowIdKey]
                const rid =
                  typeof raw === "string"
                    ? raw.trim()
                    : String(raw ?? "").trim()
                return rid !== "" ? rid : null
              })()
            : null
        const relatedTargetBusy =
          relatedTargetRowId != null &&
          nestedCrudRef.current?.nestedCrudBusyRowId === relatedTargetRowId
        const relatedTargetAriaLabel =
          relatedTargetNestedSpec?.ariaLabel ??
          relatedTargetNestedSpec?.buttonLabel ??
          (relatedTargetNestedSpec != null
            ? `Edit ${relatedTargetNestedSpec.relatedEntitySlug}`
            : "Edit related")
        const relatedTargetTooltip =
          relatedTargetNestedSpec?.tooltip ?? relatedTargetAriaLabel

        const nestedBtn = collection.openChildInNestedCrudDialog
        const showNested =
          hasNestedCrudControls && nestedBtn != null && isSaved
        const nestedBusy =
          showNested &&
          nestedCrudRef.current?.nestedCrudBusyRowId === String(savedId)

        const nestedAriaLabel =
          nestedBtn?.ariaLabel ??
          nestedBtn?.buttonLabel ??
          "Edit row"
        const nestedTooltip =
          nestedBtn?.tooltip ?? nestedAriaLabel

        const rowDeleteBusy = immediateDeleteBusyClientKey === line.clientKey

        return (
          <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1">
            {renderInlineRowActionsFn != null && adminUiMutationsDisabled !== true
              ? renderInlineRowActionsFn({
                  parentSlug,
                  variant,
                  entityRowId,
                  collection,
                  detailPayload: detailPayloadRef.current,
                  line,
                  updateLine,
                  setLines,
                  childCfg,
                  parentCrudForm,
                  adminUiMutationsDisabled,
                })
              : null}
            {relatedTargetRowId != null &&
            hasRelatedTargetNestedControls &&
            relatedTargetNestedSpec != null &&
            !suppressRelatedTargetTrailingRowOpenButton ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="shrink-0"
                    disabled={
                      relatedTargetBusy ||
                      adminUiMutationsDisabled === true
                    }
                    aria-label={relatedTargetAriaLabel}
                    aria-busy={relatedTargetBusy}
                    data-testid={`admin-entity-crud-related-open-related-target--${parentSlug}--${collection.jsonKey}--row--${line.clientKey}`}
                    onClick={() => {
                      const nestedCtx =
                        nestedEntityEditUiContextFromParentPropertyLine({
                          parentSlug,
                          relatedEntitySlug:
                            relatedTargetNestedSpec.relatedEntitySlug,
                          parentFkColumnKey: collection.parentFkColumnKey,
                          line,
                          parentEntityRowId: entityRowId,
                        })
                      void nestedCrudRef.current?.openNestedEntityEdit({
                        slug: relatedTargetNestedSpec.relatedEntitySlug,
                        rowId: relatedTargetRowId,
                        ...(relatedTargetNestedSpec.dialogEditSingular != null
                          ? { overrideSingular: relatedTargetNestedSpec.dialogEditSingular }
                          : {}),
                        ...nestedCtx,
                      })
                    }}
                  >
                    {relatedTargetBusy ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Pencil data-icon="inline-start" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  data-testid={`admin-entity-crud-related-open-related-target-tooltip--${parentSlug}--${collection.jsonKey}--row--${line.clientKey}`}
                >
                  {relatedTargetTooltip}
                </TooltipContent>
              </Tooltip>
            ) : null}
            {showNested ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="shrink-0"
                    disabled={nestedBusy}
                    aria-label={nestedAriaLabel}
                    aria-busy={nestedBusy}
                    data-testid={`admin-entity-crud-related-nested-open--${parentSlug}--${collection.jsonKey}--${String(savedId)}`}
                    onClick={() => {
                      void nestedCrudRef.current?.openNestedEntityEdit({
                        slug: collection.childEntitySlug,
                        rowId: String(savedId),
                      })
                    }}
                  >
                    {nestedBusy ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Pencil data-icon="inline-start" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  data-testid={`admin-entity-crud-related-nested-tooltip--${parentSlug}--${collection.jsonKey}--${String(savedId)}`}
                >
                  {nestedTooltip}
                </TooltipContent>
              </Tooltip>
            ) : null}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={isSaved ? "destructive" : "outline"}
                  size="icon-sm"
                  className="shrink-0"
                  disabled={rowDeleteBusy || adminUiMutationsDisabled === true}
                  data-testid={
                    isSaved
                      ? `admin-entity-crud-related-row-delete--${parentSlug}--${collection.jsonKey}--${String(savedId)}`
                      : undefined
                  }
                  onClick={() => {
                    void performDeleteLineRef.current(line)
                  }}
                  aria-label={isSaved ? "Delete row" : "Remove row"}
                  aria-busy={rowDeleteBusy || undefined}
                >
                  {rowDeleteBusy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 data-icon="inline-start" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                data-testid={
                  isSaved
                    ? `admin-entity-crud-related-delete-tooltip--${parentSlug}--${collection.jsonKey}--${String(savedId)}`
                    : `admin-entity-crud-related-remove-tooltip--${parentSlug}--${collection.jsonKey}--${String(line.clientKey)}`
                }
              >
                {isSaved ? "Delete row" : "Remove row"}
              </TooltipContent>
            </Tooltip>
          </div>
        )
      },
    })
  }

  return cols
}
