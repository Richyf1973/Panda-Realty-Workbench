"use client"

import { useCallback, useEffect, useState } from "react"

import { useDriveUpload } from "@/lib/use-drive-upload"

export interface PropertyFormRow {
  propertyFormId: number
  formName: string
  category: string | null
  fileLink: string | null
  fileName: string | null
  isActive: boolean
  prefillStrategy: string | null
}

export interface FormSendRow {
  propertyFormSendId: number
  propertyFormId: number
  formName: string
  recipientEmail: string | null
  recipientName: string | null
  driveFileLink?: string | null
  prefillValues: Record<string, string> | null
  prefillStrategy: string | null
  sentAt: string | null
}

export function useFormsTab({
  listIdNum,
  hasSavedProperty,
}: {
  listIdNum: number
  hasSavedProperty: boolean
}) {
  const [forms, setForms] = useState<PropertyFormRow[]>([])
  const [loadingForms, setLoadingForms] = useState(true)
  const [sendHistory, setSendHistory] = useState<FormSendRow[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [sendDialog, setSendDialog] = useState<{ open: boolean; form: PropertyFormRow | null }>({
    open: false,
    form: null,
  })
  const [sendLinkDialog, setSendLinkDialog] = useState<{ open: boolean; form: PropertyFormRow | null }>({
    open: false,
    form: null,
  })

  const loadForms = useCallback(async () => {
    if (!hasSavedProperty) { setLoadingForms(false); return }
    setLoadingForms(true)
    try {
      const res = await fetch("/api/admin/property-forms?isActive=true")
      if (res.ok) {
        const data = (await res.json()) as { items: PropertyFormRow[] }
        setForms(data.items ?? [])
      }
    } finally {
      setLoadingForms(false)
    }
  }, [hasSavedProperty])

  const loadHistory = useCallback(async () => {
    if (!hasSavedProperty) {
      setLoadingHistory(false)
      return
    }
    setLoadingHistory(true)
    try {
      const res = await fetch(`/api/admin/property-form-sends?propertyListId=${listIdNum}`)
      if (res.ok) {
        const data = (await res.json()) as { items: FormSendRow[] }
        setSendHistory(data.items ?? [])
      }
    } finally {
      setLoadingHistory(false)
    }
  }, [hasSavedProperty, listIdNum])

  useEffect(() => {
    void loadForms()
    void loadHistory()
  }, [loadForms, loadHistory])

  const driveUpload = useDriveUpload({
    initiateUrl: "/api/admin/property-forms/initiate-upload",
    recordUrl: "/api/admin/property-forms/record-form-upload",
    onRecordSuccess: async () => { await loadForms() },
  })

  function openSendDialog(form: PropertyFormRow) { setSendDialog({ open: true, form }) }
  function closeSendDialog() { setSendDialog({ open: false, form: null }) }
  function openSendLinkDialog(form: PropertyFormRow) { setSendLinkDialog({ open: true, form }) }
  function closeSendLinkDialog() { setSendLinkDialog({ open: false, form: null }) }

  return {
    forms,
    loadingForms,
    sendHistory,
    loadingHistory,
    sendDialog,
    sendLinkDialog,
    loadHistory,
    openSendDialog,
    closeSendDialog,
    openSendLinkDialog,
    closeSendLinkDialog,
    ...driveUpload,
  }
}
