import { describe, expect, it } from "vitest"

import {
  MEETING_SCHEDULE_TIMEZONE,
  scheduledAtIsoFromMeetingFormParts,
  scheduledAtIsoFromReminderFormParts,
} from "./meeting-scheduled-at"

describe("scheduledAtIsoFromMeetingFormParts", () => {
  it("builds ISO for snapped quarter-hour in schedule TZ", () => {
    const r = scheduledAtIsoFromMeetingFormParts("2026-06-15", "09:07")
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const d = new Date(r.iso)
    const parts = new Intl.DateTimeFormat("en-AU", {
      timeZone: MEETING_SCHEDULE_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d)
    const h = Number(parts.find((p) => p.type === "hour")?.value)
    const m = Number(parts.find((p) => p.type === "minute")?.value)
    expect(h).toBe(9)
    expect(m).toBe(0)
  })
})

describe("scheduledAtIsoFromReminderFormParts", () => {
  it("uses midnight in schedule TZ when time is omitted", () => {
    const r = scheduledAtIsoFromReminderFormParts("2026-07-20", null)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const d = new Date(r.iso)
    const parts = new Intl.DateTimeFormat("en-AU", {
      timeZone: MEETING_SCHEDULE_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d)
    const h = Number(parts.find((p) => p.type === "hour")?.value)
    const m = Number(parts.find((p) => p.type === "minute")?.value)
    expect(h).toBe(0)
    expect(m).toBe(0)
  })
})
