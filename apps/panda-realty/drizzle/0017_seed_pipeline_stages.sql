-- Seed Sellers pipeline stages into property_status.
-- Existing statuses (pipeline = NULL) are untouched.
-- ON CONFLICT DO NOTHING is safe to re-run.

INSERT INTO panda_realty.property_status (property_status_code, property_status, is_shown_on_favorite, pipeline)
VALUES
  ('To Be Appraised',              'To Be Appraised',              true,  'sellers'),
  ('Appraised',                    'Appraised',                    true,  'sellers'),
  ('Follow Up',                    'Follow Up',                    true,  'sellers'),
  ('Form 6 Signed',                'Form 6 Signed',                true,  'sellers'),
  ('Advertising Payment Received', 'Advertising Payment Received', true,  'sellers'),
  ('Disclosure Signed',            'Disclosure Signed',            true,  'sellers'),
  ('Sale Contract Signed',         'Sale Contract Signed',         true,  'sellers'),
  ('Conditions',                   'Conditions',                   true,  'sellers'),
  ('Unconditional Date',           'Unconditional Date',           true,  'sellers'),
  ('Settlement Date',              'Settlement Date',              true,  'sellers')
ON CONFLICT (property_status_code) DO UPDATE
  SET pipeline = EXCLUDED.pipeline,
      is_shown_on_favorite = EXCLUDED.is_shown_on_favorite;

-- Seed Buyers pipeline stages.
-- "Conditions", "Disclosure Signed", "Sale Contract Signed" overlap with Sellers names —
-- we use distinct codes to keep them separate rows per pipeline.

INSERT INTO panda_realty.property_status (property_status_code, property_status, is_shown_on_favorite, pipeline)
VALUES
  ('Enquiry',                       'Enquiry',                       true, 'buyers'),
  ('Contact Made',                  'Contact Made',                  true, 'buyers'),
  ('Negotiations Started',          'Negotiations Started',          true, 'buyers'),
  ('Viewing Scheduled',             'Viewing Scheduled',             true, 'buyers'),
  ('Offer Made',                    'Offer Made',                    true, 'buyers'),
  ('Buyers - Disclosure Signed',    'Disclosure Signed',             true, 'buyers'),
  ('Buyers - Sale Contract Signed', 'Sale Contract Signed',          true, 'buyers'),
  ('Buyers - Conditions',           'Conditions',                    true, 'buyers'),
  ('Unconditional',                 'Unconditional',                 true, 'buyers'),
  ('Sold / Settlement',             'Sold / Settlement',             true, 'buyers')
ON CONFLICT (property_status_code) DO UPDATE
  SET pipeline = EXCLUDED.pipeline,
      is_shown_on_favorite = EXCLUDED.is_shown_on_favorite;

-- Update the three existing statuses that map to Sellers pipeline stages.
-- They already exist with NULL pipeline; tag them so the board can pick them up.
UPDATE panda_realty.property_status
SET pipeline = 'sellers'
WHERE property_status_code IN ('To Be Appraised', 'Appraised', 'Unconditional')
  AND pipeline IS NULL;
