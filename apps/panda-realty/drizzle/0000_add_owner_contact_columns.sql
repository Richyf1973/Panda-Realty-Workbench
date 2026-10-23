-- Incremental migration for existing `panda_realty.panda_properties` (not a full baseline).
ALTER TABLE "panda_realty"."panda_properties" ADD COLUMN IF NOT EXISTS "owner1phone" "citext";
ALTER TABLE "panda_realty"."panda_properties" ADD COLUMN IF NOT EXISTS "owner1email" "citext";
ALTER TABLE "panda_realty"."panda_properties" ADD COLUMN IF NOT EXISTS "owner2phone" "citext";
ALTER TABLE "panda_realty"."panda_properties" ADD COLUMN IF NOT EXISTS "owner2email" "citext";
ALTER TABLE "panda_realty"."panda_properties" ADD COLUMN IF NOT EXISTS "owner3phone" "citext";
ALTER TABLE "panda_realty"."panda_properties" ADD COLUMN IF NOT EXISTS "owner3email" "citext";
ALTER TABLE "panda_realty"."panda_properties" ADD COLUMN IF NOT EXISTS "owner_type" "citext";
