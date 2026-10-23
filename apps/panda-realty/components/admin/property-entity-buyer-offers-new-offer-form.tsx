"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Calendar } from "@repo/ui/calendar"
import { Checkbox } from "@repo/ui/checkbox"
import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui/popover"

import { formatDateStr } from "@/app/admin/properties/board/panel-shared"

export function PropertyEntityBuyerOffersNewOfferForm({
  propertyEntityId,
  onAdded,
}: {
  propertyEntityId: number
  onAdded: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState("")
  const [dateOffered, setDateOffered] = useState(() => new Date().toISOString().slice(0, 10))
  const [isAccepted, setIsAccepted] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleAddOffer() {
    if (!amount.trim() || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch("/api/admin/buyer-offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyEntityId, offer: amount.trim(), dateOffered, isAccepted }),
      })
      if (res.ok) {
        setAmount("")
        setDateOffered(new Date().toISOString().slice(0, 10))
        setIsAccepted(false)
        setShowForm(false)
        onAdded()
      } else {
        const json = await res.json().catch(() => ({})) as { error?: string }
        setSubmitError(json.error ?? "Failed to add offer")
      }
    } catch {
      setSubmitError("Failed to add offer")
    }
    setSubmitting(false)
  }

  return (
    <>
      <div className="flex justify-end">
        <Button
          type="button"
          data-testid="offers-tab-toggle-btn"
          variant="ghost"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm
            ? <><X className="size-3.5 mr-1" />Cancel</>
            : <><Plus className="size-3.5 mr-1" />New Offer</>}
        </Button>
      </div>

      {showForm && (
        <div data-testid="offers-tab-form" className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Amount</Label>
            <Input
              data-testid="offers-tab-amount-input"
              type="text"
              placeholder="e.g. 750000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Date Offered</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  data-testid="offers-tab-date-btn"
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-sm font-normal"
                >
                  {formatDateStr(dateOffered)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateOffered ? new Date(dateOffered + "T00:00:00") : undefined}
                  onSelect={(d) => {
                    if (d) setDateOffered(d.toISOString().slice(0, 10))
                    setCalendarOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="offer-is-accepted"
              data-testid="offers-tab-accepted-checkbox"
              checked={isAccepted}
              onCheckedChange={(v) => setIsAccepted(!!v)}
            />
            <Label htmlFor="offer-is-accepted" className="text-sm font-normal cursor-pointer">
              Accepted
            </Label>
          </div>
          <div className="flex items-center justify-between">
            {submitError
              ? <p data-testid="offers-tab-error" className="text-xs text-destructive">{submitError}</p>
              : <span />}
            <Button
              data-testid="offers-tab-submit-btn"
              size="sm"
              onClick={() => void handleAddOffer()}
              disabled={submitting || !amount.trim()}
            >
              {submitting ? "Adding…" : "Add Offer"}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
