"use client"

import { useEffect, useState } from "react"

import {
  buildPersistedImageHtml,
  buildUploadingPlaceholderHtml,
} from "./rich-email-editor-html"

interface UseRichEmailEditorUploadOptions {
  editorRef: React.RefObject<HTMLDivElement | null>
  savedSelectionRef: React.RefObject<Range | null>
  objectUrlMapRef: React.RefObject<Map<string, string>>
  emitHtml: (nextValue?: string) => string
  uploadEndpoint: string
}

export function useRichEmailEditorUpload({
  editorRef,
  savedSelectionRef,
  objectUrlMapRef,
  emitHtml,
  uploadEndpoint,
}: UseRichEmailEditorUploadOptions) {
  const [activeUploadCount, setActiveUploadCount] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      for (const objectUrl of objectUrlMapRef.current.values()) {
        URL.revokeObjectURL(objectUrl)
      }
      objectUrlMapRef.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function focusEditorForUpload() {
    editorRef.current?.focus()
  }

  function restoreSelectionForUpload() {
    const selection = window.getSelection()
    if (!selection) return

    const savedRange = savedSelectionRef.current
    if (savedRange) {
      focusEditorForUpload()
      selection.removeAllRanges()
      selection.addRange(savedRange)
    }
  }

  function insertUploadingPlaceholder(file: File) {
    const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const objectUrl = URL.createObjectURL(file)
    objectUrlMapRef.current.set(uploadId, objectUrl)
    restoreSelectionForUpload()
    focusEditorForUpload()
    document.execCommand(
      "insertHTML",
      false,
      buildUploadingPlaceholderHtml(uploadId, objectUrl, file.name || "Uploading image"),
    )
    emitHtml()
    return uploadId
  }

  function replaceUploadPlaceholder(uploadId: string, html: string) {
    const editor = editorRef.current
    const placeholder = editor?.querySelector(`[data-upload-id="${uploadId}"]`)
    if (!placeholder) return
    placeholder.insertAdjacentHTML("afterend", html)
    placeholder.remove()
    emitHtml()
  }

  function removeUploadPlaceholder(uploadId: string) {
    const editor = editorRef.current
    const placeholder = editor?.querySelector(`[data-upload-id="${uploadId}"]`)
    placeholder?.remove()
    emitHtml()
  }

  function releaseUploadPreview(uploadId: string) {
    const objectUrl = objectUrlMapRef.current.get(uploadId)
    if (!objectUrl) return
    URL.revokeObjectURL(objectUrl)
    objectUrlMapRef.current.delete(uploadId)
  }

  async function handleUploadFile(file: File) {
    const uploadId = insertUploadingPlaceholder(file)
    setActiveUploadCount((count) => count + 1)
    setUploadError(null)

    const body = new FormData()
    body.append("file", file)

    try {
      const res = await fetch(uploadEndpoint, {
        method: "POST",
        body,
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        fileUrl?: string
        previewUrl?: string
      }

      if (!res.ok || !data.fileUrl) {
        removeUploadPlaceholder(uploadId)
        setUploadError(data.error ?? "Upload failed.")
        return
      }

      replaceUploadPlaceholder(
        uploadId,
        buildPersistedImageHtml({
          previewSrc: data.previewUrl ?? data.fileUrl,
          originalSrc: data.fileUrl,
          alt: file.name || "Inserted image",
        }),
      )
    } catch (error) {
      removeUploadPlaceholder(uploadId)
      setUploadError(error instanceof Error ? error.message : "Upload failed.")
    } finally {
      releaseUploadPreview(uploadId)
      setActiveUploadCount((count) => Math.max(0, count - 1))
    }
  }

  return { handleUploadFile, activeUploadCount, uploadError, setUploadError }
}
