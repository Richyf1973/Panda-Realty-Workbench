"use client"

import type { ReactNode } from "react"
import { Bell, CalendarPlus, DollarSign, ExternalLink, Inbox, Mail, NotebookText, Paperclip, Pencil, Phone, Trash2 } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/tooltip"

export interface EntityCardRowActionsProps {
  propertyEntityId: number
  entityName: string
  phoneNumber?: string | null
  emailAddress?: string | null
  inboxEnabled?: boolean
  testidPrefix: string
  showThreads: boolean
  onInboxToggle: () => void
  onOpenProfile?: () => void
  onCompose?: (email: string, entityName: string) => void
  onAddEvent?: () => void
  addEventDisabledReason?: string
  onAddNote?: () => void
  onAddReminder?: () => void
  onFiles?: () => void
  onEdit?: () => void
  onOffers?: () => void
  onDelete: () => void
}

function DisabledIconButton({
  triggerTestid,
  testid,
  variant = "secondary",
  children,
}: {
  triggerTestid: string
  testid: string
  variant?: "secondary" | "ghost"
  children: ReactNode
}) {
  return (
    <TooltipTrigger asChild>
      <span tabIndex={0} role="presentation" data-testid={triggerTestid}>
        <Button
          type="button"
          size="icon"
          variant={variant}
          className="h-10 w-10 shrink-0"
          disabled
          data-testid={testid}
        >
          {children}
        </Button>
      </span>
    </TooltipTrigger>
  )
}

export function EntityCardRowActions({
  propertyEntityId,
  entityName,
  phoneNumber,
  emailAddress,
  inboxEnabled,
  testidPrefix,
  showThreads,
  onInboxToggle,
  onOpenProfile,
  onCompose,
  onAddEvent,
  addEventDisabledReason,
  onAddNote,
  onAddReminder,
  onFiles,
  onEdit,
  onOffers,
  onDelete,
}: EntityCardRowActionsProps) {
  const canOpenInbox = inboxEnabled ?? !!emailAddress?.trim()
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {onOpenProfile && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onOpenProfile}
              data-testid={`${testidPrefix}-open-profile--${propertyEntityId}`}
            >
              <ExternalLink className="h-4 w-4" />
              <span className="sr-only">Open profile</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open profile</TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        {phoneNumber?.trim() ? (
          <TooltipTrigger asChild>
            <Button type="button" size="icon" variant="secondary" className="h-10 w-10 shrink-0" asChild>
              <a
                href={`tel:${phoneNumber.trim()}`}
                aria-label={`Call ${entityName}`}
                data-testid={`${testidPrefix}-quick-call--${propertyEntityId}`}
              >
                <Phone className="h-5 w-5" />
              </a>
            </Button>
          </TooltipTrigger>
        ) : (
          <DisabledIconButton
            triggerTestid={`${testidPrefix}-quick-call-trigger--${propertyEntityId}`}
            testid={`${testidPrefix}-quick-call--${propertyEntityId}`}
          >
            <Phone className="h-5 w-5" />
          </DisabledIconButton>
        )}
        <TooltipContent>{phoneNumber?.trim() ? "Call" : "No phone number"}</TooltipContent>
      </Tooltip>
      <Tooltip>
        {emailAddress?.trim() && onCompose ? (
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-10 w-10 shrink-0"
              aria-label={`Email ${entityName}`}
              data-testid={`${testidPrefix}-quick-email--${propertyEntityId}`}
              onClick={() => onCompose(emailAddress.trim(), entityName)}
            >
              <Mail className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
        ) : (
          <DisabledIconButton
            triggerTestid={`${testidPrefix}-quick-email-trigger--${propertyEntityId}`}
            testid={`${testidPrefix}-quick-email--${propertyEntityId}`}
          >
            <Mail className="h-5 w-5" />
          </DisabledIconButton>
        )}
        <TooltipContent>{emailAddress?.trim() && onCompose ? "Send email" : !emailAddress?.trim() ? "No email address" : "Cannot compose email"}</TooltipContent>
      </Tooltip>
      <Tooltip>
        {canOpenInbox ? (
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant={showThreads ? "secondary" : "ghost"}
              className="h-10 w-10 shrink-0"
              onClick={onInboxToggle}
              aria-label={`${showThreads ? "Hide" : "Show"} email threads for ${entityName}`}
              data-testid={`${testidPrefix}-inbox--${propertyEntityId}`}
            >
              <Inbox className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
        ) : (
          <DisabledIconButton
            triggerTestid={`${testidPrefix}-inbox-trigger--${propertyEntityId}`}
            testid={`${testidPrefix}-inbox--${propertyEntityId}`}
            variant="ghost"
          >
            <Inbox className="h-5 w-5" />
          </DisabledIconButton>
        )}
        <TooltipContent>{canOpenInbox ? "View email threads" : "No email address"}</TooltipContent>
      </Tooltip>
      {(onAddEvent ?? addEventDisabledReason) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0} data-testid={`${testidPrefix}-add-event-trigger--${propertyEntityId}`}>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onAddEvent}
                disabled={!onAddEvent}
                data-testid={`${testidPrefix}-add-event--${propertyEntityId}`}
              >
                <CalendarPlus className="h-4 w-4" />
                <span className="sr-only">Add event</span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{addEventDisabledReason ?? "Add event"}</TooltipContent>
        </Tooltip>
      )}
      {onAddNote && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onAddNote}
              data-testid={`${testidPrefix}-add-note--${propertyEntityId}`}
            >
              <NotebookText className="h-4 w-4" />
              <span className="sr-only">Add note</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notes</TooltipContent>
        </Tooltip>
      )}
      {onAddReminder && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onAddReminder}
              data-testid={`${testidPrefix}-add-reminder--${propertyEntityId}`}
            >
              <Bell className="h-4 w-4" />
              <span className="sr-only">Add reminder</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add reminder</TooltipContent>
        </Tooltip>
      )}
      {onFiles && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onFiles}
              data-testid={`${testidPrefix}-files--${propertyEntityId}`}
            >
              <Paperclip className="h-4 w-4" />
              <span className="sr-only">Files</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Files</TooltipContent>
        </Tooltip>
      )}
      {onEdit && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onEdit}
              data-testid={`${testidPrefix}-edit--${propertyEntityId}`}
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>
      )}
      {onOffers && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onOffers}
              data-testid={`${testidPrefix}-offers--${propertyEntityId}`}
            >
              <DollarSign className="h-4 w-4" />
              <span className="sr-only">Offers</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Offers</TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            data-testid={`${testidPrefix}-delete--${propertyEntityId}`}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Delete</TooltipContent>
      </Tooltip>
    </div>
  )
}
