CREATE TABLE IF NOT EXISTS "panda_realty"."gmail_oauth_tokens" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_type" text DEFAULT 'Bearer' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"scope" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
