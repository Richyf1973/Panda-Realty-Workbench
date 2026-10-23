-- Enforce at most one accepted offer per property at the DB level.
-- Because the uniqueness spans a join (buyer_offers → property_entities),
-- a simple partial unique index is not sufficient; a trigger is used instead.

CREATE OR REPLACE FUNCTION panda_realty.check_buyer_offer_accepted_unique()
RETURNS TRIGGER AS $$
DECLARE
  v_property_list_id bigint;
BEGIN
  IF NEW.is_accepted = TRUE THEN
    SELECT property_list_id INTO v_property_list_id
      FROM panda_realty.property_entities
     WHERE property_entity_id = NEW.property_entity_id;

    IF EXISTS (
      SELECT 1
        FROM panda_realty.buyer_offers bo
        JOIN panda_realty.property_entities pe
          ON bo.property_entity_id = pe.property_entity_id
       WHERE pe.property_list_id = v_property_list_id
         AND bo.is_accepted = TRUE
         AND bo.buyer_offer_id IS DISTINCT FROM NEW.buyer_offer_id
    ) THEN
      RAISE EXCEPTION 'Only one accepted offer is allowed per property.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_buyer_offer_accepted_unique ON panda_realty.buyer_offers;
CREATE TRIGGER trg_buyer_offer_accepted_unique
  BEFORE INSERT OR UPDATE ON panda_realty.buyer_offers
  FOR EACH ROW EXECUTE FUNCTION panda_realty.check_buyer_offer_accepted_unique();
