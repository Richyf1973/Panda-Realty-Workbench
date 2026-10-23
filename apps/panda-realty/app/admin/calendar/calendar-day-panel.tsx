"use client"

import { format, startOfDay } from "date-fns"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@repo/ui/sheet"

import { CONDITION_CALENDAR_EVENT_STYLE } from "../properties/board/compute-condition-events"
import { getGoogleEventStyle, type CalendarEventRow } from "./calendar-event-builders"

export const AGENT_TASK_COLOR = "#d97706"

function toDate(v: Date | string | undefined): Date | null {
  if (!v) return null
  return v instanceof Date ? v : new Date(v)
}

export function getDotColor(event: CalendarEventRow): string {
  if (event.source === "agent-task") return AGENT_TASK_COLOR
  if (event.source === "google")
    return (getGoogleEventStyle(event.colorId).backgroundColor as string) ?? "#2563eb"
  return CONDITION_CALENDAR_EVENT_STYLE.backgroundColor
}

export function getTypeLabel(event: CalendarEventRow): string {
  if (event.source === "agent-task") return "Agent Task"
  if (event.source === "google") return "Google Calendar"
  return "Condition Milestone"
}

export function filterEventsForDay(events: CalendarEventRow[], day: Date): CalendarEventRow[] {
  const dayStart = startOfDay(day).getTime()
  return events.filter((e) => {
    const d = toDate(e.start)
    return d !== null && startOfDay(d).getTime() === dayStart
  })
}

export function DayEventPanel({
  selectedDay,
  allEvents,
  onClose,
}: {
  selectedDay: Date | null
  allEvents: CalendarEventRow[]
  onClose: () => void
}) {
  const dayEvents = selectedDay ? filterEventsForDay(allEvents, selectedDay) : []

  return (
    <Sheet open={selectedDay !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent
        side="bottom"
        data-testid="calendar-day-panel"
        className="min-h-[50vh] max-h-[70vh] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle data-testid="calendar-day-panel-title">
            Events — {selectedDay ? format(selectedDay, "EEE d MMMM yyyy") : ""}
          </SheetTitle>
        </SheetHeader>
        {dayEvents.length === 0 ? (
          <p data-testid="calendar-day-panel-empty" className="px-4 py-2 text-sm text-muted-foreground">
            No events on this day.
          </p>
        ) : (
          <ul className="flex flex-col gap-3 px-4 py-2">
            {dayEvents.map((event) => {
              const eventDate = toDate(event.start)
              return (
                <li
                  key={event.eventKey}
                  data-testid="calendar-day-panel-event-item"
                  className="flex items-start gap-3"
                >
                  <span
                    data-testid="calendar-day-panel-event-dot"
                    className="mt-1 size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: getDotColor(event) }}
                  />
                  <div className="flex flex-col gap-0.5">
                    <span data-testid="calendar-day-panel-event-title" className="text-sm font-medium leading-snug">
                      {String(event.title ?? "")}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span data-testid="calendar-day-panel-event-type">{getTypeLabel(event)}</span>
                      <span aria-hidden>·</span>
                      <span data-testid="calendar-day-panel-event-date">
                        {eventDate ? format(eventDate, "d MMM") : ""}
                      </span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  )
}
