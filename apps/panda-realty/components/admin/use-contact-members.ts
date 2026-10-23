"use client"

import { useCallback, useEffect, useState } from "react"

import {
  contactMemberToForm,
  EMPTY_CONTACT_MEMBER_FORM,
  type ContactMember,
  type ContactMemberDeleteDialogState,
  type ContactMemberDialogState,
  type ContactMemberFormState,
} from "./contact-member-types"

export function useContactMembers({
  entityId,
  variant,
}: {
  entityId: number | null
  variant: "create" | "edit"
}) {
  const [members, setMembers] = useState<ContactMember[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [memberDialog, setMemberDialog] = useState<ContactMemberDialogState>({
    open: false,
    member: null,
    saving: false,
    saveError: null,
  })
  const [form, setForm] = useState<ContactMemberFormState>(EMPTY_CONTACT_MEMBER_FORM)

  const [deleteDialog, setDeleteDialog] = useState<ContactMemberDeleteDialogState>({
    open: false,
    member: null,
    deleting: false,
  })

  const loadMembers = useCallback(async (signal?: AbortSignal) => {
    if (entityId == null) return
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(
        `/api/admin/entity-members?entityId=${entityId}&limit=200`,
        { signal },
      )
      if (!res.ok) throw new Error(`Failed to load representatives (${res.status})`)
      const data = (await res.json()) as { items: ContactMember[] }
      setMembers(data.items ?? [])
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      setLoadError(err instanceof Error ? err.message : "Failed to load representatives.")
    } finally {
      setLoading(false)
    }
  }, [entityId])

  useEffect(() => {
    if (variant === "edit") {
      const controller = new AbortController()
      void loadMembers(controller.signal)
      return () => controller.abort()
    }
    setLoading(false)
  }, [variant, loadMembers])

  function openAddDialog() {
    setForm(EMPTY_CONTACT_MEMBER_FORM)
    setMemberDialog({ open: true, member: null, saving: false, saveError: null })
  }

  function openEditDialog(m: ContactMember) {
    setForm(contactMemberToForm(m))
    setMemberDialog({ open: true, member: m, saving: false, saveError: null })
  }

  function closeMemberDialog() {
    if (memberDialog.saving) return
    setMemberDialog({ open: false, member: null, saving: false, saveError: null })
  }

  async function saveMember() {
    if (!form.memberName.trim()) {
      setMemberDialog((prev) => ({ ...prev, saveError: "Name is required." }))
      return
    }
    setMemberDialog((prev) => ({ ...prev, saving: true, saveError: null }))

    const isEdit = memberDialog.member != null
    if (!isEdit && entityId == null) {
      setMemberDialog((prev) => ({ ...prev, saving: false, saveError: "Entity not loaded yet." }))
      return
    }

    const url = isEdit
      ? `/api/admin/entity-members/${memberDialog.member!.entityMemberId}`
      : "/api/admin/entity-members"
    const method = isEdit ? "PATCH" : "POST"
    const body = isEdit
      ? {
          memberName: form.memberName.trim(),
          memberPhoneNumber: form.memberPhoneNumber.trim() || null,
          memberEmailAddress: form.memberEmailAddress.trim() || null,
        }
      : {
          entityId: String(entityId),
          memberName: form.memberName.trim(),
          memberPhoneNumber: form.memberPhoneNumber.trim() || null,
          memberEmailAddress: form.memberEmailAddress.trim() || null,
        }

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; detail?: string }
        const base = data.error ?? `Save failed (${res.status})`
        const detail = data.detail?.trim()
        throw new Error(detail ? `${base} — ${detail}` : base)
      }
      await loadMembers()
      setMemberDialog({ open: false, member: null, saving: false, saveError: null })
    } catch (err) {
      setMemberDialog((prev) => ({
        ...prev,
        saving: false,
        saveError: err instanceof Error ? err.message : "Save failed.",
      }))
    }
  }

  function openDeleteDialog(m: ContactMember) {
    setDeleteDialog({ open: true, member: m, deleting: false })
  }

  function closeDeleteDialog() {
    if (deleteDialog.deleting) return
    setDeleteDialog({ open: false, member: null, deleting: false })
  }

  async function confirmDelete() {
    if (!deleteDialog.member) return
    setDeleteDialog((prev) => ({ ...prev, deleting: true }))
    const memberId = deleteDialog.member.entityMemberId
    try {
      const res = await fetch(`/api/admin/entity-members/${memberId}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      setMembers((prev) => prev.filter((m) => m.entityMemberId !== memberId))
      setDeleteDialog({ open: false, member: null, deleting: false })
    } catch (err) {
      console.error("Delete failed", err)
      setDeleteDialog((prev) => ({ ...prev, deleting: false }))
    }
  }

  return {
    members,
    loading,
    loadError,
    memberDialog,
    setMemberDialog,
    form,
    setForm,
    deleteDialog,
    openAddDialog,
    openEditDialog,
    closeMemberDialog,
    saveMember,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
  }
}
