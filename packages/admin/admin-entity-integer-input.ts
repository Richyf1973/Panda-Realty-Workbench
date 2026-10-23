import type { AdminEntityDecimalAmountKeyboardLike } from "./admin-entity-currency-decimal-input"

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

function isMinusChar(ch: string): boolean {
  return ch === "-" || ch === "\u2212"
}

export type AdminEntityIntegerInputOptions = {
  /** When true, a single leading `-` / `−` is allowed (signed integer). */
  readonly allowLeadingMinus?: boolean
  /**
   * When true, allow `,` and spaces so users can type comma-separated quantities (e.g. `37, 5, 23`)
   * before a client post-process expands them into multiple rows. Unsigned only; incompatible with
   * {@link allowLeadingMinus}.
   */
  readonly allowCommaSeparatedQuantities?: boolean
}

/**
 * Strip non-digits for integer admin fields (related-row cells use `type="text"` like amounts).
 * Optional single leading minus when `allowLeadingMinus` is true.
 */
export function sanitizeAdminEntityIntegerInput(
  raw: string,
  options?: AdminEntityIntegerInputOptions,
): string {
  if (options?.allowCommaSeparatedQuantities === true) {
    let out = ""
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i]!
      if (ch >= "0" && ch <= "9") {
        out += ch
      } else if (ch === ",") {
        out += ch
      } else if (ch === " ") {
        out += ch
      }
    }
    return out
  }
  const allowMinus = options?.allowLeadingMinus === true
  let i = 0
  let out = ""
  if (allowMinus && raw.length > 0 && isMinusChar(raw[0]!)) {
    out = "-"
    i = 1
  }
  for (; i < raw.length; i++) {
    const ch = raw[i]!
    if (ch >= "0" && ch <= "9") {
      out += ch
    }
  }
  return out
}

/**
 * Block keys that would change the value to something `sanitizeAdminEntityIntegerInput` would strip.
 *
 * @param reactValue - When provided, used instead of `el.value` as the authoritative current value.
 *   Pass the React state value to avoid stale-DOM issues: in a controlled input inside a Radix Dialog,
 *   the DOM value can lag behind React state during fast typing (React hasn't committed the previous
 *   keystroke's render yet), causing the next character to be inserted into the wrong position.
 */
export function adminEntityIntegerInputKeyShouldPass(
  e: AdminEntityDecimalAmountKeyboardLike,
  options?: AdminEntityIntegerInputOptions,
  reactValue?: string,
): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return true
  if (NAV_KEYS.has(e.key)) return true
  if (options?.allowCommaSeparatedQuantities === true) {
    if (
      e.key === "," ||
      e.key === " " ||
      e.key === "Spacebar" ||
      e.code === "Comma" ||
      e.code === "NumpadComma" ||
      e.code === "Space"
    ) {
      return true
    }
  }
  if (e.key.length !== 1) return true
  const el = e.currentTarget
  const v = reactValue ?? el.value
  // When reactValue differs from el.value the DOM hasn't committed yet — selection positions
  // are relative to the stale DOM value and are meaningless for reactValue. Treat as append.
  let start: number
  let end: number
  if (reactValue != null && reactValue !== el.value) {
    start = reactValue.length
    end = reactValue.length
  } else {
    start = el.selectionStart ?? v.length
    end = el.selectionEnd ?? v.length
  }
  const next = `${v.slice(0, start)}${e.key}${v.slice(end)}`
  const pass = sanitizeAdminEntityIntegerInput(next, options) === next
  return pass
}
