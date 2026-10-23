import type {
  AdminResolveListTableColumnKeys,
  AdminTransformListTableColumns,
} from "../../admin-client-registry-context"
import { adminEntityListColumnsByKeys } from "../../admin-entity-list-columns-by-keys"
import { adminEntityListColumnsInOrder } from "../../admin-entity-list-column-order"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityColumn, AdminEntityDefinition } from "../../admin-entity-types"

export type ResolveAdminEntityListColsArgs = {
  readonly resolveListTableColumnKeys?: AdminResolveListTableColumnKeys
  readonly transformListTableColumns?: AdminTransformListTableColumns
  readonly slug: AdminEntitySlug
  readonly cfg: AdminEntityDefinition
  readonly listAppendWhereHintSegments: Readonly<Record<string, string>>
  /** Same string the list GET uses for `search` (empty when list search disabled). */
  readonly listSearchForRequest: string
  readonly relationFilterSelections: Readonly<Record<string, string>>
  readonly listLayoutMode: "table" | "grid"
  readonly isCompactListViewport: boolean
  readonly listBooleanFilterSegment: "all" | "true" | "false"
}

/**
 * Resolves visible list table columns: optional registry override, otherwise
 * {@link adminEntityListColumnsInOrder}.
 */
export function resolveAdminEntityListColsForTable(
  args: ResolveAdminEntityListColsArgs,
): AdminEntityColumn[] {
  const resolveArgs = {
    slug: args.slug,
    cfg: args.cfg,
    listAppendWhereHintSegments: args.listAppendWhereHintSegments,
    listSearchDebounced: args.listSearchForRequest,
    relationFilterSelections: args.relationFilterSelections,
    listLayoutMode: args.listLayoutMode,
    isCompactListViewport: args.isCompactListViewport,
    listBooleanFilterSegment: args.listBooleanFilterSegment,
  }
  const keys = args.resolveListTableColumnKeys?.(resolveArgs)
  let cols =
    keys != null && keys.length > 0
      ? adminEntityListColumnsByKeys(args.cfg, keys)
      : adminEntityListColumnsInOrder(args.cfg)
  const mapped = args.transformListTableColumns?.({
    ...resolveArgs,
    columns: cols,
  })
  if (mapped != null) cols = [...mapped]
  return cols
}
