-- Align existing tables with 0001: IF NOT EXISTS skipped CREATE when the table already existed without file_type.
ALTER TABLE "panda_realty"."property_entity_files" ADD COLUMN IF NOT EXISTS "file_type" citext;
