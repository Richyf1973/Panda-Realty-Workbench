"use client"

import { AlertCircle, CheckCircle2, Loader2, Send, X } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"

import type { EntityEmailItem } from "@/app/api/admin/properties/[id]/entity-emails/route"
import { GmailComposeToCombobox } from "./gmail-compose-to-combobox"

import {
  GmailComposeAttachmentList,
  MAX_ATTACHMENT_BYTES,
} from "./gmail-compose-attachment-list"
import { GmailComposeCcBcc } from "./gmail-compose-cc-bcc"
import type { AttachmentChipItem } from "./gmail-compose-dialog"
import {
  GmailComposeSignatureSelect,
  type ComposeSignature,
} from "./gmail-compose-signature-select"
import { RichEmailEditor, type RichEmailEditorHandle } from "./rich-email-editor"

export type ComposeStatus = {
  tone: "success" | "error"
  message: string
}

interface GmailComposeFormProps {
  toChips: string[]
  onToChipsChange: (chips: string[]) => void
  entityEmailOptions: EntityEmailItem[]
  subject: string
  onSubjectChange: (value: string) => void
  ccChips: string[]
  bccChips: string[]
  showCcBcc: boolean
  onCcChipsChange: (chips: string[]) => void
  onBccChipsChange: (chips: string[]) => void
  onShowCcBcc: () => void
  hasInvalidCcBcc: boolean
  replyContext?: { threadId: string; messageId: string }
  forwardContext?: { messageId: string }
  sending: boolean
  editorHtml: string
  editorRef: React.RefObject<RichEmailEditorHandle | null>
  onEditorChange: (html: string) => void
  activeUploadCount: number
  onUploadCountChange: (count: number) => void
  chips: AttachmentChipItem[]
  totalAttachmentBytes: number
  hasAnyUploading: boolean
  hasAnyError: boolean
  attachFileInputRef: React.RefObject<HTMLInputElement | null>
  onFileInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveChip: (id: string) => void
  onRetryChip: (id: string) => void
  status: ComposeStatus | null
  onClose: () => void
  onSend: () => void
  onClearSuccessStatus: () => void
  signatures: ComposeSignature[]
  selectedSignatureValue: string
  includeSignature: boolean
  loadingSignatures: boolean
  displayedSelectedSignature: ComposeSignature | null
  selectedSignatureId: number | null
  signatureSelectionTouchedRef: React.MutableRefObject<boolean>
  setSelectedSignatureId: (id: number | null) => void
  setIncludeSignature: (value: boolean) => void
  setEditorHtml: React.Dispatch<React.SetStateAction<string>>
  emptyTo: boolean
}

export function GmailComposeForm({
  toChips,
  onToChipsChange,
  entityEmailOptions,
  subject,
  onSubjectChange,
  ccChips,
  bccChips,
  showCcBcc,
  onCcChipsChange,
  onBccChipsChange,
  onShowCcBcc,
  hasInvalidCcBcc,
  replyContext,
  forwardContext,
  sending,
  editorHtml,
  editorRef,
  onEditorChange,
  activeUploadCount,
  onUploadCountChange,
  chips,
  totalAttachmentBytes,
  hasAnyUploading,
  hasAnyError,
  attachFileInputRef,
  onFileInputChange,
  onRemoveChip,
  onRetryChip,
  status,
  onClose,
  onSend,
  onClearSuccessStatus,
  signatures,
  selectedSignatureValue,
  includeSignature,
  loadingSignatures,
  displayedSelectedSignature,
  selectedSignatureId,
  signatureSelectionTouchedRef,
  setSelectedSignatureId,
  setIncludeSignature,
  setEditorHtml,
  emptyTo,
}: GmailComposeFormProps) {
  const attachmentSizeExceeded = totalAttachmentBytes > MAX_ATTACHMENT_BYTES

  return (
    <div
      className="relative mx-4 flex h-[min(56rem,calc(100%-1rem))] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-background text-sm shadow-xl ring-1 ring-foreground/10 md:mx-6"
      data-testid="property-gmail-compose-dialog"
    >
      <button
        type="button"
        className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        onClick={onClose}
        disabled={sending}
        aria-label="Close"
        data-testid="property-gmail-compose-cancel"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="border-b px-6 py-4">
        <h2 className="font-heading text-lg font-semibold">
          {replyContext ? "Reply" : forwardContext ? "Forward" : "New Message"}
        </h2>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">To</Label>
            <GmailComposeToCombobox
              chips={toChips}
              onChipsChange={(c) => { onClearSuccessStatus(); onToChipsChange(c) }}
              entityEmailOptions={entityEmailOptions}
              disabled={sending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compose-subject" className="text-sm font-medium">
              Subject
            </Label>
            <Input
              id="compose-subject"
              value={subject}
              onChange={(event) => onSubjectChange(event.target.value)}
              disabled={sending}
              data-testid="property-gmail-compose-subject"
            />
          </div>
        </div>

        <GmailComposeCcBcc
          ccChips={ccChips}
          bccChips={bccChips}
          showCcBcc={showCcBcc}
          onCcChipsChange={onCcChipsChange}
          onBccChipsChange={onBccChipsChange}
          onShowCcBcc={onShowCcBcc}
          disabled={sending}
          entityEmailOptions={entityEmailOptions.length > 0 ? entityEmailOptions : undefined}
        />

        <RichEmailEditor
          ref={editorRef}
          value={editorHtml}
          onChange={onEditorChange}
          disabled={sending}
          label="Message"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          editorClassName="min-h-[18rem] flex-1"
          onUploadCountChange={onUploadCountChange}
          hideImageUpload
          afterToolbar={
            <GmailComposeSignatureSelect
              signatures={signatures}
              selectedSignatureValue={selectedSignatureValue}
              includeSignature={includeSignature}
              sending={sending}
              loadingSignatures={loadingSignatures}
              displayedSelectedSignature={displayedSelectedSignature}
              selectedSignatureId={selectedSignatureId}
              signatureSelectionTouchedRef={signatureSelectionTouchedRef}
              setSelectedSignatureId={setSelectedSignatureId}
              setIncludeSignature={setIncludeSignature}
              setEditorHtml={setEditorHtml}
              onClearSuccessStatus={onClearSuccessStatus}
            />
          }
          testIds={{
            editor: "property-gmail-compose-editor",
            imageInput: "property-gmail-compose-image-input",
            imageUploadButton: "property-gmail-compose-image-upload",
            uploadOverlay: "property-gmail-compose-editor-upload-overlay",
            uploadError: "property-gmail-compose-upload-error",
            toolbarBold: "property-gmail-compose-toolbar-bold",
            toolbarItalic: "property-gmail-compose-toolbar-italic",
            toolbarUnderline: "property-gmail-compose-toolbar-underline",
            toolbarLink: "property-gmail-compose-toolbar-link",
            toolbarList: "property-gmail-compose-toolbar-list",
            toolbarAlignLeft: "property-gmail-compose-toolbar-align-left",
            toolbarAlignCenter: "property-gmail-compose-toolbar-align-center",
            toolbarAlignRight: "property-gmail-compose-toolbar-align-right",
            toolbarFontSize: "property-gmail-compose-font-size",
            toolbarHighlight: "property-gmail-compose-highlight",
            toolbarFontColor: "property-gmail-compose-font-color",
            toolbarFontFamily: "property-gmail-compose-font-family",
          }}
        />

        <GmailComposeAttachmentList
          chips={chips}
          totalAttachmentBytes={totalAttachmentBytes}
          attachmentSizeExceeded={attachmentSizeExceeded}
          sending={sending}
          attachFileInputRef={attachFileInputRef}
          onFileInputChange={onFileInputChange}
          onRemoveChip={onRemoveChip}
          onRetryChip={onRetryChip}
        />

        {status ? (
          <div
            className={
              status.tone === "success"
                ? "flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
                : "flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            }
            data-testid="property-gmail-compose-status"
          >
            {status.tone === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p
              data-testid={
                status.tone === "success"
                  ? "property-gmail-compose-status-success"
                  : "property-gmail-compose-error"
              }
            >
              {status.message}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t bg-muted/50 px-6 py-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onClose} disabled={sending}>
          {status?.tone === "success" ? "Close" : "Cancel"}
        </Button>
        <Button
          type="button"
          onClick={onSend}
          disabled={
            sending ||
            emptyTo ||
            activeUploadCount > 0 ||
            hasAnyUploading ||
            hasAnyError ||
            attachmentSizeExceeded ||
            hasInvalidCcBcc ||
            status?.tone === "success"
          }
          data-testid="property-gmail-compose-send"
        >
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
