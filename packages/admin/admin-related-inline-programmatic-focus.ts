const programmaticRelatedInlineFocusTargets = new WeakSet<Element>()

/** Call immediately before `HTMLElement.focus()` from related-inline draft restore. */
export function markAdminRelatedInlineProgrammaticFocus(el: Element): void {
  programmaticRelatedInlineFocusTargets.add(el)
}

/**
 * If this focus was from {@link markAdminRelatedInlineProgrammaticFocus}, consume the mark once.
 * Used so currency/amount fields can skip select-all on sync refocus (blur → focus each key).
 */
export function consumeAdminRelatedInlineProgrammaticFocus(el: Element): boolean {
  if (!programmaticRelatedInlineFocusTargets.has(el)) return false
  programmaticRelatedInlineFocusTargets.delete(el)
  return true
}

/**
 * Tracks the test-id + timestamp of the last keydown per dialog element.
 * Scoped per dialog so two simultaneously open dialogs cannot cross-contaminate.
 * WeakMap ensures no memory leak when dialogs are removed from the DOM.
 */
type KeydownState = { testId: string | null; at: number }
const keydownStateByDialog = new WeakMap<Element, KeydownState>()

export function recordRelatedInlineKeydown(el: Element): void {
  const dialog = el.closest('[role="dialog"]')
  if (!dialog) return
  const testId = (el as HTMLElement).dataset.testid ?? null
  keydownStateByDialog.set(dialog, { testId, at: Date.now() })
}

/**
 * Clears the recent-keydown record for the dialog containing `el` when the user explicitly
 * blurs the input. A real user blur (e.g. Tab or click elsewhere) means the next focus is
 * genuine, not a Radix focus-trap restore — so select-all should proceed normally.
 */
export function clearRelatedInlineKeydown(el: Element): void {
  const dialog = el.closest('[role="dialog"]')
  if (!dialog) return
  keydownStateByDialog.delete(dialog)
}

/**
 * Returns true when the given element has the same test-id as the last keydown target
 * in its dialog and the keydown happened within 500 ms — meaning this focus event is a
 * Radix-triggered restore during active typing, not a real user focus.
 */
export function isRelatedInlineRecentKeydownTarget(el: Element): boolean {
  const dialog = el.closest('[role="dialog"]')
  if (!dialog) return false
  const state = keydownStateByDialog.get(dialog)
  if (!state || state.testId === null) return false
  const testId = (el as HTMLElement).dataset.testid ?? null
  const ms = Date.now() - state.at
  return testId !== null && testId === state.testId && ms < 500
}
