const EMAIL_IN_BRACKETS_PATTERN = /<([^<>@\s]+@[^<>@\s]+)>/
const EMAIL_BARE_PATTERN = /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i
const REPLY_SUBJECT_PATTERN = /^\s*re\s*:/i
const FORWARD_SUBJECT_PATTERN = /^\s*fwd\s*:/i

export function extractEmailAddress(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const bracketMatch = trimmed.match(EMAIL_IN_BRACKETS_PATTERN)
  if (bracketMatch?.[1]) return bracketMatch[1].trim()

  const bareMatch = trimmed.match(EMAIL_BARE_PATTERN)
  if (bareMatch?.[1]) return bareMatch[1].trim()

  return null
}

export function normalizeReplySubject(subject: string): string {
  const trimmed = subject.trim()
  if (!trimmed) return ""
  if (REPLY_SUBJECT_PATTERN.test(trimmed)) return trimmed.replace(/^\s+/, "")
  return `Re: ${trimmed}`
}

export function normalizeForwardSubject(subject: string): string {
  const trimmed = subject.trim()
  if (!trimmed) return ""
  if (FORWARD_SUBJECT_PATTERN.test(trimmed)) return trimmed.replace(/^\s+/, "")
  return `Fwd: ${trimmed}`
}
