export type EmailSignatureLayout =
  | "text-only"
  | "image-above-details"
  | "logo-left-details-right"

export interface EmailSignatureRecord {
  emailSignatureId: number
  name: string
  layout: EmailSignatureLayout
  isDefault: boolean
  htmlContent: string
  renderedHtml: string
  bodyText: string
  closingText: string
  contactName: string
  phone: string | null
  email: string | null
  website: string | null
  imageAssetUrl: string | null
  googleDriveFileId: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function linesToHtml(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>")
}

function linkOrText(
  value: string | null,
  hrefPrefix: "mailto:" | "tel:" | null = null,
): string {
  if (!value?.trim()) return ""
  const trimmed = value.trim()
  if (hrefPrefix == null) return `<div>${escapeHtml(trimmed)}</div>`
  return `<div><a href="${hrefPrefix}${escapeHtml(trimmed)}">${escapeHtml(trimmed)}</a></div>`
}

function websiteHtml(website: string | null): string {
  if (!website?.trim()) return ""
  const trimmed = website.trim()
  return `<div><a href="${escapeHtml(trimmed)}">${escapeHtml(trimmed)}</a></div>`
}

function stripDangerousTags(value: string): string {
  return value.replace(/<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, "")
}

function stripDangerousAttributes(value: string): string {
  return value
    .replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/\s+style\s*=\s*"[^"]*expression\([^"]*\)[^"]*"/gi, "")
    .replace(/\s+style\s*=\s*'[^']*expression\([^']*\)[^']*'/gi, "")
}

function stripJavascriptUrls(value: string): string {
  return value
    .replace(/\s(href|src)\s*=\s*"javascript:[^"]*"/gi, ' $1=""')
    .replace(/\s(href|src)\s*=\s*'javascript:[^']*'/gi, " $1=''")
}

function normalizeBlockHtml(value: string): string {
  return value
    .replace(/<div[^>]*><br><\/div>/gi, "<p><br></p>")
    .replace(/<div([^>]*)>/gi, "<p$1>")
    .replace(/<\/div>/gi, "</p>")
    .replace(/<p>\s*<\/p>/gi, "<p><br></p>")
}

export function normalizeEmailSignatureHtml(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) return ""

  return stripJavascriptUrls(stripDangerousAttributes(stripDangerousTags(normalizeBlockHtml(trimmed))))
}

function detailsBlock(signature: EmailSignatureRecord): string {
  return [
    signature.closingText?.trim()
      ? `<div style="font-weight:600;">${linesToHtml(signature.closingText)}</div>`
      : "",
    signature.contactName?.trim() ? `<div>${escapeHtml(signature.contactName.trim())}</div>` : "",
    linkOrText(signature.phone, "tel:"),
    linkOrText(signature.email, "mailto:"),
    websiteHtml(signature.website),
  ]
    .filter(Boolean)
    .join("")
}

function renderLegacyEmailSignatureHtml(signature: EmailSignatureRecord): string {
  const intro = signature.bodyText?.trim()
    ? `<div style="margin-bottom:12px;">${linesToHtml(signature.bodyText.trim())}</div>`
    : ""
  const details = detailsBlock(signature)
  const image = signature.imageAssetUrl?.trim()
    ? `<img src="${escapeHtml(signature.imageAssetUrl.trim())}" alt="${escapeHtml(signature.name)}" style="max-width:320px;height:auto;display:block;border:0;">`
    : ""

  if (signature.layout === "text-only") {
    return `${intro}<div>${details}</div>`
  }

  if (signature.layout === "logo-left-details-right") {
    return `${intro}<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>${
      image
        ? `<td style="padding-right:16px;vertical-align:top;">${image}</td>`
        : ""
    }<td style="vertical-align:top;">${details}</td></tr></table>`
  }

  return `${intro}${image ? `<div style="margin-bottom:12px;">${image}</div>` : ""}<div>${details}</div>`
}

export function renderEmailSignatureHtml(signature: EmailSignatureRecord): string {
  const htmlContent = normalizeEmailSignatureHtml(signature.htmlContent)
  if (htmlContent) return htmlContent

  const renderedHtml = normalizeEmailSignatureHtml(signature.renderedHtml)
  if (renderedHtml) return renderedHtml

  return renderLegacyEmailSignatureHtml(signature)
}
