"use client"

import type { AdminRenderQuickDesktopCardOwnerRowsArgs } from "@repo/admin/admin-client-registry-context"

import { AddMeetingDialog } from "@/app/admin/properties/board/add-meeting-dialog"
import { AddReminderDialog } from "@/app/admin/properties/board/add-reminder-dialog"
import { useCalendarStatus } from "@/lib/admin/panda-calendar-status-context"
import { getPandaPropertyQuickCardOwners } from "@/lib/admin/panda-property-quick-card-owners"

import { PandaPropertyQuickCardContactActionsRow } from "./panda-property-quick-card-contact-actions-row"
import { PropertyListAddNoteDialog } from "./property-list-add-note-dialog"

function PandaPropertyQuickCardOwnerRow(args: {
  readonly ownerNum: 1 | 2 | 3
  readonly name: string
  readonly phone: string | null
  readonly email: string | null
  readonly composeSubject: string
  readonly propertyListId: number | null
  readonly propertyLabel: string
  readonly calendarConnected: boolean | null
}) {
  const { ownerNum, name, phone, email, composeSubject, propertyListId, propertyLabel, calendarConnected } = args
  const ownerLabel = `Owner ${ownerNum} - ${name}`
  const noteSubtitle = `${ownerLabel} • ${propertyLabel}`

  return (
    <PandaPropertyQuickCardContactActionsRow
      testIdPrefix="property-owner"
      rowId={ownerNum}
      name={name}
      phone={phone}
      email={email}
      composeSubject={composeSubject}
      calendarConnected={calendarConnected}
      titleContent={
        <span className="block text-sm font-medium leading-snug text-foreground [overflow-wrap:anywhere]">
          {name}
        </span>
      }
      renderDialogs={({ addEventOpen, addNoteOpen, addReminderOpen, setAddEventOpen, setAddNoteOpen, setAddReminderOpen }) =>
        propertyListId != null ? (
          <>
            <PropertyListAddNoteDialog
              open={addNoteOpen}
              onOpenChange={setAddNoteOpen}
              propertyListId={propertyListId}
              propertyLabel={propertyLabel}
              subtitleOverride={noteSubtitle}
              ownerNum={ownerNum}
            />
            <AddMeetingDialog
              open={addEventOpen}
              onOpenChange={setAddEventOpen}
              propertyListId={propertyListId}
              buyers={[]}
              onAdded={() => {}}
              onSyncError={() => {}}
              defaultTitle={`Meeting with ${name}`}
            />
            <AddReminderDialog
              open={addReminderOpen}
              onOpenChange={setAddReminderOpen}
              propertyListId={propertyListId}
              buyers={[]}
              onAdded={() => undefined}
            />
          </>
        ) : null
      }
    />
  )
}

type PandaPropertyQuickCardOwnerRowsContentProps = {
  readonly owners: ReturnType<typeof getPandaPropertyQuickCardOwners>
  readonly composeSubject: string
  readonly propertyListId: number | null
  readonly propertyLabel: string
}

function PandaPropertyQuickCardOwnerRowsContent({
  owners,
  composeSubject,
  propertyListId,
  propertyLabel,
}: PandaPropertyQuickCardOwnerRowsContentProps) {
  const calendarConnected = useCalendarStatus()

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">Owners</span>
      {owners.map((owner) => (
        <PandaPropertyQuickCardOwnerRow
          key={owner.ownerNum}
          ownerNum={owner.ownerNum}
          name={owner.name}
          phone={owner.phone}
          email={owner.email}
          composeSubject={composeSubject}
          propertyListId={propertyListId}
          propertyLabel={propertyLabel}
          calendarConnected={calendarConnected}
        />
      ))}
    </div>
  )
}

export function renderPandaPropertyQuickCardOwnerRows({
  slug,
  row,
}: AdminRenderQuickDesktopCardOwnerRowsArgs) {
  if (slug !== "properties") {
    return undefined
  }

  const owners = getPandaPropertyQuickCardOwners(row as Record<string, unknown>)
  const propertyListIdRaw = row["propertyListId"]
  const propertyListId =
    typeof propertyListIdRaw === "number" && Number.isFinite(propertyListIdRaw) && propertyListIdRaw > 0
      ? propertyListIdRaw
      : null
  const streetAddress = typeof row["streetAddress"] === "string" ? row["streetAddress"].trim() : ""
  const suburb = typeof row["suburb"] === "string" ? row["suburb"].trim() : ""
  const composeSubject = [streetAddress, suburb].filter(Boolean).join(", ")
  const propertyLabel = [streetAddress, suburb].filter(Boolean).join(", ")

  return {
    suppressDefaultCombinedOwner: true,
    content:
      owners.length > 0 ? (
        <PandaPropertyQuickCardOwnerRowsContent
          owners={owners}
          composeSubject={composeSubject}
          propertyListId={propertyListId}
          propertyLabel={propertyLabel}
        />
      ) : null,
  }
}
