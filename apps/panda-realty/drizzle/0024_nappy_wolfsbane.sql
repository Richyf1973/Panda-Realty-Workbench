ALTER TABLE "panda_realty"."gmail_oauth_tokens" ADD COLUMN "email_attachments_folder_id" text;--> statement-breakpoint
ALTER TABLE "panda_realty"."panda_properties" ADD COLUMN "last_drive_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "panda_realty"."property_entity_files" ADD COLUMN "source" "citext";--> statement-breakpoint
ALTER TABLE "panda_realty"."property_list_files" ADD COLUMN "owner_num" smallint;--> statement-breakpoint
ALTER TABLE "panda_realty"."property_list_files" ADD COLUMN "source" "citext";--> statement-breakpoint
ALTER TABLE "panda_realty"."property_list_notes" ADD COLUMN "owner_num" smallint;