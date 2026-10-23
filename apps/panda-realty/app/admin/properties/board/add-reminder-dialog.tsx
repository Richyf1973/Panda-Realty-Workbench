"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/dialog"
import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select"
import { Textarea } from "@repo/ui/textarea"

import { prepareSnappedTimeForSubmit } from "@/lib/meeting-scheduled-at"

import { addReminderAction } from "./add-meeting-action"
import {
  DEFAULT_REMINDERS,
  ReminderRows,
  rowsToReminders,
  type ReminderRow,
} from "@/components/admin/meeting-reminder-rows"
import type { PropertyDetailBuyer } from "./property-types"
import { QuarterHourTimeSelect } from "@/components/admin/quarter-hour-time-select"

export function AddReminderDialog({
  open,
  onOpenChange,
  propertyListId,
  buyers,
  onAdded,
  defaultBuyerId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyListId: number
  buyers: PropertyDetailBuyer[]
  onAdded: () => void
  /** Pre-select buyer junction when there is a single obvious link (e.g. Edit Buyer dialog). */
  defaultBuyerId?: number
}) {
  const [title, setTitle] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [notes, setNotes] = useState("")
  const [selectedBuyer, setSelectedBuyer] = useState<string>(
    defaultBuyerId != null ? String(defaultBuyerId) : "none",
  )
  const [reminders, setReminders] = useState<ReminderRow[]>(DEFAULT_REMINDERS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setTitle("")
    setDate("")
    setTime("")
    setNotes("")
    setSelectedBuyer(defaultBuyerId != null ? String(defaultBuyerId) : "none")
    setReminders(DEFAULT_REMINDERS)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    if (!title.trim()) {
      setError("Title is required")
      setSaving(false)
      return
    }

    let scheduledTime: string | null = time.trim() === "" ? null : time
    if (scheduledTime) {
      const prep = prepareSnappedTimeForSubmit(scheduledTime)
      if (!prep.ok) {
        setSaving(false)
        setError(prep.error)
        return
      }
      if (prep.snapped !== scheduledTime) setTime(prep.snapped)
      scheduledTime = prep.snapped
    }

    const propertyEntityId = selectedBuyer !== "none" ? Number(selectedBuyer) : null

    const result = await addReminderAction({
      propertyListId,
      propertyEntityId,
      title,
      scheduledDate: date,
      scheduledTime,
      notes: notes || null,
      reminders: rowsToReminders(reminders),
    })

    setSaving(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    reset()
    onOpenChange(false)
    onAdded()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset()
        onOpenChange(o)
      }}
    >
      <DialogContent data-testid="add-reminder-dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Reminder</DialogTitle>
        </DialogHeader>
        <form noValidate onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reminder-title">Title</Label>
            <Input
              id="reminder-title"
              data-testid="reminder-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Follow up call"
              required
            />
          </div>

          {buyers.length > 0 && (
            <div className="space-y-1.5">
              <Label>Buyer (optional)</Label>
              <Select value={selectedBuyer} onValueChange={setSelectedBuyer}>
                <SelectTrigger data-testid="reminder-buyer-select">
                  <SelectValue placeholder="Select buyer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {buyers.map((b) => (
                    <SelectItem key={b.propertyEntityId} value={String(b.propertyEntityId)}>
                      {b.entityName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="reminder-date">Date</Label>
              <Input
                id="reminder-date"
                data-testid="reminder-date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault() }}
                required
              />
            </div>
            <QuarterHourTimeSelect
              label="Time (optional)"
              labelId="reminder-time"
              value={time}
              onChange={setTime}
              optional
              rootTestId="reminder-time-input"
              hourSelectTestId="reminder-time-hour-select"
              minuteSelectTestId="reminder-time-minute-select"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reminder-notes">Notes (optional)</Label>
            <Textarea
              id="reminder-notes"
              data-testid="reminder-notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any additional details…"
            />
          </div>

          <div className="space-y-1.5">
            <ReminderRows rows={reminders} onChange={setReminders} />
          </div>

          {error && (
            <p data-testid="reminder-form-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button data-testid="reminder-submit-btn" type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : null}
              Add Reminder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
