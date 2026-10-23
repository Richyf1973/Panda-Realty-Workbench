"use client"

import type React from "react"
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react"
import {
  Loader2,
  XCircle,
} from "lucide-react"

import { Label } from "@repo/ui/label"
import { cn } from "@repo/ui/utils"
import { normalizeEmailSignatureHtml } from "@/lib/email-signature-render"

import { findBlockAncestor, mergeBlockIntoNext } from "./rich-email-editor-keydown"
import { sanitizePastedHtml } from "./rich-email-editor-paste"
import { buildApplyInlineStyle } from "./rich-email-editor-selection"
import {
  emitHtml,
  focusEditor,
  restoreSavedSelection,
  saveSelectionIfInEditor,
} from "./rich-email-editor-state"
import { RichEmailEditorToolbar, type RichEmailEditorTestIds } from "./rich-email-editor-toolbar"
import { useRichEmailEditorUpload } from "./rich-email-editor-upload"

export type { RichEmailEditorTestIds } from "./rich-email-editor-toolbar"

export interface RichEmailEditorHandle {
  focus: () => void
  getHtml: () => string
  getPlainText: () => string
  setHtml: (value: string) => void
}

interface RichEmailEditorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  label?: string
  helpText?: string
  afterToolbar?: React.ReactNode
  className?: string
  editorClassName?: string
  uploadEndpoint?: string
  onUploadCountChange?: (count: number) => void
  hideImageUpload?: boolean
  testIds: RichEmailEditorTestIds
}

export const RichEmailEditor = forwardRef<RichEmailEditorHandle, RichEmailEditorProps>(
  function RichEmailEditor(
    {
      value,
      onChange,
      disabled = false,
      label,
      helpText,
      afterToolbar,
      className,
      editorClassName,
      uploadEndpoint = "/api/admin/email-signatures/upload",
      onUploadCountChange,
      hideImageUpload = false,
      testIds,
    },
    ref,
  ) {
    const editorRef = useRef<HTMLDivElement | null>(null)
    const objectUrlMapRef = useRef(new Map<string, string>())
    const lastValueFromEditorRef = useRef<string>("")
    const savedSelectionRef = useRef<Range | null>(null)
    const onChangeRef = useRef(onChange)

    useEffect(() => {
      onChangeRef.current = onChange
    }, [onChange])

    const emit = (nextValue?: string) =>
      emitHtml(editorRef, lastValueFromEditorRef, onChangeRef, nextValue)

    const { handleUploadFile, activeUploadCount, uploadError, setUploadError } =
      useRichEmailEditorUpload({
        editorRef,
        savedSelectionRef,
        objectUrlMapRef,
        emitHtml: emit,
        uploadEndpoint,
      })

    const editorLocked = disabled || activeUploadCount > 0

    const focus = () => focusEditor(editorRef, editorLocked)
    const restoreSelection = () =>
      restoreSavedSelection(editorRef, savedSelectionRef, editorLocked)

    useEffect(() => {
      onUploadCountChange?.(activeUploadCount)
    }, [activeUploadCount, onUploadCountChange])

    useEffect(() => {
      const editor = editorRef.current
      if (!editor) return

      const currentHtml = normalizeEmailSignatureHtml(editor.innerHTML)
      if (value === lastValueFromEditorRef.current && currentHtml === value) return
      if (editor.innerHTML !== value) {
        editor.innerHTML = value
      }
    }, [value])

    useEffect(() => {
      const handler = () => saveSelectionIfInEditor(editorRef, savedSelectionRef)
      document.addEventListener("selectionchange", handler)
      return () => {
        document.removeEventListener("selectionchange", handler)
      }
    }, [])

    const applyInlineStyle = buildApplyInlineStyle({
      editorRef,
      savedSelectionRef,
      editorLocked,
      emitHtml: emit,
      focusEditor: focus,
      restoreSavedSelection: restoreSelection,
    })

    function runEditorCommand(command: string, commandValue?: string) {
      if (editorLocked) return
      focus()
      document.execCommand(command, false, commandValue)
      emit()
    }

    function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
      if (event.key !== "Backspace" && event.key !== "Delete") return

      const editor = editorRef.current
      if (!editor) return

      const selection = window.getSelection()
      if (!selection || !selection.isCollapsed || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      const blockEl = findBlockAncestor(range.startContainer, editor)
      if (!blockEl) return

      if (event.key === "Backspace") {
        const checkRange = document.createRange()
        checkRange.setStart(blockEl, 0)
        checkRange.setEnd(range.startContainer, range.startOffset)
        if (checkRange.toString() !== "") return

        const prevBlock = blockEl.previousElementSibling
        if (
          !prevBlock ||
          !(prevBlock instanceof HTMLElement) ||
          (prevBlock.tagName !== "P" && prevBlock.tagName !== "DIV")
        )
          return

        event.preventDefault()

        if (prevBlock.lastChild instanceof HTMLBRElement) {
          prevBlock.removeChild(prevBlock.lastChild)
        }
        const anchorNode: Node = prevBlock.lastChild ?? prevBlock
        const anchorOffset =
          anchorNode instanceof Text ? anchorNode.length : prevBlock.childNodes.length

        const children = Array.from(blockEl.childNodes)
        for (const child of children) {
          if (child instanceof HTMLBRElement && children.length === 1) break
          prevBlock.appendChild(child)
        }
        blockEl.remove()

        const newRange = document.createRange()
        if (anchorNode instanceof Text) {
          newRange.setStart(anchorNode, anchorOffset)
        } else {
          newRange.setStart(prevBlock, anchorOffset)
        }
        newRange.collapse(true)
        selection.removeAllRanges()
        selection.addRange(newRange)
      } else {
        const checkRange = document.createRange()
        checkRange.setStart(range.startContainer, range.startOffset)
        checkRange.setEnd(blockEl, blockEl.childNodes.length)
        const textAfter = checkRange.toString().replace(/^\n/, "")
        if (textAfter !== "") return

        const nextBlock = blockEl.nextElementSibling
        if (
          !nextBlock ||
          !(nextBlock instanceof HTMLElement) ||
          (nextBlock.tagName !== "P" && nextBlock.tagName !== "DIV")
        )
          return

        event.preventDefault()
        mergeBlockIntoNext(blockEl, nextBlock, selection)
      }

      emit()
    }

    async function handleEditorPaste(event: React.ClipboardEvent<HTMLDivElement>) {
      if (editorLocked) {
        event.preventDefault()
        return
      }

      const clipboardItems =
        event.clipboardData?.items == null ? [] : Array.from(event.clipboardData.items)
      const imageFile = clipboardItems
        .find((item) => item.type.startsWith("image/"))
        ?.getAsFile()

      if (imageFile) {
        event.preventDefault()
        await handleUploadFile(imageFile)
        return
      }

      const htmlData = event.clipboardData?.getData("text/html")
      if (htmlData) {
        event.preventDefault()
        const clean = sanitizePastedHtml(htmlData)
        document.execCommand("insertHTML", false, clean)
        emit()
      }
    }

    useImperativeHandle(
      ref,
      () => ({
        focus,
        getHtml: () => normalizeEmailSignatureHtml(editorRef.current?.innerHTML ?? value),
        getPlainText: () => editorRef.current?.innerText ?? "",
        setHtml: (nextValue: string) => {
          const nextHtml = normalizeEmailSignatureHtml(nextValue)
          if (editorRef.current) {
            editorRef.current.innerHTML = nextHtml
          }
          emit(nextHtml)
        },
      }),
      [editorLocked, value],
    )

    return (
      <div className={cn("space-y-3", className)}>
        <RichEmailEditorToolbar
          disabled={editorLocked}
          testIds={testIds}
          hideImageUpload={hideImageUpload}
          onUploadFile={handleUploadFile}
          applyInlineStyle={applyInlineStyle}
          runEditorCommand={runEditorCommand}
        />

        {afterToolbar}

        {label ? <Label>{label}</Label> : null}

        <div className="relative min-h-0 flex-1">
          <div
            ref={editorRef}
            contentEditable={!editorLocked}
            suppressContentEditableWarning
            className={cn(
              "h-full min-h-64 overflow-y-auto rounded-lg border bg-background p-4 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              editorLocked && "cursor-wait opacity-80",
              editorClassName,
            )}
            data-testid={testIds.editor}
            aria-disabled={editorLocked}
            onInput={() => {
              setUploadError(null)
              emit()
            }}
            onMouseUp={() => saveSelectionIfInEditor(editorRef, savedSelectionRef)}
            onKeyUp={() => saveSelectionIfInEditor(editorRef, savedSelectionRef)}
            onKeyDown={handleKeyDown}
            onPaste={(event) => void handleEditorPaste(event)}
          />
          {activeUploadCount > 0 ? (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/70 backdrop-blur-[1px]"
              data-testid={testIds.uploadOverlay}
            >
              <div className="flex items-center gap-2 rounded-full border bg-background px-3 py-2 text-sm text-muted-foreground shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Finishing image upload...
              </div>
            </div>
          ) : null}
        </div>

        {helpText ? <p className="text-xs text-muted-foreground">{helpText}</p> : null}

        {uploadError ? (
          <div
            className="flex items-center gap-2 text-sm text-destructive"
            data-testid={testIds.uploadError}
          >
            <XCircle className="h-4 w-4 shrink-0" />
            {uploadError}
          </div>
        ) : null}
      </div>
    )
  },
)
