"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/dialog"
import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/select"
import { Textarea } from "@repo/ui/textarea"

import { addMeetingAction } from "./add-meeting-action"
import {
  DEFAULT_REMINDERS,
  remindersToRows,
  ReminderRows,
  rowsToReminders,
  type ReminderRow,
} from "@/components/admin/meeting-reminder-rows"
import type { PropertyDetailBuyer } from "./property-types"
import { prepareSnappedTimeForSubmit } from "@/lib/meeting-scheduled-at"
import { snapDurationMinutes } from "@/lib/meeting-time-utils"
import type { MeetingReminder } from "@/lib/reminder-types"

import { QuarterHourTimeSelect } from "@/components/admin/quarter-hour-time-select"

export function AddMeetingDialog({
  open,
  onOpenChange,
  propertyListId,
  buyers,
  onAdded,
  onSyncError,
  defaultTitle,
  initialReminders,
  defaultBuyerId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyListId: number
  buyers: PropertyDetailBuyer[]
  onAdded: () => void
  onSyncError?: (msg: string) => void
  defaultTitle?: string
  initialReminders?: MeetingReminder[]
  defaultBuyerId?: number
}) {
  const defaultReminders = initialReminders ? remindersToRows(initialReminders) : DEFAULT_REMINDERS
  const [title, setTitle] = useState(defaultTitle ?? "")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [duration, setDuration] = useState("60")
  const [notes, setNotes] = useState("")
  const [selectedBuyer, setSelectedBuyer] = useState<string>(
    defaultBuyerId != null ? String(defaultBuyerId) : "none",
  )
  const [reminders, setReminders] = useState<ReminderRow[]>(defaultReminders)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset(defaults?: { title?: string; buyerId?: number; reminders?: ReminderRow[] }) {
    const nextTitle = defaults?.title ?? defaultTitle
    const nextBuyerId = defaults?.buyerId ?? defaultBuyerId
    const nextReminders = defaults?.reminders ?? defaultReminders
    setTitle(nextTitle ?? "")
    setDate("")
    setTime("")
    setDuration("60")
    setNotes("")
    setSelectedBuyer(nextBuyerId != null ? String(nextBuyerId) : "none")
    setReminders(nextReminders)
    setError(null)
  }

  useEffect(() => {
    if (!open) return
    reset({
      title: defaultTitle,
      buyerId: defaultBuyerId,
      reminders: defaultReminders,
    })
  }, [open, defaultBuyerId, defaultReminders, defaultTitle])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    if (!time.trim()) {
      setSaving(false)
      setError("Time is required.")
      return
    }

    let scheduledTime = time
    if (date) {
      const prep = prepareSnappedTimeForSubmit(time)
      if (!prep.ok) {
        setSaving(false)
        setError(prep.error)
        return
      }
      if (prep.snapped !== time) setTime(prep.snapped)
      scheduledTime = prep.snapped
    }

    const propertyEntityId = selectedBuyer !== "none" ? Number(selectedBuyer) : null

    let durationMinutes: number | null = null
    if (duration.trim() !== "") {
      durationMinutes = snapDurationMinutes(Number(duration))
      if (String(durationMinutes) !== duration.trim()) {
        setDuration(String(durationMinutes))
      }
    }

    const result = await addMeetingAction({
      propertyListId,
      propertyEntityId,
      title,
      scheduledDate: date,
      scheduledTime,
      durationMinutes,
      notes: notes || null,
      reminders: rowsToReminders(reminders),
    })

    setSaving(false)

    if (!result.success) {
      setError(result.error)
      return
    }

    if (result.calendarSync === "not_connected") {
      onSyncError?.("Meeting saved. Google Calendar is not connected — connect Google from Settings.")
    } else if (result.calendarSync === "failed") {
      onSyncError?.("Meeting saved, but calendar sync failed. Use Retry on the meeting card.")
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
      <DialogContent data-testid="add-meeting-dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Meeting</DialogTitle>
        </DialogHeader>
        <form noValidate onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="meeting-title">Title</Label>
            <Input
              id="meeting-title"
              data-testid="meeting-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Property walkthrough"
              required
            />
          </div>

          {buyers.length > 0 && (
            <div className="space-y-1.5">
              <Label>Buyer (optional)</Label>
              <Select value={selectedBuyer} onValueChange={setSelectedBuyer}>
                <SelectTrigger data-testid="meeting-buyer-select">
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
              <Label htmlFor="meeting-date">Date</Label>
              <Input
                id="meeting-date"
                data-testid="meeting-date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault() }}
                required
              />
            </div>
            <QuarterHourTimeSelect
              label="Time"
              labelId="meeting-time"
              value={time}
              onChange={setTime}
              optional={false}
              rootTestId="meeting-time-input"
              hourSelectTestId="meeting-time-hour-select"
              minuteSelectTestId="meeting-time-minute-select"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="meeting-duration">Duration (minutes)</Label>
            <Input
              id="meeting-duration"
              data-testid="meeting-duration-input"
              type="number"
              min={15}
              step={15}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="60"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="meeting-notes">Notes (optional)</Label>
            <Textarea
              id="meeting-notes"
              data-testid="meeting-notes-input"
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
            <p data-testid="meeting-form-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button data-testid="meeting-submit-btn" type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : null}
              Add Meeting
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
