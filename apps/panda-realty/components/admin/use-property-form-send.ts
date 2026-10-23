"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { hasPrefillFillStep } from "@/lib/admin/constants"
import { usePropertyFormPrefill } from "./use-property-form-prefill"
import { usePropertyFormRecipients } from "./use-property-form-recipients"

interface PropertyFormRow {
  propertyFormId: number
  formName: string
  fileLink: string | null
  prefillStrategy: string | null
}

interface UsePropertyFormSendProps {
  open: boolean
  form: PropertyFormRow | null
  propertyListId: number
  propertyAddress?: string
  onClose: () => void
  onSent: () => void
}

export function usePropertyFormSend({
  open,
  form,
  propertyListId,
  propertyAddress,
  onClose,
  onSent,
}: UsePropertyFormSendProps) {
  const hasPrefill = Boolean(form?.prefillStrategy)

  const [step, setStep] = useState<"prefill" | "send">(hasPrefill ? "prefill" : "send")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [savingToDrive, setSavingToDrive] = useState(false)
  const [driveLink, setDriveLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [saveTemplateError, setSaveTemplateError] = useState<string | null>(null)

  const prefill = usePropertyFormPrefill({ form, propertyListId, propertyAddress })
  const recipients = usePropertyFormRecipients({ propertyListId })

  // Merge errors from sub-hooks; sub-hook errors take priority over send errors
  const displayError = prefill.prefillError ?? recipients.recipientsError ?? error

  // Auto-select first agent when agents load.
  // If template agent data is already in prefillValues (agentName set from template spread),
  // only sync the dropdown ID — do NOT call handleAgentChange which would overwrite all
  // licensee fields with the first agent's DB record, discarding the template values.
  const { agents, selectedAgentId, setSelectedAgentId, handleAgentChange, prefillValues } = prefill
  useEffect(() => {
    if (agents.length > 0 && selectedAgentId === null) {
      if (prefillValues.agentName) {
        setSelectedAgentId(agents[0].agentId)
      } else {
        handleAgentChange(agents[0].agentId)
      }
    }
  }, [agents, selectedAgentId, handleAgentChange, setSelectedAgentId, prefillValues.agentName])

  useEffect(() => {
    if (!open || !propertyListId) return
    setStep(hasPrefill ? "prefill" : "send")
    setMessage("")
    setError(null)
    setDriveLink(null)
    const isTemplatePrefill = hasPrefillFillStep(form?.prefillStrategy)
    // keepLoading=true so spinner shows immediately during loadTemplate, not just loadPrefillData
    prefill.reset({ keepLoading: hasPrefill && Boolean(isTemplatePrefill) })
    recipients.reset()
    if (hasPrefill && isTemplatePrefill && form) {
      void (async () => {
        const templateVals = await prefill.loadTemplate(form.propertyFormId)
        // loadPrefillData merges template + DB atomically (DB wins) — avoids split-render race
        await prefill.loadPrefillData(templateVals ?? undefined)
        void prefill.loadAgents()
      })()
    } else if (hasPrefill) {
      void prefill.loadPrefillData()
    }
    void recipients.loadRecipients()
  // Stable callbacks (loadPrefillData, loadAgents, loadRecipients, reset) are intentionally
  // omitted — they never change identity and including them would mask the real triggers.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, propertyListId, hasPrefill, form?.prefillStrategy])

  async function postForm<T>(
    url: string,
    body: object,
    setLoading: (v: boolean) => void,
    setErr: (v: string | null) => void,
    failurePrefix: string,
  ): Promise<T | null> {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({}))) as { error?: string }
        setErr(error ?? `${failurePrefix} (${res.status})`)
        return null
      }
      return (await res.json()) as T
    } catch {
      setErr("Network error — please try again")
      return null
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    if (!form || recipients.selected.size === 0) return
    const result = await postForm<object>(
      "/api/admin/property-forms/send",
      {
        propertyFormId: form.propertyFormId,
        propertyListId,
        recipientEntityIds: Array.from(recipients.selected),
        message: message.trim() || undefined,
        ...(hasPrefill ? { prefillValues: prefill.prefillValues } : {}),
      },
      setSending,
      setError,
      "Send failed",
    )
    if (result !== null) {
      onSent()
      onClose()
    }
  }

  async function handleSaveToDrive() {
    if (!form) return
    const data = await postForm<{ driveFileLink: string }>(
      "/api/admin/property-forms/send",
      {
        propertyFormId: form.propertyFormId,
        propertyListId,
        recipientEntityIds: [],
        saveOnly: true,
        ...(hasPrefill ? { prefillValues: prefill.prefillValues } : {}),
      },
      setSavingToDrive,
      setError,
      "Save failed",
    )
    if (data !== null) {
      setDriveLink(data.driveFileLink)
      onSent()
    }
  }

  async function handleSaveTemplate() {
    if (!form) return
    const result = await postForm<object>(
      "/api/admin/property-forms/template",
      {
        propertyFormId: form.propertyFormId,
        propertyListId,
        prefillStrategy: form.prefillStrategy ?? undefined,
        templateValues: prefill.prefillValues,
      },
      setSavingTemplate,
      setSaveTemplateError,
      "Failed to save template",
    )
    if (result !== null) toast.success("Template saved")
  }

  return {
    hasPrefill,
    step,
    setStep,
    prefillValues: prefill.prefillValues,
    setPrefill: prefill.setPrefill,
    setAllPrefillValues: prefill.setAllPrefillValues,
    loadingPrefill: prefill.loadingPrefill,
    agents: prefill.agents,
    selectedAgentId: prefill.selectedAgentId,
    handleAgentChange: prefill.handleAgentChange,
    recipients: recipients.recipients,
    loadingRecipients: recipients.loadingRecipients,
    selected: recipients.selected,
    toggleEntity: recipients.toggleEntity,
    message,
    setMessage,
    sending,
    savingToDrive,
    driveLink,
    setDriveLink,
    error: displayError,
    handleSend,
    handleSaveToDrive,
    handleSaveTemplate,
    savingTemplate,
    saveTemplateError,
  }
}
