-- Drive sync: add source flag to file tables and last_drive_synced_at to properties.
ALTER TABLE "panda_realty"."property_entity_files" ADD COLUMN IF NOT EXISTS "source" "citext";--> statement-breakpoint
ALTER TABLE "panda_realty"."property_list_files" ADD COLUMN IF NOT EXISTS "source" "citext";--> statement-breakpoint
ALTER TABLE "panda_realty"."panda_properties" ADD COLUMN IF NOT EXISTS "last_drive_synced_at" timestamptz;
