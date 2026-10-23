"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@repo/ui/utils"
import { normalizeEmailSignatureHtml } from "@/lib/email-signature-render"

import { cloneForForm } from "./email-signatures/html"
import { SignatureEditorPanel } from "./email-signatures/signature-editor-panel"
import { SignatureListPanel } from "./email-signatures/signature-list-panel"
import { EMPTY_FORM, type EmailSignatureForm, type EmailSignatureItem } from "./email-signatures/types"
import { type RichEmailEditorHandle } from "./rich-email-editor"

export function EmailSignaturesPage() {
  const [items, setItems] = useState<EmailSignatureItem[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [listPanelOpen, setListPanelOpen] = useState(false)
  const [form, setForm] = useState<EmailSignatureForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeUploadCount, setActiveUploadCount] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const editorRef = useRef<RichEmailEditorHandle | null>(null)
  const editorLocked = saving || activeUploadCount > 0

  function setFormFromItem(nextSelectedId: number | null, nextForm: EmailSignatureForm) {
    setSelectedId(nextSelectedId)
    setForm(nextForm)
    setErrors({})
  }

  async function loadItems() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/email-signatures")
      const data = (await res.json()) as { items?: EmailSignatureItem[] }
      const nextItems = data.items ?? []
      setItems(nextItems)

      const currentSelected =
        selectedId == null ? null : nextItems.find((item) => item.id === selectedId) ?? null
      if (currentSelected) {
        setFormFromItem(currentSelected.id, cloneForForm(currentSelected))
        return
      }

      const first = nextItems[0] ?? null
      if (first) {
        setFormFromItem(first.id, cloneForForm(first))
      } else {
        setFormFromItem(null, EMPTY_FORM)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function startCreate() {
    setListPanelOpen(false)
    setFormFromItem(null, {
      ...EMPTY_FORM,
      isDefault: items.length === 0,
    })
  }

  function selectItem(item: EmailSignatureItem) {
    setFormFromItem(item.id, cloneForForm(item))
  }

  async function handleSave() {
    setSaving(true)
    setErrors({})

    const htmlContent = normalizeEmailSignatureHtml(
      editorRef.current?.getHtml() ?? form.htmlContent,
    )
    const payload = {
      name: form.name,
      isDefault: form.isDefault,
      htmlContent,
    }

    try {
      const endpoint =
        selectedId == null
          ? "/api/admin/email-signatures"
          : `/api/admin/email-signatures/${selectedId}`
      const method = selectedId == null ? "POST" : "PATCH"
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await res.json().catch(() => ({}))) as
        | (EmailSignatureItem & { errors?: Record<string, string> })
        | { errors?: Record<string, string> }

      if (!res.ok) {
        setErrors(data.errors ?? {})
        return
      }

      const saved = data as EmailSignatureItem
      let nextItems =
        selectedId == null
          ? [...items, saved]
          : items.map((item) => (item.id === saved.id ? saved : item))

      if (saved.isDefault) {
        nextItems = nextItems.map((item) =>
          item.id === saved.id ? item : { ...item, isDefault: false },
        )
      }

      nextItems.sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.id - b.id)
      setItems(nextItems)
      setFormFromItem(saved.id, cloneForForm(saved))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className={cn(
        "grid gap-6",
        listPanelOpen
          ? "xl:grid-cols-[280px_minmax(0,1fr)]"
          : "xl:grid-cols-[72px_minmax(0,1fr)]",
      )}
      data-testid="email-signatures-page"
    >
      <SignatureListPanel
        items={items}
        listPanelOpen={listPanelOpen}
        selectedId={selectedId}
        onOpenChange={setListPanelOpen}
        onSelectItem={selectItem}
      />

      <SignatureEditorPanel
        selectedId={selectedId}
        form={form}
        loading={loading}
        saving={saving}
        listPanelOpen={listPanelOpen}
        editorLocked={editorLocked}
        errors={errors}
        editorRef={editorRef}
        onToggleListPanel={() => setListPanelOpen((open) => !open)}
        onStartCreate={startCreate}
        onSetDefault={() => setForm((current) => ({ ...current, isDefault: true }))}
        onNameChange={(value) => setForm((current) => ({ ...current, name: value }))}
        onEditorChange={(value) =>
          setForm((current) => ({
            ...current,
            htmlContent: value,
            renderedHtml: value,
          }))
        }
        onEditorUploadCountChange={setActiveUploadCount}
        onRefresh={() => void loadItems()}
        onSave={() => void handleSave()}
      />
    </div>
  )
}
