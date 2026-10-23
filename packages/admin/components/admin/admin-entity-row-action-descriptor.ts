import type { LucideIcon } from "lucide-react"

/**
 * A single row action expressed as data (not pre-rendered JSX) so the shared
 * {@link AdminEntityRowActions} can render it two ways: an inline icon button when the
 * table is wide, or a `DropdownMenuItem` when the table is too narrow and the strip collapses.
 *
 * `onSelect` and `href` are mutually exclusive — provide `href` for navigation actions
 * (e.g. `tel:`), `onSelect` for everything else (open a dialog, etc.).
 */
export interface AdminEntityRowActionDescriptor {
  /** Stable React key / dedupe key. */
  key: string
  icon: LucideIcon
  /** Accessible label — used as the button aria-label and the menu-item text. */
  label: string
  onSelect?: () => void
  href?: string
  disabled?: boolean
  /** Shown as the tooltip / menu-item title when `disabled` (e.g. "No phone number"). */
  disabledReason?: string
  /** Renders the menu item in the destructive variant. */
  destructive?: boolean
  /** Optional data-testid applied to the inline button and the menu item. */
  testId?: string
}
