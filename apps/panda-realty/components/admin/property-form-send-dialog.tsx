"use client"

import { ArrowLeft, ArrowRight, HardDriveUpload, Loader2, Save, Send, X } from "lucide-react"

import { Button } from "@repo/ui/button"

import { PREFILL_STRATEGY_CONTRACT_SALE_PURCHASE, hasPrefillFillStep } from "@/lib/admin/constants"
import { usePropertyFormSend } from "./use-property-form-send"
import { PropertyFormPrefillStep } from "./property-form-prefill-step"
import { PropertyFormSendStep } from "./property-form-send-step"
import type { PropertyFormRow } from "./use-forms-tab"

interface PropertyFormSendDialogProps {
  open: boolean
  form: PropertyFormRow | null
  propertyListId: number
  propertyAddress?: string
  onClose: () => void
  onSent: () => void
}

export function PropertyFormSendDialog(props: PropertyFormSendDialogProps) {
  const { open, form, onClose } = props
  const isContractSp = form?.prefillStrategy === PREFILL_STRATEGY_CONTRACT_SALE_PURCHASE
  const hasFillStep = hasPrefillFillStep(form?.prefillStrategy)

  const {
    hasPrefill,
    step,
    setStep,
    prefillValues,
    setPrefill,
    setAllPrefillValues,
    loadingPrefill,
    agents,
    selectedAgentId,
    handleAgentChange,
    recipients,
    loadingRecipients,
    selected,
    toggleEntity,
    message,
    setMessage,
    sending,
    savingToDrive,
    driveLink,
    setDriveLink,
    error,
    handleSend,
    handleSaveToDrive,
    handleSaveTemplate,
    savingTemplate,
    saveTemplateError,
  } = usePropertyFormSend(props)

  if (!open) return null

  return (
    // Inline overlay — avoids Radix portal/inert issue with nested dialogs
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-black/20"
      onClick={(e) => { if (e.target === e.currentTarget && !sending) onClose() }}
      onKeyDown={(e) => { if (e.key === "Escape" && !sending) onClose() }}
    >
      <div
        className={`relative flex flex-col rounded-xl bg-background text-sm ring-1 ring-foreground/10 overflow-hidden ${
          hasFillStep && step === "prefill"
            ? "w-[calc(100%-2rem)] h-[calc(100%-2rem)]"
            : "mx-4 w-full max-w-2xl max-h-[min(90vh,calc(100%-2rem))]"
        }`}
        data-testid="property-form-send-dialog"
      >
        <button
          type="button"
          className="absolute top-2 right-2 rounded-md p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground z-10"
          onClick={onClose}
          disabled={sending}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col gap-1 px-4 pt-4 pb-3 shrink-0">
          <h2 className="font-heading text-base font-medium leading-none">Send Form</h2>
          {form && <p className="text-sm text-muted-foreground">{form.formName}</p>}
          {hasPrefill && (
            <p className="text-xs text-muted-foreground">
              {step === "prefill" ? "Step 1 of 2" : "Step 2 of 2"}
            </p>
          )}
        </div>

        <div className={`flex-1 min-h-0 overflow-hidden ${hasFillStep && step === "prefill" ? "" : "overflow-y-auto px-4 pb-3"}`}>
          {step === "prefill" && (
            <PropertyFormPrefillStep
              prefillValues={prefillValues}
              setPrefill={setPrefill}
              onValuesChange={setAllPrefillValues}
              loadingPrefill={loadingPrefill}
              prefillStrategy={form?.prefillStrategy ?? null}
              agents={agents}
              selectedAgentId={selectedAgentId}
              onAgentChange={handleAgentChange}
            />
          )}

          {step === "send" && (
            <PropertyFormSendStep
              hasPrefill={hasPrefill}
              loadingRecipients={loadingRecipients}
              recipients={recipients}
              selected={selected}
              toggleEntity={toggleEntity}
              message={message}
              setMessage={setMessage}
              sending={sending}
              savingToDrive={savingToDrive}
              driveLink={driveLink}
              error={error}
            />
          )}
        </div>

        <div className="flex items-center gap-2 rounded-b-xl border-t bg-muted/50 px-4 py-3 shrink-0">
          {step === "send" && hasPrefill ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => { setStep("prefill"); setDriveLink(null) }}
              data-testid="property-form-send-back"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
          ) : null}

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {step === "prefill" ? (
              <>
                <Button type="button" variant="outline" onClick={onClose} data-testid="property-form-send-cancel">
                  Cancel
                </Button>
                {hasFillStep && (
                  <div className="flex flex-col items-end gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleSaveTemplate()}
                      disabled={savingTemplate}
                      data-testid={isContractSp ? "contract-sp-save-template-btn" : "form6-save-template-btn"}
                    >
                      {savingTemplate ? (
                        <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…</>
                      ) : (
                        <><Save className="mr-1.5 h-4 w-4" /> Save as Template</>
                      )}
                    </Button>
                    {saveTemplateError && (
                      <span className="text-xs text-destructive" data-testid="form6-save-template-error">
                        {saveTemplateError}
                      </span>
                    )}
                  </div>
                )}
                <Button type="button" onClick={() => setStep("send")} disabled={loadingPrefill} data-testid="property-form-prefill-next">
                  <ArrowRight className="mr-1.5 h-4 w-4" />
                  Next
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={onClose} disabled={sending || savingToDrive} data-testid="property-form-send-cancel">
                  Cancel
                </Button>
                {hasPrefill && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleSaveToDrive()}
                    disabled={savingToDrive || sending}
                    data-testid="property-form-send-save-to-drive"
                  >
                    {savingToDrive ? (
                      <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…</>
                    ) : (
                      <><HardDriveUpload className="mr-1.5 h-4 w-4" /> Save to Drive</>
                    )}
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={selected.size === 0 || sending || savingToDrive || loadingRecipients}
                  data-testid="property-form-send-submit"
                >
                  {sending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
                  ) : selected.size > 0 ? (
                    <><Send className="mr-2 h-4 w-4" /> Send to {selected.size} recipient{selected.size !== 1 ? "s" : ""}</>
                  ) : (
                    <><Send className="mr-2 h-4 w-4" /> Send to recipients</>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
