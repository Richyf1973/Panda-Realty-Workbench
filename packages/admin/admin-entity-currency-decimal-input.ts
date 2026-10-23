const NAV_KEYS = new Set([
  "Backspace",
  "Delete",
  "Tab",
  "Escape",
  "Enter",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
])

export type AdminEntityDecimalAmountInputOptions = {
  /**
   * When true, a single leading ASCII `-` is allowed (plain signed numeric, e.g. count deltas).
   * Currency fields use this only when the column sets `currencyAmountAllowLeadingMinus`.
   */
  allowLeadingMinus?: boolean
}

function isMinusChar(ch: string): boolean {
  return ch === "-" || ch === "\u2212"
}

/**
 * Strip illegal characters for amount fields; keeps digits and at most one decimal point.
 * With `allowLeadingMinus`, normalizes a leading `-` / `−` to ASCII `-`.
 * Aligns with server validation that expects a plain decimal string (no grouping, no currency).
 */
export function sanitizeAdminEntityDecimalAmountInput(
  raw: string,
  options?: AdminEntityDecimalAmountInputOptions,
): string {
  const allowMinus = options?.allowLeadingMinus === true
  let i = 0
  let out = ""
  if (allowMinus && raw.length > 0 && isMinusChar(raw[0]!)) {
    out = "-"
    i = 1
  }
  let dotSeen = false
  for (; i < raw.length; i++) {
    const ch = raw[i]!
    if (isMinusChar(ch)) {
      continue
    }
    if (ch >= "0" && ch <= "9") {
      out += ch
      continue
    }
    if (ch === "." && !dotSeen) {
      dotSeen = true
      out += ch
    }
  }
  return out
}

/** Minimal input shape for key validation (React `KeyboardEvent` is compatible). */
export type AdminEntityDecimalAmountKeyboardLike = {
  key: string
  /** Physical key (`KeyboardEvent.code`) — e.g. **`Comma`** vs **`NumpadComma`**. */
  code?: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  currentTarget: {
    value: string
    selectionStart: number | null
    selectionEnd: number | null
  }
}

/**
 * Block keys that would produce characters `sanitizeAdminEntityDecimalAmountInput` would remove,
 * using the current value and selection. Modifier shortcuts (copy/paste/select all) are allowed.
 */
export function adminEntityDecimalAmountInputKeyShouldPass(
  e: AdminEntityDecimalAmountKeyboardLike,
  options?: AdminEntityDecimalAmountInputOptions,
): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return true
  if (NAV_KEYS.has(e.key)) return true
  if (e.key.length !== 1) return true
  const el = e.currentTarget
  const v = el.value
  const start = el.selectionStart ?? v.length
  const end = el.selectionEnd ?? v.length
  const next = `${v.slice(0, start)}${e.key}${v.slice(end)}`
  return sanitizeAdminEntityDecimalAmountInput(next, options) === next
}

/**
 * Append-at-end variant of {@link adminEntityDecimalAmountInputKeyShouldPass} for tests and
 * callers without a real selection (cursor assumed at end).
 */
export function adminEntityDecimalAmountInputKeyAppendShouldPass(
  key: string,
  modifiers: { ctrlKey: boolean; metaKey: boolean; altKey: boolean },
  currentValue: string,
  options?: AdminEntityDecimalAmountInputOptions,
): boolean {
  return adminEntityDecimalAmountInputKeyShouldPass(
    {
      key,
      ...modifiers,
      currentTarget: {
        value: currentValue,
        selectionStart: currentValue.length,
        selectionEnd: currentValue.length,
      },
    },
    options,
  )
}
