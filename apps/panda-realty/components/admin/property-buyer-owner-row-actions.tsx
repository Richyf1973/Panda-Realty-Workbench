"use client"

import type { ReactNode } from "react"
import { Bell, CalendarPlus, DollarSign, ExternalLink, Inbox, Mail, NotebookText, Paperclip, Phone, Trash2 } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/tooltip"

export interface BuyerOwnerRowActionsProps {
  propertyEntityId: number
  entityName: string
  hasPhone: boolean
  phone: string
  hasEmail: boolean
  showThreads: boolean
  calendarConnected: boolean | null
  testidPrefix: string
  /**
   * Contact-action cluster (Call / Email / Inbox / Calendar / Reminder) renders only when
   * `onCompose` is provided — omit it for an entity-level toolbar that shows only Notes/Files/etc.
   */
  onCompose?: () => void
  onInboxToggle?: () => void
  onAddEvent?: () => void
  onNotes?: () => void
  onFiles?: () => void
  onAddReminder?: () => void
  onOffers?: () => void
  onOpenPortal?: () => void
  onDelete?: () => void
  /** Inline messaging control rendered after Open Portal (its panel wraps below via basis-full). */
  messagesSlot?: ReactNode
}

export function BuyerOwnerRowActions({
  propertyEntityId,
  entityName,
  hasPhone,
  phone,
  hasEmail,
  showThreads,
  calendarConnected,
  testidPrefix,
  onCompose,
  onInboxToggle,
  onAddEvent,
  onNotes,
  onFiles,
  onAddReminder,
  onOffers,
  onOpenPortal,
  onDelete,
  messagesSlot,
}: BuyerOwnerRowActionsProps) {
  const addEventDisabled = calendarConnected !== true
  const addEventTooltip =
    calendarConnected === false
      ? "Google Calendar not connected"
      : calendarConnected == null
        ? "Checking Google Calendar"
        : "Add event"

  return (
    <div className="flex flex-wrap items-center gap-1">
      {onCompose != null && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label={`Call ${entityName}`}
                data-testid={`${testidPrefix}-call--${propertyEntityId}`}
                asChild={hasPhone}
                disabled={!hasPhone}
              >
                {hasPhone ? (
                  <a href={`tel:${phone}`}>
                    <Phone className="h-4 w-4" />
                  </a>
                ) : (
                  <Phone className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{hasPhone ? "Call" : "No phone number"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label={`Email ${entityName}`}
                data-testid={`${testidPrefix}-compose--${propertyEntityId}`}
                disabled={!hasEmail}
                onClick={hasEmail ? onCompose : undefined}
              >
                <Mail className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{hasEmail ? "Send email" : "No email address"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant={showThreads ? "secondary" : "ghost"}
                className="h-7 w-7"
                aria-label={`${showThreads ? "Hide" : "Show"} email threads`}
                data-testid={`${testidPrefix}-inbox--${propertyEntityId}`}
                disabled={!hasEmail}
                onClick={hasEmail ? onInboxToggle : undefined}
              >
                <Inbox className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{hasEmail ? "View email threads" : "No email address"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label={`Add event for ${entityName}`}
                data-testid={`${testidPrefix}-calendar--${propertyEntityId}`}
                disabled={addEventDisabled}
                onClick={onAddEvent}
              >
                <CalendarPlus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{addEventTooltip}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label={`Add reminder for ${entityName}`}
                data-testid={`${testidPrefix}-reminder--${propertyEntityId}`}
                onClick={onAddReminder}
              >
                <Bell className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add reminder</TooltipContent>
          </Tooltip>
        </>
      )}

      {onNotes != null && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              aria-label={`Notes for ${entityName}`}
              data-testid={`${testidPrefix}-notes--${propertyEntityId}`}
              onClick={onNotes}
            >
              <NotebookText className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notes</TooltipContent>
        </Tooltip>
      )}

      {onFiles != null && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              aria-label={`Files for ${entityName}`}
              data-testid={`${testidPrefix}-files--${propertyEntityId}`}
              onClick={onFiles}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Files</TooltipContent>
        </Tooltip>
      )}

      {onOffers != null && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              aria-label={`Offers for ${entityName}`}
              data-testid={`${testidPrefix}-offers--${propertyEntityId}`}
              onClick={onOffers}
            >
              <DollarSign className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Offers</TooltipContent>
        </Tooltip>
      )}

      {onOpenPortal != null && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1.5 px-2"
          aria-label={`Open portal for ${entityName}`}
          data-testid={`${testidPrefix}-open-portal--${propertyEntityId}`}
          onClick={onOpenPortal}
        >
          <ExternalLink className="h-4 w-4" />
          Open Portal
        </Button>
      )}

      {messagesSlot}

      {onDelete != null && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Remove ${entityName}`}
              data-testid={`${testidPrefix}-delete--${propertyEntityId}`}
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove buyer</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
