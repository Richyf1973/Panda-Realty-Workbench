import type { EmailSignatureForm, EmailSignatureItem } from "./types"
export {
  buildPersistedImageHtml,
  buildUploadingPlaceholderHtml,
} from "../rich-email-editor-html"

export function cloneForForm(item: EmailSignatureItem): EmailSignatureForm {
  const rawHtmlContent = item.htmlContent.trim() || item.renderedHtml.trim()
  return {
    name: item.name,
    isDefault: item.isDefault,
    htmlContent: rawHtmlContent,
    renderedHtml: item.renderedHtml.trim() || rawHtmlContent,
  }
}
