-- Add buyer_pipeline_status_id to property_entities.
-- This tracks which Buyers pipeline stage a buyer–property link is at,
-- allowing buyer cards to appear in the correct column on the Buyers Kanban board.
-- Nullable: existing rows have no stage assigned; they won't appear on the board until set.
ALTER TABLE panda_realty.property_entities
  ADD COLUMN IF NOT EXISTS buyer_pipeline_status_id bigint
    REFERENCES panda_realty.property_status(property_status_id);
