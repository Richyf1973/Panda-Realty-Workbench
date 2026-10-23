import { bigint, date, text, timestamp } from "drizzle-orm/pg-core"

import { pandaRealty, citext } from "./schema-base"

export const agents = pandaRealty.table("agents", {
  agentId: bigint("agent_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  agentName: citext("agent_name").notNull(),
  email: citext("email"),
  phone: citext("phone"),
  tradingName: citext("trading_name"),
  abn: citext("abn"),
  licenceNumber: citext("licence_number"),
  acn: citext("acn"),
  fax: citext("fax"),
  mobile: citext("mobile"),
  address: citext("address"),
  suburb: citext("suburb"),
  state: citext("state"),
  postcode: citext("postcode"),
  licenceExpiry: date("licence_expiry", { mode: "string" }),
  licenseeType: citext("licensee_type"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
})

export const agentTasks = pandaRealty.table("agent_tasks", {
  agentTaskId: bigint("agent_task_id", { mode: "number" })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  agentId: bigint("agent_id", { mode: "number" })
    .notNull()
    .references(() => agents.agentId),
  title: text("title").notNull(),
  dueDate: date("due_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
})
