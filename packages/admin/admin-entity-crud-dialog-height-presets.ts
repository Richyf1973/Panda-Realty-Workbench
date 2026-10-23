/**
 * Max-height presets for admin create/edit `DialogContent` (full Tailwind literals for JIT).
 * Wider dialogs use {@link adminEntityCrudDialogWidthPresets}; tall forms (e.g. related-row tabs)
 * benefit from a larger vertical budget so the flex `flex-1` body can grow.
 */
export const adminEntityCrudDialogHeightPresets = {
  /** Historical default: cap at 720px and 90vh. */
  medium: "max-h-[min(90vh,720px)]",
  /** More room for tabbed related collections and long field groups. */
  tall: "max-h-[min(92vh,880px)]",
  /** Data-heavy CRUD (wide + many child tables). Avoid when the form body uses `flex-1 min-h-0` scroll regions — use `extraTallFixed` instead. */
  extraTall: "max-h-[min(95vh,1024px)]",
  /**
   * Definite-height variants: set both `h-` and `max-h-` so the dialog has a known height.
   * Required when the form body uses `renderCrudDialogFormBody` with inner `flex-1 min-h-0`
   * scroll regions — `max-h` alone does not give a "definite height" in CSS, so `flex-1`
   * children cannot constrain themselves and `overflow-y-auto` never triggers.
   */
  tallFixed: "h-[min(92vh,880px)] max-h-[min(92vh,880px)]",
  extraTallFixed: "h-[min(95vh,1024px)] max-h-[min(95vh,1024px)]",
} as const

export type AdminEntityCrudDialogHeightPreset = keyof typeof adminEntityCrudDialogHeightPresets

/**
 * On admin list compact viewports, give CRUD `DialogContent` a definite viewport height so inner
 * `flex-1 min-h-0` regions (e.g. scroll + docked footer) lay out correctly on short screens.
 */
export const ADMIN_ENTITY_CRUD_DIALOG_COMPACT_HEIGHT_CLASS =
  "h-[90dvh] max-h-[90dvh] min-h-0"

const DEFAULT_CRUD_DIALOG_HEIGHT: AdminEntityCrudDialogHeightPreset = "medium"

/** Tailwind class for `DialogContent` max-height. */
export function adminEntityCrudDialogMaxHeightClass(
  preset: AdminEntityCrudDialogHeightPreset | undefined,
): string {
  return adminEntityCrudDialogHeightPresets[preset ?? DEFAULT_CRUD_DIALOG_HEIGHT]
}
