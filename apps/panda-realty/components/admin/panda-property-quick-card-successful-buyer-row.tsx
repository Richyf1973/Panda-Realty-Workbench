"use client"

import type { AdminRenderQuickDesktopCardSuccessfulBuyerRowArgs } from "@repo/admin/admin-client-registry-context"

import { AddMeetingDialog } from "@/app/admin/properties/board/add-meeting-dialog"
import { AddReminderDialog } from "@/app/admin/properties/board/add-reminder-dialog"
import { useCalendarStatus } from "@/lib/admin/panda-calendar-status-context"

import { AddBuyerNoteDialog } from "./add-buyer-note-dialog"
import { PandaPropertyQuickCardContactActionsRow } from "./panda-property-quick-card-contact-actions-row"

type SuccessfulBuyerQuickCardRowProps = {
  readonly propertyListId: number
  readonly propertyEntityId: number
  readonly entityId: number
  readonly name: string
  readonly phone: string | null
  readonly email: string | null
  readonly composeSubject: string
}

function SuccessfulBuyerQuickCardRow(args: SuccessfulBuyerQuickCardRowProps) {
  const { propertyListId, propertyEntityId, entityId, name, phone, email, composeSubject } = args
  const calendarConnected = useCalendarStatus()

  const buyer = {
    propertyEntityId,
    entityId,
    entityName: name,
    phoneNumber: phone,
    emailAddress: email,
    memberPropertyToSellAddress: null,
    memberResidenceAddress: null,
    offers: [] as never[],
  }

  return (
    <PandaPropertyQuickCardContactActionsRow
      testIdPrefix="property-successful-buyer"
      rowId={propertyListId}
      name={name}
      phone={phone}
      email={email}
      composeSubject={composeSubject}
      calendarConnected={calendarConnected}
      titleContent={
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Successful Buyer</span>
          <span className="min-w-0 text-sm font-medium leading-snug text-foreground [overflow-wrap:anywhere]">
            {name}
          </span>
        </div>
      }
      renderDialogs={({ addEventOpen, addNoteOpen, addReminderOpen, setAddEventOpen, setAddNoteOpen, setAddReminderOpen }) => (
        <>
          <AddMeetingDialog
            open={addEventOpen}
            onOpenChange={setAddEventOpen}
            propertyListId={propertyListId}
            buyers={[buyer]}
            onAdded={() => undefined}
            onSyncError={() => undefined}
            defaultTitle={`Meeting with ${name}`}
            defaultBuyerId={propertyEntityId}
          />

          <AddBuyerNoteDialog
            open={addNoteOpen}
            onOpenChange={setAddNoteOpen}
            propertyEntityId={propertyEntityId}
            onSuccess={() => setAddNoteOpen(false)}
          />

          <AddReminderDialog
            open={addReminderOpen}
            onOpenChange={setAddReminderOpen}
            propertyListId={propertyListId}
            buyers={[buyer]}
            defaultBuyerId={propertyEntityId}
            onAdded={() => undefined}
          />
        </>
      )}
    />
  )
}

export function renderPandaPropertyQuickCardSuccessfulBuyerRow({
  slug,
  row,
}: AdminRenderQuickDesktopCardSuccessfulBuyerRowArgs) {
  if (slug !== "properties") {
    return undefined
  }

  const name = typeof row["successfulBuyer"] === "string" ? row["successfulBuyer"].trim() : ""
  const propertyListId = typeof row["propertyListId"] === "number" ? row["propertyListId"] : null
  const propertyEntityId =
    typeof row["successfulBuyerPropertyEntityId"] === "number"
      ? row["successfulBuyerPropertyEntityId"]
      : null
  const entityId = typeof row["successfulBuyerEntityId"] === "number" ? row["successfulBuyerEntityId"] : null
  const phone =
    typeof row["successfulBuyerPhoneNumber"] === "string"
      ? row["successfulBuyerPhoneNumber"].trim() || null
      : null
  const email =
    typeof row["successfulBuyerEmailAddress"] === "string"
      ? row["successfulBuyerEmailAddress"].trim() || null
      : null
  const streetAddress = typeof row["streetAddress"] === "string" ? row["streetAddress"].trim() : ""
  const suburb = typeof row["suburb"] === "string" ? row["suburb"].trim() : ""
  const composeSubject = [streetAddress, suburb].filter(Boolean).join(", ")

  if (!name || propertyListId == null || propertyEntityId == null || entityId == null) {
    return undefined
  }

  return {
    suppressDefaultSuccessfulBuyer: true,
    content: (
      <SuccessfulBuyerQuickCardRow
        propertyListId={propertyListId}
        propertyEntityId={propertyEntityId}
        entityId={entityId}
        name={name}
        phone={phone}
        email={email}
        composeSubject={composeSubject}
      />
    ),
  }
}
