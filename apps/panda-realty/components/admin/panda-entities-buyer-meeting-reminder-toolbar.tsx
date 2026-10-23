"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useStore, type Store } from "@tanstack/react-store"
import { Bell, CalendarClock } from "lucide-react"

import type { AdminNestedEditUiContext } from "@repo/admin/components/admin/admin-entity-crud-dialog-state"
import { Button } from "@repo/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui/tooltip"
import { cn } from "@repo/ui/utils"

import { AddMeetingDialog } from "@/app/admin/properties/board/add-meeting-dialog"
import { AddReminderDialog } from "@/app/admin/properties/board/add-reminder-dialog"
import type { PropertyDetailBuyer } from "@/app/admin/properties/board/property-types"

import {
  fetchConnections,
  type ConnectionSummary,
} from "./panda-entities-property-connections-data"
import type { PandaEntitiesFormLike } from "./panda-entities-dialog-form-types"

type FormWithStore = PandaEntitiesFormLike & { readonly store: Store<unknown> }

function usePandaEntitiesFormValues(form: PandaEntitiesFormLike): Record<string, string> {
  const f = form as unknown as FormWithStore
  return useStore(f.store, (s) => {
    const v = (s as { values?: Record<string, string> }).values
    return v ?? {}
  })
}

function pickPrimaryConnection(
  items: ConnectionSummary[],
  nested: AdminNestedEditUiContext | undefined,
): ConnectionSummary | null {
  if (items.length === 0) return null
  const source = nested?.sourcePropertyListId?.trim()
  if (source) {
    const match = items.find(
      (c) =>
        c.propertyListId != null && String(c.propertyListId) === source,
    )
    if (match) return match
  }
  return items.reduce((best, c) =>
    c.propertyEntityId > best.propertyEntityId ? c : best,
  )
}

export function PandaEntitiesBuyerMeetingReminderToolbar({
  form,
  entityRowId,
  variant,
  nestedEditUiContext,
  isCompact,
  preloadedConnections,
}: {
  form: PandaEntitiesFormLike
  entityRowId: string | null
  variant: "create" | "edit"
  nestedEditUiContext?: AdminNestedEditUiContext
  isCompact: boolean
  preloadedConnections?: ConnectionSummary[] | null
}) {
  const [meetingOpen, setMeetingOpen] = useState(false)
  const [reminderOpen, setReminderOpen] = useState(false)
  const [connections, setConnections] = useState<ConnectionSummary[]>([])
  const [loadingConnections, setLoadingConnections] = useState(false)

  const values = usePandaEntitiesFormValues(form)

  const loadConnections = useCallback(async () => {
    if (!entityRowId) return
    setLoadingConnections(true)
    try {
      const result = await fetchConnections(entityRowId)
      if (result.ok) setConnections(result.items)
      else setConnections([])
    } finally {
      setLoadingConnections(false)
    }
  }, [entityRowId])

  useEffect(() => {
    if (variant !== "edit" || !entityRowId) {
      setConnections([])
      return
    }
    // Prefer pre-loaded data from listDetailSeed if available
    if (preloadedConnections && preloadedConnections.length > 0) {
      setConnections(preloadedConnections)
      return
    }
    // Otherwise fetch from API
    void loadConnections()
  }, [variant, entityRowId, loadConnections, preloadedConnections])

  const primary = useMemo(
    () => pickPrimaryConnection(connections, nestedEditUiContext),
    [connections, nestedEditUiContext],
  )

  const propertyListId =
    primary?.propertyListId != null ? Number(primary.propertyListId) : null

  const buyers: PropertyDetailBuyer[] = useMemo(() => {
    if (primary == null || !entityRowId) return []
    const entityId = Number(entityRowId)
    if (!Number.isFinite(entityId)) return []
    return [
      {
        propertyEntityId: primary.propertyEntityId,
        entityId,
        entityName: (values.entityName ?? "").trim() || "Buyer",
        phoneNumber: (values.contact ?? "").trim() || null,
        emailAddress: (values.emailAddress ?? "").trim() || null,
        memberPropertyToSellAddress: null,
        memberResidenceAddress: null,
        offers: [],
      },
    ]
  }, [primary, entityRowId, values.entityName, values.contact, values.emailAddress])

  const canOpen =
    variant === "edit" &&
    entityRowId &&
    !loadingConnections &&
    propertyListId != null &&
    primary != null

  const disabledReason = loadingConnections
    ? "Loading property links…"
    : connections.length === 0
      ? "Link a property in Property Connections first."
      : propertyListId == null || primary == null
        ? "Property link is missing listing id."
        : null

  if (variant !== "edit" || !entityRowId) return null

  const btnClass = cn(isCompact ? "h-8 px-2 text-xs" : "h-9 px-3 text-sm")

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "flex shrink-0 flex-wrap items-center gap-2 border-b",
          isCompact ? "px-3 py-2" : "px-4 py-3",
        )}
        data-testid="panda-entities-buyer-meeting-reminder-toolbar"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={btnClass}
                disabled={!canOpen}
                onClick={() => {
                  if (canOpen) setMeetingOpen(true)
                }}
                data-testid="panda-entities-buyer-meeting-btn"
              >
                <CalendarClock className="mr-1.5 size-4" aria-hidden />
                Meeting
              </Button>
            </span>
          </TooltipTrigger>
          {disabledReason ? (
            <TooltipContent side="bottom">{disabledReason}</TooltipContent>
          ) : null}
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={btnClass}
                disabled={!canOpen}
                onClick={() => {
                  if (canOpen) setReminderOpen(true)
                }}
                data-testid="panda-entities-buyer-reminder-btn"
              >
                <Bell className="mr-1.5 size-4" aria-hidden />
                Reminder
              </Button>
            </span>
          </TooltipTrigger>
          {disabledReason ? (
            <TooltipContent side="bottom">{disabledReason}</TooltipContent>
          ) : null}
        </Tooltip>
      </div>

      {propertyListId != null && primary != null ? (
        <>
          <AddMeetingDialog
            open={meetingOpen}
            onOpenChange={setMeetingOpen}
            propertyListId={propertyListId}
            buyers={buyers}
            defaultBuyerId={primary.propertyEntityId}
            onAdded={() => {
              setMeetingOpen(false)
              void loadConnections()
            }}
          />
          <AddReminderDialog
            open={reminderOpen}
            onOpenChange={setReminderOpen}
            propertyListId={propertyListId}
            buyers={buyers}
            defaultBuyerId={primary.propertyEntityId}
            onAdded={() => {
              setReminderOpen(false)
              void loadConnections()
            }}
          />
        </>
      ) : null}
    </TooltipProvider>
  )
}
