"use client"

import { useCallback, useState } from "react"
import { Loader2, X } from "lucide-react"

import { Button } from "@repo/ui/button"

import {
  PREFILL_STRATEGY_CONTRACT_SALE_PURCHASE,
  PREFILL_STRATEGY_FORM6,
} from "@/lib/admin/constants"
import { Form6FillStep } from "./form6-fill-step"
import { ContractSpFillStep } from "./contract-sp-fill-step"
import type { FormSendRow } from "./use-forms-tab"

interface Props {
  row: FormSendRow
  saving: boolean
  error: string | null
  onClose: () => void
  onSubmit: (values: Record<string, string>) => void
}

export function PropertyFormHistoryEditDialog({ row, saving, error, onClose, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, string>>(
    (row.prefillValues as Record<string, string>) ?? {},
  )

  const handleValuesChange = useCallback((v: Record<string, string>) => setValues(v), [])

  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-black/20"
      data-testid="property-forms-history-edit-dialog"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose() }}
      onKeyDown={(e) => { if (e.key === "Escape" && !saving) onClose() }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="history-edit-dialog-title" className="relative flex w-[calc(100%-2rem)] h-[calc(100%-2rem)] flex-col rounded-xl bg-background text-sm ring-1 ring-foreground/10 overflow-hidden">
        <button
          type="button"
          className="absolute top-2 right-2 rounded-md p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground z-10"
          onClick={onClose}
          disabled={saving}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col gap-1 px-4 pt-4 pb-3 shrink-0">
          <h2 id="history-edit-dialog-title" className="font-heading text-base font-medium leading-none">Edit Form Entry</h2>
          <p className="text-sm text-muted-foreground">{row.formName}</p>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {row.prefillStrategy === PREFILL_STRATEGY_FORM6 ? (
            <Form6FillStep
              prefillValues={values}
              agents={[]}
              selectedAgentId={null}
              onAgentChange={() => undefined}
              onValuesChange={handleValuesChange}
            />
          ) : row.prefillStrategy === PREFILL_STRATEGY_CONTRACT_SALE_PURCHASE ? (
            <ContractSpFillStep
              prefillValues={values}
              agents={[]}
              selectedAgentId={null}
              onAgentChange={() => undefined}
              onValuesChange={handleValuesChange}
            />
          ) : null}
        </div>

        {error && (
          <p
            className="px-4 pb-2 text-sm text-destructive"
            data-testid="property-forms-history-edit-error"
          >
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 rounded-b-xl border-t bg-muted/50 px-4 py-3 shrink-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit(values)}
            disabled={saving}
            data-testid="property-forms-history-edit-submit"
          >
            {saving ? (
              <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              "Save & Re-generate"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
