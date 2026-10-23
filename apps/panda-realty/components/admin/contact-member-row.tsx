"use client"

import { useState } from "react"
import { Bell, CalendarPlus, Inbox, Mail, NotebookText, Pencil, Phone, Trash2 } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/tooltip"

import type { ContactMember } from "./contact-member-types"
import { EntityThreadsPanel, type EntityThreadForwardDraft, type EntityThreadReplyDraft } from "./entity-threads-panel"

export function ContactMemberRow({
  m,
  connectionDisabledReason,
  primaryPropertyEntityId,
  propertyListId,
  onCompose,
  onReply,
  onForward,
  onEdit,
  onDelete,
  onAddEvent,
  onAddNote,
  onAddReminder,
}: {
  m: ContactMember
  connectionDisabledReason: string | null
  primaryPropertyEntityId: number | null
  propertyListId?: number | null
  onCompose: (email: string, memberName: string) => void
  onReply: (draft: EntityThreadReplyDraft) => void
  onForward: (draft: EntityThreadForwardDraft) => void
  onEdit: (m: ContactMember) => void
  onDelete: (m: ContactMember) => void
  onAddEvent: () => void
  onAddNote: () => void
  onAddReminder: () => void
}) {
  const [showThreads, setShowThreads] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)

  function handleInboxToggle() {
    if (!showThreads && !hasOpened) setHasOpened(true)
    setShowThreads((v) => !v)
  }

  const id = m.entityMemberId
  const hasPhone = !!m.memberPhoneNumber?.trim()
  const hasEmail = !!m.memberEmailAddress?.trim()
  const hasConnection = primaryPropertyEntityId !== null && connectionDisabledReason === null

  return (
    <li
      className="flex flex-col rounded-md border bg-card"
      data-testid={`contact-member-row--${id}`}
    >
      <div className="flex items-start gap-3 px-3 py-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium">{m.memberName}</span>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {m.memberPhoneNumber && <span>{m.memberPhoneNumber}</span>}
            {m.memberEmailAddress && <span>{m.memberEmailAddress}</span>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {/* Phone */}
          <Tooltip>
            <TooltipTrigger asChild>
              {hasPhone ? (
                <Button type="button" size="icon" variant="secondary" className="h-8 w-8 shrink-0" asChild>
                  <a href={`tel:${m.memberPhoneNumber!.trim()}`} aria-label={`Call ${m.memberName}`} data-testid={`contact-member-quick-call--${id}`}>
                    <Phone className="h-4 w-4" />
                  </a>
                </Button>
              ) : (
                <span tabIndex={0} className="inline-flex">
                  <Button type="button" size="icon" variant="secondary" className="h-8 w-8 shrink-0" disabled data-testid={`contact-member-quick-call--${id}`} aria-label={`Call ${m.memberName}`}>
                    <Phone className="h-4 w-4" />
                  </Button>
                </span>
              )}
            </TooltipTrigger>
            <TooltipContent>{hasPhone ? "Call" : "No phone number on file"}</TooltipContent>
          </Tooltip>

          {/* Mail */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={hasEmail ? undefined : 0} className="inline-flex">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 shrink-0"
                  aria-label={`Email ${m.memberName}`}
                  data-testid={`contact-member-quick-email--${id}`}
                  disabled={!hasEmail}
                  onClick={hasEmail ? () => onCompose(m.memberEmailAddress!.trim(), m.memberName) : undefined}
                >
                  <Mail className="h-4 w-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{hasEmail ? "Send email" : "No email address on file"}</TooltipContent>
          </Tooltip>

          {/* Inbox */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={hasEmail ? undefined : 0} className="inline-flex">
                <Button
                  type="button"
                  size="icon"
                  variant={showThreads ? "secondary" : "ghost"}
                  className="h-8 w-8 shrink-0"
                  disabled={!hasEmail}
                  onClick={hasEmail ? handleInboxToggle : undefined}
                  aria-label={`${showThreads ? "Hide" : "Show"} email threads for ${m.memberName}`}
                  data-testid={`contact-member-inbox--${id}`}
                >
                  <Inbox className="h-4 w-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{hasEmail ? "View email threads" : "No email address on file"}</TooltipContent>
          </Tooltip>

          {/* Meeting */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={hasConnection ? undefined : 0} className="inline-flex">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!hasConnection}
                  onClick={hasConnection ? onAddEvent : undefined}
                  data-testid={`contact-member-add-event--${id}`}
                >
                  <CalendarPlus className="h-4 w-4" />
                  <span className="sr-only">Add meeting</span>
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{connectionDisabledReason ?? "Add meeting"}</TooltipContent>
          </Tooltip>

          {/* Note */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={hasConnection ? undefined : 0} className="inline-flex">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!hasConnection}
                  onClick={hasConnection ? onAddNote : undefined}
                  data-testid={`contact-member-add-note--${id}`}
                >
                  <NotebookText className="h-4 w-4" />
                  <span className="sr-only">Add note</span>
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{connectionDisabledReason ?? "Add note"}</TooltipContent>
          </Tooltip>

          {/* Reminder */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={hasConnection ? undefined : 0} className="inline-flex">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!hasConnection}
                  onClick={hasConnection ? onAddReminder : undefined}
                  data-testid={`contact-member-add-reminder--${id}`}
                >
                  <Bell className="h-4 w-4" />
                  <span className="sr-only">Add reminder</span>
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{connectionDisabledReason ?? "Add reminder"}</TooltipContent>
          </Tooltip>

          {/* Edit */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onEdit(m)}
                data-testid={`contact-member-edit--${id}`}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>

          {/* Delete */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(m)}
                data-testid={`contact-member-delete--${id}`}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {hasOpened && hasEmail && (
        <div className={showThreads ? "px-3 pb-3" : "hidden"}>
          <EntityThreadsPanel
            email={m.memberEmailAddress!.trim()}
            onReply={onReply}
            onForward={onForward}
            propertyListId={propertyListId}
            propertyEntityId={primaryPropertyEntityId}
            entityName={m.memberName}
          />
        </div>
      )}
    </li>
  )
}
