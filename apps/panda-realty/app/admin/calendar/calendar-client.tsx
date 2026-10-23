"use client"

import "react-big-calendar/lib/css/react-big-calendar.css"
import "./calendar-overrides.css"

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react"
import { Calendar, dateFnsLocalizer, type SlotInfo, type View } from "react-big-calendar"
import { format, getDay, parse, startOfWeek } from "date-fns"
import { enAU } from "date-fns/locale/en-AU"
import { Plus } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@repo/ui/tooltip"

import { AddCalendarEventDialog } from "@/components/admin/add-calendar-event-dialog"
import { AddAgentTaskDialog } from "@/components/admin/add-agent-task-dialog"
import type { CalendarProperty } from "./queries"
import {
  CONDITION_CALENDAR_VIEW_STORAGE_KEY,
  getGoogleFetchRange,
} from "@/lib/condition-calendar-google-range"
import type { GoogleCalendarEvent } from "@/lib/google-calendar-client"
import {
  buildConditionEvents,
  getConditionEventStyle,
  getGoogleEventStyle,
  mapGoogleEventsToCalendar,
  type CalendarEventRow,
} from "./calendar-event-builders"
import { AGENT_TASK_COLOR, DayEventPanel } from "./calendar-day-panel"

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { "en-AU": enAU },
})

const AGENT_TASK_EVENT_STYLE: React.CSSProperties = {
  backgroundColor: AGENT_TASK_COLOR,
  color: "#fff",
  borderRadius: "4px",
  border: "none",
  fontSize: "0.72rem",
}

type AgentTaskRow = {
  agentTaskId: number
  agentName: string | null
  title: string
  dueDate: string | null
}

function isPersistableView(v: View): v is "month" | "week" | "day" {
  return v === "month" || v === "week" || v === "day"
}


export function ConditionCalendarView({ properties }: { properties: CalendarProperty[] }) {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [calendarView, setCalendarView] = useState<View>("month")
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([])
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null)
  const [calendarFetchError, setCalendarFetchError] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [taskRefreshKey, setTaskRefreshKey] = useState(0)
  const [agentTasks, setAgentTasks] = useState<AgentTaskRow[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  useLayoutEffect(() => {
    try {
      const raw = localStorage.getItem(CONDITION_CALENDAR_VIEW_STORAGE_KEY)
      if (raw === "day" || raw === "week" || raw === "month") setCalendarView(raw)
    } catch {
      /* ignore */
    }
  }, [])

  const persistView = useCallback((v: View) => {
    setCalendarView(v)
    if (!isPersistableView(v)) return
    try {
      localStorage.setItem(CONDITION_CALENDAR_VIEW_STORAGE_KEY, v)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const v = isPersistableView(calendarView) ? calendarView : "month"
    const { from, toExclusive } = getGoogleFetchRange(v, currentDate)
    void refreshKey // consumed to re-trigger fetch after event creation
    const qs = new URLSearchParams({
      from: from.toISOString(),
      to: toExclusive.toISOString(),
    })
    fetch(`/api/admin/calendar/google-events?${qs.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: { connected: boolean; events: GoogleCalendarEvent[]; error?: string }) => {
        if (data.error) {
          setCalendarFetchError(true)
          return
        }
        setCalendarFetchError(false)
        setCalendarConnected(data.connected)
        setGoogleEvents(data.connected ? data.events : [])
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return
        setCalendarFetchError(true)
      })
    return () => controller.abort()
  }, [calendarView, currentDate, refreshKey])

  useEffect(() => {
    void fetch("/api/admin/calendar/agent-tasks")
      .then((r) => r.json())
      .then((data: AgentTaskRow[]) => setAgentTasks(data))
      .catch(() => {/* ignore */})
  }, [taskRefreshKey])

  const conditionEvents = useMemo(() => buildConditionEvents(properties), [properties])

  const agentTaskEvents = useMemo<CalendarEventRow[]>(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return agentTasks.map((t) => {
      const date = t.dueDate ? new Date(t.dueDate + "T00:00:00") : today
      return {
        title: `${t.agentName ?? "Agent"}: ${t.title}`,
        start: date,
        end: date,
        allDay: true,
        eventKey: `agent-task-${t.agentTaskId}`,
        source: "agent-task" as const,
      }
    })
  }, [agentTasks])

  const allEvents = useMemo<CalendarEventRow[]>(() => {
    const gEvents = mapGoogleEventsToCalendar(googleEvents, calendarView)
    return [...conditionEvents, ...gEvents, ...agentTaskEvents]
  }, [conditionEvents, googleEvents, calendarView, agentTaskEvents])

  const addButtonDisabled = calendarConnected !== true

  return (
    <div data-testid="condition-calendar-view" className="flex flex-1 flex-col gap-2 min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-y-2">
        <h1 className="text-xl font-semibold sm:text-2xl">Condition Calendar</h1>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={addButtonDisabled ? "cursor-not-allowed" : undefined}>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setTaskDialogOpen(true)}
                    disabled={addButtonDisabled}
                    data-testid="add-agent-task-button"
                    className={addButtonDisabled ? "pointer-events-none" : undefined}
                  >
                    <Plus className="size-4 shrink-0 sm:mr-1.5" aria-hidden />
                    <span className="hidden sm:inline">Add Task for Agent</span>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {addButtonDisabled ? "Connect Gmail to add tasks" : "Add Task for Agent"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={addButtonDisabled ? "cursor-not-allowed" : undefined}>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setDialogOpen(true)}
                    disabled={addButtonDisabled}
                    data-testid="add-calendar-event-button"
                    className={addButtonDisabled ? "pointer-events-none" : undefined}
                  >
                    <Plus className="size-4 shrink-0 sm:mr-1.5" aria-hidden />
                    <span className="hidden sm:inline">Add Calendar Event</span>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {addButtonDisabled ? "Connect Google Calendar to add events" : "Add Calendar Event"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <AddAgentTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        onSuccess={() => setTaskRefreshKey((k) => k + 1)}
      />

      <AddCalendarEventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      <DayEventPanel
        selectedDay={selectedDay}
        allEvents={allEvents}
        onClose={() => setSelectedDay(null)}
      />

      {calendarConnected === false && (
        <p className="text-xs text-muted-foreground">
          Google Calendar not connected —{" "}
          <a href="/api/auth/google?returnTo=/admin/calendar" className="underline hover:no-underline">
            connect Google
          </a>{" "}
          to show your calendar events here.
        </p>
      )}
      {calendarFetchError && (
        <p className="text-xs text-destructive">
          Could not load calendar events — check your Google connection and try refreshing.
        </p>
      )}
      <div className="flex-1 min-h-0 rounded-lg border border-border bg-card p-2 sm:p-4">
        <div
          data-testid="condition-calendar-rbc"
          className="condition-calendar-rbc h-full [&_.rbc-calendar]:h-full"
          data-cal-view={
            calendarView === "month" || calendarView === "week" || calendarView === "day"
              ? calendarView
              : "month"
          }
        >
          <Calendar
            localizer={localizer}
            events={allEvents}
            view={calendarView}
            views={["month", "week", "day"]}
            onView={persistView}
            culture="en-AU"
            date={currentDate}
            onNavigate={setCurrentDate}
            selectable
            onSelectSlot={(slot: SlotInfo) => setSelectedDay(slot.start as Date)}
            onSelectEvent={(event) => setSelectedDay((event as CalendarEventRow).start as Date)}
            messages={{
              today: "Today",
              previous: "Back",
              next: "Next",
              month: "Month",
              week: "Week",
              day: "Day",
              showMore: (total) => `+${total}`,
            }}
            eventPropGetter={(event) => {
              const row = event as CalendarEventRow
              if (row.source === "google") return { style: getGoogleEventStyle(row.colorId) }
              if (row.source === "agent-task") return { style: { ...AGENT_TASK_EVENT_STYLE } }
              return { style: getConditionEventStyle(row.isDueHighlight, row.isDueWarning, row.dueWarningTier) }
            }}
          />
        </div>
      </div>
    </div>
  )
}
