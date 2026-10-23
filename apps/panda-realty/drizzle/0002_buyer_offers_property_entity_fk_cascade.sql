-- Ensure buyer_offers rows are removed when property_entities is deleted (junction cleanup).
DO $$
DECLARE
  cname text;
BEGIN
  SELECT con.conname INTO cname
  FROM pg_constraint con
  WHERE con.conrelid = 'panda_realty.buyer_offers'::regclass
    AND con.contype = 'f'
    AND EXISTS (
      SELECT 1
      FROM pg_attribute a
      WHERE a.attrelid = con.conrelid
        AND a.attnum = ANY (con.conkey)
        AND a.attname = 'property_entity_id'
    )
  LIMIT 1;
  IF cname IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE panda_realty.buyer_offers DROP CONSTRAINT %I',
      cname
    );
  END IF;
END $$;

ALTER TABLE panda_realty.buyer_offers
  ADD CONSTRAINT buyer_offers_property_entity_id_fkey
  FOREIGN KEY (property_entity_id)
  REFERENCES panda_realty.property_entities (property_entity_id)
  ON DELETE CASCADE;
