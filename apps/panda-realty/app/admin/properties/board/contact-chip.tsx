"use client"

import { useState } from "react"
import { CalendarPlus, Mail, Phone } from "lucide-react"

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@repo/ui/hover-card"
import { cn } from "@repo/ui/utils"

import { AddMeetingDialog } from "./property-meeting-dialogs"
import type { PropertyDetailBuyer } from "./property-types"

export type ContactItem = {
  name: string
  phone: string | null
  email: string | null
}

export function ContactChip({
  name,
  phone,
  email,
  propertyListId,
  buyers,
  onMeetingAdded,
}: {
  name: string
  phone: string | null
  email: string | null
  propertyListId: number
  buyers: PropertyDetailBuyer[]
  onMeetingAdded: () => void
}) {
  const [meetingOpen, setMeetingOpen] = useState(false)
  const hasContact = !!(phone || email)

  if (!hasContact) {
    return <span className="font-medium text-foreground">{name}</span>
  }

  return (
    <>
      <HoverCard>
        <HoverCardTrigger asChild>
          <span
            data-testid="contact-chip-trigger"
            className={cn(
              "rounded px-1 -mx-1 font-medium text-foreground transition-colors",
              "underline decoration-dotted underline-offset-2 decoration-muted-foreground/50",
              "hover:bg-muted hover:decoration-foreground cursor-default",
            )}
          >
            {name}
          </span>
        </HoverCardTrigger>
        <HoverCardContent className="min-w-48" align="start">
          <p className="mb-2 text-xs font-semibold text-foreground">{name}</p>
          <div className="flex flex-col gap-1">
            {phone && (
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
              >
                <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                {phone}
              </a>
            )}
            {email && (
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
              >
                <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                {email}
              </a>
            )}
            <button
              onClick={() => setMeetingOpen(true)}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-foreground hover:bg-muted transition-colors text-left"
            >
              <CalendarPlus className="size-3.5 shrink-0 text-muted-foreground" />
              Add to Calendar
            </button>
          </div>
        </HoverCardContent>
      </HoverCard>

      <AddMeetingDialog
        open={meetingOpen}
        onOpenChange={setMeetingOpen}
        propertyListId={propertyListId}
        buyers={buyers}
        onAdded={onMeetingAdded}
        defaultTitle={`Meeting with ${name}`}
      />
    </>
  )
}

export function ContactList({
  items,
  propertyListId,
  buyers,
  onMeetingAdded,
}: {
  items: ContactItem[]
  propertyListId: number
  buyers: PropertyDetailBuyer[]
  onMeetingAdded: () => void
}) {
  if (items.length === 0) return null
  return (
    <dd className="flex flex-wrap gap-x-1 gap-y-0.5">
      {items.map((item, i) => (
        <span key={item.name} className="flex items-center">
          <ContactChip
            name={item.name}
            phone={item.phone}
            email={item.email}
            propertyListId={propertyListId}
            buyers={buyers}
            onMeetingAdded={onMeetingAdded}
          />
          {i < items.length - 1 && (
            <span className="ml-1 text-muted-foreground select-none">/</span>
          )}
        </span>
      ))}
    </dd>
  )
}
