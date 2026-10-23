ALTER TABLE "panda_realty"."property_entity_notes" ADD COLUMN "agent_id" bigint REFERENCES "panda_realty"."agents"("agent_id");
