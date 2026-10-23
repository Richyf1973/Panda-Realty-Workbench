"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import {
  EMPTY_FORM,
  memberToForm,
  type DeleteDialogState,
  type EntityMember,
  type MemberDialogState,
  type MemberFormState,
} from "./buyer-member-types"

function normalizeEntityMember(raw: EntityMember): EntityMember {
  return {
    ...raw,
    isBuyersRepresentative: raw.isBuyersRepresentative === true,
  }
}

export function usePropertyEntityBuyerMembers({
  entityId,
  variant,
}: {
  entityId: number | null
  variant: "create" | "edit"
}) {
  const [members, setMembers] = useState<EntityMember[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [memberDialog, setMemberDialog] = useState<MemberDialogState>({
    open: false,
    member: null,
    saving: false,
    saveError: null,
    calendarOpen: false,
  })
  const [form, setForm] = useState<MemberFormState>(EMPTY_FORM)

  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    open: false,
    member: null,
    deleting: false,
  })
  const [repPatchMemberId, setRepPatchMemberId] = useState<number | null>(null)

  const loadMembers = useCallback(async (signal?: AbortSignal) => {
    if (entityId == null) return
    setLoading(true)
    setLoadError(null)
    try {
      const res = await fetch(
        `/api/admin/entity-members?entityId=${entityId}&limit=200`,
        { signal },
      )
      if (!res.ok) throw new Error(`Failed to load members (${res.status})`)
      const data = (await res.json()) as { items: EntityMember[] }
      setMembers((data.items ?? []).map(normalizeEntityMember))
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return
      setLoadError(
        err instanceof Error ? err.message : "Failed to load members.",
      )
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
    setForm(EMPTY_FORM)
    setMemberDialog({ open: true, member: null, saving: false, saveError: null, calendarOpen: false })
  }

  function openEditDialog(m: EntityMember) {
    setForm(memberToForm(m))
    setMemberDialog({ open: true, member: m, saving: false, saveError: null, calendarOpen: false })
  }

  function closeMemberDialog() {
    if (memberDialog.saving) return
    setMemberDialog({ open: false, member: null, saving: false, saveError: null, calendarOpen: false })
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
          memberAddress: form.memberAddress.trim() || null,
          propertyToSellAddress: form.propertyToSellAddress.trim() || null,
          scheduledViewingDate: form.scheduledViewingDate || null,
          isBuyersRepresentative: form.isBuyersRepresentative,
        }
      : {
          entityId: String(entityId),
          memberName: form.memberName.trim(),
          memberPhoneNumber: form.memberPhoneNumber.trim() || null,
          memberEmailAddress: form.memberEmailAddress.trim() || null,
          memberAddress: form.memberAddress.trim() || null,
          propertyToSellAddress: form.propertyToSellAddress.trim() || null,
          scheduledViewingDate: form.scheduledViewingDate || null,
          isBuyersRepresentative: form.isBuyersRepresentative,
        }

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          detail?: string
        }
        const base = data.error ?? `Save failed (${res.status})`
        const detail = data.detail?.trim()
        throw new Error(detail ? `${base} — ${detail}` : base)
      }
      const saved = (await res.json()) as EntityMember

      void fetch(`/api/admin/entity-members/${saved.entityMemberId}/calendar-sync`, {
        method: "POST",
      }).catch(() => undefined)

      await loadMembers()
      setMemberDialog({ open: false, member: null, saving: false, saveError: null, calendarOpen: false })
    } catch (err) {
      setMemberDialog((prev) => ({
        ...prev,
        saving: false,
        saveError: err instanceof Error ? err.message : "Save failed.",
      }))
    }
  }

  function openDeleteDialog(m: EntityMember) {
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
      const res = await fetch(`/api/admin/entity-members/${memberId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)

      void fetch(`/api/admin/entity-members/${memberId}/calendar-sync`, {
        method: "POST",
      }).catch(() => undefined)

      setMembers((prev) => prev.filter((m) => m.entityMemberId !== memberId))
      setDeleteDialog({ open: false, member: null, deleting: false })
    } catch (err) {
      console.error("Delete failed", err)
      setDeleteDialog((prev) => ({ ...prev, deleting: false }))
    }
  }

  async function patchBuyersRepresentative(
    memberId: number,
    isBuyersRepresentative: boolean,
  ) {
    setRepPatchMemberId(memberId)
    try {
      const res = await fetch(`/api/admin/entity-members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBuyersRepresentative }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          detail?: string
        }
        const base = data.error ?? `Update failed (${res.status})`
        const detail = data.detail?.trim()
        throw new Error(detail ? `${base} — ${detail}` : base)
      }
      await loadMembers()
    } catch (err) {
      console.error(err)
      setLoadError(
        err instanceof Error ? err.message : "Could not update representative.",
      )
    } finally {
      setRepPatchMemberId(null)
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
    repPatchMemberId,
    openAddDialog,
    openEditDialog,
    closeMemberDialog,
    saveMember,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
    patchBuyersRepresentative,
  }
}
