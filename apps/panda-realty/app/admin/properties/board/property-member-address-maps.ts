// Pure helper — no DB calls, no server imports.

export type MemberAddressRow = {
  entityId: number
  propertyToSellAddress: string | null
  memberAddress: string | null
  isBuyersRepresentative: boolean
}

/**
 * Builds two entity-keyed maps from raw entity_members rows:
 * - memberPropertyToSellAddressById: rep's propertyToSellAddress → rep's memberAddress → first member's propertyToSellAddress → first member's memberAddress
 * - memberResidenceAddressById: rep's memberAddress → first member's memberAddress
 *
 * Rep rows overwrite earlier (non-rep) entries for the same entityId.
 */
export function buildMemberAddressMaps(rows: MemberAddressRow[]): {
  memberPropertyToSellAddressById: Map<number, string | null>
  memberResidenceAddressById: Map<number, string | null>
} {
  const memberPropertyToSellAddressById = new Map<number, string | null>()
  const memberResidenceAddressById = new Map<number, string | null>()
  for (const m of rows) {
    if (!memberPropertyToSellAddressById.has(m.entityId) || m.isBuyersRepresentative) {
      memberPropertyToSellAddressById.set(m.entityId, m.propertyToSellAddress ?? m.memberAddress ?? null)
    }
    if (!memberResidenceAddressById.has(m.entityId) || m.isBuyersRepresentative) {
      memberResidenceAddressById.set(m.entityId, m.memberAddress ?? null)
    }
  }
  return { memberPropertyToSellAddressById, memberResidenceAddressById }
}
