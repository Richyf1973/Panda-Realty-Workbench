-- Last Google Contacts bulk/incremental sync attempt per CRM entity and listing owner slot.
ALTER TABLE "panda_realty"."entities"
ADD COLUMN IF NOT EXISTS "google_contacts_synced_at" timestamptz;

ALTER TABLE "panda_realty"."entities"
ADD COLUMN IF NOT EXISTS "google_contacts_last_outcome" text;

ALTER TABLE "panda_realty"."entities"
ADD COLUMN IF NOT EXISTS "google_contacts_last_error" text;

ALTER TABLE "panda_realty"."panda_properties"
ADD COLUMN IF NOT EXISTS "owner1_google_contacts_synced_at" timestamptz;

ALTER TABLE "panda_realty"."panda_properties"
ADD COLUMN IF NOT EXISTS "owner1_google_contacts_last_outcome" text;

ALTER TABLE "panda_realty"."panda_properties"
ADD COLUMN IF NOT EXISTS "owner1_google_contacts_last_error" text;

ALTER TABLE "panda_realty"."panda_properties"
ADD COLUMN IF NOT EXISTS "owner2_google_contacts_synced_at" timestamptz;

ALTER TABLE "panda_realty"."panda_properties"
ADD COLUMN IF NOT EXISTS "owner2_google_contacts_last_outcome" text;

ALTER TABLE "panda_realty"."panda_properties"
ADD COLUMN IF NOT EXISTS "owner2_google_contacts_last_error" text;

ALTER TABLE "panda_realty"."panda_properties"
ADD COLUMN IF NOT EXISTS "owner3_google_contacts_synced_at" timestamptz;

ALTER TABLE "panda_realty"."panda_properties"
ADD COLUMN IF NOT EXISTS "owner3_google_contacts_last_outcome" text;

ALTER TABLE "panda_realty"."panda_properties"
ADD COLUMN IF NOT EXISTS "owner3_google_contacts_last_error" text;
