"use client"

import { CheckCircle2, Loader2, XCircle } from "lucide-react"

import { Button } from "@repo/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog"
import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"
import { Textarea } from "@repo/ui/textarea"

import { ReminderRows } from "./meeting-reminder-rows"
import { QuarterHourTimeSelect } from "./quarter-hour-time-select"
import { useCalendarEventForm } from "./use-add-calendar-event-form"

interface AddCalendarEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  initialTitle?: string
  propertySubtitle?: string
}

export function AddCalendarEventDialog({
  open,
  onOpenChange,
  onSuccess,
  initialTitle,
  propertySubtitle,
}: AddCalendarEventDialogProps) {
  const {
    ids: { titleId, dateId, notesId },
    fields: { title, date, time, durationMinutes, notes, reminders },
    setters: { setTitle, setDate, setTime, setDurationMinutes, setNotes, setReminders },
    submitState,
    errorMessage,
    isSubmitting,
    isSuccess,
    handleSubmit,
    handleOpenChange,
  } = useCalendarEventForm({ open, initialTitle, onSuccess, onOpenChange })

  const disabled = isSubmitting || isSuccess

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md flex flex-col gap-0 p-0"
        data-testid="add-calendar-event-dialog"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle>Add Calendar Event</DialogTitle>
          {propertySubtitle && (
            <p
              className="text-sm text-muted-foreground mt-0.5"
              data-testid="add-calendar-event-property-subtitle"
            >
              {propertySubtitle}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="px-6 py-5 flex flex-col gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor={titleId}>
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id={titleId}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoComplete="off"
                disabled={disabled}
                data-testid="add-calendar-event-title"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 items-start">
              <div className="grid gap-1.5">
                <Label htmlFor={dateId}>
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={dateId}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault() }}
                  required
                  disabled={disabled}
                  data-testid="add-calendar-event-date"
                />
              </div>
              <QuarterHourTimeSelect
                label="Time *"
                labelId="add-calendar-event-time"
                value={time}
                onChange={setTime}
                optional={false}
                rootTestId="add-calendar-event-time-input"
                hourSelectTestId="add-calendar-event-time-hour-select"
                minuteSelectTestId="add-calendar-event-time-minute-select"
                className={disabled ? "opacity-50 pointer-events-none" : undefined}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="add-calendar-event-duration-field">Duration (minutes)</Label>
              <Input
                id="add-calendar-event-duration-field"
                type="number"
                min={15}
                step={15}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                disabled={disabled}
                data-testid="add-calendar-event-duration"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={notesId}>Notes (optional)</Label>
              <Textarea
                id={notesId}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                disabled={disabled}
                data-testid="add-calendar-event-notes"
              />
            </div>

            <div className="grid gap-1.5">
              <ReminderRows rows={reminders} onChange={setReminders} />
            </div>

            {isSuccess && (
              <p
                className="flex items-center gap-1.5 text-sm text-green-600"
                data-testid="add-calendar-event-success"
              >
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                Event created — close the dialog when done.
              </p>
            )}

            {submitState === "error" && errorMessage && (
              <p
                className="flex items-center gap-1.5 text-sm text-destructive"
                data-testid="add-calendar-event-error"
              >
                <XCircle className="size-4 shrink-0" aria-hidden />
                {errorMessage}
              </p>
            )}
          </div>

          <DialogFooter className="mx-0 mb-0 px-6 py-4 border-t border-border bg-transparent flex-row justify-between sm:justify-between gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={disabled}
              data-testid="add-calendar-event-submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin shrink-0" aria-hidden />
                  Adding…
                </>
              ) : (
                "Add Event"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
