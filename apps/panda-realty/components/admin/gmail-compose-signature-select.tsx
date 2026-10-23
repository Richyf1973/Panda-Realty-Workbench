"use client"

import { Checkbox } from "@repo/ui/checkbox"
import { Label } from "@repo/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select"

import {
  NO_SIGNATURE_VALUE,
  persistSelectedSignature,
  setRememberedExplicitSignatureId,
} from "./gmail-compose-session"
import {
  removeComposeSignatureHtml,
  upsertComposeSignatureHtml,
} from "./rich-email-editor-html"

export interface ComposeSignature {
  id: number
  name: string
  isDefault: boolean
  htmlContent?: string
  renderedHtml: string
}

interface GmailComposeSignatureSelectProps {
  signatures: ComposeSignature[]
  selectedSignatureValue: string
  includeSignature: boolean
  sending: boolean
  loadingSignatures: boolean
  displayedSelectedSignature: ComposeSignature | null
  selectedSignatureId: number | null
  signatureSelectionTouchedRef: React.MutableRefObject<boolean>
  setSelectedSignatureId: (id: number | null) => void
  setIncludeSignature: (include: boolean) => void
  setEditorHtml: (updater: (current: string) => string) => void
  onClearSuccessStatus: () => void
}

export function GmailComposeSignatureSelect({
  signatures,
  selectedSignatureValue,
  includeSignature,
  sending,
  loadingSignatures,
  displayedSelectedSignature,
  selectedSignatureId,
  signatureSelectionTouchedRef,
  setSelectedSignatureId,
  setIncludeSignature,
  setEditorHtml,
  onClearSuccessStatus,
}: GmailComposeSignatureSelectProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 md:flex-row md:items-center md:justify-between">
      <div className="inline-flex items-center gap-2">
        <Checkbox
          id="gmail-compose-include-signature"
          checked={includeSignature}
          onCheckedChange={(v) => {
            const checked = v === true
            onClearSuccessStatus()
            signatureSelectionTouchedRef.current = true
            setIncludeSignature(checked)

            if (!checked) {
              setEditorHtml((current) => removeComposeSignatureHtml(current))
              return
            }

            let nextSignature = displayedSelectedSignature
            let nextSelectedId = selectedSignatureId
            if (!nextSignature) {
              nextSignature = signatures.find((s) => s.isDefault) ?? signatures[0] ?? null
              nextSelectedId = nextSignature?.id ?? null
              setSelectedSignatureId(nextSelectedId)
              persistSelectedSignature(
                nextSelectedId == null ? NO_SIGNATURE_VALUE : String(nextSelectedId),
              )
            }

            if (nextSignature) {
              setEditorHtml((current) =>
                upsertComposeSignatureHtml(current, nextSignature.renderedHtml),
              )
            }
          }}
          disabled={sending || loadingSignatures || signatures.length === 0}
          data-testid="property-gmail-compose-include-signature"
        />
        <label
          htmlFor="gmail-compose-include-signature"
          className="text-sm font-medium"
        >
          Include signature
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Label className="shrink-0 text-sm font-medium">Signature</Label>
        <Select
          value={selectedSignatureValue}
          onValueChange={(value) => {
            onClearSuccessStatus()
            signatureSelectionTouchedRef.current = true
            const nextSelectedId = value === NO_SIGNATURE_VALUE ? null : Number(value)
            const nextSignature =
              value === NO_SIGNATURE_VALUE
                ? null
                : (signatures.find((s) => String(s.id) === value) ?? null)
            setRememberedExplicitSignatureId(
              Number.isFinite(nextSelectedId) ? nextSelectedId : null,
            )
            setSelectedSignatureId(Number.isFinite(nextSelectedId) ? nextSelectedId : null)
            persistSelectedSignature(value)
            if (includeSignature && nextSignature) {
              setEditorHtml((current) =>
                upsertComposeSignatureHtml(current, nextSignature.renderedHtml),
              )
            }
          }}
        >
          <SelectTrigger
            disabled={loadingSignatures || sending || signatures.length === 0}
            className="min-w-[240px]"
            data-testid="property-gmail-compose-signature-select"
          >
            {loadingSignatures ? (
              <span className="truncate">Loading signatures...</span>
            ) : (
              <SelectValue placeholder="No signatures saved" />
            )}
          </SelectTrigger>
          <SelectContent
            position="popper"
            align="end"
            sideOffset={4}
            className="w-(--radix-select-trigger-width)"
          >
            {signatures.length === 0 ? (
              <SelectItem value={NO_SIGNATURE_VALUE}>No signatures saved</SelectItem>
            ) : (
              signatures.map((signature) => (
                <SelectItem key={signature.id} value={String(signature.id)}>
                  {signature.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
