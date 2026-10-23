/**
 * Idempotent upsert helpers for Panda pipeline E2E seed fixtures.
 * Each function takes a `sql` scoped client (from `sql.begin(...)`) plus any
 * context it needs, and returns the resolved DB id.
 */

/** @param {import('postgres').Sql} sql */
export async function ensureProperty(sql, { street, suburb, statusId, contractMode }) {
  const existing = await sql`
    SELECT property_list_id AS id
    FROM panda_realty.panda_properties
    WHERE street_address = ${street} AND suburb = ${suburb}
    LIMIT 1
  `
  if (existing.length > 0) {
    const id = existing[0].id
    if (contractMode === "today") {
      await sql`
        UPDATE panda_realty.panda_properties
        SET
          is_favorite = true,
          property_status_id = ${statusId},
          contract_date = COALESCE(contract_date, CURRENT_DATE),
          updated_at = NOW()
        WHERE property_list_id = ${id}
      `
    } else {
      await sql`
        UPDATE panda_realty.panda_properties
        SET
          is_favorite = true,
          property_status_id = ${statusId},
          contract_date = NULL,
          updated_at = NOW()
        WHERE property_list_id = ${id}
      `
    }
    return id
  }
  if (contractMode === "today") {
    const [row] = await sql`
      INSERT INTO panda_realty.panda_properties (
        street_address, suburb, state, postcode, property_type,
        is_favorite, property_status_id, sale_price, contract_date
      )
      VALUES (
        ${street}, ${suburb}, 'QLD', '4000', 'House',
        true, ${statusId}, 500000, CURRENT_DATE
      )
      RETURNING property_list_id AS id
    `
    // sale_price is the listing price field; it no longer drives the kanban card price display.
    // Kanban cards show appraised_amount (or contract price from accepted offer) — set those
    // separately in seed-panda-pipeline-fixture.mjs after ensureProperty returns.
    return row.id
  }
  const [row] = await sql`
    INSERT INTO panda_realty.panda_properties (
      street_address, suburb, state, postcode, property_type,
      is_favorite, property_status_id, sale_price, contract_date
    )
    VALUES (
      ${street}, ${suburb}, 'QLD', '4000', 'House',
      true, ${statusId}, 500000, NULL
    )
    RETURNING property_list_id AS id
  `
  return row.id
}

/** @param {import('postgres').Sql} sql */
export async function ensureEntity(sql, { name, categoryId = 1 }) {
  const rows = await sql`
    SELECT entity_id AS id
    FROM panda_realty.entities
    WHERE entity_name = ${name}
    LIMIT 1
  `
  if (rows.length > 0) return rows[0].id
  const [ins] = await sql`
    INSERT INTO panda_realty.entities (entity_category_id, entity_name)
    VALUES (${categoryId}, ${name})
    RETURNING entity_id AS id
  `
  return ins.id
}

/** Upsert a property_entity row for a contact (no buyerPipelineStatusId). @param {import('postgres').Sql} sql */
export async function ensureContactPropertyEntity(sql, { propertyListId, entityId }) {
  const rows = await sql`
    SELECT property_entity_id AS id
    FROM panda_realty.property_entities
    WHERE property_list_id = ${propertyListId} AND entity_id = ${entityId}
    LIMIT 1
  `
  if (rows.length > 0) return rows[0].id
  const [ins] = await sql`
    INSERT INTO panda_realty.property_entities (entity_id, property_list_id)
    VALUES (${entityId}, ${propertyListId})
    RETURNING property_entity_id AS id
  `
  return ins.id
}

/**
 * Ensures exactly one accepted buyer offer exists for a property entity with the given fields.
 * Un-accepts conflicting accepted offers on the same property list before inserting/updating
 * to avoid the DB unique constraint on accepted offers per property.
 * @param {import('postgres').Sql} sql
 */
export async function ensureSingleAcceptedOffer(sql, {
  propertyEntityId,
  propertyListId,
  offer,
  subjectToSaleDays = null,
  // Optional enriched offer fields
  settlementDate = null,
  depositInitial = null,
  depositBalance = null,
  financeDays = null,
  buildingPestDays = null,
  isCashOffer = null,
  isSubjectToFinance = null,
  isSubjectToSale = null,
  subjectToSaleAddress = null,
  financeBank = null,
  conditionNotes = null,
}) {
  // Clear any accepted status on this entity's offers first.
  await sql`
    UPDATE panda_realty.buyer_offers
    SET is_accepted = false, updated_at = NOW()
    WHERE property_entity_id = ${propertyEntityId}
  `
  const rows = await sql`
    SELECT buyer_offer_id AS id
    FROM panda_realty.buyer_offers
    WHERE property_entity_id = ${propertyEntityId}
    LIMIT 1
  `
  // Un-accept any remaining accepted offer on the same property list.
  await sql`
    UPDATE panda_realty.buyer_offers
    SET is_accepted = false, updated_at = NOW()
    WHERE is_accepted = true
      AND property_entity_id IN (
        SELECT property_entity_id FROM panda_realty.property_entities
        WHERE property_list_id = ${propertyListId}
      )
  `
  if (rows.length > 0) {
    await sql`
      UPDATE panda_realty.buyer_offers
      SET
        offer = ${offer},
        is_accepted = true,
        date_offered = CURRENT_DATE,
        subject_to_sale_days = ${subjectToSaleDays},
        settlement_date = ${settlementDate},
        deposit_initial = ${depositInitial},
        deposit_balance = ${depositBalance},
        finance_days = ${financeDays},
        building_pest_days = ${buildingPestDays},
        is_cash_offer = ${isCashOffer ?? false},
        is_subject_to_finance = ${isSubjectToFinance},
        is_subject_to_sale = ${isSubjectToSale},
        subject_to_sale_address = ${subjectToSaleAddress},
        finance_bank = ${financeBank},
        condition_notes = ${conditionNotes},
        updated_at = NOW()
      WHERE buyer_offer_id = ${rows[0].id}
    `
  } else {
    await sql`
      INSERT INTO panda_realty.buyer_offers (
        property_entity_id, offer, is_accepted, date_offered, subject_to_sale_days,
        settlement_date, deposit_initial, deposit_balance, finance_days, building_pest_days,
        is_cash_offer, is_subject_to_finance, is_subject_to_sale, subject_to_sale_address,
        finance_bank, condition_notes
      )
      VALUES (
        ${propertyEntityId}, ${offer}, true, CURRENT_DATE, ${subjectToSaleDays},
        ${settlementDate}, ${depositInitial}, ${depositBalance}, ${financeDays}, ${buildingPestDays},
        ${isCashOffer ?? false}, ${isSubjectToFinance}, ${isSubjectToSale}, ${subjectToSaleAddress},
        ${financeBank}, ${conditionNotes}
      )
    `
  }
}

/** @param {import('postgres').Sql} sql */
export async function ensurePropertyEntity(sql, { propertyListId, entityId, buyersPipelineStageId }) {
  const rows = await sql`
    SELECT property_entity_id AS id
    FROM panda_realty.property_entities
    WHERE property_list_id = ${propertyListId} AND entity_id = ${entityId}
    LIMIT 1
  `
  if (rows.length > 0) {
    await sql`
      UPDATE panda_realty.property_entities
      SET
        buyer_pipeline_status_id = ${buyersPipelineStageId},
        updated_at = NOW()
      WHERE property_entity_id = ${rows[0].id}
    `
    return rows[0].id
  }
  const [ins] = await sql`
    INSERT INTO panda_realty.property_entities (entity_id, property_list_id, buyer_pipeline_status_id)
    VALUES (${entityId}, ${propertyListId}, ${buyersPipelineStageId})
    RETURNING property_entity_id AS id
  `
  return ins.id
}
