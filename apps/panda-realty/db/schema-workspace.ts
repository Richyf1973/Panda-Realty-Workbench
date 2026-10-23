import { bigint, boolean, integer, jsonb, smallint, text, timestamp, unique, uniqueIndex } from "drizzle-orm/pg-core"

import { pandaRealty, citext } from "./schema-base"
import { pandaProperties } from "./schema-properties"
import { agents } from "./schema-agents"
import { propertyEntities } from "./schema-entities"

export const propertyEntityFiles = pandaRealty.table("property_entity_files", {
  propertyEntityFileId: bigint("property_entity_file_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  propertyEntityId: bigint("property_entity_id", { mode: "number" }).notNull(),
  fileType: citext("file_type"),
  fileLink: text("file_link"),
  fileName: text("file_name"),
  fileSize: bigint("file_size", { mode: "number" }),
  googleDriveFileId: text("google_drive_file_id"),
  source: citext("source"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
  sharedWithPortal: boolean("shared_with_portal").notNull().default(false),
  sharedWithSeller: boolean("shared_with_seller").notNull().default(false),
})

/**
 * `panda_realty.property_list_files` — file metadata per listing (not tied to a property_entity).
 * Same Drive-backed shape as `property_entity_files`; used from the property dialog **Files** tab.
 */
export const propertyListFiles = pandaRealty.table("property_list_files", {
  propertyListFileId: bigint("property_list_file_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  propertyListId: bigint("property_list_id", { mode: "number" })
    .notNull()
    .references(() => pandaProperties.propertyListId, { onDelete: "cascade" }),
  fileType: citext("file_type"),
  fileLink: text("file_link"),
  fileName: text("file_name"),
  fileSize: bigint("file_size", { mode: "number" }),
  googleDriveFileId: text("google_drive_file_id"),
  ownerNum: smallint("owner_num"),
  source: citext("source"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
  sharedWithPortal: boolean("shared_with_portal").notNull().default(false),
  sharedWithSeller: boolean("shared_with_seller").notNull().default(false),
})

/**
 * `panda_realty.property_entity_notes` — one-to-many notes per property_entity (buyer workspace).
 */
export const propertyEntityNotes = pandaRealty.table("property_entity_notes", {
  propertyEntityNoteId: bigint("property_entity_note_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  propertyEntityId: bigint("property_entity_id", { mode: "number" }).notNull(),
  note: text("note").notNull(),
  createdBy: citext("created_by"),
  agentId: bigint("agent_id", { mode: "number" }).references(() => agents.agentId),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
})

/**
 * `panda_realty.property_list_notes` — property-level notes added by admin users,
 * not attached to any specific buyer or contact entity.
 */
export const propertyListNotes = pandaRealty.table("property_list_notes", {
  propertyListNoteId: bigint("property_list_note_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  propertyListId: bigint("property_list_id", { mode: "number" }).notNull(),
  note: text("note").notNull(),
  createdBy: citext("created_by"),
  agentId: bigint("agent_id", { mode: "number" }).references(() => agents.agentId),
  propertyEntityId: bigint("property_entity_id", { mode: "number" }).references(() => propertyEntities.propertyEntityId),
  ownerNum: smallint("owner_num"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
})

export const propertyMeetings = pandaRealty.table("property_meetings", {
  propertyMeetingId: bigint("property_meeting_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  propertyListId: bigint("property_list_id", { mode: "number" }).notNull(),
  propertyEntityId: bigint("property_entity_id", { mode: "number" }),
  type: text("type").notNull(), // 'meeting' | 'reminder'
  title: text("title").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes"),
  notes: text("notes"),
  googleCalendarEventId: text("google_calendar_event_id"),
  /** JSON array of { method, minutes } objects sent to Google Calendar reminders.overrides */
  remindersJson: text("reminders_json"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
})

/**
 * `panda_realty.property_thread_tags` — maps a Gmail threadId to the property it was
 * sent/replied/forwarded from, enabling reliable property-scoped thread filtering.
 */
export const propertyThreadTags = pandaRealty.table(
  "property_thread_tags",
  {
    propertyThreadTagId: bigint("property_thread_tag_id", { mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity(),
    propertyListId: bigint("property_list_id", { mode: "number" })
      .notNull()
      .references(() => pandaProperties.propertyListId, { onDelete: "cascade" }),
    threadId: text("thread_id").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("property_thread_tags_property_thread_unique").on(
      table.propertyListId,
      table.threadId,
    ),
  ],
)

export const leadImports = pandaRealty.table(
  "lead_imports",
  {
    leadImportId: bigint("lead_import_id", { mode: "number" })
      .primaryKey()
      .generatedByDefaultAsIdentity(),
    sourceEmail: citext("source_email").notNull(),
    advertisementId: citext("advertisement_id").notNull(),
    entityId: bigint("entity_id", { mode: "number" }),
    propertyEntityId: bigint("property_entity_id", { mode: "number" }),
    rawEmailText: text("raw_email_text"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    unique("lead_imports_source_email_advertisement_id_key").on(
      t.sourceEmail,
      t.advertisementId,
    ),
  ],
)

/**
 * `panda_realty.property_forms` — shared form templates (e.g. "PRO FORMA CONTRACT 2026").
 * Each form is stored once in Google Drive and can be sent from any property.
 */
export const propertyForms = pandaRealty.table("property_forms", {
  propertyFormId: bigint("property_form_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  formName: citext("form_name").notNull(),
  description: text("description"),
  category: citext("category"),
  isActive: boolean("is_active").notNull().default(true),
  prefillStrategy: citext("prefill_strategy"),
  templateValues: jsonb("template_values"),
  googleDriveFileId: text("google_drive_file_id"),
  fileLink: text("file_link"),
  fileName: text("file_name"),
  fileSize: bigint("file_size", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
})

/**
 * `panda_realty.property_form_sends` — log of each time a form was sent from a property
 * to a recipient entity (buyer/contact/tenant) via Gmail.
 */
export const propertyFormSends = pandaRealty.table("property_form_sends", {
  propertyFormSendId: bigint("property_form_send_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  propertyFormId: bigint("property_form_id", { mode: "number" })
    .notNull()
    .references(() => propertyForms.propertyFormId),
  propertyListId: bigint("property_list_id", { mode: "number" })
    .notNull()
    .references(() => pandaProperties.propertyListId, { onDelete: "cascade" }),
  entityId: bigint("entity_id", { mode: "number" }),
  recipientEmail: citext("recipient_email"),
  recipientName: citext("recipient_name"),
  messageSent: text("message_sent"),
  driveFileLink: text("drive_file_link"),
  prefillValues: jsonb("prefill_values").$type<Record<string, string>>(),
  sentAt: timestamp("sent_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
})
