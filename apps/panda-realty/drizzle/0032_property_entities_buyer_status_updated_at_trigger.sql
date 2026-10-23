-- Trigger: auto-stamp updated_at when buyer_pipeline_status_id changes on a row that
-- has never had updated_at set (NULL). Rows already stamped are not disturbed, so aging
-- bulk-moves that fire after a manual move do not reset the clock.
CREATE OR REPLACE FUNCTION panda_realty.set_updated_at_on_buyer_status_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.buyer_pipeline_status_id IS DISTINCT FROM OLD.buyer_pipeline_status_id
     AND NEW.updated_at IS NULL
  THEN
    NEW.updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_property_entities_buyer_status_updated_at
BEFORE UPDATE ON panda_realty.property_entities
FOR EACH ROW EXECUTE FUNCTION panda_realty.set_updated_at_on_buyer_status_change();
