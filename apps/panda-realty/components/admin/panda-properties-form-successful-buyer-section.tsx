"use client"

import { useEffect, useState } from "react"
import { Star } from "lucide-react"
import { useOptionalAdminNestedEntityCrud } from "@repo/admin/components/admin/admin-nested-entity-crud-context"
import { Input } from "@repo/ui/input"

import { PandaPropertiesFormSuccessfulBuyerEntityActions } from "./panda-properties-form-successful-buyer-entity-actions"
import { PandaPropertiesFormSuccessfulBuyerMemberRow } from "./panda-properties-form-successful-buyer-member-row"
import type { BuyerOffer } from "./panda-properties-dialog-form-types"

interface Props {
  acceptedOffer: BuyerOffer
  propertyListId: number
  propertyAddress: string
  /** Deep link: auto-open the buyer's portal messages on mount (from a notification email link). */
  autoOpenMessages?: boolean
}

/** Selecting a member's phone/email primary persists a pointer on the buyer entity. */
async function patchEntityPrimary(entityId: number, field: "primaryPhoneMemberId" | "primaryEmailMemberId", memberId: number) {
  await fetch(`/api/admin/entities/${entityId}/primary-member`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [field]: memberId }),
  })
}

export function PandaPropertiesFormSuccessfulBuyerSection({
  acceptedOffer,
  propertyListId,
  propertyAddress,
  autoOpenMessages = false,
}: Props) {
  const nestedCrud = useOptionalAdminNestedEntityCrud()
  const { entityId, propertyEntityId } = acceptedOffer
  const members = acceptedOffer.members ?? []

  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null)
  const [primaryPhoneId, setPrimaryPhoneId] = useState<number | null>(acceptedOffer.primaryPhoneMemberId ?? null)
  const [primaryEmailId, setPrimaryEmailId] = useState<number | null>(acceptedOffer.primaryEmailMemberId ?? null)

  // Zero-member fallback: edit the entity-level enquiry contact directly.
  const [name, setName] = useState(acceptedOffer.entityName)
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState(acceptedOffer.phoneNumber ?? "")
  const [email, setEmail] = useState(acceptedOffer.emailAddress ?? "")

  useEffect(() => {
    if (members.length > 0) return
    let cancelled = false
    void fetch(`/api/admin/entities/${entityId}`)
      .then((r) => r.json())
      .then((d: { address?: string | null }) => { if (!cancelled) setAddress(d.address ?? "") })
      .catch((err) => console.warn("[PandaPropertiesFormSuccessfulBuyerSection] Failed to load entity address", err))
    return () => { cancelled = true }
  }, [entityId, members.length])

  useEffect(() => {
    let cancelled = false
    void fetch("/api/admin/calendar/status")
      .then((r) => r.json())
      .then((d: { connected: boolean }) => { if (!cancelled) setCalendarConnected(d.connected) })
      .catch(() => { if (!cancelled) setCalendarConnected(false) })
    return () => { cancelled = true }
  }, [])

  function handleOpenProfile() {
    nestedCrud?.openNestedEntityEdit({
      slug: "entities",
      rowId: String(entityId),
      nestedEditUiContext: { sourcePropertyListId: String(propertyListId) },
    })
  }

  // Effective primary: explicit pointer → buyer's representative → first member.
  const defaultMemberId =
    members.find((m) => m.isBuyersRepresentative)?.entityMemberId ?? members[0]?.entityMemberId ?? null
  const effectivePhoneId = primaryPhoneId ?? defaultMemberId
  const effectiveEmailId = primaryEmailId ?? defaultMemberId

  function handleSetPrimaryPhone(memberId: number) {
    setPrimaryPhoneId(memberId)
    void patchEntityPrimary(entityId, "primaryPhoneMemberId", memberId)
  }
  function handleSetPrimaryEmail(memberId: number) {
    setPrimaryEmailId(memberId)
    void patchEntityPrimary(entityId, "primaryEmailMemberId", memberId)
  }

  async function patchEntityField(field: "entityName" | "contact" | "emailAddress" | "address", value: string) {
    await fetch(`/api/admin/entities/${entityId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value.trim() || null }),
    })
  }

  return (
    <div className="shrink-0 border-b" data-testid="panda-properties-form-section--successful-buyer">
      <div className="space-y-2 p-4 pb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Successful Buyer</p>
        <div
          className="hidden gap-x-4 md:grid md:grid-cols-4"
          aria-hidden={true}
          data-testid="panda-properties-form-successful-buyer-column-headers"
        >
          <span className="text-xs font-medium text-muted-foreground">Name</span>
          <span className="text-xs font-medium text-muted-foreground">Address</span>
          <span className="text-xs font-medium text-muted-foreground">Phone</span>
          <span className="text-xs font-medium text-muted-foreground">Email</span>
        </div>
      </div>

      {members.length > 0 ? (
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 px-4 pb-2 pt-0 md:grid-cols-4">
          {members.map((member) => (
            <PandaPropertiesFormSuccessfulBuyerMemberRow
              key={member.entityMemberId}
              member={member}
              entityId={entityId}
              propertyEntityId={propertyEntityId}
              propertyListId={propertyListId}
              propertyAddress={propertyAddress}
              calendarConnected={calendarConnected}
              isPrimaryPhone={effectivePhoneId === member.entityMemberId}
              isPrimaryEmail={effectiveEmailId === member.entityMemberId}
              onSetPrimaryPhone={() => handleSetPrimaryPhone(member.entityMemberId)}
              onSetPrimaryEmail={() => handleSetPrimaryEmail(member.entityMemberId)}
              onOpenProfile={handleOpenProfile}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-1 px-4 pb-2 pt-0 md:grid-cols-4">
          <div className="relative min-w-0">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => void patchEntityField("entityName", name)}
              placeholder="Name"
              aria-label="Buyer name"
              data-testid={`panda-properties-form-successful-buyer-name--${propertyEntityId}`}
              className="min-w-0 pr-7"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Open buyer profile"
              data-testid={`panda-properties-form-successful-buyer-open-profile--${propertyEntityId}`}
              onClick={handleOpenProfile}
            >
              ↗
            </button>
          </div>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onBlur={() => void patchEntityField("address", address)}
            placeholder="Address"
            aria-label="Buyer address"
            data-testid={`panda-properties-form-successful-buyer-address-input--${propertyEntityId}`}
            className="min-w-0"
          />
          <div className="relative min-w-0">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => void patchEntityField("contact", phone)}
              placeholder="Phone"
              type="tel"
              aria-label="Buyer phone"
              data-testid={`panda-properties-form-successful-buyer-phone-input--${propertyEntityId}`}
              className="min-w-0 pr-7"
            />
            <span
              role="img"
              aria-label="Primary phone buyer (active)"
              data-testid={`panda-properties-form-successful-buyer-phone-star--${propertyEntityId}`}
              aria-pressed={true}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-amber-400"
            >
              <Star className="h-3.5 w-3.5" fill="currentColor" />
            </span>
          </div>
          <div className="relative min-w-0">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => void patchEntityField("emailAddress", email)}
              placeholder="Email"
              type="email"
              aria-label="Buyer email"
              data-testid={`panda-properties-form-successful-buyer-email-input--${propertyEntityId}`}
              className="min-w-0 pr-7"
            />
            <span
              role="img"
              aria-label="Primary email buyer (active)"
              data-testid={`panda-properties-form-successful-buyer-email-star--${propertyEntityId}`}
              aria-pressed={true}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-amber-400"
            >
              <Star className="h-3.5 w-3.5" fill="currentColor" />
            </span>
          </div>
        </div>
      )}

      <div className="px-4 pb-4">
        <PandaPropertiesFormSuccessfulBuyerEntityActions
          propertyEntityId={propertyEntityId}
          entityId={entityId}
          entityName={members.length > 0 ? acceptedOffer.entityName : name}
          propertyListId={propertyListId}
          propertyAddress={propertyAddress}
          calendarConnected={calendarConnected}
          showContactActions={members.length === 0}
          phone={phone}
          email={email}
          autoOpenMessages={autoOpenMessages}
        />
      </div>
    </div>
  )
}
