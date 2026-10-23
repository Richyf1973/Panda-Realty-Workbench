"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type CalendarStatusContextValue = boolean | null

const CalendarStatusContext = createContext<CalendarStatusContextValue>(null)

export function PandaCalendarStatusProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch("/api/admin/calendar/status")
      .then((r) => r.json())
      .then((data: { connected: boolean }) => { if (!cancelled) setConnected(data.connected) })
      .catch(() => { if (!cancelled) setConnected(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <CalendarStatusContext.Provider value={connected}>
      {children}
    </CalendarStatusContext.Provider>
  )
}

export function useCalendarStatus(): boolean | null {
  return useContext(CalendarStatusContext)
}
