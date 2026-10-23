export type MeetingReminder = {
  method: "popup" | "email"
  minutes: number
}

export function parseRemindersJson(json: string | null | undefined): MeetingReminder[] {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (r): r is MeetingReminder =>
        r !== null &&
        typeof r === "object" &&
        (r.method === "popup" || r.method === "email") &&
        typeof r.minutes === "number",
    )
  } catch {
    return []
  }
}
