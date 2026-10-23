"use client"

import { Loader2, Send, X } from "lucide-react"

import { Button } from "@repo/ui/button"

import { formatAUD, formatDateStr } from "@/app/admin/properties/board/panel-shared"

import { usePropertyFormSendLink } from "./use-property-form-send-link"
import type { PropertyFormRow } from "./use-forms-tab"

interface PropertyFormSendLinkDialogProps {
  open: boolean
  form: PropertyFormRow | null
  propertyListId: number
  onClose: () => void
  onSent: () => void
}

export function PropertyFormSendLinkDialog({
  open,
  form,
  propertyListId,
  onClose,
  onSent,
}: PropertyFormSendLinkDialogProps) {
  const { buyers, loadingBuyers, buyerOffers, selections, selectOffer, isReady, sending, error, submit } =
    usePropertyFormSendLink({
      propertyListId,
      propertyFormId: form?.propertyFormId ?? 0,
      onSent,
    })

  if (!open) return null

  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-black/20"
      onClick={(e) => { if (e.target === e.currentTarget && !sending) onClose() }}
      onKeyDown={(e) => { if (e.key === "Escape" && !sending) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-link-title"
        className="relative mx-4 flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-background text-sm ring-1 ring-foreground/10"
        data-testid="property-form-send-link-dialog"
      >
        <button
          type="button"
          className="absolute right-2 top-2 z-10 rounded-md p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          onClick={onClose}
          disabled={sending}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col gap-1 px-4 pb-3 pt-4">
          <h2 id="send-link-title" className="font-heading text-base font-medium leading-none">Send Form Link</h2>
          {form && <p className="text-sm text-muted-foreground">{form.formName}</p>}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-3">
          <p className="mb-3 text-xs text-muted-foreground">
            Select the offer to pre-fill in each buyer&apos;s form link.
          </p>

          {loadingBuyers ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading buyers…
            </div>
          ) : buyers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No buyers attached to this property.</p>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto">
              {buyers.map((buyer) => {
                const hasEmail = Boolean(buyer.emailAddress)
                const offers = buyerOffers.get(buyer.entityId) ?? []
                const selection = selections.get(buyer.entityId)

                return (
                  <div
                    key={buyer.entityId}
                    data-testid={`send-link-buyer--${buyer.entityId}`}
                    className={`rounded-lg border border-border px-3 py-2 ${!hasEmail ? "opacity-50" : ""}`}
                  >
                    <p className="text-sm font-medium">{buyer.entityName ?? "Unknown"}</p>
                    {!hasEmail ? (
                      <p className="text-xs text-muted-foreground">No email on file</p>
                    ) : (
                      <div className="mt-1.5 flex flex-col gap-1">
                        {offers.map((offer) => (
                          <label
                            key={offer.buyerOfferId}
                            data-testid={`send-link-offer--${offer.buyerOfferId}`}
                            className="flex cursor-pointer items-center gap-2 text-xs"
                          >
                            <input
                              type="radio"
                              name={`offer-${buyer.entityId}`}
                              checked={selection === offer.buyerOfferId}
                              onChange={() => selectOffer(buyer.entityId, offer.buyerOfferId)}
                              disabled={sending}
                              className="size-3"
                            />
                            <span>
                              {formatAUD(offer.offer) ?? offer.offer}
                              {offer.dateOffered ? ` — ${formatDateStr(offer.dateOffered)}` : ""}
                            </span>
                          </label>
                        ))}
                        <label
                          data-testid={`send-link-no-offer--${buyer.entityId}`}
                          className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"
                        >
                          <input
                            type="radio"
                            name={`offer-${buyer.entityId}`}
                            checked={selection === "none"}
                            onChange={() => selectOffer(buyer.entityId, "none")}
                            disabled={sending}
                            className="size-3"
                          />
                          No specific offer
                        </label>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm text-destructive" data-testid="send-link-error">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 rounded-b-xl border-t bg-muted/50 px-4 py-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={!isReady || sending || loadingBuyers}
            data-testid="send-link-submit"
          >
            {sending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
            ) : (
              <><Send className="mr-2 h-4 w-4" /> Send</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
