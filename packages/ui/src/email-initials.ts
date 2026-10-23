/** Two-letter initials for an avatar fallback from a sign-in email (local part). */
export function emailInitialsForAvatar(
  email: string | null | undefined,
): string {
  if (!email?.trim()) return "?"
  const local = email.split("@")[0] ?? email
  const tokens = local.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(/\s+/)
  if (tokens.length >= 2 && tokens[0] && tokens[1]) {
    return `${tokens[0][0]}${tokens[1][0]}`.toUpperCase()
  }
  const compact = local.replace(/[^a-zA-Z0-9]/g, "")
  if (compact.length >= 2) return compact.slice(0, 2).toUpperCase()
  return (compact[0] ?? "?").toUpperCase()
}
