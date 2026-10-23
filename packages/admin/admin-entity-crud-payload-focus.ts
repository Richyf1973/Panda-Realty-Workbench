/**
 * Run `fn` after two animation frames so layout can settle (e.g. Radix Collapsible opening) before
 * calling {@link focusFirstAdminEntityCrudPayloadIssueField}.
 */
export function scheduleAfterDoubleRaf(fn: () => void): void {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
    queueMicrotask(fn)
    return
  }
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(fn)
  })
}

/**
 * Focus the first control for a blocking payload-validation field key (Panda custom form or
 * default admin CRUD field cells). Used after create/patch body build fails client-side.
 */
export function focusFirstAdminEntityCrudPayloadIssueField(args: {
  readonly slug: string
  readonly fieldKeys: readonly string[]
  readonly variant: "create" | "edit"
}): void {
  const prefix =
    args.variant === "create" ? "admin-entity-create-field" : "admin-entity-edit-field"
  for (const key of args.fieldKeys) {
    const pandaWrap = document.querySelector(
      `[data-testid="panda-properties-form-field--${key}"]`,
    )
    if (pandaWrap) {
      const byId = document.getElementById(`pp-${key}`) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement
        | null
      const focusEl =
        byId ??
        pandaWrap.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
          "input:not([type=hidden]), textarea, select",
        )
      if (focusEl) {
        pandaWrap.scrollIntoView({ block: "nearest", behavior: "smooth" })
        focusEl.focus({ preventScroll: true })
        return
      }
    }
    const adminCell = document.querySelector(
      `[data-testid="${prefix}--${args.slug}--${key}"]`,
    )
    if (adminCell) {
      const focusEl = adminCell.querySelector<HTMLElement>(
        'input:not([type=hidden]), textarea, select, button[role="combobox"]',
      )
      if (focusEl) {
        adminCell.scrollIntoView({ block: "nearest", behavior: "smooth" })
        focusEl.focus({ preventScroll: true })
        return
      }
    }
  }
}
