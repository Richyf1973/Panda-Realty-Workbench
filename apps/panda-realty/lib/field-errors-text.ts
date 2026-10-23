function errorEntryToString(e: unknown): string {
  if (e == null) return ""
  if (typeof e === "string") return e
  if (typeof e === "object" && e !== null && "message" in e) {
    const m = (e as { message: unknown }).message
    return typeof m === "string" ? m : String(m)
  }
  return String(e)
}

export function fieldErrorsText(errors: readonly unknown[]): string {
  return errors.map(errorEntryToString).filter(Boolean).join(", ")
}
