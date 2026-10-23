import { bigint, check, index, text, timestamp } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

import { pandaRealty } from "./schema-base"
import { pandaProperties } from "./schema-properties"
import { propertyEntities } from "./schema-entities"

export const portalLinkSends = pandaRealty.table("portal_link_sends", {
  portalLinkSendId: bigint("portal_link_send_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  propertyListId: bigint("property_list_id", { mode: "number" })
    .notNull()
    .references(() => pandaProperties.propertyListId, { onDelete: "cascade" }),
  portalTokenId: bigint("portal_token_id", { mode: "number" })
    .references(() => portalTokens.portalTokenId, { onDelete: "set null" }),
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
})

export const portalTokens = pandaRealty.table("portal_tokens", {
  portalTokenId: bigint("portal_token_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  token: text("token").notNull().unique(),
  role: text("role").notNull().default("buyer"),
  propertyEntityId: bigint("property_entity_id", { mode: "number" })
    .references(() => propertyEntities.propertyEntityId, { onDelete: "cascade" }),
  propertyListId: bigint("property_list_id", { mode: "number" })
    .notNull()
    .references(() => pandaProperties.propertyListId, { onDelete: "cascade" }),
  revokedAt: timestamp("revoked_at"),
  lastAccessedAt: timestamp("last_accessed_at"),
  createdAt: timestamp("created_at").defaultNow(),
})

export const portalFileSignRequests = pandaRealty.table(
  "portal_file_sign_requests",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    portalTokenId: bigint("portal_token_id", { mode: "number" })
      .notNull()
      .references(() => portalTokens.portalTokenId, { onDelete: "cascade" }),
    fileId: text("file_id").notNull(),
    adobeSignAgreementId: text("adobe_sign_agreement_id").notNull(),
    signatureStatus: text("signature_status").notNull(),
    signerEmail: text("signer_email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (t) => [
    index("portal_file_sign_requests_agreement_id_idx").on(t.adobeSignAgreementId),
    check(
      "portal_file_sign_requests_status_check",
      sql`${t.signatureStatus} IN ('pending', 'signed', 'cancelled')`,
    ),
  ],
)

export const portalMessages = pandaRealty.table("portal_messages", {
  portalMessageId: bigint("portal_message_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  portalTokenId: bigint("portal_token_id", { mode: "number" })
    .notNull()
    .references(() => portalTokens.portalTokenId, { onDelete: "cascade" }),
  senderRole: text("sender_role").notNull(),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  readAt: timestamp("read_at"),
})
