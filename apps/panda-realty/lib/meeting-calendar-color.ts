/** Google Calendar colorId for each property meeting type. */
export const MEETING_TYPE_COLOR_ID = {
  meeting: "7",
  reminder: "4",
} as const

/** Maps colorId strings to CSS hex colors for in-app calendar display. */
export const GOOGLE_EVENT_COLOR: Record<string, string> = {
  [MEETING_TYPE_COLOR_ID.meeting]: "#039be5", // Peacock — meetings
  [MEETING_TYPE_COLOR_ID.reminder]: "#f6bf26", // Banana — reminders
}
