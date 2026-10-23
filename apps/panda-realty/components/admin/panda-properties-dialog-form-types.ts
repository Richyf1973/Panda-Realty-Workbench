import type { ReactNode } from "react"
import type { Store } from "@tanstack/react-store"

import type { AdminRenderCrudDialogFormBodyArgs } from "@repo/admin/admin-client-registry-context"

export type FieldApi = {
  state: {
    value: string
    meta: {
      errors: readonly string[]
      errorMap?: { onServer?: string }
    }
  }
  handleChange: (v: string) => void
  handleBlur: () => void
}

export type FormLike = NonNullable<AdminRenderCrudDialogFormBodyArgs["form"]> & {
  Field: (props: {
    name: string
    validators?: { onSubmit?: (args: { value: string }) => string | undefined }
    children: (field: FieldApi) => ReactNode
  }) => ReactNode
  /** TanStack Form store — used to read `fieldMeta.*.errorMap.onServer` from the admin CRUD shell. */
  store: Store<unknown>
}

export type FormStoreState = {
  fieldMeta?: Record<
    string,
    { errorMap?: { onServer?: string }; errors?: readonly string[] }
  >
  isSubmitting?: boolean
}

/** One buyer member of the accepted buyer's entity — drives the SUCCESSFUL BUYER member rows. */
export type BuyerOfferMember = {
  entityMemberId: number
  memberName: string
  memberAddress: string | null
  memberPhoneNumber: string | null
  memberEmailAddress: string | null
  isBuyersRepresentative: boolean
}

export type BuyerOffer = {
  buyerOfferId: number
  entityId: number
  entityName: string
  propertyEntityId: number
  offerFormToken: string | null
  phoneNumber: string | null
  emailAddress: string | null
  /** Selected primary-phone / primary-email member (entity_members.entity_member_id), or null. */
  primaryPhoneMemberId: number | null
  primaryEmailMemberId: number | null
  offer: string
  isAccepted: boolean
  dateOffered: string | null
  createdAt: string | null
  isCashOffer: boolean
  noConditions: boolean
  coolingOffDays: number | null
  financeDays: number | null
  buildingPestDays: number | null
  dueDiligenceDays: number | null
  subjectToSaleDays: number | null
  subjectToSaleStage: string | null
  subjectToSaleAddress: string | null
  memberPropertyToSellAddress: string | null
  /** Buyer member full names, in entity_member_id order. Empty when the enquiry has no members. */
  memberNames: string[]
  /** Full buyer member rows, in entity_member_id order. Empty when the enquiry has no members. */
  members: BuyerOfferMember[]
  saleOfPropertyDays: number | null
  unconditionalContractDays: number | null
  depositInitial: string | null
  depositBalance: string | null
  otherConditions: string | null
  customConditions: Array<{ label: string; days: number }> | null
  conditionNotes: string | null
  waiveCoolingOff: boolean | null
  isSubjectToFinance: boolean | null
  financePreApproved: boolean | null
  financeBank: string | null
  financeBankContactName: string | null
  financeBankContactPhone: string | null
  financeBankContactEmail: string | null
  suggestBuildingCompanies: boolean | null
  isSubjectToSale: boolean | null
  saleDaysBeforeListingLive: number | null
  saleIsUnconditional: boolean | null
  saleUnconditionalDate: string | null
  saleBuyerSettlementDate: string | null
  saleActiveConditions: string[] | null
  saleFreeAppraisal: boolean | null
  settlementPeriod: string | null
}
