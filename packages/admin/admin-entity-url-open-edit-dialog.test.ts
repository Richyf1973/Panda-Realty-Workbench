import { describe, expect, it } from "vitest"

import {
  ADMIN_ENTITY_URL_DIALOG_VIEW_ONLY_PARAM,
  ADMIN_ENTITY_URL_OPEN_EDIT_PARAM,
  parseAdminEntityUrlOpenEditDialog,
} from "./admin-entity-admin-list-fetch"

describe("parseAdminEntityUrlOpenEditDialog", () => {
  it("returns null when openEdit is missing or empty", () => {
    expect(parseAdminEntityUrlOpenEditDialog(new URLSearchParams())).toBeNull()
    expect(
      parseAdminEntityUrlOpenEditDialog(
        new URLSearchParams({ [ADMIN_ENTITY_URL_OPEN_EDIT_PARAM]: "  " }),
      ),
    ).toBeNull()
  })

  it("parses row id and viewOnly flags", () => {
    expect(
      parseAdminEntityUrlOpenEditDialog(
        new URLSearchParams({
          [ADMIN_ENTITY_URL_OPEN_EDIT_PARAM]: "DR001",
        }),
      ),
    ).toEqual({ rowId: "DR001", viewOnly: false })
    expect(
      parseAdminEntityUrlOpenEditDialog(
        new URLSearchParams({
          [ADMIN_ENTITY_URL_OPEN_EDIT_PARAM]: "DR001",
          [ADMIN_ENTITY_URL_DIALOG_VIEW_ONLY_PARAM]: "1",
        }),
      ),
    ).toEqual({ rowId: "DR001", viewOnly: true })
    expect(
      parseAdminEntityUrlOpenEditDialog(
        new URLSearchParams({
          [ADMIN_ENTITY_URL_OPEN_EDIT_PARAM]: "X",
          [ADMIN_ENTITY_URL_DIALOG_VIEW_ONLY_PARAM]: "TRUE",
        }),
      ),
    ).toEqual({ rowId: "X", viewOnly: true })
    expect(
      parseAdminEntityUrlOpenEditDialog(
        new URLSearchParams({
          [ADMIN_ENTITY_URL_OPEN_EDIT_PARAM]: "X",
          [ADMIN_ENTITY_URL_DIALOG_VIEW_ONLY_PARAM]: "yes",
        }),
      ),
    ).toEqual({ rowId: "X", viewOnly: true })
  })
})
