export function formatThreadDate(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(d)
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function isPreviewable(mimeType: string): boolean {
  return mimeType === "application/pdf" || mimeType.startsWith("image/")
}

export function buildAttachmentUrl(
  messageId: string,
  attachmentId: string,
  filename: string,
  mimeType: string,
  disposition: "inline" | "attachment",
): string {
  const params = new URLSearchParams({
    messageId,
    attachmentId,
    filename,
    mimeType,
    disposition,
  })
  return `/api/admin/gmail/threads/attachment?${params.toString()}`
}

const URL_PATTERN = /<(https?:\/\/[^>]+)>|(https?:\/\/[^\s<>"]+)/g

export function renderBodyWithLinks(body: string) {
  const result: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  URL_PATTERN.lastIndex = 0
  while ((match = URL_PATTERN.exec(body)) !== null) {
    if (match.index > lastIndex) result.push(body.slice(lastIndex, match.index))
    const url = match[1] ?? match[2]
    const text = match[1] ? `<${url}>` : url
    result.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline hover:no-underline"
      >
        {text}
      </a>,
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < body.length) result.push(body.slice(lastIndex))
  return result
}
