ALTER TABLE "panda_realty"."panda_properties"
  DROP COLUMN IF EXISTS "cooling_off_date",
  DROP COLUMN IF EXISTS "bpi_due_date",
  DROP COLUMN IF EXISTS "finance_due_date",
  DROP COLUMN IF EXISTS "searches_date",
  DROP COLUMN IF EXISTS "balance_deposit_due_date";
