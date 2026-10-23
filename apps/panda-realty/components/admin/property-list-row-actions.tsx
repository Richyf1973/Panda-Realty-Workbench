"use client"

import { Bell, CalendarPlus, Inbox, Mail, NotebookText, Phone } from "lucide-react"
import type { ReactNode } from "react"

import type { AdminEntityRowActionDescriptor } from "@repo/admin/components/admin/admin-entity-row-action-descriptor"

import { PropertyListRowPinnedActions } from "./property-list-row-pinned-actions"
import { createPropertyRowActionControls } from "./property-list-row-action-controls"
import type { DueWarningTier } from "@/lib/admin/due-highlight"

export interface BuildPropertyListRowActionsArgs {
  propertyListId: number
  streetAddress: string
  suburb: string
  state: string
  owner1name: string | null
  owner1phone: string | null
  owner1email: string | null
  primaryPhoneOwnerName: string | null
  primaryEmailOwnerName: string | null
  primaryBuyerPhone: string | null
  primaryBuyerEmail: string | null
  primaryBuyerName: string | null
  primaryBuyerEmailName: string | null
  dueHighlightActive: boolean
  dueHighlightLabels: string[]
  dueWarningActive: boolean
  dueWarningLabels: string[]
  dueWarningTier: DueWarningTier
  /** Map-results view: only the hide tick + map button, no collapsible actions. */
  mapResultsOnly: boolean
}

/**
 * Builds the property list row's actions for the shared `AdminEntityRowActions`:
 * `pinned` (hide tick, due indicator, locate-on-map, and all dialogs) stays inline at any width,
 * while `collapsible` (call/email/inbox/buyer/reminder/note/meeting) folds into the overflow menu
 * with Edit/Delete when the table is narrow. The map-results view returns no collapsible actions.
 */
export function buildPropertyListRowActions(
  args: BuildPropertyListRowActionsArgs,
): { pinned: ReactNode; collapsible: AdminEntityRowActionDescriptor[]; pinnedOnly: boolean } {
  const {
    propertyListId,
    streetAddress,
    suburb,
    state,
    owner1name,
    owner1phone,
    owner1email,
    primaryPhoneOwnerName,
    primaryEmailOwnerName,
    primaryBuyerPhone,
    primaryBuyerEmail,
    primaryBuyerName,
    primaryBuyerEmailName,
    dueHighlightActive,
    dueHighlightLabels,
    dueWarningActive,
    dueWarningLabels,
    dueWarningTier,
    mapResultsOnly,
  } = args

  const controls = createPropertyRowActionControls()
  const mapAddress = [streetAddress, suburb, state].filter(Boolean).join(", ")
  const propertyLabel = suburb ? `${streetAddress} · ${suburb}` : streetAddress
  const composeSubject = [streetAddress, suburb].filter(Boolean).join(", ")

  const pinned = (
    <PropertyListRowPinnedActions
      controls={controls}
      propertyListId={propertyListId}
      mapAddress={mapAddress}
      propertyLabel={propertyLabel}
      composeSubject={composeSubject}
      owner1name={owner1name}
      owner1email={owner1email}
      primaryBuyerEmail={primaryBuyerEmail}
      primaryBuyerEmailName={primaryBuyerEmailName}
      dueHighlightActive={dueHighlightActive}
      dueHighlightLabels={dueHighlightLabels}
      dueWarningActive={dueWarningActive}
      dueWarningLabels={dueWarningLabels}
      dueWarningTier={dueWarningTier}
      mapResultsOnly={mapResultsOnly}
    />
  )

  if (mapResultsOnly) return { pinned, collapsible: [], pinnedOnly: true }

  const hasOwner = Boolean(owner1name)
  const callDisabled = !owner1phone
  const emailDisabled = !owner1email

  const callDisabledReason = primaryPhoneOwnerName
    ? `Primary owner (${primaryPhoneOwnerName}) has no phone number`
    : "No phone number"
  const emailDisabledReason = primaryEmailOwnerName
    ? `Primary owner (${primaryEmailOwnerName}) has no email address`
    : "No email address"

  const collapsible: AdminEntityRowActionDescriptor[] = [
    {
      key: "call-owner",
      icon: Phone,
      label: "Call owner",
      href: !hasOwner || callDisabled ? undefined : `tel:${owner1phone}`,
      disabled: !hasOwner || callDisabled,
      disabledReason: !hasOwner ? "No owner" : callDisabledReason,
      testId: `property-list-call-button--${propertyListId}`,
    },
    {
      key: "email-owner",
      icon: Mail,
      label: "Send email",
      onSelect: () => controls.openOwnerCompose(),
      disabled: !hasOwner || emailDisabled,
      disabledReason: !hasOwner ? "No owner" : emailDisabledReason,
      testId: `property-list-email-button--${propertyListId}`,
    },
    {
      key: "inbox-owner",
      icon: Inbox,
      label: "View email threads",
      onSelect: () => controls.openOwnerInbox(),
      disabled: !hasOwner || emailDisabled,
      disabledReason: !hasOwner ? "No owner" : emailDisabledReason,
      testId: `property-list-inbox-button--${propertyListId}`,
    },
    ...(primaryBuyerPhone != null || primaryBuyerEmail != null
      ? [
          {
            key: "call-buyer",
            icon: Phone,
            label: "Call buyer",
            href: primaryBuyerPhone ? `tel:${primaryBuyerPhone}` : undefined,
            disabled: !primaryBuyerPhone,
            disabledReason: primaryBuyerName
              ? `Primary buyer (${primaryBuyerName}) has no phone number`
              : "No primary buyer phone",
            testId: `panda-property-list-row-buyer-call--${propertyListId}`,
          },
          {
            key: "email-buyer",
            icon: Mail,
            label: "Email buyer",
            onSelect: () => controls.openBuyerCompose(),
            disabled: !primaryBuyerEmail,
            disabledReason: primaryBuyerEmailName
              ? `Primary buyer (${primaryBuyerEmailName}) has no email address`
              : "No primary buyer email",
            testId: `panda-property-list-row-buyer-email--${propertyListId}`,
          },
        ]
      : []),
    {
      key: "reminder",
      icon: Bell,
      label: "Add reminder",
      onSelect: () => controls.openReminder(),
      testId: `property-list-add-reminder-button--${propertyListId}`,
    },
    {
      key: "note",
      icon: NotebookText,
      label: "Add notes",
      onSelect: () => controls.openNote(),
      testId: `property-list-add-note-button--${propertyListId}`,
    },
    {
      key: "meeting",
      icon: CalendarPlus,
      label: "Add meeting",
      onSelect: () => controls.openMeeting(),
      testId: `property-list-add-calendar-event-button--${propertyListId}`,
    },
  ]

  return { pinned, collapsible, pinnedOnly: false }
}
