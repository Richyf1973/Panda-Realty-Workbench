"use client"

import { useEffect, useState } from "react"

import { useDriveSync } from "@/lib/use-drive-sync"
import { useDriveUpload } from "@/lib/use-drive-upload"
import { usePropertyFiles } from "@/lib/use-property-files"
import type { PropertyDialogAggregateFileRow } from "@/lib/property-list-files-aggregate.types"

export function useFilesTab({
  hasSavedProperty,
  listIdNum,
}: {
  hasSavedProperty: boolean
  listIdNum: number
}) {
  const { items, setItems, loading, setLoading, loadError, loadItems } = usePropertyFiles(hasSavedProperty, listIdNum)

  const [folderCreating, setFolderCreating] = useState(false)
  const [folderResult, setFolderResult] = useState<{ folderId: string; folderName: string } | null>(null)
  const [folderError, setFolderError] = useState<string | null>(null)

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    row: PropertyDialogAggregateFileRow | null
    deleting: boolean
    deleteError: string | null
  }>({ open: false, row: null, deleting: false, deleteError: null })

  useEffect(() => {
    if (hasSavedProperty) {
      void loadItems()
    } else {
      setLoading(false)
      setItems([])
    }
  }, [hasSavedProperty, loadItems, setItems, setLoading])

  const driveUpload = useDriveUpload({
    initiateUrl: "/api/admin/property-list-files/initiate-upload",
    initiateExtraFields: { propertyListId: listIdNum },
    recordUrl: "/api/admin/property-list-files/record-upload",
    recordExtraFields: { propertyListId: listIdNum },
    onRecordSuccess: async () => { await loadItems() },
  })

  const driveSync = useDriveSync({
    hasSavedProperty,
    listIdNum,
    onSyncSuccess: loadItems,
  })

  async function handleCreateFolder() {
    if (!hasSavedProperty) return
    setFolderCreating(true)
    setFolderError(null)
    try {
      const res = await fetch("/api/admin/property-list-files/create-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyListId: listIdNum }),
      })
      const data = (await res.json().catch(() => ({}))) as { folderId?: string; folderName?: string; error?: string }
      if (!res.ok) {
        throw new Error(data.error ?? `Failed to create folder (${res.status})`)
      }
      setFolderResult({ folderId: data.folderId!, folderName: data.folderName! })
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : "Failed to create Drive folder.")
    } finally {
      setFolderCreating(false)
    }
  }

  function openDeleteDialog(row: PropertyDialogAggregateFileRow) {
    setDeleteDialog({ open: true, row, deleting: false, deleteError: null })
  }

  function closeDeleteDialog() {
    if (deleteDialog.deleting) return
    setDeleteDialog({ open: false, row: null, deleting: false, deleteError: null })
  }

  async function confirmDelete() {
    const row = deleteDialog.row
    if (!row || !hasSavedProperty) return
    setDeleteDialog((prev) => ({ ...prev, deleting: true, deleteError: null }))
    try {
      const url =
        row.kind === "property"
          ? `/api/admin/property-list-files/${row.propertyListFileId ?? row.id}`
          : `/api/admin/property-entity-files/${row.propertyEntityFileId ?? row.id}?propertyListId=${listIdNum}`

      const res = await fetch(url, { method: "DELETE" })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `Delete failed (${res.status})`)
      }
      setItems((prev) => prev.filter((r) => !(r.kind === row.kind && r.id === row.id)))
      setDeleteDialog({ open: false, row: null, deleting: false, deleteError: null })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed. Please try again."
      setDeleteDialog((prev) => ({ ...prev, deleting: false, deleteError: msg }))
    }
  }

  return {
    items,
    loading,
    loadError,
    folderCreating,
    folderResult,
    folderError,
    deleteDialog,
    handleCreateFolder,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,
    ...driveUpload,
    ...driveSync,
  }
}
