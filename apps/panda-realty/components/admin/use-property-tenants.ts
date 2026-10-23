"use client"

import { useCallback, useEffect, useState } from "react"

import {
  EMPTY_TENANT_FORM,
  tenantToForm,
  type PropertyTenant,
  type TenantDeleteDialogState,
  type TenantDialogState,
  type TenantFormState,
} from "./property-tenant-types"

export function usePropertyTenants({
  propertyListId,
  variant,
}: {
  propertyListId: number | null
  variant: "create" | "edit"
}) {
  const [tenants, setTenants] = useState<PropertyTenant[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [dialog, setDialog] = useState<TenantDialogState>({
    open: false,
    tenant: null,
    saving: false,
    saveError: null,
  })
  const [form, setForm] = useState<TenantFormState>(EMPTY_TENANT_FORM)

  const [deleteDialog, setDeleteDialog] = useState<TenantDeleteDialogState>({
    open: false,
    tenant: null,
    deleting: false,
  })

  const loadTenants = useCallback(async (signal?: AbortSignal) => {
    if (propertyListId == null) return
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(`/api/admin/properties/${propertyListId}/tenants`, { signal })
      if (!res.ok) throw new Error(`Failed to load tenants (${res.status})`)
      const data = (await res.json()) as { items: PropertyTenant[] }
      setTenants(data.items ?? [])
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      setLoadError(err instanceof Error ? err.message : "Failed to load tenants.")
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [propertyListId])

  useEffect(() => {
    if (variant === "edit") {
      const controller = new AbortController()
      void loadTenants(controller.signal)
      return () => controller.abort()
    }
    setLoading(false)
  }, [variant, loadTenants])

  function openAddDialog() {
    setForm(EMPTY_TENANT_FORM)
    setDialog({ open: true, tenant: null, saving: false, saveError: null })
  }

  function openEditDialog(t: PropertyTenant) {
    setForm(tenantToForm(t))
    setDialog({ open: true, tenant: t, saving: false, saveError: null })
  }

  function closeDialog() {
    if (dialog.saving) return
    setDialog({ open: false, tenant: null, saving: false, saveError: null })
  }

  async function saveTenant() {
    if (!form.entityName.trim()) {
      setDialog((prev) => ({ ...prev, saveError: "Name is required." }))
      return
    }
    setDialog((prev) => ({ ...prev, saving: true, saveError: null }))

    const isEdit = dialog.tenant != null
    const payload = {
      entityName: form.entityName.trim(),
      contact: form.phone.trim() || null,
      emailAddress: form.emailAddress.trim() || null,
      address: form.address.trim() || null,
      esuburb: form.esuburb.trim() || null,
      estate: form.estate.trim() || null,
      epostcode: form.epostcode.trim() || null,
      notes: form.notes.trim() || null,
    }

    try {
      if (isEdit) {
        const res = await fetch(`/api/admin/entities/${dialog.tenant!.entityId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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
          body: JSON.stringify({ ...payload, entityCategoryId: "3" }),
        })
        if (!entityRes.ok) {
          const data = (await entityRes.json().catch(() => ({}))) as { error?: string }
          throw new Error(data.error ?? `Failed to create tenant (${entityRes.status})`)
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
          throw new Error(data.error ?? `Failed to link tenant (${linkRes.status})`)
        }
      }

      await loadTenants()
      setDialog({ open: false, tenant: null, saving: false, saveError: null })
    } catch (err) {
      setDialog((prev) => ({
        ...prev,
        saving: false,
        saveError: err instanceof Error ? err.message : "Save failed.",
      }))
    }
  }

  function openDeleteDialog(t: PropertyTenant) {
    setDeleteDialog({ open: true, tenant: t, deleting: false })
  }

  function closeDeleteDialog() {
    if (deleteDialog.deleting) return
    setDeleteDialog({ open: false, tenant: null, deleting: false })
  }

  async function confirmDelete() {
    if (!deleteDialog.tenant) return
    setDeleteDialog((prev) => ({ ...prev, deleting: true }))
    const { propertyEntityId } = deleteDialog.tenant
    try {
      const res = await fetch(`/api/admin/property-entities/${propertyEntityId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      setTenants((prev) => prev.filter((t) => t.propertyEntityId !== propertyEntityId))
      setDeleteDialog({ open: false, tenant: null, deleting: false })
    } catch (err) {
      console.error("Delete failed", err)
      setDeleteDialog((prev) => ({ ...prev, deleting: false }))
    }
  }

  return {
    tenants,
    loading,
    loadError,
    dialog,
    setDialog,
    form,
    setForm,
    deleteDialog,
    openAddDialog,
    openEditDialog,
    closeDialog,
    saveTenant,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
  }
}
