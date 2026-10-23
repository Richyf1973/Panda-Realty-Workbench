"use client"

import type { EntityEmailItem } from "@/app/api/admin/properties/[id]/entity-emails/route"

import { ChipInput } from "./chip-input"

export interface CcBccState {
  ccChips: string[]
  bccChips: string[]
  showCcBcc: boolean
}

interface GmailComposeCcBccProps {
  ccChips: string[]
  bccChips: string[]
  showCcBcc: boolean
  onCcChipsChange: (chips: string[]) => void
  onBccChipsChange: (chips: string[]) => void
  onShowCcBcc: () => void
  disabled?: boolean
  entityEmailOptions?: EntityEmailItem[]
}

export function GmailComposeCcBcc({
  ccChips,
  bccChips,
  showCcBcc,
  onCcChipsChange,
  onBccChipsChange,
  onShowCcBcc,
  disabled,
  entityEmailOptions,
}: GmailComposeCcBccProps) {
  if (!showCcBcc) {
    return (
      <button
        type="button"
        onClick={onShowCcBcc}
        disabled={disabled}
        className="self-start text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        data-testid="property-gmail-compose-cc-bcc-toggle"
      >
        + Add CC/BCC
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <ChipInput
        label="CC"
        chips={ccChips}
        onChipsChange={onCcChipsChange}
        disabled={disabled}
        inputTestId="property-gmail-compose-cc-text-input"
        chipTestId="property-gmail-compose-cc-chip"
        fieldTestId="property-gmail-compose-cc-field"
        entityEmailOptions={entityEmailOptions}
        autocompleteTestIdPrefix={entityEmailOptions ? "property-gmail-compose-cc" : undefined}
      />
      <ChipInput
        label="BCC"
        chips={bccChips}
        onChipsChange={onBccChipsChange}
        disabled={disabled}
        inputTestId="property-gmail-compose-bcc-text-input"
        chipTestId="property-gmail-compose-bcc-chip"
        fieldTestId="property-gmail-compose-bcc-field"
        entityEmailOptions={entityEmailOptions}
        autocompleteTestIdPrefix={entityEmailOptions ? "property-gmail-compose-bcc" : undefined}
      />
    </div>
  )
}
