"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

import type { EntityEmailItem } from "@/app/api/admin/properties/[id]/entity-emails/route"
import { clientEmailAttachmentUpload } from "@/lib/client-email-attachment-upload"

import { normalizeForwardSubject } from "@/lib/gmail-reply"
import { GmailComposeForm, type ComposeStatus } from "./gmail-compose-form"
import type { RichEmailEditorHandle } from "./rich-email-editor"
import { plainTextToRichEmailHtml } from "./rich-email-editor-html"
import { hasInvalidEmailChips, joinChips } from "./gmail-chip-utils"
import { type ForwardContext, sendGmailCompose } from "./gmail-compose-send"
import { useGmailComposeSignatureState } from "./gmail-compose-signature-state"
import { buildForwardBlockquoteHtml, gmailChipsFromAttachments } from "./gmail-compose-forward-html"
import type { AttachmentChipItem, GmailForwardContext } from "./gmail-compose-dialog-types"

export type { AttachmentChipItem, GmailForwardContext } from "./gmail-compose-dialog-types"

interface GmailComposeDialogProps {
  open: boolean
  to: string
  subject: string
  body: string
  propertyListId?: number | null
  replyContext?: {
    threadId: string
    messageId: string
  }
  forwardContext?: GmailForwardContext
  onClose: () => void
  /** When true, renders inline without createPortal (required when inside a Radix Dialog,
   *  which marks document.body as inert and makes portaled content unclickable). */
  inline?: boolean
}

export function GmailComposeDialog({
  open,
  to,
  subject: initialSubject,
  body: initialBody,
  propertyListId,
  replyContext,
  forwardContext,
  onClose,
  inline,
}: GmailComposeDialogProps) {
  const [toChips, setToChips] = useState<string[]>(to ? [to] : [])
  const [subject, setSubject] = useState(initialSubject)
  const [editorHtml, setEditorHtml] = useState("")
  const [sending, setSending] = useState(false)
  const [activeUploadCount, setActiveUploadCount] = useState(0)
  const [status, setStatus] = useState<ComposeStatus | null>(null)
  const [chips, setChips] = useState<AttachmentChipItem[]>([])
  const [ccChips, setCcChips] = useState<string[]>([])
  const [bccChips, setBccChips] = useState<string[]>([])
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [entityEmailOptions, setEntityEmailOptions] = useState<EntityEmailItem[]>([])
  const editorRef = useRef<RichEmailEditorHandle | null>(null)
  const attachFileInputRef = useRef<HTMLInputElement | null>(null)

  const {
    signatures,
    selectedSignatureId,
    setSelectedSignatureId,
    includeSignature,
    setIncludeSignature,
    loadingSignatures,
    signatureSelectionTouchedRef,
    displayedSelectedSignature,
    selectedSignatureValue,
  } = useGmailComposeSignatureState({ open, initialBody: forwardContext ? "" : initialBody, setEditorHtml })

  const totalAttachmentBytes = chips.reduce((sum, c) => sum + (c.status === "gmail" ? c.size : c.file.size), 0)
  const hasAnyUploading = chips.some((c) => c.status === "uploading")
  const hasAnyError = chips.some((c) => c.status === "error")

  function clearSuccessStatus() {
    setStatus((current) => (current?.tone === "success" ? null : current))
  }

  useEffect(() => {
    if (!open) return

    if (forwardContext) {
      setToChips([])
      setSubject(normalizeForwardSubject(forwardContext.subject))
      setEditorHtml(buildForwardBlockquoteHtml(forwardContext))
      setChips(gmailChipsFromAttachments(forwardContext.attachments))
    } else {
      setToChips(to ? [to] : [])
      setSubject(initialSubject)
      setEditorHtml(plainTextToRichEmailHtml(initialBody))
      setChips([])
    }

    setIncludeSignature(true)
    setStatus(null)
    setActiveUploadCount(0)
    setCcChips([])
    setBccChips([])
    setShowCcBcc(false)
    signatureSelectionTouchedRef.current = false

    if (propertyListId) {
      fetch(`/api/admin/properties/${propertyListId}/entity-emails`)
        .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
        .then((data: { items: EntityEmailItem[] }) => setEntityEmailOptions(data.items))
        .catch(() => setEntityEmailOptions([]))
    } else {
      setEntityEmailOptions([])
    }
  }, [
    to,
    initialBody,
    initialSubject,
    open,
    propertyListId,
    replyContext?.messageId,
    replyContext?.threadId,
    forwardContext?.messageId,
  ])

  function startUpload(chipId: string, file: File) {
    void clientEmailAttachmentUpload(file, (progress) => {
      setChips((prev) =>
        prev.map((c) => (c.id === chipId && c.status === "uploading" ? { ...c, progress } : c)),
      )
    }).then((result) => {
      setChips((prev) =>
        prev.map((c) => {
          if (c.id !== chipId) return c
          if ("driveFileId" in result) {
            return { id: chipId, status: "ready" as const, file, driveFileId: result.driveFileId }
          }
          return { id: chipId, status: "error" as const, file, errorMessage: result.error }
        }),
      )
    })
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return

    const newChips = files.map((file) => ({
      id: crypto.randomUUID(),
      status: "uploading" as const,
      file,
      progress: 0,
    }))

    setChips((prev) => [...prev, ...newChips])
    clearSuccessStatus()

    for (const chip of newChips) {
      startUpload(chip.id, chip.file)
    }

    event.target.value = ""
  }

  function removeChip(id: string) {
    setChips((prev) => prev.filter((c) => c.id !== id))
  }

  function handleRetryChip(id: string) {
    const chip = chips.find((c) => c.id === id)
    if (!chip) return
    const chipWithFile = chip as Extract<AttachmentChipItem, { file: File }>
    setChips((prev) =>
      prev.map((c) =>
        c.id === id ? { id, status: "uploading" as const, file: chipWithFile.file, progress: 0 } : c,
      ),
    )
    startUpload(id, chipWithFile.file)
  }

  async function handleSend() {
    setSending(true)
    setStatus(null)

    const driveFileIds = chips
      .filter((c): c is Extract<AttachmentChipItem, { status: "ready" }> => c.status === "ready")
      .map((c) => c.driveFileId)

    const gmailChips = chips
      .filter((c): c is Extract<AttachmentChipItem, { status: "gmail" }> => c.status === "gmail")
      .map((c) => ({ attachmentId: c.attachmentId, messageId: c.messageId, filename: c.filename, mimeType: c.mimeType }))

    const resolvedForwardContext: ForwardContext | undefined = forwardContext
      ? { ...forwardContext, gmailChips }
      : undefined

    const result = await sendGmailCompose({
      to: joinChips(toChips) ?? "",
      subject,
      cc: joinChips(ccChips),
      bcc: joinChips(bccChips),
      replyContext,
      forwardContext: resolvedForwardContext,
      editorRef,
      editorHtml,
      driveFileIds,
      propertyListId,
    })

    setSending(false)

    if ("ok" in result) {
      onClose()
    } else {
      setStatus({ tone: "error", message: result.error })
    }
  }

  if (!open) return null

  const hasInvalidChips = hasInvalidEmailChips(toChips, ccChips, bccChips)

  const dialogContent = (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/20"
      data-testid="property-gmail-compose-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget && !sending) onClose()
      }}
    >
      <GmailComposeForm
        toChips={toChips}
        onToChipsChange={setToChips}
        entityEmailOptions={entityEmailOptions}
        subject={subject}
        onSubjectChange={(value) => {
          clearSuccessStatus()
          setSubject(value)
        }}
        ccChips={ccChips}
        bccChips={bccChips}
        showCcBcc={showCcBcc}
        onCcChipsChange={(c) => { clearSuccessStatus(); setCcChips(c) }}
        onBccChipsChange={(c) => { clearSuccessStatus(); setBccChips(c) }}
        onShowCcBcc={() => setShowCcBcc(true)}
        hasInvalidCcBcc={hasInvalidChips}
        replyContext={replyContext}
        forwardContext={forwardContext}
        sending={sending}
        editorHtml={editorHtml}
        editorRef={editorRef}
        onEditorChange={(html) => {
          clearSuccessStatus()
          setEditorHtml(html)
        }}
        activeUploadCount={activeUploadCount}
        onUploadCountChange={setActiveUploadCount}
        chips={chips}
        totalAttachmentBytes={totalAttachmentBytes}
        hasAnyUploading={hasAnyUploading}
        hasAnyError={hasAnyError}
        attachFileInputRef={attachFileInputRef}
        onFileInputChange={handleFileInputChange}
        onRemoveChip={removeChip}
        onRetryChip={handleRetryChip}
        status={status}
        onClose={onClose}
        onSend={() => void handleSend()}
        onClearSuccessStatus={clearSuccessStatus}
        signatures={signatures}
        selectedSignatureValue={selectedSignatureValue}
        includeSignature={includeSignature}
        loadingSignatures={loadingSignatures}
        displayedSelectedSignature={displayedSelectedSignature}
        selectedSignatureId={selectedSignatureId}
        signatureSelectionTouchedRef={signatureSelectionTouchedRef}
        setSelectedSignatureId={setSelectedSignatureId}
        setIncludeSignature={setIncludeSignature}
        setEditorHtml={setEditorHtml}
        emptyTo={toChips.length === 0}
      />
    </div>
  )

  return inline ? dialogContent : createPortal(dialogContent, document.body)
}
