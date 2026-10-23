/**
 * Finds the next or previous focusable element in DOM order (tabindex 0 / default),
 * for programmatic Tab / Shift+Tab when a popover/select closes and Radix would
 * otherwise restore focus to the trigger.
 *
 * **Debug:** set `NEXT_PUBLIC_DEBUG_ADMIN_TAB_FOCUS=1` in the app `.env.local` and restart dev
 * to log resolved Tab targets from `adminFocusAdjacentTabStop` (async combobox + select controls).
 */

function adminTabFocusDebugEnabled(): boolean {
  if (typeof process === "undefined" || process.env == null) return false
  return process.env.NEXT_PUBLIC_DEBUG_ADMIN_TAB_FOCUS === "1"
}

function describeAdminTabFocusElement(el: Element | null): Record<string, unknown> {
  if (el == null) return { tag: null }
  if (!(el instanceof HTMLElement)) {
    return { tag: el.nodeName.toLowerCase() }
  }
  const out: Record<string, unknown> = {
    tag: el.tagName.toLowerCase(),
    id: el.id || undefined,
    dataTestId: el.getAttribute("data-testid") ?? undefined,
    role: el.getAttribute("role") ?? undefined,
    ariaLabel: el.getAttribute("aria-label") ?? undefined,
    name: el.getAttribute("name") ?? undefined,
  }
  if (el instanceof HTMLInputElement) out.inputType = el.type
  if (el instanceof HTMLButtonElement) out.buttonType = el.type
  if (el instanceof HTMLSelectElement) out.selectSize = el.size
  return out
}

type AdminAdjacentResolutionPath = "sameTableRow" | "documentFocusables" | "domWalk" | "none"

function adminResolveAdjacentFocusable(
  fromEl: HTMLElement,
  direction: 1 | -1,
): { target: HTMLElement | null; path: AdminAdjacentResolutionPath } {
  const expectedInRow = getExpectedTableRowAdjacent(fromEl, direction)
  if (expectedInRow != null) {
    return { target: expectedInRow, path: "sameTableRow" }
  }

  const list = listFocusablesInDocumentOrder(document.body)
  const idx = list.indexOf(fromEl)
  if (idx !== -1) {
    const next = list[idx + direction]
    if (next != null) return { target: next, path: "documentFocusables" }
    return { target: null, path: "documentFocusables" }
  }

  const order = Array.from(document.body.querySelectorAll<HTMLElement>("*"))
  const start = order.indexOf(fromEl)
  if (start === -1) return { target: null, path: "none" }
  for (let i = start + direction; i >= 0 && i < order.length; i += direction) {
    const el = order[i]!
    if (!el.matches(FOCUSABLE_SELECTOR) || !isFocusableCandidate(el)) continue
    if (fromEl.contains(el)) continue
    return { target: el, path: "domWalk" }
  }
  return { target: null, path: "domWalk" }
}

function escapeForDataTestIdSelector(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value)
  }
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",")

function isFocusableCandidate(el: HTMLElement): boolean {
  if (!el.isConnected) return false
  const tab = el.getAttribute("tabindex")
  if (tab === "-1") return false
  let cur: HTMLElement | null = el
  while (cur) {
    if (cur.hasAttribute("hidden")) return false
    if (cur.getAttribute("aria-hidden") === "true") return false
    if (cur.getAttribute("inert") != null) return false
    const s = getComputedStyle(cur)
    if (s.display === "none" || s.visibility === "hidden") return false
    cur = cur.parentElement
  }
  return true
}

function collectFocusableMatches(nodes: Iterable<HTMLElement>): HTMLElement[] {
  const out: HTMLElement[] = []
  for (const el of nodes) {
    if (!isFocusableCandidate(el)) continue
    out.push(el)
  }
  return out
}

function listFocusablesInDocumentOrder(root: HTMLElement): HTMLElement[] {
  return collectFocusableMatches(
    root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  )
}

function focusablesInTableCellInTreeOrder(
  cell: HTMLTableCellElement,
): HTMLElement[] {
  return collectFocusableMatches(
    cell.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  )
}

function firstFocusableInTableCell(
  cell: HTMLTableCellElement,
): HTMLElement | null {
  const list = focusablesInTableCellInTreeOrder(cell)
  return list[0] ?? null
}

function lastFocusableInTableCell(
  cell: HTMLTableCellElement,
): HTMLElement | null {
  const list = focusablesInTableCellInTreeOrder(cell)
  return list.length > 0 ? list[list.length - 1]! : null
}

/**
 * Index of the anchor in this cell’s tab order, or -1 if it is missing (e.g. Radix left the
 * combobox trigger inert / aria-hidden while the popover closes — then it is not “focusable”).
 */
function indexOfAnchorInCellFocusables(
  cell: HTMLTableCellElement,
  anchor: HTMLElement,
): number {
  const list = focusablesInTableCellInTreeOrder(cell)
  for (let i = 0; i < list.length; i++) {
    const el = list[i]!
    if (el === anchor || el.contains(anchor) || anchor.contains(el)) return i
  }
  return -1
}

/**
 * Next/previous meaningful tab stop **within the same `<tr>`**, walking `<td>` / `<th>` in column
 * order so we skip cells that only contain disabled/non-tabbable content (e.g. embed previews)
 * and still reach the next column when the anchor trigger is temporarily excluded from
 * focusable queries during popover close.
 */
function getExpectedTableRowAdjacent(
  anchor: HTMLElement,
  direction: 1 | -1,
): HTMLElement | null {
  const tr = anchor.closest("tr")
  if (!(tr instanceof HTMLTableRowElement)) return null

  let startCell = -1
  for (let i = 0; i < tr.cells.length; i++) {
    if (tr.cells[i]!.contains(anchor)) {
      startCell = i
      break
    }
  }
  if (startCell === -1) return null

  if (direction === 1) {
    const start = tr.cells[startCell]!
    const sameCellList = focusablesInTableCellInTreeOrder(start)
    const ai = indexOfAnchorInCellFocusables(start, anchor)
    if (ai !== -1 && ai + 1 < sameCellList.length) {
      return sameCellList[ai + 1]!
    }
    for (let c = startCell + 1; c < tr.cells.length; c++) {
      const next = firstFocusableInTableCell(tr.cells[c]!)
      if (next != null) return next
    }
    return null
  }

  const start = tr.cells[startCell]!
  const sameCellList = focusablesInTableCellInTreeOrder(start)
  const ai = indexOfAnchorInCellFocusables(start, anchor)
  if (ai !== -1 && ai > 0) {
    return sameCellList[ai - 1]!
  }
  for (let c = startCell - 1; c >= 0; c--) {
    const prev = lastFocusableInTableCell(tr.cells[c]!)
    if (prev != null) return prev
  }
  return null
}

export type AdminFocusAdjacentAnchorHints = {
  /** Matches the trigger’s `id` (reconnect after React replaces the DOM node). */
  readonly htmlForId?: string
  /** Matches `[data-testid="…"]` on the trigger (e.g. async combobox `--trigger` suffix). */
  readonly dataTestId?: string
}

function getRelationTriggerFromHints(
  anchorHints?: AdminFocusAdjacentAnchorHints,
): HTMLElement | null {
  if (anchorHints?.htmlForId) {
    const byId = document.getElementById(anchorHints.htmlForId)
    if (byId instanceof HTMLElement && byId.isConnected) return byId
  }
  if (anchorHints?.dataTestId) {
    const sel = `[data-testid="${escapeForDataTestIdSelector(anchorHints.dataTestId)}"]`
    return document.querySelector<HTMLElement>(sel)
  }
  return null
}

/**
 * True when focus is nowhere useful (body) or still on the relation trigger after we tried to Tab away.
 * Parent re-renders (form / query) can run after the first `focus()` and steal or skip the handoff.
 */
export function adminAdjacentTabFocusNeedsRetry(
  anchorHints?: AdminFocusAdjacentAnchorHints,
): boolean {
  const active = document.activeElement
  if (active == null || active === document.body) return true
  if (!(active instanceof HTMLElement)) return false
  const trig = getRelationTriggerFromHints(anchorHints)
  if (trig == null) return false
  return active === trig || trig.contains(active)
}

/**
 * True when another Tab attempt should move focus from the relation trigger.
 * Covers: lost focus, still on trigger, **backward** jump in tab order (forward Tab), or **skipping**
 * the immediate next control (e.g. inline table: focus leaps to “Add empty row” past **Qty**).
 */
export function adminAdjacentTabFocusShouldRetryAttempt(
  anchorHints: AdminFocusAdjacentAnchorHints | undefined,
  direction: 1 | -1,
): boolean {
  if (anchorHints == null) return false
  if (adminAdjacentTabFocusNeedsRetry(anchorHints)) return true
  const trig = getRelationTriggerFromHints(anchorHints)
  if (trig == null) return false

  const expectedRow = getExpectedTableRowAdjacent(trig, direction)
  if (expectedRow != null) {
    const active = document.activeElement
    if (
      active instanceof HTMLElement &&
      (active === expectedRow || expectedRow.contains(active))
    ) {
      return false
    }
  }

  const list = listFocusablesInDocumentOrder(document.body)
  const ti = list.indexOf(trig)
  if (ti === -1) return false
  const active = document.activeElement
  if (!(active instanceof HTMLElement)) return true
  const ai = list.indexOf(active)
  if (ai === -1) return true
  if (direction === 1) {
    if (ai < ti) return true
    /** Focus is after the trigger but not the immediate next tab stop — retry `focus()` on `ti + 1`. */
    if (ai > ti + 1) return true
    return false
  }
  return ai > ti
}

export type AdminAdjacentTabFocusRetryProfile = "full" | "short"

/**
 * Run after the combobox/select closes from Tab: focus the adjacent control after layout commit,
 * then retry across microtasks, animation frames, and delayed timers so focus survives cascading
 * React Query / form updates (e.g. sales customer → inventories + alternate names + return slips).
 *
 * Use `retryProfile: "short"` when the caller already waited for critical async work (e.g. row-detail
 * GET before advancing Tab). Long `setTimeout` retries from `"full"` can otherwise fire seconds
 * later and steal focus from another opened popover/combobox.
 */
export function adminFinalizeAdjacentTabFocusAfterClose(
  from: Element | null,
  direction: 1 | -1,
  anchorHints?: AdminFocusAdjacentAnchorHints,
  options?: { readonly retryProfile?: AdminAdjacentTabFocusRetryProfile },
): void {
  if (!document.body) return

  const tryMove = () => {
    if (anchorHints == null) return
    if (!adminAdjacentTabFocusShouldRetryAttempt(anchorHints, direction)) return
    adminFocusAdjacentTabStop(null, direction, anchorHints)
  }

  adminFocusAdjacentTabStop(from, direction, anchorHints)

  queueMicrotask(tryMove)
  window.requestAnimationFrame(() => {
    tryMove()
    window.requestAnimationFrame(() => {
      tryMove()
      window.requestAnimationFrame(tryMove)
    })
  })
  if (options?.retryProfile === "short") return

  /** Cover slow parallel relation GETs (e.g. customer + line-item inventory embeds) finishing past ~2s. */
  for (const ms of [
    0, 16, 32, 48, 80, 120, 200, 320, 500, 650, 800, 950, 1100, 1300, 1600,
    2000, 2300, 2600, 3000, 3500,
  ]) {
    window.setTimeout(tryMove, ms)
  }
}

function focusAdjacentElement(el: HTMLElement): void {
  try {
    el.focus({ preventScroll: true })
  } catch {
    el.focus()
  }
}

/**
 * Moves focus to the adjacent tab stop after `from` in document order.
 * `from` is usually the combobox / select trigger.
 *
 * After `onChange` from Tab-to-pick, React may replace the trigger before
 * `onCloseAutoFocus` runs; pass `anchorHints` so we can resolve the live node via
 * `id` / `data-testid` when `from` is null or disconnected.
 */
export function adminFocusAdjacentTabStop(
  from: Element | null,
  direction: 1 | -1,
  anchorHints?: AdminFocusAdjacentAnchorHints,
): void {
  if (!document.body) return

  let fromEl = from instanceof HTMLElement ? from : null

  const resolveConnectedAnchor = (): HTMLElement | null => {
    if (fromEl?.isConnected) return fromEl
    if (fromEl?.id) {
      const byStaleId = document.getElementById(fromEl.id)
      if (byStaleId instanceof HTMLElement && byStaleId.isConnected) {
        return byStaleId
      }
    }
    if (anchorHints?.htmlForId) {
      const byId = document.getElementById(anchorHints.htmlForId)
      if (byId instanceof HTMLElement && byId.isConnected) return byId
    }
    if (anchorHints?.dataTestId) {
      const sel = `[data-testid="${escapeForDataTestIdSelector(anchorHints.dataTestId)}"]`
      const byTestId = document.querySelector<HTMLElement>(sel)
      if (byTestId?.isConnected) return byTestId
    }
    return null
  }

  fromEl = resolveConnectedAnchor()
  if (fromEl == null || !fromEl.isConnected) return

  const { target, path } = adminResolveAdjacentFocusable(fromEl, direction)

  if (adminTabFocusDebugEnabled()) {
    console.log("[admin-tab-focus]", {
      fn: "adminFocusAdjacentTabStop",
      direction: direction === 1 ? "forward" : "backward",
      anchorHints,
      resolutionPath: path,
      anchor: describeAdminTabFocusElement(fromEl),
      /** Element the helper will try to focus (predicted landing). */
      resolvedTarget: describeAdminTabFocusElement(target),
      activeElementBefore: describeAdminTabFocusElement(document.activeElement),
    })
  }

  if (target == null) return

  focusAdjacentElement(target)

  if (adminTabFocusDebugEnabled()) {
    const active = document.activeElement
    const matches =
      active != null &&
      (active === target ||
        (active instanceof Node && target.contains(active)))
    console.log("[admin-tab-focus] after programmatic focus()", {
      activeElement: describeAdminTabFocusElement(active),
      matchesResolvedTarget: matches,
    })
  }
}

