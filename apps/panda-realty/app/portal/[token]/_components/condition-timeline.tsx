import {
  addDaysToDate,
  computeConditionEvents,
  hasPositiveDayCount,
  type ConditionOfferFields,
} from "@/app/admin/properties/board/compute-condition-events"

import { formatPortalDate } from "./portal-format-date"

type OfferForTimeline = ConditionOfferFields & {
  customConditions: Array<{ label: string; days: number }> | null
  settlementDate: string | null
}

type TimelineRow = { key: string; label: string; date: Date }

function buildRows(offer: OfferForTimeline, contractDate: Date): TimelineRow[] {
  const rows: TimelineRow[] = computeConditionEvents(offer, contractDate).filter(
    (e) => e.key !== "contract",
  )

  if (offer.customConditions) {
    for (let i = 0; i < offer.customConditions.length; i++) {
      const { label, days } = offer.customConditions[i]
      if (hasPositiveDayCount(days)) {
        rows.push({ key: `custom-${i}`, label, date: addDaysToDate(contractDate, days) })
      }
    }
  }

  if (offer.settlementDate) {
    rows.push({ key: "settlement", label: "Settlement", date: new Date(offer.settlementDate) })
  }

  return rows.sort((a, b) => a.date.getTime() - b.date.getTime())
}

function daysLabel(daysRemaining: number): string {
  if (daysRemaining === 0) return "Today"
  return `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"}`
}

type Props = {
  offer: OfferForTimeline | null
  contractDate: Date | null
}

export function PortalConditionTimeline({ offer, contractDate }: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let content: React.ReactNode

  if (!offer) {
    content = (
      <p data-testid="portal-condition-timeline-empty" className="text-sm text-gray-500">
        Conditions will appear once an offer is recorded.
      </p>
    )
  } else if (!contractDate) {
    content = (
      <p data-testid="portal-condition-timeline-empty" className="text-sm text-gray-500">
        Condition dates will be confirmed once a contract date is set.
      </p>
    )
  } else {
    const rows = buildRows(offer, contractDate)
    content = (
      <div className="space-y-3">
        {rows.map((row) => {
          const isPast = row.date < today
          const daysRemaining = Math.ceil(
            (row.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
          )
          return (
            <div
              key={row.key}
              data-testid={`portal-condition-row-${row.key}`}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{isPast ? "✅" : "⏳"}</span>
                <span className="text-sm font-medium text-gray-800">{row.label}</span>
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-600">{formatPortalDate(row.date)}</span>
                <span className="ml-2 text-xs text-gray-400">
                  {isPast ? "(past)" : daysLabel(daysRemaining)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div
      data-testid="portal-condition-timeline"
      className="rounded-xl bg-white p-6 shadow-sm sm:p-8"
    >
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-gray-400">
        Conditions &amp; Key Dates
      </p>
      {content}
    </div>
  )
}
