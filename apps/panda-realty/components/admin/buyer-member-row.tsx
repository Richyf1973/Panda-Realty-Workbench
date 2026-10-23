"use client"

import { useState } from "react"
import { Bell, CalendarIcon, CalendarPlus, Inbox, Mail, NotebookText, Pencil, Phone, Trash2 } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Checkbox } from "@repo/ui/checkbox"
import { Label } from "@repo/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/tooltip"

import { formatViewingDate, type EntityMember } from "./buyer-member-types"
import { EntityThreadsPanel, type EntityThreadForwardDraft, type EntityThreadReplyDraft } from "./entity-threads-panel"

export function BuyerMemberRow({
  m,
  repPatchMemberId,
  primaryPropertyEntityId,
  propertyListId,
  connectionDisabledReason,
  onCompose,
  onReply,
  onForward,
  onEdit,
  onDelete,
  onPatchRep,
  onAddEvent,
  onAddNote,
  onAddReminder,
}: {
  m: EntityMember
  repPatchMemberId: number | null
  primaryPropertyEntityId: number | null
  propertyListId?: number | null
  connectionDisabledReason: string | null
  onCompose: (email: string, memberName: string) => void
  onReply: (draft: EntityThreadReplyDraft) => void
  onForward: (draft: EntityThreadForwardDraft) => void
  onEdit: (m: EntityMember) => void
  onDelete: (m: EntityMember) => void
  onPatchRep: (id: number, value: boolean) => void
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
    <li className="flex flex-col rounded-md border bg-card">
      <div className="flex items-start gap-3 px-3 py-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium">{m.memberName}</span>
          <div className="flex items-center gap-2 py-0.5">
            <Checkbox
              id={`buyer-member-rep--${id}`}
              checked={m.isBuyersRepresentative === true}
              disabled={repPatchMemberId === id}
              onCheckedChange={(v) => onPatchRep(id, v === true)}
              data-testid={`buyer-member-representative--${id}`}
            />
            <Label
              htmlFor={`buyer-member-rep--${id}`}
              className="cursor-pointer text-xs font-normal text-muted-foreground"
            >
              Buyer&apos;s representative
            </Label>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {m.memberPhoneNumber && <span>{m.memberPhoneNumber}</span>}
            {m.memberEmailAddress && <span>{m.memberEmailAddress}</span>}
            {m.memberAddress && <span>{m.memberAddress}</span>}
            {m.scheduledViewingDate && (
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {formatViewingDate(m.scheduledViewingDate)}
              </span>
            )}
          </div>
          {(m.propertyToSellAddress ?? m.memberAddress) && (
            <div
              className="text-xs text-muted-foreground"
              data-testid={`buyer-member-property-to-sell--${id}`}
            >
              <span className="font-medium">Property to sell:</span>{" "}
              {m.propertyToSellAddress ?? m.memberAddress}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {/* Phone */}
          <Tooltip>
            <TooltipTrigger asChild>
              {hasPhone ? (
                <Button type="button" size="icon" variant="secondary" className="h-10 w-10 shrink-0" asChild>
                  <a href={`tel:${m.memberPhoneNumber!.trim()}`} aria-label={`Call ${m.memberName}`} data-testid={`buyer-member-quick-call--${id}`}>
                    <Phone className="h-5 w-5" />
                  </a>
                </Button>
              ) : (
                <span tabIndex={0} className="inline-flex">
                  <Button type="button" size="icon" variant="secondary" className="h-10 w-10 shrink-0" disabled data-testid={`buyer-member-quick-call--${id}`} aria-label={`Call ${m.memberName}`}>
                    <Phone className="h-5 w-5" />
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
                  className="h-10 w-10 shrink-0"
                  aria-label={`Email ${m.memberName}`}
                  data-testid={`buyer-member-quick-email--${id}`}
                  disabled={!hasEmail}
                  onClick={hasEmail ? () => onCompose(m.memberEmailAddress!.trim(), m.memberName) : undefined}
                >
                  <Mail className="h-5 w-5" />
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
                  className="h-10 w-10 shrink-0"
                  disabled={!hasEmail}
                  onClick={hasEmail ? handleInboxToggle : undefined}
                  aria-label={`${showThreads ? "Hide" : "Show"} email threads for ${m.memberName}`}
                  data-testid={`buyer-member-inbox--${id}`}
                >
                  <Inbox className="h-5 w-5" />
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
                  data-testid={`buyer-member-add-event--${id}`}
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
                  data-testid={`buyer-member-add-note--${id}`}
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
                  data-testid={`buyer-member-add-reminder--${id}`}
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
              <Button type="button" size="sm" variant="ghost" onClick={() => onEdit(m)} data-testid={`buyer-member-edit--${id}`}>
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
                data-testid={`buyer-member-delete--${id}`}
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
