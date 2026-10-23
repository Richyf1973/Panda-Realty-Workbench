-- Add contract-condition fields to panda_realty.buyer_offers

ALTER TABLE panda_realty.buyer_offers
  ADD COLUMN IF NOT EXISTS is_cash_offer        boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS no_conditions        boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cooling_off_days     integer,
  ADD COLUMN IF NOT EXISTS finance_days         integer,
  ADD COLUMN IF NOT EXISTS building_pest_days   integer,
  ADD COLUMN IF NOT EXISTS due_diligence_days   integer,
  ADD COLUMN IF NOT EXISTS subject_to_sale_days integer,
  ADD COLUMN IF NOT EXISTS deposit_initial      numeric(20,2),
  ADD COLUMN IF NOT EXISTS deposit_balance      numeric(20,2),
  ADD COLUMN IF NOT EXISTS other_conditions     text;
