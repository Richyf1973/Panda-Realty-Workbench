import type React from "react"

import { normalizeEmailSignatureHtml } from "@/lib/email-signature-render"

export function saveSelectionIfInEditor(
  editorRef: React.RefObject<HTMLDivElement | null>,
  savedSelectionRef: React.MutableRefObject<Range | null>,
) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return

  const range = selection.getRangeAt(0)
  const editor = editorRef.current
  if (!editor) return

  const ancestorNode =
    range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentNode
      : range.commonAncestorContainer
  if (!(ancestorNode instanceof Node) || !editor.contains(ancestorNode)) return

  savedSelectionRef.current = range.cloneRange()
}

export function focusEditor(
  editorRef: React.RefObject<HTMLDivElement | null>,
  editorLocked: boolean,
) {
  if (editorLocked) return
  editorRef.current?.focus()
}

export function restoreSavedSelection(
  editorRef: React.RefObject<HTMLDivElement | null>,
  savedSelectionRef: React.MutableRefObject<Range | null>,
  editorLocked: boolean,
): Range | null {
  const selection = window.getSelection()
  if (!selection) return null

  const savedRange = savedSelectionRef.current
  if (savedRange) {
    focusEditor(editorRef, editorLocked)
    selection.removeAllRanges()
    selection.addRange(savedRange)
    return savedRange
  }

  if (selection.rangeCount === 0) return null
  const activeRange = selection.getRangeAt(0)
  const editor = editorRef.current
  const ancestorNode =
    activeRange.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? activeRange.commonAncestorContainer.parentNode
      : activeRange.commonAncestorContainer
  if (!editor || !(ancestorNode instanceof Node) || !editor.contains(ancestorNode)) {
    return null
  }

  return activeRange
}

export function emitHtml(
  editorRef: React.RefObject<HTMLDivElement | null>,
  lastValueFromEditorRef: React.MutableRefObject<string>,
  onChangeRef: React.MutableRefObject<(value: string) => void>,
  nextValue?: string,
): string {
  const nextHtml =
    nextValue ?? normalizeEmailSignatureHtml(editorRef.current?.innerHTML ?? "")
  lastValueFromEditorRef.current = nextHtml
  onChangeRef.current(nextHtml)
  return nextHtml
}
