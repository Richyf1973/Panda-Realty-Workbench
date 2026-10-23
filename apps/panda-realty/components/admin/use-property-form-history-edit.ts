"use client"

import { useState, useCallback } from "react"

import type { FormSendRow } from "./use-forms-tab"

export function usePropertyFormHistoryEdit({ onEdited }: { onEdited: () => void }) {
  const [editRow, setEditRow] = useState<FormSendRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openEdit = useCallback((row: FormSendRow) => {
    setEditRow(row)
    setError(null)
  }, [])

  const closeEdit = useCallback(() => {
    setEditRow(null)
    setError(null)
  }, [])

  async function submitEdit(prefillValues: Record<string, string>) {
    if (!editRow) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/property-form-sends/${editRow.propertyFormSendId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefillValues }),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        setError(json.error ?? `Edit failed (${res.status})`)
        return
      }
      closeEdit()
      onEdited()
    } catch {
      setError("Network error — please try again")
    } finally {
      setSaving(false)
    }
  }

  return { editRow, saving, error, openEdit, closeEdit, submitEdit }
}
