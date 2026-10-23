"use client"

import { Bell, CalendarPlus, Inbox, Mail, MoreHorizontal, NotebookText, Paperclip, Phone, Trash2 } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/tooltip"

interface OwnerRowActionsProps {
  ownerNum: 1 | 2 | 3
  hasPhone: boolean
  ownerPhone: string
  hasEmail: boolean
  showOwnerActions: boolean
  showThreads: boolean
  addEventDisabled: boolean
  addEventTooltip: string
  onCompose: () => void
  onInboxToggle: () => void
  onAddEvent: () => void
  onNotes: () => void
  onFiles: () => void
  onAddReminder: () => void
  onMoreInfo: () => void
  onDelete?: () => void
}

export function OwnerRowActions({
  ownerNum,
  hasPhone,
  ownerPhone,
  hasEmail,
  showOwnerActions,
  showThreads,
  addEventDisabled,
  addEventTooltip,
  onCompose,
  onInboxToggle,
  onAddEvent,
  onNotes,
  onFiles,
  onAddReminder,
  onMoreInfo,
  onDelete,
}: OwnerRowActionsProps) {
  return (
    <div className="flex justify-end gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            aria-label={`Call owner ${ownerNum}`}
            data-testid={`property-owner-call--${ownerNum}`}
            asChild={hasPhone}
            disabled={!hasPhone}
          >
            {hasPhone ? (
              <a href={`tel:${ownerPhone}`}>
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
            aria-label={`Send email to owner ${ownerNum}`}
            data-testid={`property-owner-compose--${ownerNum}`}
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
            aria-label={`${showThreads ? "Hide" : "Show"} email threads for owner ${ownerNum}`}
            data-testid={`property-owner-inbox--${ownerNum}`}
            disabled={!hasEmail}
            onClick={hasEmail ? onInboxToggle : undefined}
          >
            <Inbox className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{hasEmail ? "View email threads" : "No email address"}</TooltipContent>
      </Tooltip>
      {showOwnerActions && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label={`Add event for owner ${ownerNum}`}
                data-testid={`property-owner-add-event--${ownerNum}`}
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
                aria-label={`View notes for owner ${ownerNum}`}
                data-testid={`property-owner-notes--${ownerNum}`}
                onClick={onNotes}
              >
                <NotebookText className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Notes</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label={`Files for owner ${ownerNum}`}
                data-testid={`property-owner-files--${ownerNum}`}
                onClick={onFiles}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Files</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label={`Add reminder for owner ${ownerNum}`}
                data-testid={`property-owner-add-reminder--${ownerNum}`}
                onClick={onAddReminder}
              >
                <Bell className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add reminder</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label={`More info for owner ${ownerNum}`}
                data-testid={`property-owner-more-info--${ownerNum}`}
                onClick={onMoreInfo}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{ownerNum === 1 ? "More info (mobile, ABN)" : "More info (mobile)"}</TooltipContent>
          </Tooltip>
        </>
      )}
      {onDelete != null && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Remove owner ${ownerNum}`}
              data-testid={`property-owner-delete--${ownerNum}`}
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove owner</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}
