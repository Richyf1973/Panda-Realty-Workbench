import type { Metadata } from "next"

import { ConditionCalendarView } from "./calendar-client"
import { fetchFavoritePropertiesWithConditions } from "./queries"

export const metadata: Metadata = {
  title: "Calendar · Admin",
}

export default async function CalendarPage() {
  const properties = await fetchFavoritePropertiesWithConditions()

  return (
    <div data-testid="condition-calendar-page" className="flex flex-1 flex-col min-h-0 p-3 sm:p-6">
      <ConditionCalendarView properties={properties} />
    </div>
  )
}
