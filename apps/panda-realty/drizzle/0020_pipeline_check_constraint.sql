-- Normalise any title-case 'Sellers'/'Buyers' pipeline values to lowercase
UPDATE panda_realty.property_status
SET pipeline = LOWER(pipeline)
WHERE pipeline IS NOT NULL AND pipeline != LOWER(pipeline);

-- Add check constraint so only valid values can be stored going forward
ALTER TABLE panda_realty.property_status
  ADD CONSTRAINT property_status_pipeline_check
  CHECK (pipeline IN ('sellers', 'buyers', 'deal') OR pipeline IS NULL);
