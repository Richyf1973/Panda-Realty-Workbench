"use client"

import { useState, useCallback } from "react"

import type { FormSendRow } from "./use-forms-tab"

export interface EmailEntry {
  id: string
  value: string
}

const isValidEmail = (e: EmailEntry) => e.value.trim().includes("@")

function newEntry(): EmailEntry {
  return { id: crypto.randomUUID(), value: "" }
}

export function usePropertyFormHistoryResend() {
  const [resendRow, setResendRow] = useState<FormSendRow | null>(null)
  const [emails, setEmails] = useState<EmailEntry[]>([newEntry()])
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openResend = useCallback((row: FormSendRow) => {
    setResendRow(row)
    setEmails([newEntry()])
    setMessage("")
    setError(null)
  }, [])

  const closeResend = useCallback(() => {
    setResendRow(null)
    setError(null)
  }, [])

  function setEmail(index: number, value: string) {
    setEmails((prev) => prev.map((e, i) => (i === index ? { ...e, value } : e)))
  }

  function addEmail() {
    setEmails((prev) => [...prev, newEntry()])
  }

  async function submitResend() {
    if (!resendRow) return
    const validEmails = emails.filter(isValidEmail).map((e) => e.value.trim())
    if (validEmails.length === 0) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/property-form-sends/${resendRow.propertyFormSendId}/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: validEmails, message: message.trim() || undefined }),
      })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        setError(json.error ?? `Send failed (${res.status})`)
        return
      }
      closeResend()
    } catch {
      setError("Network error — please try again")
    } finally {
      setSending(false)
    }
  }

  const hasValidEmail = emails.some(isValidEmail)

  return {
    resendRow,
    emails,
    message,
    sending,
    error,
    hasValidEmail,
    openResend,
    closeResend,
    setEmail,
    addEmail,
    setMessage,
    submitResend,
  }
}
