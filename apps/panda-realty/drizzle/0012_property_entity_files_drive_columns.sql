ALTER TABLE panda_realty.property_entity_files
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS google_drive_file_id text;
