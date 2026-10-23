"use client"

import { useEffect, useState } from "react"
import type { ChangeEvent } from "react"

import type { SettlementNote } from "./offer-form-types"

export function useSettlementState(initial: { settlementPeriod?: string; settlementDate?: string }) {
  const [settlementPeriod, setSettlementPeriod] = useState(initial.settlementPeriod ?? "")
  const [settlementDate, setSettlementDate] = useState(initial.settlementDate ?? "")
  const [settlementNote, setSettlementNote] = useState<SettlementNote>(null)

  function handleSettlementDateChange(e: ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    if (!val) {
      setSettlementDate("")
      setSettlementPeriod("")
      setSettlementNote(null)
      return
    }
    const [y, m, d] = val.split("-").map(Number)
    const selected = new Date(y, m - 1, d)
    const dayOfWeek = selected.toLocaleDateString("en-AU", { weekday: "long" })
    const dow = selected.getDay()
    if (dow === 0 || dow === 6) {
      setSettlementDate("")
      setSettlementPeriod("")
      setSettlementNote({ type: "error", dayOfWeek, source: "datepicker" })
      return
    }
    setSettlementDate(val)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    selected.setHours(0, 0, 0, 0)
    const diff = Math.ceil((selected.getTime() - today.getTime()) / (1000 * 3600 * 24))
    if (diff > 0) setSettlementPeriod(`${diff} Days (${dayOfWeek})`)
    else if (diff === 0) setSettlementPeriod(`Today (${dayOfWeek})`)
    else setSettlementPeriod(`${Math.abs(diff)} Days Ago (${dayOfWeek})`)
    setSettlementNote({ type: "success", dayOfWeek })
  }

  function handleSettlementPeriodChange(val: string) {
    setSettlementPeriod(val)
    const trimmed = val.trim()
    if (!trimmed) {
      setSettlementDate("")
      setSettlementNote(null)
      return
    }
    const match = trimmed.match(/^-?\d+/)
    if (!match) {
      setSettlementDate("")
      setSettlementNote(null)
      return
    }
    const days = parseInt(match[0], 10)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)
    const dayOfWeek = target.toLocaleDateString("en-AU", { weekday: "long" })
    const dow = target.getDay()
    if (dow === 0 || dow === 6) {
      setSettlementDate("")
      setSettlementNote({ type: "error", dayOfWeek, source: "days" })
      return
    }
    const yyyy = target.getFullYear()
    const mm = String(target.getMonth() + 1).padStart(2, "0")
    const dd = String(target.getDate()).padStart(2, "0")
    setSettlementDate(`${yyyy}-${mm}-${dd}`)
    setSettlementNote({ type: "success", dayOfWeek })
  }

  // On mount: if period was pre-filled (e.g. from a draft save) but date was not saved,
  // run the calculation so the calendar date and note auto-populate.
  useEffect(() => {
    if (initial.settlementPeriod && !initial.settlementDate) {
      handleSettlementPeriodChange(initial.settlementPeriod)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    settlementPeriod,
    setSettlementPeriod,
    settlementDate,
    settlementNote,
    handleSettlementDateChange,
    handleSettlementPeriodChange,
  }
}
