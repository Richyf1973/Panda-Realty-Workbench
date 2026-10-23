import type { Page } from "@playwright/test"

export async function pasteImageIntoComposeEditor(page: Page) {
  await page.getByTestId("property-gmail-compose-editor").evaluate((element) => {
    const clipboardData = new DataTransfer()
    clipboardData.items.add(new File(["image-bytes"], "draft-image.png", { type: "image/png" }))
    const event = new ClipboardEvent("paste", {
      clipboardData,
      bubbles: true,
      cancelable: true,
    })
    element.dispatchEvent(event)
  })
}

export async function composeEditorHtml(page: Page) {
  return page
    .getByTestId("property-gmail-compose-editor")
    .evaluate((node) => (node as HTMLDivElement).innerHTML)
}

export async function composeEditorText(page: Page) {
  return page
    .getByTestId("property-gmail-compose-editor")
    .evaluate((node) => (node as HTMLDivElement).textContent ?? "")
}

export async function setComposeEditorHtml(page: Page, html: string) {
  await page.getByTestId("property-gmail-compose-editor").evaluate((node, nextHtml) => {
    const editor = node as HTMLDivElement
    editor.innerHTML = String(nextHtml)
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, cancelable: true }))
  }, html)
}

export async function selectTextInComposeEditor(page: Page, text: string) {
  await page.getByTestId("property-gmail-compose-editor").evaluate((element, targetText) => {
    const root = element as HTMLDivElement
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let textNode: Text | null = null
    let startOffset = -1

    while (walker.nextNode()) {
      const current = walker.currentNode as Text
      const nextOffset = current.data.indexOf(targetText as string)
      if (nextOffset >= 0) {
        textNode = current
        startOffset = nextOffset
        break
      }
    }

    if (!textNode || startOffset < 0) {
      throw new Error(`Could not find text: ${String(targetText)}`)
    }

    const range = document.createRange()
    range.setStart(textNode, startOffset)
    range.setEnd(textNode, startOffset + String(targetText).length)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
  }, text)
}
