export interface ContactMember {
  entityMemberId: number
  entityId: number
  memberName: string
  memberPhoneNumber: string | null
  memberEmailAddress: string | null
}

export interface ContactMemberFormState {
  memberName: string
  memberPhoneNumber: string
  memberEmailAddress: string
}

export interface ContactMemberDialogState {
  open: boolean
  member: ContactMember | null
  saving: boolean
  saveError: string | null
}

export interface ContactMemberDeleteDialogState {
  open: boolean
  member: ContactMember | null
  deleting: boolean
}

export const EMPTY_CONTACT_MEMBER_FORM: ContactMemberFormState = {
  memberName: "",
  memberPhoneNumber: "",
  memberEmailAddress: "",
}

export function contactMemberToForm(m: ContactMember): ContactMemberFormState {
  return {
    memberName: m.memberName,
    memberPhoneNumber: m.memberPhoneNumber ?? "",
    memberEmailAddress: m.memberEmailAddress ?? "",
  }
}
