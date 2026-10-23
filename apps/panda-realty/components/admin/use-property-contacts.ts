"use client"

import { useCallback, useEffect, useState } from "react"

import { emitGoogleContactsPatchWarnings } from "@/lib/google-contacts-warning-client"

import {
  contactToForm,
  EMPTY_CONTACT_FORM,
  type ContactCategory,
  type ContactDeleteDialogState,
  type ContactDialogState,
  type ContactFormState,
  type PropertyContact,
} from "./property-contact-types"
import { usePropertyContactsSearch } from "./use-property-contacts-search"

export function usePropertyContacts({
  propertyListId,
  variant,
}: {
  propertyListId: number | null
  variant: "create" | "edit"
}) {
  const [contacts, setContacts] = useState<PropertyContact[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [categories, setCategories] = useState<ContactCategory[]>([])

  const [dialog, setDialog] = useState<ContactDialogState>({
    open: false,
    contact: null,
    saving: false,
    saveError: null,
  })
  const [form, setForm] = useState<ContactFormState>(EMPTY_CONTACT_FORM)

  const [deleteDialog, setDeleteDialog] = useState<ContactDeleteDialogState>({
    open: false,
    contact: null,
    deleting: false,
  })

  const loadContacts = useCallback(async (signal?: AbortSignal) => {
    if (propertyListId == null) return
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(`/api/admin/properties/${propertyListId}/contacts`, { signal })
      if (!res.ok) throw new Error(`Failed to load contacts (${res.status})`)
      const data = (await res.json()) as { items: PropertyContact[] }
      setContacts(data.items ?? [])
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      setLoadError(err instanceof Error ? err.message : "Failed to load contacts.")
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [propertyListId])

  useEffect(() => {
    if (variant === "edit") {
      const controller = new AbortController()
      void loadContacts(controller.signal)
      return () => controller.abort()
    }
    setLoading(false)
  }, [variant, loadContacts])

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/contact-categories?limit=100")
        if (!res.ok) return
        const data = (await res.json()) as { items: ContactCategory[] }
        setCategories(data.items ?? [])
      } catch {
        // non-critical — dropdown just stays empty
      }
    })()
  }, [])

  const search = usePropertyContactsSearch({
    propertyListId,
    variant,
    contacts,
    onLinked: loadContacts,
  })

  function openAddDialog() {
    setForm(EMPTY_CONTACT_FORM)
    setDialog({ open: true, contact: null, saving: false, saveError: null })
  }

  function openEditDialog(c: PropertyContact) {
    setForm(contactToForm(c))
    setDialog({ open: true, contact: c, saving: false, saveError: null })
  }

  function closeDialog() {
    if (dialog.saving) return
    setDialog({ open: false, contact: null, saving: false, saveError: null })
  }

  async function saveContact(opts?: { keepOpen?: boolean }) {
    if (!form.entityName.trim()) {
      setDialog((prev) => ({ ...prev, saveError: "Name is required." }))
      return
    }
    setDialog((prev) => ({ ...prev, saving: true, saveError: null }))

    const isEdit = dialog.contact != null

    try {
      if (isEdit) {
        const entityId = dialog.contact!.entityId
        const res = await fetch(`/api/admin/entities/${entityId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityName: form.entityName.trim(),
            contact: form.phoneNumber.trim() || null,
            emailAddress: form.emailAddress.trim() || null,
            address: form.address.trim() || null,
            esuburb: form.esuburb.trim() || null,
            estate: form.estate.trim() || null,
            epostcode: form.epostcode.trim() || null,
            notes: form.notes.trim() || null,
            contactCategoryId: form.contactCategoryId,
            association: form.association || null,
          }),
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(data.error ?? `Save failed (${res.status})`)
        }
      } else {
        if (propertyListId == null) {
          setDialog((prev) => ({ ...prev, saving: false, saveError: "Property not saved yet." }))
          return
        }
        const entityRes = await fetch("/api/admin/entities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityCategoryId: "4",
            entityName: form.entityName.trim(),
            contact: form.phoneNumber.trim() || null,
            emailAddress: form.emailAddress.trim() || null,
            address: form.address.trim() || null,
            esuburb: form.esuburb.trim() || null,
            estate: form.estate.trim() || null,
            epostcode: form.epostcode.trim() || null,
            notes: form.notes.trim() || null,
            contactCategoryId: form.contactCategoryId,
            association: form.association || null,
          }),
        })
        if (!entityRes.ok) {
          const data = (await entityRes.json().catch(() => ({}))) as { error?: string }
          throw new Error(data.error ?? `Failed to create contact (${entityRes.status})`)
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
          void fetch(`/api/admin/entities/${newEntity.entityId}`, { method: "DELETE" }).catch(() => {})
          const data = (await linkRes.json().catch(() => ({}))) as { error?: string }
          throw new Error(data.error ?? `Failed to link contact (${linkRes.status})`)
        }
        emitGoogleContactsPatchWarnings(
          (await linkRes.json().catch(() => null)) as Record<string, unknown> | null,
        )
      }

      await loadContacts()
      if (opts?.keepOpen) {
        setForm(EMPTY_CONTACT_FORM)
        setDialog({ open: true, contact: null, saving: false, saveError: null })
      } else {
        setDialog({ open: false, contact: null, saving: false, saveError: null })
      }
    } catch (err) {
      setDialog((prev) => ({
        ...prev,
        saving: false,
        saveError: err instanceof Error ? err.message : "Save failed.",
      }))
    }
  }

  function openDeleteDialog(c: PropertyContact) {
    setDeleteDialog({ open: true, contact: c, deleting: false })
  }

  function closeDeleteDialog() {
    if (deleteDialog.deleting) return
    setDeleteDialog({ open: false, contact: null, deleting: false })
  }

  async function confirmDelete() {
    if (!deleteDialog.contact) return
    setDeleteDialog((prev) => ({ ...prev, deleting: true }))
    const { propertyEntityId } = deleteDialog.contact
    try {
      const res = await fetch(`/api/admin/property-entities/${propertyEntityId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      setContacts((prev) => prev.filter((c) => c.propertyEntityId !== propertyEntityId))
      setDeleteDialog({ open: false, contact: null, deleting: false })
    } catch (err) {
      console.error("Delete failed", err)
      setDeleteDialog((prev) => ({ ...prev, deleting: false }))
    }
  }

  return {
    contacts,
    loading,
    loadError,
    categories,
    dialog,
    setDialog,
    form,
    setForm,
    deleteDialog,
    openAddDialog,
    openEditDialog,
    closeDialog,
    saveContact,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
    ...search,
  }
}
