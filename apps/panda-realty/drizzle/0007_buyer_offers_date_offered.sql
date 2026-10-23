ALTER TABLE "panda_realty"."buyer_offers"
  ADD COLUMN IF NOT EXISTS "date_offered" date DEFAULT CURRENT_DATE NOT NULL;
