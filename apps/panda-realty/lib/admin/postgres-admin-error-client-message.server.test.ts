import { describe, expect, it } from "vitest"

import { postgresAdminErrorClientMessage } from "./postgres-admin-error-client-message.server"

describe("postgresAdminErrorClientMessage", () => {
  it("maps Postgres FK violation code 23503", () => {
    const err = new Error("insert failed")
    Object.assign(err, { code: "23503" })
    expect(postgresAdminErrorClientMessage(err)).toMatch(/references data/)
  })

  it("follows error.cause", () => {
    const inner = new Error("inner")
    Object.assign(inner, { code: "23503" })
    const outer = new Error("outer", { cause: inner })
    expect(postgresAdminErrorClientMessage(outer)).toMatch(/references data/)
  })

  it("returns null for unmapped codes", () => {
    const err = new Error("x")
    Object.assign(err, { code: "XX000" })
    expect(postgresAdminErrorClientMessage(err)).toBeNull()
  })

  it("maps foreign key from error message text (Drizzle-wrapped)", () => {
    expect(
      postgresAdminErrorClientMessage(
        new Error('Failed query: insert … violates foreign key constraint "entity_members_entity_id_fkey"'),
      ),
    ).toMatch(/references data/)
  })
})
