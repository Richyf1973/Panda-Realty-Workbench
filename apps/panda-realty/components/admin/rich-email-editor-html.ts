import { normalizeEmailSignatureHtml } from "@/lib/email-signature-render"

const COMPOSE_SIGNATURE_BLOCK_SELECTOR = 'section[data-compose-signature-block="true"]'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function parseEditorHtml(html: string) {
  return new DOMParser().parseFromString(`<body>${html}</body>`, "text/html")
}

export function buildUploadingPlaceholderHtml(uploadId: string, src: string, alt: string): string {
  const safeSrc = escapeHtml(src)
  const safeAlt = escapeHtml(alt)
  return `
    <span
      data-upload-placeholder="true"
      data-upload-id="${uploadId}"
      contenteditable="false"
      style="position:relative;display:inline-flex;max-width:320px;border:1px solid rgba(148,163,184,0.35);border-radius:12px;overflow:hidden;background:rgba(148,163,184,0.08);"
    >
      <img src="${safeSrc}" alt="${safeAlt}" style="max-width:320px;max-height:220px;height:auto;display:block;opacity:0.72;" />
      <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(15,23,42,0.38);">
        <span style="width:34px;height:34px;border-radius:9999px;border:3px solid rgba(255,255,255,0.35);border-top-color:rgba(255,255,255,0.95);"></span>
      </span>
    </span>
    <p><br></p>
  `
}

export function buildPersistedImageHtml({
  originalSrc,
  alt,
}: {
  previewSrc?: string
  originalSrc: string
  alt: string
}): string {
  const safeOriginalSrc = escapeHtml(originalSrc)
  const safeAlt = escapeHtml(alt)
  return `<img src="${safeOriginalSrc}" alt="${safeAlt}" style="max-width:320px;height:auto;display:block;border:0;" />`
}

export function plainTextToRichEmailHtml(value: string): string {
  if (!value.trim()) return "<p><br></p>"
  return `<p>${escapeHtml(value).replace(/\r?\n/g, "<br>")}</p><p><br></p>`
}

export function buildComposeSignatureBlockHtml(signatureHtml: string): string {
  const normalizedSignature = normalizeEmailSignatureHtml(signatureHtml)
  if (!normalizedSignature) return ""

  return `
    <section
      data-compose-signature-block="true"
      contenteditable="false"
      style="display:block;margin-top:24px;"
    >
      ${normalizedSignature}
    </section>
  `
}

export function removeComposeSignatureHtml(value: string): string {
  const doc = parseEditorHtml(value)
  const signatureBlocks = doc.body.querySelectorAll(COMPOSE_SIGNATURE_BLOCK_SELECTOR)
  signatureBlocks.forEach((node) => node.remove())
  return normalizeEmailSignatureHtml(doc.body.innerHTML)
}

export function upsertComposeSignatureHtml(value: string, signatureHtml: string): string {
  const doc = parseEditorHtml(removeComposeSignatureHtml(value))
  const nextBlock = buildComposeSignatureBlockHtml(signatureHtml)
  if (!nextBlock) {
    return normalizeEmailSignatureHtml(doc.body.innerHTML)
  }

  const lastEl = doc.body.lastElementChild
  const lastIsEmptyP =
    lastEl?.tagName === "P" &&
    lastEl.getAttribute("contenteditable") !== "false" &&
    (!lastEl.textContent?.trim() || lastEl.innerHTML === "<br>")
  if (!lastIsEmptyP) {
    doc.body.insertAdjacentHTML("beforeend", "<p><br></p>")
  }

  doc.body.insertAdjacentHTML("beforeend", nextBlock)
  return normalizeEmailSignatureHtml(doc.body.innerHTML)
}

export function hasComposeSignatureHtml(value: string): boolean {
  const doc = parseEditorHtml(value)
  return doc.body.querySelector(COMPOSE_SIGNATURE_BLOCK_SELECTOR) != null
}
