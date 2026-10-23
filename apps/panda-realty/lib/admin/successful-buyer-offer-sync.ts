/**
 * Forward-sync: when a SUCCESSFUL BUYER member field is edited in the property
 * dialog, push the new value into the matching buyer of the latest
 * `offer_form_submissions` row so the read-only "Offer Form Submission" panel
 * stays consistent with the editable Successful Buyer rows.
 *
 * Non-rep `entity_members` map 1:1 by `entity_member_id` order to `buyers_json[]`
 * (mirrors `upsertEntityMembersInTx`). Member[0] also mirrors the top-level
 * `buyer1_name`/`buyer_email`/`buyer_phone`/`buyer_address` columns; member[1]'s
 * name mirrors `buyer2_name`.
 */

export type SuccessfulBuyerSyncField =
  | "memberName"
  | "memberAddress"
  | "memberPhoneNumber"
  | "memberEmailAddress"

export const SUCCESSFUL_BUYER_SYNC_FIELDS: readonly SuccessfulBuyerSyncField[] = [
  "memberName",
  "memberAddress",
  "memberPhoneNumber",
  "memberEmailAddress",
] as const

export function isSuccessfulBuyerSyncField(value: unknown): value is SuccessfulBuyerSyncField {
  return typeof value === "string" && (SUCCESSFUL_BUYER_SYNC_FIELDS as readonly string[]).includes(value)
}

const FIELD_TO_BUYERS_JSON_KEY: Record<SuccessfulBuyerSyncField, "name" | "address" | "phone" | "email"> = {
  memberName: "name",
  memberAddress: "address",
  memberPhoneNumber: "phone",
  memberEmailAddress: "email",
}

/** Buyer entries keep extra keys (hasRep, repName, …); only the typed four are guaranteed. */
type BuyerJsonEntry = Record<string, unknown> & {
  name?: string
  phone?: string
  email?: string
  address?: string
}

export interface SubmissionSyncPatch {
  buyersJson?: BuyerJsonEntry[]
  buyer1Name?: string | null
  buyer2Name?: string | null
  buyerEmail?: string | null
  buyerPhone?: string | null
  buyerAddress?: string | null
}

/**
 * Build the partial update to apply to a single `offer_form_submissions` row.
 * Returns an empty object when there is nothing to sync (e.g. the buyer index
 * has no `buyers_json` entry and is not the top-level buyer 1/2).
 *
 * - `buyersJson` is cloned (never mutated in place) and preserves every extra key.
 * - Empty values are stored as `""` inside `buyers_json` (matching the form's
 *   own shape) and as `null` in the nullable top-level columns.
 */
export function buildSubmissionSyncPatch(args: {
  field: SuccessfulBuyerSyncField
  value: string | null
  memberIndex: number
  buyersJson: BuyerJsonEntry[] | null
}): SubmissionSyncPatch {
  const { field, value, memberIndex, buyersJson } = args
  const key = FIELD_TO_BUYERS_JSON_KEY[field]
  const normalized = value && value.trim() !== "" ? value.trim() : null
  const patch: SubmissionSyncPatch = {}

  if (Array.isArray(buyersJson) && memberIndex >= 0 && memberIndex < buyersJson.length) {
    const next = buyersJson.map((entry, i) =>
      i === memberIndex ? { ...entry, [key]: normalized ?? "" } : entry,
    )
    patch.buyersJson = next
  }

  if (field === "memberName") {
    if (memberIndex === 0) patch.buyer1Name = normalized
    else if (memberIndex === 1) patch.buyer2Name = normalized
  } else if (memberIndex === 0) {
    if (field === "memberEmailAddress") patch.buyerEmail = normalized
    else if (field === "memberPhoneNumber") patch.buyerPhone = normalized
    else if (field === "memberAddress") patch.buyerAddress = normalized
  }

  return patch
}
