import type * as React from "react"

import { consumeAdminRelatedInlineProgrammaticFocus, isRelatedInlineRecentKeydownTarget } from "./admin-related-inline-programmatic-focus"
import { RELATED_INLINE_NAV_TARGET_ATTR } from "./admin-related-inline-table-arrow-navigation"

export type AdminSelectAllOnInputFocusOptions = {
  /**
   * Related inline plain text cells skip select-all by default: rows can remount and programmatic
   * refocus would select the whole value so the next key replaces everything. Currency inputs use
   * their own focus effect; opt in for **numeric** inline editors only.
   */
  allowInRelatedInlineTable?: boolean
}

/**
 * Selects the entire value when a text-like control receives focus so typing
 * overwrites (keyboard / tab-through data entry).
 */
export function adminSelectAllOnInputFocus(
  e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  options?: AdminSelectAllOnInputFocusOptions,
): void {
  const el = e.currentTarget
  // Skip select-all when focus was restored programmatically by the related-inline applyFocus
  // (sync bumps after keystrokes). Mirrors the pattern in AdminEntityCrudCurrencyAmountTextInput.
  if (consumeAdminRelatedInlineProgrammaticFocus(el)) return
  // Skip select-all when this element (identified by data-testid) had a keydown very recently —
  // Radix Dialog's focus trap temporarily moves focus to the container during each React DOM
  // commit and may restore it here. Selecting-all would wipe the character just typed.
  if (isRelatedInlineRecentKeydownTarget(el)) return
  const valueAtFocus = el.value
  const run = () => {
    if (document.activeElement !== el) return
    if (el.value !== valueAtFocus) return
    if (
      options?.allowInRelatedInlineTable !== true &&
      el.hasAttribute(RELATED_INLINE_NAV_TARGET_ATTR)
    ) {
      return
    }
    try {
      el.select()
    } catch {
      /* ignore */
    }
  }
  queueMicrotask(run)
  // For non-inline-table inputs, also run a double-RAF to cover Radix Dialog's async focus
  // management. For inline-table inputs the applyFocus RAF mechanism already handles programmatic
  // refocus — the double-RAF fires ~32ms after focus, after the user may have already typed the
  // first character, and the DOM value can still read the pre-edit value if React hasn't committed
  // yet, causing the valueAtFocus guard to miss and select-all to fire mid-typing.
  if (
    options?.allowInRelatedInlineTable !== true &&
    !el.hasAttribute(RELATED_INLINE_NAV_TARGET_ATTR)
  ) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(run)
    })
  }
}
