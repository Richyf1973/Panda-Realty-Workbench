export function stripInlineStyleFromFragment(fragment: DocumentFragment, propertyName: string) {
  const elements = fragment.querySelectorAll<HTMLElement>("*")
  for (const element of elements) {
    element.style.removeProperty(propertyName)
    if (!element.getAttribute("style")?.trim()) {
      element.removeAttribute("style")
    }
  }
}

interface BuildApplyInlineStyleOptions {
  editorRef: React.RefObject<HTMLDivElement | null>
  savedSelectionRef: React.MutableRefObject<Range | null>
  editorLocked: boolean
  emitHtml: () => void
  focusEditor: () => void
  restoreSavedSelection: () => Range | null
}

export function buildApplyInlineStyle({
  editorRef,
  savedSelectionRef,
  editorLocked,
  emitHtml,
  focusEditor,
  restoreSavedSelection,
}: BuildApplyInlineStyleOptions) {
  return function applyInlineStyle(
    styleProperty: "font-size" | "background-color" | "color" | "font-family",
    styleValue: string | null,
  ) {
    if (editorLocked) return

    const range = restoreSavedSelection()
    if (!range || range.collapsed) return

    if (styleValue == null) {
      const editor = editorRef.current
      const selectedText = range.toString()
      let ancestor: HTMLElement | null =
        range.commonAncestorContainer.nodeType === Node.TEXT_NODE
          ? range.commonAncestorContainer.parentElement
          : range.commonAncestorContainer instanceof HTMLElement
            ? range.commonAncestorContainer
            : null

      while (ancestor && editor?.contains(ancestor)) {
        if (
          ancestor.style.getPropertyValue(styleProperty) &&
          ancestor.textContent === selectedText
        ) {
          ancestor.style.removeProperty(styleProperty)
          if (!ancestor.getAttribute("style")?.trim()) {
            ancestor.removeAttribute("style")
          }
          if (ancestor.tagName === "SPAN" && ancestor.attributes.length === 0) {
            ancestor.replaceWith(...Array.from(ancestor.childNodes))
          }
          savedSelectionRef.current = null
          emitHtml()
          focusEditor()
          return
        }
        ancestor = ancestor.parentElement
      }
    }

    const fragment = range.extractContents()
    stripInlineStyleFromFragment(fragment, styleProperty)

    if (styleValue) {
      const wrapper = document.createElement("span")
      wrapper.style.setProperty(styleProperty, styleValue)
      wrapper.append(fragment)
      range.insertNode(wrapper)
    } else {
      range.insertNode(fragment)
    }

    const selection = window.getSelection()
    selection?.removeAllRanges()
    savedSelectionRef.current = null
    emitHtml()
    focusEditor()
  }
}
