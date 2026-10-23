export function findBlockAncestor(startNode: Node, editor: HTMLElement): HTMLElement | null {
  let node: Node | null =
    startNode.nodeType === Node.TEXT_NODE ? startNode.parentNode : startNode
  while (node && node !== editor) {
    if (node instanceof HTMLElement && (node.tagName === "P" || node.tagName === "DIV")) {
      return node
    }
    node = node.parentNode
  }
  return null
}

export function mergeBlockIntoNext(
  blockEl: HTMLElement,
  nextBlock: HTMLElement,
  selection: Selection,
): void {
  // Remove trailing <br> placeholder from current block
  if (blockEl.lastChild instanceof HTMLBRElement) {
    blockEl.removeChild(blockEl.lastChild)
  }

  // Record merge-point cursor position after <br> removal
  const mergeAnchor: Node = blockEl.lastChild ?? blockEl
  const mergeOffset =
    mergeAnchor instanceof Text ? mergeAnchor.length : blockEl.childNodes.length

  // Move children from next block into current block, skipping lone <br> placeholders
  const children = Array.from(nextBlock.childNodes)
  for (const child of children) {
    if (child instanceof HTMLBRElement && children.length === 1) break
    blockEl.appendChild(child)
  }
  nextBlock.remove()

  // Place cursor at merge point
  const newRange = document.createRange()
  if (mergeAnchor instanceof Text) {
    newRange.setStart(mergeAnchor, mergeOffset)
  } else {
    newRange.setStart(blockEl, mergeOffset)
  }
  newRange.collapse(true)
  selection.removeAllRanges()
  selection.addRange(newRange)
}
