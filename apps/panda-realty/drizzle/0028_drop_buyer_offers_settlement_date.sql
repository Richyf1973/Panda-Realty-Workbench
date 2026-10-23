-- buyer_offers: settlement timing is stored only as subject_to_sale_days (days from contract).
-- Backfill days from legacy settlement_date when subject_to_sale_days was null and contract_date exists.

UPDATE panda_realty.buyer_offers bo
SET subject_to_sale_days = GREATEST(
  0,
  (bo.settlement_date::date - pp.contract_date::date)
)::integer
FROM panda_realty.property_entities pe
INNER JOIN panda_realty.panda_properties pp ON pe.property_list_id = pp.property_list_id
WHERE bo.property_entity_id = pe.property_entity_id
  AND bo.settlement_date IS NOT NULL
  AND pp.contract_date IS NOT NULL
  AND bo.subject_to_sale_days IS NULL;

ALTER TABLE panda_realty.buyer_offers DROP COLUMN IF EXISTS settlement_date;
