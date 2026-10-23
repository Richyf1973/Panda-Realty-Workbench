-- Same drift as 0003: pre-existing property_entity_files rows without full 0001 shape.
ALTER TABLE "panda_realty"."property_entity_files" ADD COLUMN IF NOT EXISTS "file_link" text;
ALTER TABLE "panda_realty"."property_entity_files" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now();
ALTER TABLE "panda_realty"."property_entity_files" ADD COLUMN IF NOT EXISTS "updated_at" timestamp;
