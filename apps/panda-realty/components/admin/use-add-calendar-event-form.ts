"use client"

import { useEffect, useId, useState } from "react"

import {
  DEFAULT_REMINDERS,
  rowsToReminders,
  type ReminderRow,
} from "@/components/admin/meeting-reminder-rows"
import { prepareSnappedTimeForSubmit } from "@/lib/meeting-scheduled-at"

type SubmitState = "idle" | "submitting" | "success" | "error"

interface UseCalendarEventFormOptions {
  open: boolean
  initialTitle?: string
  onSuccess: () => void
  onOpenChange: (open: boolean) => void
}

export function useCalendarEventForm({
  open,
  initialTitle,
  onSuccess,
  onOpenChange,
}: UseCalendarEventFormOptions) {
  const titleId = useId()
  const dateId = useId()
  const notesId = useId()

  const [title, setTitle] = useState(initialTitle ?? "")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [durationMinutes, setDurationMinutes] = useState("60")
  const [notes, setNotes] = useState("")
  const [reminders, setReminders] = useState<ReminderRow[]>(DEFAULT_REMINDERS)
  const [submitState, setSubmitState] = useState<SubmitState>("idle")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    if (open) setTitle(initialTitle ?? "")
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function resetForm() {
    setTitle("")
    setDate("")
    setTime("")
    setDurationMinutes("60")
    setNotes("")
    setReminders(DEFAULT_REMINDERS)
    setSubmitState("idle")
    setErrorMessage("")
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm()
    onOpenChange(nextOpen)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitState === "submitting") return

    if (!time.trim()) {
      setErrorMessage("Time is required.")
      setSubmitState("error")
      return
    }

    setSubmitState("submitting")
    setErrorMessage("")

    const prep = prepareSnappedTimeForSubmit(time)
    if (!prep.ok) {
      setErrorMessage(prep.error)
      setSubmitState("error")
      return
    }
    if (prep.snapped !== time) setTime(prep.snapped)

    try {
      const res = await fetch("/api/admin/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          date,
          startTime: prep.snapped,
          durationMinutes: Number(durationMinutes) || 60,
          notes: notes.trim() || undefined,
          reminders: rowsToReminders(reminders),
        }),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? `Request failed (${res.status})`)
      }

      setSubmitState("success")
      onSuccess()
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to create event")
      setSubmitState("error")
    }
  }

  return {
    ids: { titleId, dateId, notesId },
    fields: { title, date, time, durationMinutes, notes, reminders },
    setters: { setTitle, setDate, setTime, setDurationMinutes, setNotes, setReminders },
    submitState,
    errorMessage,
    isSubmitting: submitState === "submitting",
    isSuccess: submitState === "success",
    handleSubmit,
    handleOpenChange,
  }
}
