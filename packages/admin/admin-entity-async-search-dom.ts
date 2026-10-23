/**
 * Queries the focusable trigger button inside an async-search combobox field.
 * The trigger testid follows the pattern:
 *   admin-entity-{variant}-relation-async--{slug}--{fieldKey}--trigger
 */
export function queryAdminAsyncSearchTrigger(
  root: Element | Document | null,
  variant: "create" | "edit",
  slug: string,
  fieldKey: string,
): HTMLElement | null {
  if (root == null) return null
  return root.querySelector<HTMLElement>(
    `[data-testid="admin-entity-${variant}-relation-async--${slug}--${fieldKey}--trigger"]`,
  )
}
