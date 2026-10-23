-- Internal notes for contract conditions (distinct from other_conditions legal text).
ALTER TABLE panda_realty.buyer_offers
  ADD COLUMN IF NOT EXISTS condition_notes text;
