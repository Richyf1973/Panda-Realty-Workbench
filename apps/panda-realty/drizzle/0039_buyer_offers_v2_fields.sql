-- apps/panda-realty/drizzle/0039_buyer_offers_v2_fields.sql
ALTER TABLE panda_realty.buyer_offers
  ADD COLUMN IF NOT EXISTS waive_cooling_off          boolean,
  ADD COLUMN IF NOT EXISTS is_subject_to_finance      boolean,
  ADD COLUMN IF NOT EXISTS finance_pre_approved       boolean,
  ADD COLUMN IF NOT EXISTS finance_bank               text,
  ADD COLUMN IF NOT EXISTS finance_bank_contact_name  text,
  ADD COLUMN IF NOT EXISTS finance_bank_contact_phone text,
  ADD COLUMN IF NOT EXISTS finance_bank_contact_email text,
  ADD COLUMN IF NOT EXISTS suggest_building_companies boolean,
  ADD COLUMN IF NOT EXISTS is_subject_to_sale         boolean,
  ADD COLUMN IF NOT EXISTS sale_days_before_listing_live integer,
  ADD COLUMN IF NOT EXISTS sale_is_unconditional      boolean,
  ADD COLUMN IF NOT EXISTS sale_unconditional_date    date,
  ADD COLUMN IF NOT EXISTS sale_buyer_settlement_date date,
  ADD COLUMN IF NOT EXISTS sale_active_conditions     text[],
  ADD COLUMN IF NOT EXISTS sale_free_appraisal        boolean,
  ADD COLUMN IF NOT EXISTS settlement_period          text;

-- Allow submitted_at to be NULL (draft rows have no submitted_at)
ALTER TABLE panda_realty.offer_form_submissions
  ALTER COLUMN submitted_at DROP DEFAULT;
