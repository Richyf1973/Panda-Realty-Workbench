const KEEP_STYLE_PROPS = [
  "font-family",
  "font-size",
  "color",
  "background-color",
  "font-weight",
  "font-style",
  "text-decoration",
  "text-decoration-line",
  "text-decoration-color",
  "text-decoration-style",
  "text-align",
]

/**
 * Strips Gmail / Outlook / Word cruft from pasted HTML:
 * - Converts Gmail emoji <img data-emoji> to real Unicode characters
 * - Removes class, data-*, and event-handler attributes
 * - Keeps only formatting-relevant inline styles (font, color, decoration, alignment)
 *
 * DOMParser also auto-repairs invalid nesting (e.g. <p> inside <span>).
 */
export function sanitizePastedHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html")

  for (const img of Array.from(doc.querySelectorAll("img[data-emoji]"))) {
    const emoji = img.getAttribute("alt") ?? img.getAttribute("aria-label") ?? ""
    img.replaceWith(doc.createTextNode(emoji))
  }

  for (const el of Array.from(doc.querySelectorAll("*"))) {
    for (const attr of Array.from(el.attributes)) {
      if (!["href", "src", "alt", "style"].includes(attr.name)) {
        el.removeAttribute(attr.name)
      }
    }

    if (el instanceof HTMLElement && el.style.length > 0) {
      const keep: [string, string][] = []
      for (const prop of KEEP_STYLE_PROPS) {
        const val = el.style.getPropertyValue(prop)
        if (val) keep.push([prop, val])
      }
      el.removeAttribute("style")
      for (const [prop, val] of keep) {
        el.style.setProperty(prop, val)
      }
      if (!el.getAttribute("style")) el.removeAttribute("style")
    }
  }

  return doc.body.innerHTML
}
