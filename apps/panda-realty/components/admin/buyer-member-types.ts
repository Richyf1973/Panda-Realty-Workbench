export interface EntityMember {
  entityMemberId: number
  entityId: number
  memberName: string
  memberPhoneNumber: string | null
  memberEmailAddress: string | null
  memberAddress: string | null
  propertyToSellAddress: string | null
  scheduledViewingDate: string | null
  isBuyersRepresentative: boolean
}

export interface MemberFormState {
  memberName: string
  memberPhoneNumber: string
  memberEmailAddress: string
  memberAddress: string
  propertyToSellAddress: string
  scheduledViewingDate: string
  isBuyersRepresentative: boolean
}

export interface MemberDialogState {
  open: boolean
  member: EntityMember | null
  saving: boolean
  saveError: string | null
  calendarOpen: boolean
}

export interface DeleteDialogState {
  open: boolean
  member: EntityMember | null
  deleting: boolean
}

export function formatViewingDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

export function memberToForm(m: EntityMember): MemberFormState {
  return {
    memberName: m.memberName,
    memberPhoneNumber: m.memberPhoneNumber ?? "",
    memberEmailAddress: m.memberEmailAddress ?? "",
    memberAddress: m.memberAddress ?? "",
    propertyToSellAddress: m.propertyToSellAddress ?? m.memberAddress ?? "",
    scheduledViewingDate: m.scheduledViewingDate ?? "",
    isBuyersRepresentative: m.isBuyersRepresentative === true,
  }
}

export const EMPTY_FORM: MemberFormState = {
  memberName: "",
  memberPhoneNumber: "",
  memberEmailAddress: "",
  memberAddress: "",
  propertyToSellAddress: "",
  scheduledViewingDate: "",
  isBuyersRepresentative: false,
}
