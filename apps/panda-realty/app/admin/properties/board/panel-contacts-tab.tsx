"use client"

import { Mail, Phone } from "lucide-react"

import { EmptyState } from "./panel-shared"
import { ContactChip } from "./panel-contact-chip"
import type { PropertyDetailContact } from "./property-types"

export function ContactsTab({ contacts }: { contacts: PropertyDetailContact[] }) {
  if (contacts.length === 0) return <EmptyState message="No contacts linked yet." />

  return (
    <div className="space-y-3">
      {contacts.map((contact) => (
        <div
          key={contact.propertyEntityId}
          data-testid={`pipeline-contact-card--${contact.propertyEntityId}`}
          className="rounded-lg border border-border bg-card px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">{contact.entityName}</p>
            {contact.association === "Buyer" && (
              <span
                className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                data-testid={`pipeline-contact-association--${contact.propertyEntityId}`}
              >
                Buyer
              </span>
            )}
            {contact.association === "Seller" && (
              <span
                className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                data-testid={`pipeline-contact-association--${contact.propertyEntityId}`}
              >
                Seller
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            {contact.phoneNumber && (
              <ContactChip icon={<Phone className="size-3" />} value={contact.phoneNumber} />
            )}
            {contact.emailAddress && (
              <ContactChip icon={<Mail className="size-3" />} value={contact.emailAddress} />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
