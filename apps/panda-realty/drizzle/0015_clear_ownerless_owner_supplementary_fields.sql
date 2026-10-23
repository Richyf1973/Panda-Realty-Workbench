-- Clear supplementary fields for owner2/owner3 rows where the name is absent,
-- produced by a partial import that wrote address data without an owner name.
UPDATE panda_realty.panda_properties
SET
  owner2address = NULL,
  owner2phone   = NULL,
  owner2email   = NULL
WHERE (owner2name IS NULL OR owner2name = '')
  AND (
    (owner2address IS NOT NULL AND owner2address <> '') OR
    (owner2phone   IS NOT NULL AND owner2phone   <> '') OR
    (owner2email   IS NOT NULL AND owner2email   <> '')
  );

UPDATE panda_realty.panda_properties
SET
  owner3address = NULL,
  owner3phone   = NULL,
  owner3email   = NULL
WHERE (owner3name IS NULL OR owner3name = '')
  AND (
    (owner3address IS NOT NULL AND owner3address <> '') OR
    (owner3phone   IS NOT NULL AND owner3phone   <> '') OR
    (owner3email   IS NOT NULL AND owner3email   <> '')
  );
