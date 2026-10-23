"use client"

import { useState } from "react"

import { EntityCardRowActions, type EntityCardRowActionsProps } from "./property-entity-card-row-actions"
import { EntityThreadsPanel, type EntityThreadForwardDraft, type EntityThreadReplyDraft } from "./entity-threads-panel"

export interface EntityCardRowProps extends Omit<EntityCardRowActionsProps, "showThreads" | "onInboxToggle"> {
  address?: string | null
  statusLabel?: string | null
  subLine?: React.ReactNode
  onReply?: (draft: EntityThreadReplyDraft) => void
  onForward?: (draft: EntityThreadForwardDraft) => void
  propertyListId?: number | null
  entityId?: number | null
}

export function EntityCardRow({
  propertyEntityId,
  entityName,
  phoneNumber,
  emailAddress,
  address,
  statusLabel,
  subLine,
  testidPrefix,
  onReply,
  onForward,
  propertyListId,
  entityId,
  ...actionProps
}: EntityCardRowProps) {
  const [showThreads, setShowThreads] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)

  function handleInboxToggle() {
    if (!showThreads && !hasOpened) setHasOpened(true)
    setShowThreads((v) => !v)
  }

  return (
    <li
      className="flex flex-col rounded-md border bg-card"
      data-testid={`${testidPrefix}-row--${propertyEntityId}`}
    >
      <div className="flex items-start gap-3 px-3 py-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{entityName}</span>
            {statusLabel && (
              <span
                className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                data-testid={`${testidPrefix}-status--${propertyEntityId}`}
              >
                {statusLabel}
              </span>
            )}
            {subLine}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {phoneNumber && <span data-testid={`${testidPrefix}-phone--${propertyEntityId}`}>{phoneNumber}</span>}
            {emailAddress && <span>{emailAddress}</span>}
            {address && <span>{address}</span>}
          </div>
        </div>
        <EntityCardRowActions
          propertyEntityId={propertyEntityId}
          entityName={entityName}
          phoneNumber={phoneNumber}
          emailAddress={emailAddress}
          inboxEnabled={entityId != null || !!emailAddress?.trim()}
          testidPrefix={testidPrefix}
          showThreads={showThreads}
          onInboxToggle={handleInboxToggle}
          {...actionProps}
        />
      </div>
      {hasOpened && (entityId != null || emailAddress?.trim()) && (
        <div className={showThreads ? "px-3 pb-3" : "hidden"}>
          <EntityThreadsPanel
            entityId={entityId}
            email={emailAddress?.trim()}
            onReply={onReply}
            onForward={onForward}
            propertyListId={propertyListId}
            propertyEntityId={propertyEntityId}
            entityName={entityName}
          />
        </div>
      )}
    </li>
  )
}
