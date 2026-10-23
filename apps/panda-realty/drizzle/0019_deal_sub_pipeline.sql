-- Add deal_stage_status_id to panda_properties for the deal sub-pipeline
ALTER TABLE panda_realty.panda_properties
  ADD COLUMN IF NOT EXISTS deal_stage_status_id bigint
    REFERENCES panda_realty.property_status(property_status_id);

-- Seed the 4 deal pipeline stages into property_status
INSERT INTO panda_realty.property_status
  (property_status_code, property_status, pipeline, sort_order)
VALUES
  ('Deal - Offer Accepted',  'Offer Accepted',  'deal', 1),
  ('Deal - Conditions',      'Conditions',      'deal', 2),
  ('Deal - Unconditional',   'Unconditional',   'deal', 3),
  ('Deal - Settlement',      'Settlement',      'deal', 4)
ON CONFLICT (property_status_code) DO NOTHING;
