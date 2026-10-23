/**
 * Max-width presets for admin create/edit `DialogContent` (full Tailwind literals for JIT).
 * Separate from {@link adminEntityPageWidthPresets}: list shells are wider than modals.
 *
 * Each preset uses `min(<cap>, calc(100vw - 3rem))` so narrow viewports keep ~1.5rem inset
 * on each side. Plain `max-w-2xl` etc. would override the shell `max-w-[calc(100%-2rem)]`
 * via `cn()` merge and allowed edge-to-edge panels on phones.
 */
export const adminEntityCrudDialogWidthPresets = {
  narrow: "max-w-[min(36rem,calc(100vw-3rem))]",
  /** Matches historical default (`max-w-2xl` = 42rem on wide viewports). */
  medium: "max-w-[min(42rem,calc(100vw-3rem))]",
  wide: "max-w-[min(56rem,calc(100vw-3rem))]",
  extraWide: "max-w-[min(72rem,calc(100vw-3rem))]",
  /** Nearly full viewport width with horizontal inset. */
  fluid: "max-w-[min(96rem,calc(100vw-3rem))]",
} as const

export type AdminEntityCrudDialogWidthPreset = keyof typeof adminEntityCrudDialogWidthPresets

/**
 * On admin list compact viewports, CRUD dialogs use this so the shell is nearly edge-to-edge
 * (tighter than `calc(100vw - 3rem)` entity max-width presets). Apply when the UI hook for compact
 * admin lists is true (`@repo/ui/use-compact-admin-list-viewport`).
 */
export const ADMIN_ENTITY_CRUD_DIALOG_COMPACT_WIDTH_CLASS =
  "!max-w-[calc(100vw-0.75rem)] w-[calc(100vw-0.75rem)]"

const DEFAULT_CRUD_DIALOG_WIDTH: AdminEntityCrudDialogWidthPreset = "medium"

/** Tailwind classes for `DialogContent` max-width (single responsive-safe `max-w-[min(...)]` each). */
export function adminEntityCrudDialogMaxWidthClass(
  preset: AdminEntityCrudDialogWidthPreset | undefined,
): string {
  return adminEntityCrudDialogWidthPresets[preset ?? DEFAULT_CRUD_DIALOG_WIDTH]
}
