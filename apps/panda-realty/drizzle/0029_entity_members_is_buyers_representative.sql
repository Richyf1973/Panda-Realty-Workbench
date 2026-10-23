ALTER TABLE "panda_realty"."entity_members"
ADD COLUMN IF NOT EXISTS "is_buyers_representative" boolean DEFAULT false NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "entity_members_one_buyers_rep_per_entity"
ON "panda_realty"."entity_members" ("entity_id")
WHERE "is_buyers_representative" = true;
