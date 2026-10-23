-- Map-filter performance: replace the unindexed `street_address ~* '\yNAME\y'` regex
-- OR-chain (a full Seq Scan over ~93k rows that hit 100s+/statement_timeout at realistic
-- polygon street counts) with an indexed normalized street-name lookup.
--
-- panda_street_norm: lowercase, collapse whitespace, trim. Applied to BOTH sides of the
-- comparison so the keys align.
-- panda_street_key: strip the leading house/unit designator from a property address
-- ("22 ", "1/14 ", "17-19 ", "120/3-5 ", "LOT 23 ", "BESPOKE/132 ", "A5/1-3 ") then
-- normalize. The designator is an optional "LOT " followed by the first whitespace token
-- when that token contains a digit — this captures plain numbers, unit ranges, and the
-- dirty building-name-prefixed forms ("MCKENZIE/49 ..."), while leaving digit-free street
-- names intact ("A Dobson Road", "The Quay"). Property addresses always carry such a
-- designator; Overpass street names never do, so the strip is applied only to the indexed
-- column, never to the query-side street names (which use panda_street_norm).

CREATE OR REPLACE FUNCTION panda_realty.panda_street_norm(s text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $$
  SELECT btrim(regexp_replace(lower(s), '\s+', ' ', 'g'))
$$;

CREATE OR REPLACE FUNCTION panda_realty.panda_street_key(addr text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $$
  SELECT panda_realty.panda_street_norm(
    regexp_replace(addr, '^\s*(lot\s+)?(\S*[0-9]\S*)\s+', '', 'i')
  )
$$;

-- Expression index used by `panda_street_key(street_address::text) = ANY(ARRAY[...])`.
-- street_address is citext, so cast to text (matched exactly in the query expression).
CREATE INDEX IF NOT EXISTS idx_panda_street_key
  ON panda_realty.panda_properties (panda_realty.panda_street_key(street_address::text));
