/**
 * Arrow-key grid navigation for related-row inline tables (`crudRelatedCollections`).
 * Mark focusable cell controls with {@link RELATED_INLINE_NAV_TARGET_ATTR}.
 */

export const RELATED_INLINE_NAV_TARGET_ATTR =
  "data-admin-related-inline-nav-target" as const

/**
 * Props for one focusable cell control: {@link RELATED_INLINE_NAV_TARGET_ATTR} plus a stable
 * `data-testid` on the same node (Playwright / Testing Library).
 */
export function adminRelatedInlineNavTargetDomProps(
  dataTestId: string,
): Record<string, string> {
  return {
    [RELATED_INLINE_NAV_TARGET_ATTR]: "",
    "data-testid": dataTestId,
  }
}

export type RelatedInlineTableArrowNavigationArgs = {
  readonly tbody: HTMLTableSectionElement
  readonly target: EventTarget | null
  readonly key: string
  readonly ctrlKey: boolean
  readonly metaKey: boolean
  readonly altKey: boolean
}

function isArrowKey(key: string): boolean {
  return (
    key === "ArrowLeft" ||
    key === "ArrowRight" ||
    key === "ArrowUp" ||
    key === "ArrowDown"
  )
}

function isEffectiveNavTarget(el: HTMLElement): boolean {
  if (el.hasAttribute("disabled")) return false
  if (el.getAttribute("aria-disabled") === "true") return false
  if (el.getAttribute("aria-hidden") === "true") return false
  if (el.tabIndex === -1) return false
  return true
}

function shouldDeferHorizontalArrowForTextControl(
  el: HTMLElement,
  key: string,
): boolean {
  if (key !== "ArrowLeft" && key !== "ArrowRight") return false
  if (el instanceof HTMLInputElement) {
    if (el.readOnly) return false
    const type = el.type
    if (type !== "text" && type !== "search" && type !== "tel" && type !== "url")
      return false
    const v = el.value
    const start = el.selectionStart ?? v.length
    const end = el.selectionEnd ?? v.length
    if (start !== end) return true
    if (key === "ArrowLeft" && start > 0) return true
    if (key === "ArrowRight" && end < v.length) return true
    return false
  }
  if (el instanceof HTMLTextAreaElement) {
    if (el.readOnly) return false
    const v = el.value
    const start = el.selectionStart ?? v.length
    const end = el.selectionEnd ?? v.length
    if (start !== end) return true
    if (key === "ArrowLeft" && start > 0) return true
    if (key === "ArrowRight" && end < v.length) return true
    return false
  }
  return false
}

function shouldDeferVerticalArrowForTextarea(
  el: HTMLElement,
  key: string,
): boolean {
  if (key !== "ArrowUp" && key !== "ArrowDown") return false
  if (!(el instanceof HTMLTextAreaElement) || el.readOnly) return false
  const v = el.value
  const pos = key === "ArrowUp" ? (el.selectionStart ?? 0) : (el.selectionEnd ?? v.length)
  const before = v.slice(0, pos)
  const after = v.slice(pos)
  if (key === "ArrowUp") {
    return before.includes("\n")
  }
  return after.includes("\n")
}

function queryNavCellRoot(td: HTMLTableCellElement): HTMLElement | null {
  const sel = `[${RELATED_INLINE_NAV_TARGET_ATTR}]`
  const hit = td.querySelector(sel)
  return hit instanceof HTMLElement ? hit : null
}

export function buildNavGrid(
  tbody: HTMLTableSectionElement,
): (HTMLElement | null)[][] {
  const rows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>(
    ":scope > tr",
  ))
  return rows.map((tr) =>
    Array.from(tr.querySelectorAll<HTMLTableCellElement>(":scope > td")).map(
      (td) => {
        const el = queryNavCellRoot(td)
        if (el == null || !isEffectiveNavTarget(el)) return null
        return el
      },
    ),
  )
}

function findNavCellCoords(
  tbody: HTMLTableSectionElement,
  navEl: HTMLElement,
): { row: number; col: number } | null {
  const rows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>(
    ":scope > tr",
  ))
  for (let r = 0; r < rows.length; r++) {
    const tds = Array.from(
      rows[r]!.querySelectorAll<HTMLTableCellElement>(":scope > td"),
    )
    for (let c = 0; c < tds.length; c++) {
      const td = tds[c]!
      if (td.contains(navEl)) {
        const root = queryNavCellRoot(td)
        if (root === navEl || root?.contains(navEl)) {
          return { row: r, col: c }
        }
      }
    }
  }
  return null
}

/**
 * Next focusable cell in row-major grid (skips null slots). Exported for unit tests.
 */
export function relatedInlineTableArrowNeighborCoords(
  grid: (unknown | null)[][],
  row: number,
  col: number,
  key: string,
): { row: number; col: number } | null {
  const nRows = grid.length
  if (nRows === 0) return null
  const nCols = grid[0]?.length ?? 0

  if (key === "ArrowLeft") {
    for (let c = col - 1; c >= 0; c--) {
      if (grid[row]?.[c]) return { row, col: c }
    }
    return null
  }
  if (key === "ArrowRight") {
    for (let c = col + 1; c < nCols; c++) {
      if (grid[row]?.[c]) return { row, col: c }
    }
    return null
  }
  if (key === "ArrowUp") {
    for (let r = row - 1; r >= 0; r--) {
      if (grid[r]?.[col]) return { row: r, col }
    }
    return null
  }
  if (key === "ArrowDown") {
    for (let r = row + 1; r < nRows; r++) {
      if (grid[r]?.[col]) return { row: r, col }
    }
    return null
  }
  return null
}

export type RelatedInlineTabNavigationResult =
  | { kind: "none" }
  | { kind: "focusCell"; target: HTMLElement }
  | { kind: "addRowAndFocusFirst" }

/**
 * When Tab (forward, no modifiers) is pressed on the last nav-target cell in a row,
 * skip action buttons and move directly to the first nav-target of the next row.
 * If no next row exists, return `addRowAndFocusFirst` so the caller can add a blank row.
 *
 * Returns `none` when the active cell is not the last in its row (let browser handle Tab).
 */
export function tryNavigateRelatedInlineTableTab(
  tbody: HTMLTableSectionElement,
): RelatedInlineTabNavigationResult {
  const active = document.activeElement
  if (!(active instanceof HTMLElement)) return { kind: "none" }
  if (!tbody.contains(active)) return { kind: "none" }

  const navEl = active.closest(`[${RELATED_INLINE_NAV_TARGET_ATTR}]`)
  if (!(navEl instanceof HTMLElement) || !tbody.contains(navEl)) return { kind: "none" }
  if (!isEffectiveNavTarget(navEl)) return { kind: "none" }

  const coords = findNavCellCoords(tbody, navEl)
  if (coords == null) return { kind: "none" }

  const grid = buildNavGrid(tbody)
  const { row, col } = coords
  const nCols = grid[row]?.length ?? 0

  // If there are more nav-targets to the right, let the browser handle Tab normally
  for (let c = col + 1; c < nCols; c++) {
    if (grid[row]?.[c] != null) return { kind: "none" }
  }

  // Last editable cell in the row — look for the first nav-target in the next row
  for (let r = row + 1; r < grid.length; r++) {
    for (let c = 0; c < (grid[r]?.length ?? 0); c++) {
      const target = grid[r]?.[c]
      if (target != null) return { kind: "focusCell", target }
    }
  }

  // No next row — caller should add a blank row
  return { kind: "addRowAndFocusFirst" }
}

/**
 * When focus is on a marked inline cell control, move focus per arrow key (spreadsheet-style).
 * Horizontal arrows defer to the control when the caret can still move inside the value.
 *
 * @returns true when navigation was applied (caller should preventDefault + stopPropagation).
 */
export function tryNavigateRelatedInlineTableArrows(
  args: RelatedInlineTableArrowNavigationArgs,
): boolean {
  if (args.ctrlKey || args.metaKey || args.altKey) return false
  if (!isArrowKey(args.key)) return false
  if (!(args.target instanceof Element)) return false

  const active = document.activeElement
  if (!(active instanceof HTMLElement)) return false
  if (!args.tbody.contains(active)) return false

  const navEl = active.closest(`[${RELATED_INLINE_NAV_TARGET_ATTR}]`)
  if (!(navEl instanceof HTMLElement) || !args.tbody.contains(navEl)) {
    return false
  }

  if (!isEffectiveNavTarget(navEl)) return false

  if (shouldDeferHorizontalArrowForTextControl(active, args.key)) return false
  if (shouldDeferVerticalArrowForTextarea(active, args.key)) return false

  const coords = findNavCellCoords(args.tbody, navEl)
  if (coords == null) return false

  const grid = buildNavGrid(args.tbody)
  const nextCoords = relatedInlineTableArrowNeighborCoords(
    grid,
    coords.row,
    coords.col,
    args.key,
  )
  if (nextCoords == null) return false
  const next = grid[nextCoords.row]?.[nextCoords.col]
  if (next == null) return false

  next.focus()
  if (
    next instanceof HTMLInputElement ||
    next instanceof HTMLTextAreaElement
  ) {
    try {
      const len = next.value.length
      next.setSelectionRange(len, len)
    } catch {
      /* ignore */
    }
  }
  return true
}
