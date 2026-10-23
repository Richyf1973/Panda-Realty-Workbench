"use client"

import type React from "react"
import { useState, type ReactNode } from "react"
import { Bell, CalendarPlus, Inbox, Mail, NotebookText, Phone } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@repo/ui/tooltip"

import { EntityThreadsPanel } from "./entity-threads-panel"
import { GmailComposeDialog } from "./gmail-compose-dialog"

export function stopQuickCardRowClick(event: React.SyntheticEvent) {
  event.stopPropagation()
}

type QuickCardContactActionDialogsArgs = {
  readonly addEventOpen: boolean
  readonly addNoteOpen: boolean
  readonly addReminderOpen: boolean
  readonly setAddEventOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly setAddNoteOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly setAddReminderOpen: React.Dispatch<React.SetStateAction<boolean>>
}

type PandaPropertyQuickCardContactActionsRowProps = {
  readonly testIdPrefix: string
  readonly rowId: number | string
  readonly name: string
  readonly phone: string | null
  readonly email: string | null
  readonly composeSubject: string
  readonly calendarConnected: boolean | null
  readonly titleContent: ReactNode
  readonly renderDialogs: (args: QuickCardContactActionDialogsArgs) => ReactNode
}

export function PandaPropertyQuickCardContactActionsRow({
  testIdPrefix,
  rowId,
  name,
  phone,
  email,
  composeSubject,
  calendarConnected,
  titleContent,
  renderDialogs,
}: PandaPropertyQuickCardContactActionsRowProps) {
  const [showThreads, setShowThreads] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [addEventOpen, setAddEventOpen] = useState(false)
  const [addNoteOpen, setAddNoteOpen] = useState(false)
  const [addReminderOpen, setAddReminderOpen] = useState(false)

  function handleInboxToggle(event: React.MouseEvent<HTMLButtonElement>) {
    stopQuickCardRowClick(event)
    if (!showThreads && !hasOpened) setHasOpened(true)
    setShowThreads((value) => !value)
  }

  const callDisabled = phone == null
  const emailDisabled = email == null
  const inboxDisabled = email == null
  const addEventDisabled = calendarConnected !== true
  const addEventDisabledReason =
    calendarConnected === false ? "Google Calendar not connected" : "Checking Google Calendar"

  return (
    <div
      className="flex flex-col gap-1 rounded-md border border-border/60 bg-muted/20 px-2.5 py-2"
      data-testid={`${testIdPrefix}-row--${rowId}`}
      onClick={stopQuickCardRowClick}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div className="min-w-0 flex-1">{titleContent}</div>
        <div className="flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="inline-flex"
                tabIndex={callDisabled ? 0 : undefined}
                data-testid={`${testIdPrefix}-quick-call-trigger--${rowId}`}
                onClick={stopQuickCardRowClick}
              >
                {callDisabled ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    aria-label={`Call unavailable for ${name}`}
                    data-testid={`${testIdPrefix}-quick-call--${rowId}`}
                    disabled
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    asChild
                  >
                    <a
                      href={`tel:${phone}`}
                      aria-label={`Call ${name}`}
                      data-testid={`${testIdPrefix}-quick-call--${rowId}`}
                      onClick={stopQuickCardRowClick}
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent>{callDisabled ? "No phone number" : "Call"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="inline-flex"
                tabIndex={emailDisabled ? 0 : undefined}
                data-testid={`${testIdPrefix}-quick-email-trigger--${rowId}`}
                onClick={stopQuickCardRowClick}
              >
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  aria-label={emailDisabled ? `Email unavailable for ${name}` : `Email ${name}`}
                  data-testid={`${testIdPrefix}-quick-email--${rowId}`}
                  disabled={emailDisabled}
                  onClick={(event) => {
                    stopQuickCardRowClick(event)
                    if (emailDisabled) return
                    setComposeOpen(true)
                  }}
                >
                  <Mail className="h-4 w-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{emailDisabled ? "No email address" : "Send email"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="inline-flex"
                tabIndex={inboxDisabled ? 0 : undefined}
                data-testid={`${testIdPrefix}-inbox-trigger--${rowId}`}
                onClick={stopQuickCardRowClick}
              >
                <Button
                  type="button"
                  size="icon"
                  variant={showThreads ? "secondary" : "ghost"}
                  className="h-8 w-8"
                  aria-label={
                    inboxDisabled
                      ? `Inbox unavailable for ${name}`
                      : `${showThreads ? "Hide" : "Show"} email threads for ${name}`
                  }
                  data-testid={`${testIdPrefix}-inbox--${rowId}`}
                  disabled={inboxDisabled}
                  onClick={handleInboxToggle}
                >
                  <Inbox className="h-4 w-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{inboxDisabled ? "No email address" : "View email threads"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="inline-flex"
                tabIndex={addEventDisabled ? 0 : undefined}
                data-testid={`${testIdPrefix}-add-event-trigger--${rowId}`}
                onClick={stopQuickCardRowClick}
              >
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  aria-label={
                    addEventDisabled ? `Add event unavailable for ${name}` : `Add event for ${name}`
                  }
                  data-testid={`${testIdPrefix}-add-event--${rowId}`}
                  disabled={addEventDisabled}
                  onClick={(event) => {
                    stopQuickCardRowClick(event)
                    if (addEventDisabled) return
                    setAddEventOpen(true)
                  }}
                >
                  <CalendarPlus className="h-4 w-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>{addEventDisabled ? addEventDisabledReason : "Add event"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="inline-flex"
                data-testid={`${testIdPrefix}-add-note-trigger--${rowId}`}
                onClick={stopQuickCardRowClick}
              >
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  aria-label={`Add note for ${name}`}
                  data-testid={`${testIdPrefix}-add-note--${rowId}`}
                  onClick={(event) => {
                    stopQuickCardRowClick(event)
                    setAddNoteOpen(true)
                  }}
                >
                  <NotebookText className="h-4 w-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Add note</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="inline-flex"
                data-testid={`${testIdPrefix}-add-reminder-trigger--${rowId}`}
                onClick={stopQuickCardRowClick}
              >
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  aria-label={`Add reminder for ${name}`}
                  data-testid={`${testIdPrefix}-add-reminder--${rowId}`}
                  onClick={(event) => {
                    stopQuickCardRowClick(event)
                    setAddReminderOpen(true)
                  }}
                >
                  <Bell className="h-4 w-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Add reminder</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {hasOpened && email ? (
        <div
          className={showThreads ? "" : "hidden"}
          data-threads-panel={showThreads ? "open" : "closed"}
          onClick={stopQuickCardRowClick}
        >
          <EntityThreadsPanel email={email} />
        </div>
      ) : null}

      {composeOpen && email ? (
        <GmailComposeDialog
          key={`${testIdPrefix}-${rowId}-${email}`}
          open={composeOpen}
          to={email}
          subject={composeSubject}
          body={`Dear ${name},\n\n`}
          onClose={() => setComposeOpen(false)}
        />
      ) : null}

      {renderDialogs({
        addEventOpen,
        addNoteOpen,
        addReminderOpen,
        setAddEventOpen,
        setAddNoteOpen,
        setAddReminderOpen,
      })}
    </div>
  )
}
