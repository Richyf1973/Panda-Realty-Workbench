-- Add settlement_date to panda_realty.buyer_offers

ALTER TABLE panda_realty.buyer_offers
  ADD COLUMN IF NOT EXISTS settlement_date date;
