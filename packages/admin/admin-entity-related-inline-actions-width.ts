import type { AdminEntityCrudRelatedCollectionTable } from "./admin-entity-types"

/** Matches **`size="icon-sm"`** (`size-7` / 1.75rem) in `@repo/ui` button. */
const RELATED_INLINE_ACTION_ICON_SM_REM = 1.75
/** Matches **`gap-1`** between action buttons. */
const RELATED_INLINE_ACTION_GAP_REM = 0.25
/** Horizontal padding from **`px-2`** on each side of the actions cell. */
const RELATED_INLINE_ACTIONS_CELL_PAD_X_REM = 1
const RELATED_INLINE_ACTIONS_SEAM_PX = "3px"

export type RelatedInlineActionsWidthCollectionInput = Pick<
  AdminEntityCrudRelatedCollectionTable,
  | "inlineCustomRowActionIconSlots"
  | "inlineRowActionsColumnWidthRemOverride"
>

/**
 * CSS **`calc(...)`** for the sticky related-row **actions** column: cell padding + icon buttons +
 * gaps + sub-pixel seam. When the custom slot uses text or non-icon controls, set
 * **`inlineRowActionsColumnWidthRemOverride`** on the collection instead of relying on icon counts.
 */
export function computeRelatedInlineActionsColumnCalc(args: {
  readonly collection: RelatedInlineActionsWidthCollectionInput
  readonly hasCustomRowActions: boolean
  /** True when **`openChildInNestedCrudDialog`** is configured and nested CRUD host is present. */
  readonly hasNestedOpenButton: boolean
  /** True when **`openRelatedTargetInNestedCrudDialog`** is configured and nested CRUD host is present. */
  readonly hasRelatedTargetNestedOpenButton: boolean
}): string {
  const o = args.collection.inlineRowActionsColumnWidthRemOverride
  if (o != null && Number.isFinite(o) && o > 0) {
    return `calc(${o}rem + ${RELATED_INLINE_ACTIONS_SEAM_PX})`
  }

  let iconSlots = 1
  if (args.hasNestedOpenButton) iconSlots += 1
  if (args.hasRelatedTargetNestedOpenButton) iconSlots += 1
  if (args.hasCustomRowActions) {
    const extra = args.collection.inlineCustomRowActionIconSlots ?? 1
    iconSlots += Math.max(0, Math.trunc(extra))
  }

  const contentRem =
    iconSlots * RELATED_INLINE_ACTION_ICON_SM_REM +
    Math.max(0, iconSlots - 1) * RELATED_INLINE_ACTION_GAP_REM
  const totalRem = RELATED_INLINE_ACTIONS_CELL_PAD_X_REM + contentRem
  return `calc(${totalRem}rem + ${RELATED_INLINE_ACTIONS_SEAM_PX})`
}
