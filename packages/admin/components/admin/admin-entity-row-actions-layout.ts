/**
 * Decides which layout {@link AdminEntityRowActions} renders. Pure so it can be unit-tested without a
 * DOM:
 * - `legacy`: no pinned and no collapsible actions — the unchanged inline-icons / mobile-dropdown
 *   layout used by apps that have not opted into the responsive collapse.
 * - `responsive`: pinned OR collapsible actions present — pinned stays inline, collapsible + Edit/Delete
 *   fold into an overflow menu when the table is narrow.
 * - `pinned-only`: `pinnedOnly` set on a responsive row — render just the pinned controls, no
 *   Edit/Delete/overflow (e.g. browse-only map results rows).
 *
 * `pinnedOnly` is ignored when there is nothing pinned and nothing collapsible (falls back to legacy),
 * since there would be no inline controls to render.
 */
export type RowActionsLayout = "legacy" | "responsive" | "pinned-only"

export function resolveRowActionsLayout(args: {
  hasPinned: boolean
  collapsibleCount: number
  pinnedOnly: boolean
}): RowActionsLayout {
  const useResponsive = args.hasPinned || args.collapsibleCount > 0
  if (!useResponsive) return "legacy"
  return args.pinnedOnly ? "pinned-only" : "responsive"
}
