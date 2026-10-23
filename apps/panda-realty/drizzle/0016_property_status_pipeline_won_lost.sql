-- Add pipeline column to property_status.
-- Values: 'sellers', 'buyers', or NULL (existing non-pipeline statuses keep NULL).
ALTER TABLE panda_realty.property_status
  ADD COLUMN IF NOT EXISTS pipeline citext;

-- Add is_won and is_lost boolean flags to panda_properties.
-- These are toggled from the Kanban detail panel; not pipeline stages.
ALTER TABLE panda_realty.panda_properties
  ADD COLUMN IF NOT EXISTS is_won boolean NOT NULL DEFAULT false;

ALTER TABLE panda_realty.panda_properties
  ADD COLUMN IF NOT EXISTS is_lost boolean NOT NULL DEFAULT false;
