"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { emitGoogleContactsPatchWarnings } from "@/lib/google-contacts-warning-client"

import {
  EMPTY_BUYER_PANEL_FORM,
  type BuyerPanelDeleteDialogState,
  type BuyerPanelDialogState,
  type BuyerPanelFormState,
  type PropertyBuyerPanel,
} from "./property-buyer-panel-types"

export function usePropertyBuyersPanel({
  propertyListId,
  variant,
}: {
  propertyListId: number | null
  variant: "create" | "edit"
}) {
  const [buyers, setBuyers] = useState<PropertyBuyerPanel[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [primaryPhoneBuyerPeId, setPrimaryPhoneBuyerPeId] = useState<number | null>(null)
  const [primaryEmailBuyerPeId, setPrimaryEmailBuyerPeId] = useState<number | null>(null)

  const [dialog, setDialog] = useState<BuyerPanelDialogState>({
    open: false,
    buyer: null,
    saving: false,
    saveError: null,
  })
  const [form, setForm] = useState<BuyerPanelFormState>(EMPTY_BUYER_PANEL_FORM)

  const [deleteDialog, setDeleteDialog] = useState<BuyerPanelDeleteDialogState>({
    open: false,
    buyer: null,
    deleting: false,
  })

  const loadBuyers = useCallback(async (signal?: AbortSignal) => {
    if (propertyListId == null) return
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(`/api/admin/properties/${propertyListId}/buyers`, { signal })
      if (!res.ok) throw new Error(`Failed to load buyers (${res.status})`)
      const data = (await res.json()) as { items: PropertyBuyerPanel[] }
      const items = data.items ?? []
      setBuyers(items)
      // Sync primary state from server flags; fall back to first buyer when none set
      const phonePrimary = items.find((b) => b.isPrimaryPhone)?.propertyEntityId ?? items[0]?.propertyEntityId ?? null
      const emailPrimary = items.find((b) => b.isPrimaryEmail)?.propertyEntityId ?? items[0]?.propertyEntityId ?? null
      setPrimaryPhoneBuyerPeId(phonePrimary)
      setPrimaryEmailBuyerPeId(emailPrimary)
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      setLoadError(err instanceof Error ? err.message : "Failed to load buyers.")
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [propertyListId])

  useEffect(() => {
    if (variant === "edit") {
      const controller = new AbortController()
      void loadBuyers(controller.signal)
      return () => controller.abort()
    }
    setLoading(false)
  }, [variant, loadBuyers])

  async function handleSetPrimaryPhone(propertyEntityId: number) {
    if (propertyListId == null) return
    const previous = primaryPhoneBuyerPeId
    setPrimaryPhoneBuyerPeId(propertyEntityId)
    try {
      const res = await fetch(`/api/admin/properties/${propertyListId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryPhoneBuyerPropertyEntityId: String(propertyEntityId) }),
      })
      if (!res.ok) throw new Error(`PATCH failed (${res.status})`)
    } catch {
      setPrimaryPhoneBuyerPeId(previous)
    }
  }

  async function handleSetPrimaryEmail(propertyEntityId: number) {
    if (propertyListId == null) return
    const previous = primaryEmailBuyerPeId
    setPrimaryEmailBuyerPeId(propertyEntityId)
    try {
      const res = await fetch(`/api/admin/properties/${propertyListId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryEmailBuyerPropertyEntityId: String(propertyEntityId) }),
      })
      if (!res.ok) throw new Error(`PATCH failed (${res.status})`)
    } catch {
      setPrimaryEmailBuyerPeId(previous)
    }
  }

  function openAddDialog() {
    setForm(EMPTY_BUYER_PANEL_FORM)
    setDialog({ open: true, buyer: null, saving: false, saveError: null })
  }

  function closeDialog() {
    if (dialog.saving) return
    setDialog({ open: false, buyer: null, saving: false, saveError: null })
  }

  async function saveBuyer() {
    if (!form.entityName.trim()) {
      setDialog((prev) => ({ ...prev, saveError: "Name is required." }))
      return
    }
    setDialog((prev) => ({ ...prev, saving: true, saveError: null }))

    const payload = {
      entityName: form.entityName.trim(),
      contact: form.phoneNumber.trim() || null,
      emailAddress: form.emailAddress.trim() || null,
      address: form.address.trim() || null,
      esuburb: form.esuburb.trim() || null,
      estate: form.estate.trim() || null,
      epostcode: form.epostcode.trim() || null,
      notes: form.notes.trim() || null,
    }

    try {
      if (propertyListId == null) {
        setDialog((prev) => ({ ...prev, saving: false, saveError: "Property not saved yet." }))
        return
      }
      const entityRes = await fetch("/api/admin/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, entityCategoryId: "1" }),
      })
      if (!entityRes.ok) {
        const data = (await entityRes.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `Failed to create buyer (${entityRes.status})`)
      }
      const newEntity = (await entityRes.json()) as { entityId: number }

      const linkRes = await fetch("/api/admin/property-entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: String(newEntity.entityId),
          propertyListId: String(propertyListId),
          isOriginalOwner: "false",
        }),
      })
      if (!linkRes.ok) {
        const data = (await linkRes.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `Failed to link buyer (${linkRes.status})`)
      }
      emitGoogleContactsPatchWarnings(
        (await linkRes.json().catch(() => null)) as Record<string, unknown> | null,
      )

      await loadBuyers()
      setDialog({ open: false, buyer: null, saving: false, saveError: null })
    } catch (err) {
      setDialog((prev) => ({
        ...prev,
        saving: false,
        saveError: err instanceof Error ? err.message : "Save failed.",
      }))
    }
  }

  function openDeleteDialog(b: PropertyBuyerPanel) {
    setDeleteDialog({ open: true, buyer: b, deleting: false })
  }

  function closeDeleteDialog() {
    if (deleteDialog.deleting) return
    setDeleteDialog({ open: false, buyer: null, deleting: false })
  }

  async function confirmDelete() {
    if (!deleteDialog.buyer) return
    setDeleteDialog((prev) => ({ ...prev, deleting: true }))
    const { propertyEntityId } = deleteDialog.buyer
    try {
      const res = await fetch(`/api/admin/property-entities/${propertyEntityId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      setDeleteDialog({ open: false, buyer: null, deleting: false })
      await loadBuyers()
    } catch (err) {
      console.error("Delete failed", err)
      setDeleteDialog((prev) => ({ ...prev, deleting: false }))
    }
  }

  const buyersWithPrimary = useMemo(() => {
    const firstBuyerId = buyers[0]?.propertyEntityId ?? null
    const resolvedPhoneId = primaryPhoneBuyerPeId ?? firstBuyerId
    const resolvedEmailId = primaryEmailBuyerPeId ?? firstBuyerId
    return buyers.map((b) => ({
      ...b,
      isPrimaryPhone: b.propertyEntityId === resolvedPhoneId,
      isPrimaryEmail: b.propertyEntityId === resolvedEmailId,
    }))
  }, [buyers, primaryPhoneBuyerPeId, primaryEmailBuyerPeId])

  return {
    buyers: buyersWithPrimary,
    loading,
    loadError,
    dialog,
    form,
    setForm,
    deleteDialog,
    openAddDialog,
    closeDialog,
    saveBuyer,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
    refreshBuyers: loadBuyers,
    handleSetPrimaryPhone,
    handleSetPrimaryEmail,
  }
}
