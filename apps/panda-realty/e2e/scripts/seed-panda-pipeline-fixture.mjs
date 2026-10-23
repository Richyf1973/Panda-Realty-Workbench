/**
 * Transaction body for Panda pipeline E2E fixtures — imported by `seed-sellers-pipeline-accepted-offer.mjs`.
 * @param {import('postgres').Sql} sql — scoped client from `sql.begin(...)`
 */
import { ensureContactPropertyEntity, ensureEntity, ensureProperty, ensurePropertyEntity, ensureSingleAcceptedOffer } from "./seed-helpers.mjs"

export async function seedPandaPipelineE2e(sql) {
  const MARKER_STREET = "99 E2E Seed Street"
  const NO_OFFER_STREET = "98 E2E No-Offer Street"
  const NO_CONTRACT_STREET = "97 E2E No-Contract Street"
  const NO_BUYER_OFFERS_STREET = "93 E2E No-Buyer-Offers Street"
  const ANCIENT_STREET = "96 E2E Ancient Street"
  const ANCIENT_SELLERS_STREET = "95 E2E Ancient Sellers Street"
  const MARKER_SUBURB = "Playwright Seed"
  const BUYER_NAME = "E2E Seed Buyer (Playwright)"
  const BUYER_NO_ACCEPT_NAME = "E2E No-Accept Buyer (Playwright)"
  const BUYER_NO_OFFER_NAME = "E2E No-Offer Buyer (Playwright)"
  const ANCIENT_BUYER_NAME = "E2E Ancient Buyer (Playwright)"
  const SEED_MEMBER_NAME = "E2E Seed Member"
  const SEED_BUYERS_REP_NAME = "E2E Seed Buyers Rep"
  const CONTACT_NAME = "E2E Seed Contact (Playwright)"

  const stageRows = await sql`
    SELECT property_status_id AS id
    FROM panda_realty.property_status
    WHERE pipeline = 'sellers' AND property_status_code = 'Conditions'
    LIMIT 1
  `
  const fallback = await sql`
    SELECT property_status_id AS id
    FROM panda_realty.property_status
    WHERE pipeline = 'sellers'
    ORDER BY sort_order NULLS LAST, property_status_id
    LIMIT 1
  `
  const statusId = stageRows[0]?.id ?? fallback[0]?.id
  if (statusId == null) {
    throw new Error("No sellers pipeline rows in panda_realty.property_status — run migrations/seed.")
  }

  const buyerStageRows = await sql`
    SELECT property_status_id AS id
    FROM panda_realty.property_status
    WHERE pipeline = 'buyers'
    ORDER BY sort_order NULLS LAST, property_status_id
    LIMIT 1
  `
  const buyersPipelineStageId = buyerStageRows[0]?.id
  if (buyersPipelineStageId == null) {
    throw new Error("No buyers pipeline rows in panda_realty.property_status — run migrations/seed.")
  }

  const ctx = { suburb: MARKER_SUBURB, statusId, buyersPipelineStageId }

  const propertyListId = await ensureProperty(sql, { ...ctx, street: MARKER_STREET, contractMode: "today" })
  const propertyListIdNoOffer = await ensureProperty(sql, { ...ctx, street: NO_OFFER_STREET, contractMode: "today" })
  const propertyListIdNoContract = await ensureProperty(sql, { ...ctx, street: NO_CONTRACT_STREET, contractMode: "null" })
  const propertyListIdNoBuyerOffers = await ensureProperty(sql, { ...ctx, street: NO_BUYER_OFFERS_STREET, contractMode: "null" })

  // Seed owner1, owner2, and RPD on main property (contact-chip + Contract S&P prefill two-seller path).
  await sql`
    UPDATE panda_realty.panda_properties
    SET
      owner1name    = COALESCE(NULLIF(owner1name, ''), 'E2E Seed Owner'),
      owner1phone   = '0400000001',
      owner1email   = 'e2e-owner@example.com',
      owner1address = '1 E2E Owner Street, Brisbane QLD 4000',
      owner1mobile  = '0400000003',
      owner1abn     = '12 345 678 901',
      owner2name    = 'E2E Seed Owner Two',
      owner2address = '2 E2E Owner Two Street, Brisbane QLD 4001',
      owner2phone   = '0400000004',
      owner2email   = 'e2e-owner2@example.com',
      owner2mobile  = '0400000005',
      owner2abn     = '98 765 432 109',
      rpd           = '12/RP123456'
    WHERE property_list_id = ${propertyListId}
  `

  // Commission rate fixtures: main (rate + accepted offer → $ amount), no-offer (rate, no accepted offer → "No offer yet").
  await sql`
    UPDATE panda_realty.panda_properties SET commission_rate = 2.00 WHERE property_list_id = ${propertyListId}
  `
  await sql`
    UPDATE panda_realty.panda_properties SET commission_rate = 1.50 WHERE property_list_id = ${propertyListIdNoOffer}
  `
  // propertyListIdNoContract intentionally has no commission_rate — verifies Commission row/badge is hidden.

  // Appraised amount fixtures for kanban card price tooltip tests.
  // main: accepted offer=$500k, appraised=$480k → card shows $500k (contract price)
  // no-offer: no accepted offer, appraised=$380k → card shows $380k (appraised price)
  await sql`
    UPDATE panda_realty.panda_properties SET appraised_amount = 480000 WHERE property_list_id = ${propertyListId}
  `
  await sql`
    UPDATE panda_realty.panda_properties SET appraised_amount = 380000 WHERE property_list_id = ${propertyListIdNoOffer}
  `

  const entityId = await ensureEntity(sql, { name: BUYER_NAME })
  const entityNoAcceptId = await ensureEntity(sql, { name: BUYER_NO_ACCEPT_NAME })
  const entityNoOfferId = await ensureEntity(sql, { name: BUYER_NO_OFFER_NAME })
  const entityAncientId = await ensureEntity(sql, { name: ANCIENT_BUYER_NAME })
  const entityContactId = await ensureEntity(sql, { name: CONTACT_NAME, categoryId: 4 })

  // Seed contact data on main buyer entity so buyer contact-chip hover tests work.
  await sql`
    UPDATE panda_realty.entities
    SET contact = '0400000002', email_address = 'e2e-buyer@example.com'
    WHERE entity_id = ${entityId}
  `

  const memberRows = await sql`
    SELECT entity_member_id AS id
    FROM panda_realty.entity_members
    WHERE entity_id = ${entityId} AND member_name = ${SEED_MEMBER_NAME}
    LIMIT 1
  `
  if (memberRows.length === 0) {
    await sql`
      INSERT INTO panda_realty.entity_members (entity_id, member_name)
      VALUES (${entityId}, ${SEED_MEMBER_NAME})
    `
  }

  const repRows = await sql`
    SELECT entity_member_id AS id
    FROM panda_realty.entity_members
    WHERE entity_id = ${entityId} AND member_name = ${SEED_BUYERS_REP_NAME}
    LIMIT 1
  `
  if (repRows.length === 0) {
    await sql`
      INSERT INTO panda_realty.entity_members (entity_id, member_name, is_buyers_representative, property_to_sell_address, member_address)
      VALUES (${entityId}, ${SEED_BUYERS_REP_NAME}, true, '55 E2E Rep Street, Brisbane QLD 4000', '42 E2E Rep Home Street, Brisbane QLD 4001')
    `
  } else {
    await sql`
      UPDATE panda_realty.entity_members
      SET is_buyers_representative = true,
          property_to_sell_address = '55 E2E Rep Street, Brisbane QLD 4000',
          member_address = '42 E2E Rep Home Street, Brisbane QLD 4001'
      WHERE entity_id = ${entityId} AND member_name = ${SEED_BUYERS_REP_NAME}
    `
  }

  const propertyEntityId = await ensurePropertyEntity(sql, { propertyListId, entityId, buyersPipelineStageId })
  await ensureContactPropertyEntity(sql, { propertyListId, entityId: entityContactId })
  const peNoOffer = await ensurePropertyEntity(sql, { propertyListId: propertyListIdNoOffer, entityId: entityNoAcceptId, buyersPipelineStageId })
  // "No-buyer-offers" property: one buyer linked, zero offer rows — tests buyers-row state 1 (all buyers shown).
  await ensurePropertyEntity(sql, { propertyListId: propertyListIdNoBuyerOffers, entityId: entityNoOfferId, buyersPipelineStageId })
  await sql`
    DELETE FROM panda_realty.buyer_offers AS bo
    USING panda_realty.property_entities AS pe
    WHERE bo.property_entity_id = pe.property_entity_id
      AND pe.property_list_id = ${propertyListIdNoBuyerOffers}
  `
  const peNoContract = await ensurePropertyEntity(sql, { propertyListId: propertyListIdNoContract, entityId, buyersPipelineStageId })

  const propertyListIdAncient = await ensureProperty(sql, { ...ctx, street: ANCIENT_STREET, contractMode: "today" })
  const peAncient = await ensurePropertyEntity(sql, { propertyListId: propertyListIdAncient, entityId: entityAncientId, buyersPipelineStageId })
  await sql`
    UPDATE panda_realty.property_entities
    SET
      created_at = NOW() - INTERVAL '18 months',
      updated_at = NOW()
    WHERE property_entity_id = ${peAncient}
  `

  // Ancient sellers property: updated_at backdated so it is excluded by the 1-month sellers filter.
  // session_replication_role=replica bypasses the moddatetime trigger that would reset updated_at.
  const propertyListIdAncientSellers = await ensureProperty(sql, { ...ctx, street: ANCIENT_SELLERS_STREET, contractMode: "null" })
  await sql`SET session_replication_role = replica`
  await sql`
    UPDATE panda_realty.panda_properties
    SET updated_at = NOW() - INTERVAL '18 months'
    WHERE property_list_id = ${propertyListIdAncientSellers}
  `
  await sql`RESET session_replication_role`

  await ensureSingleAcceptedOffer(sql, {
    propertyEntityId,
    propertyListId,
    offer: 500000,
    subjectToSaleDays: 28,
    settlementDate: "2026-09-01",
    depositInitial: 10000,
    depositBalance: 490000,
    financeDays: 14,
    buildingPestDays: 7,
    isCashOffer: false,
    isSubjectToFinance: true,
    isSubjectToSale: true,
    subjectToSaleAddress: "77 E2E Sale Street, Brisbane QLD 4000",
    financeBank: "ANZ",
    conditionNotes: "Further test condition.",
  })

  await sql`
    UPDATE panda_realty.buyer_offers
    SET is_accepted = false, updated_at = NOW()
    WHERE property_entity_id = ${peNoOffer}
  `
  const offerNoOfferRows = await sql`
    SELECT buyer_offer_id AS id
    FROM panda_realty.buyer_offers
    WHERE property_entity_id = ${peNoOffer}
    LIMIT 1
  `
  if (offerNoOfferRows.length > 0) {
    await sql`
      UPDATE panda_realty.buyer_offers
      SET offer = 400000, is_accepted = false, date_offered = CURRENT_DATE, updated_at = NOW()
      WHERE buyer_offer_id = ${offerNoOfferRows[0].id}
    `
  } else {
    await sql`
      INSERT INTO panda_realty.buyer_offers (property_entity_id, offer, is_accepted, date_offered)
      VALUES (${peNoOffer}, 400000, false, CURRENT_DATE)
    `
  }

  await ensureSingleAcceptedOffer(sql, { propertyEntityId: peNoContract, propertyListId: propertyListIdNoContract, offer: 450000 })

  // Seed a property-level file on the main property so the detail panel Files tab test can assert it.
  const existingFile = await sql`
    SELECT property_list_file_id AS id
    FROM panda_realty.property_list_files
    WHERE property_list_id = ${propertyListId} AND file_name = 'E2E Seed File.pdf'
    LIMIT 1
  `
  if (existingFile.length === 0) {
    await sql`
      INSERT INTO panda_realty.property_list_files (property_list_id, file_name, file_type, file_size, file_link)
      VALUES (${propertyListId}, 'E2E Seed File.pdf', 'application/pdf', 10240, 'https://example.com/e2e-seed-file.pdf')
    `
  }

  console.log(
    `Seed OK — main=${propertyListId} (accepted+contract); no-offer=${propertyListIdNoOffer}; no-contract=${propertyListIdNoContract}; no-buyer-offers=${propertyListIdNoBuyerOffers}; ancient=${propertyListIdAncient}; ancient-sellers=${propertyListIdAncientSellers}`,
  )
}
