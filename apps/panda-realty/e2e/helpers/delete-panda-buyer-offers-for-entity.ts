import postgres from "postgres"

/**
 * Removes all `panda_realty.buyer_offers` rows tied to any `property_entities` row
 * for the given CRM `entity_id`. Used by live E2E prep so offer counts start clean.
 */
export async function deletePandaBuyerOffersForEntityId(
  entityId: number,
): Promise<void> {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    throw new Error("DATABASE_URL is required to delete buyer offers")
  }
  const sql = postgres(url, { max: 1 })
  try {
    await sql`
      DELETE FROM panda_realty.buyer_offers AS bo
      USING panda_realty.property_entities AS pe
      WHERE bo.property_entity_id = pe.property_entity_id
        AND pe.entity_id = ${entityId}
    `
  } finally {
    await sql.end({ timeout: 5 })
  }
}
