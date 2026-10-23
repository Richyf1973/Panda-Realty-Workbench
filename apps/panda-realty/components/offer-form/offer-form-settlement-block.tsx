"use client"

import type { ReactNode } from "react"

import { inputClass } from "./offer-form-shared"
import type { SettlementState } from "./offer-form-types"

type Props = Pick<SettlementState, "settlementPeriod" | "settlementDate" | "settlementNote" | "handleSettlementPeriodChange" | "handleSettlementDateChange">

export function OfferFormSettlementBlock({
  settlementPeriod,
  settlementDate,
  settlementNote,
  handleSettlementPeriodChange,
  handleSettlementDateChange,
}: Props) {
  const noteClass =
    settlementNote?.type === "error"
      ? "text-[12px] font-medium text-red-600"
      : "text-[12px] font-medium text-slate-700"

  const noteContent: ReactNode =
    settlementNote === null
      ? "Selecting an exact calendar field date automatically determines net days tracking."
      : settlementNote.type === "success"
        ? <>Settlement date lands on a <strong>{settlementNote.dayOfWeek}</strong>.</>
        : settlementNote.source === "days"
          ? `⚠️ Settlement cannot fall on a weekend (${settlementNote.dayOfWeek}). Please adjust days to fall on a business day.`
          : `⚠️ Settlement cannot occur on a weekend (${settlementNote.dayOfWeek}). Please choose a weekday.`

  return (
    <div
      className="space-y-2 rounded-xl border border-gray-200 bg-slate-50 p-4"
      data-testid="offer-form-settlement-block"
    >
      <label className="block text-sm font-medium text-gray-700">Proposed Settlement Date / Interval</label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          type="text"
          value={settlementPeriod}
          onChange={(e) => handleSettlementPeriodChange(e.target.value)}
          className={inputClass()}
          placeholder="e.g., 30 Days from contract sign date"
          data-testid="offer-form-settlement-period"
        />
        <input
          type="date"
          value={settlementDate}
          onChange={handleSettlementDateChange}
          className={inputClass()}
          data-testid="offer-form-settlement-date-input"
        />
      </div>
      <p className={noteClass} data-testid="offer-form-settlement-note">{noteContent}</p>
    </div>
  )
}
