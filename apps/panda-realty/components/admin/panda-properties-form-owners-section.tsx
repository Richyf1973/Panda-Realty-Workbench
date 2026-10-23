"use client"

import { useEffect, useState } from "react"
import { useStore, type Store } from "@tanstack/react-store"

import { Button } from "@repo/ui/button"

import type { EntityThreadForwardDraft, EntityThreadReplyDraft } from "./entity-threads-panel"
import { GmailComposeDialog, type GmailForwardContext } from "./gmail-compose-dialog"
import type { FormLike } from "./panda-properties-dialog-form-types"
import { ownerHasData, OwnerRow, type FormValues } from "./panda-properties-form-owner-row"

export function PandaPropertiesFormOwnersSection({
  form,
  propertyListId,
}: {
  form: FormLike
  propertyListId: number | null
}) {
  const owner2HasData = useStore(form.store as Store<{ values: FormValues }>, (s) =>
    ownerHasData(s.values ?? {}, "owner2"),
  )
  const owner3HasData = useStore(form.store as Store<{ values: FormValues }>, (s) =>
    ownerHasData(s.values ?? {}, "owner3"),
  )

  const primaryPhoneOwnerNumRaw = useStore(
    form.store as Store<{ values: Record<string, unknown> }>,
    (s) => (s.values ?? {})["primaryPhoneOwnerNum"],
  )
  const primaryEmailOwnerNumRaw = useStore(
    form.store as Store<{ values: Record<string, unknown> }>,
    (s) => (s.values ?? {})["primaryEmailOwnerNum"],
  )
  const primaryPhoneOwnerNum: 1 | 2 | 3 =
    primaryPhoneOwnerNumRaw === 2 || primaryPhoneOwnerNumRaw === "2" ? 2 :
    primaryPhoneOwnerNumRaw === 3 || primaryPhoneOwnerNumRaw === "3" ? 3 : 1
  const primaryEmailOwnerNum: 1 | 2 | 3 =
    primaryEmailOwnerNumRaw === 2 || primaryEmailOwnerNumRaw === "2" ? 2 :
    primaryEmailOwnerNumRaw === 3 || primaryEmailOwnerNumRaw === "3" ? 3 : 1

  const [userAddedOwner2, setUserAddedOwner2] = useState(false)
  const [userAddedOwner3, setUserAddedOwner3] = useState(false)
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null)
  const [composeDialog, setComposeDialog] = useState<{
    open: boolean
    email: string
    name: string
    subject: string
    body: string
    replyContext?: { threadId: string; messageId: string }
  }>({ open: false, email: "", name: "", subject: "", body: "" })
  const [forwardDraft, setForwardDraft] = useState<GmailForwardContext | null>(null)

  const showOwner2 = owner2HasData || owner3HasData || userAddedOwner2
  const showOwner3 = owner3HasData || (showOwner2 && userAddedOwner3)
  const canAddOwner = !showOwner2 || !showOwner3

  const streetAddress = useStore(
    form.store as Store<{ values: FormValues }>,
    (s) => String((s.values ?? {})["streetAddress"] ?? ""),
  )
  const suburb = useStore(
    form.store as Store<{ values: FormValues }>,
    (s) => String((s.values ?? {})["suburb"] ?? ""),
  )
  const composeSubject = [streetAddress, suburb].filter(Boolean).join(", ")
  const propertyLabel = composeSubject

  function handleAddOwner() {
    if (!showOwner2) setUserAddedOwner2(true)
    else setUserAddedOwner3(true)
  }

  function handleDeleteOwner1() {
    for (const field of ["name", "address", "phone", "email", "mobile", "abn"] as const) {
      form.setFieldValue(`owner1${field}`, "")
    }
  }

  function handleDeleteOwner2() {
    for (const field of ["name", "address", "phone", "email", "mobile"] as const) {
      form.setFieldValue(`owner2${field}`, "")
      form.setFieldValue(`owner3${field}`, "")
    }
    setUserAddedOwner2(false)
    setUserAddedOwner3(false)
  }

  function handleDeleteOwner3() {
    for (const field of ["name", "address", "phone", "email"] as const) {
      form.setFieldValue(`owner3${field}`, "")
    }
    setUserAddedOwner3(false)
  }

  function handleCopyDown() {
    const address = (form.getFieldValue("owner1address") as string) ?? ""
    const phone = (form.getFieldValue("owner1phone") as string) ?? ""
    const email = (form.getFieldValue("owner1email") as string) ?? ""
    const mobile = (form.getFieldValue("owner1mobile") as string) ?? ""
    for (const prefix of ["owner2", "owner3"] as const) {
      const show = prefix === "owner2" ? showOwner2 : showOwner3
      if (!show) continue
      form.setFieldValue(`${prefix}address`, address)
      form.setFieldValue(`${prefix}phone`, phone)
      form.setFieldValue(`${prefix}email`, email)
      form.setFieldValue(`${prefix}mobile`, mobile)
    }
  }

  function handleSetPrimaryPhone(n: 1 | 2 | 3) {
    form.setFieldValue("primaryPhoneOwnerNum", String(n))
  }

  function handleSetPrimaryEmail(n: 1 | 2 | 3) {
    form.setFieldValue("primaryEmailOwnerNum", String(n))
  }

  function handleCompose(email: string, name: string) {
    setComposeDialog({ open: true, email, name, subject: composeSubject, body: `Dear ${name},\n\n` })
  }

  function handleReply(name: string, draft: EntityThreadReplyDraft) {
    setComposeDialog({
      open: true,
      email: draft.to,
      name,
      subject: draft.subject,
      body: `Dear ${name},\n\n`,
      replyContext: { threadId: draft.threadId, messageId: draft.messageId },
    })
  }

  function handleForward(draft: EntityThreadForwardDraft) {
    setForwardDraft({
      messageId: draft.messageId,
      from: draft.from,
      date: draft.date,
      subject: draft.subject,
      body: draft.body,
      attachments: draft.attachments,
    })
  }

  useEffect(() => {
    if (propertyListId == null) {
      setCalendarConnected(null)
      return
    }
    let cancelled = false
    void fetch("/api/admin/calendar/status")
      .then((r) => r.json())
      .then((data: { connected: boolean }) => { if (!cancelled) setCalendarConnected(data.connected) })
      .catch(() => { if (!cancelled) setCalendarConnected(false) })
    return () => { cancelled = true }
  }, [propertyListId])

  const sharedRowProps = {
    form, propertyListId, propertyLabel, calendarConnected,
    primaryPhoneOwnerNum, primaryEmailOwnerNum,
    onSetPrimaryPhone: handleSetPrimaryPhone,
    onSetPrimaryEmail: handleSetPrimaryEmail,
    onCompose: handleCompose, onReply: handleReply, onForward: handleForward,
  }

  return (
    <div className="shrink-0 border-b" data-testid="panda-properties-form-section--owners">
      <div className="space-y-2 p-4 pb-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" data-testid="panda-properties-form-owners-section-title">
            Owner information
          </p>
          {showOwner2 && (
            <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" title="Copy address, phone and email from row 1 to all rows below" data-testid="panda-properties-form-owners-copy-down" onClick={handleCopyDown}>
              Copy down
            </Button>
          )}
        </div>
        <div className="hidden gap-x-4 md:grid md:grid-cols-4" aria-hidden={true} data-testid="panda-properties-form-owners-column-headers">
          <span className="text-xs font-medium text-muted-foreground">Name</span>
          <span className="text-xs font-medium text-muted-foreground">Address</span>
          <span className="text-xs font-medium text-muted-foreground">Phone</span>
          <span className="text-xs font-medium text-muted-foreground">Email</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-3 px-4 pb-4 pt-0 md:grid-cols-4">
        <OwnerRow {...sharedRowProps} ownerNum={1} prefix="owner1" onDelete={handleDeleteOwner1} />
        {showOwner2 && <OwnerRow {...sharedRowProps} ownerNum={2} prefix="owner2" onDelete={handleDeleteOwner2} />}
        {showOwner3 && <OwnerRow {...sharedRowProps} ownerNum={3} prefix="owner3" onDelete={handleDeleteOwner3} />}
        {canAddOwner && (
          <div className="md:col-span-4">
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={handleAddOwner}>
              + Add owner
            </Button>
          </div>
        )}
      </div>

      {composeDialog.open && (
        <GmailComposeDialog
          key={`${composeDialog.email}-${composeDialog.name}`}
          open={composeDialog.open}
          to={composeDialog.email}
          subject={composeDialog.subject}
          body={composeDialog.body}
          propertyListId={propertyListId}
          replyContext={composeDialog.replyContext}
          onClose={() => setComposeDialog({ open: false, email: "", name: "", subject: "", body: "" })}
          inline
        />
      )}
      {forwardDraft && (
        <GmailComposeDialog
          key={`forward-${forwardDraft.messageId}`}
          open={true}
          to=""
          subject=""
          body=""
          propertyListId={propertyListId}
          forwardContext={forwardDraft}
          onClose={() => setForwardDraft(null)}
          inline
        />
      )}
    </div>
  )
}
