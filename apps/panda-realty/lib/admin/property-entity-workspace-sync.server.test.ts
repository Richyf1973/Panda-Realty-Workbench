import { describe, expect, it } from "vitest"

import {
  parseBuyerOffersWorkspacePayload,
  parseEntityMembersWorkspacePayload,
  parsePropertyEntityNotesPayload,
} from "@/lib/admin/property-entity-workspace-sync.server"

describe("property-entity-workspace-sync", () => {
  it("parseEntityMembersWorkspacePayload drops empty names", () => {
    expect(
      parseEntityMembersWorkspacePayload([
        { memberName: "  " },
        { memberName: "Ann", memberPhoneNumber: "1" },
      ]),
    ).toEqual([{ memberName: "Ann", memberPhoneNumber: "1" }])
  })

  it("parseEntityMembersWorkspacePayload accepts isBuyersRepresentative", () => {
    const [line] = parseEntityMembersWorkspacePayload([
      { memberName: "Ann", isBuyersRepresentative: "true" },
    ])
    expect(line).toMatchObject({
      memberName: "Ann",
      isBuyersRepresentative: true,
    })
  })

  it("parseBuyerOffersWorkspacePayload accepts rows", () => {
    expect(
      parseBuyerOffersWorkspacePayload([{ offer: "100", isAccepted: false }]),
    ).toEqual([{ offer: "100", isAccepted: false }])
  })

  it("parseBuyerOffersWorkspacePayload accepts dateOffered", () => {
    expect(
      parseBuyerOffersWorkspacePayload([
        {
          offer: "100",
          isAccepted: true,
          dateOffered: "2026-04-05",
        },
      ]),
    ).toEqual([
      { offer: "100", isAccepted: true, dateOffered: "2026-04-05" },
    ])
  })

  it("parsePropertyEntityNotesPayload drops empty notes", () => {
    expect(
      parsePropertyEntityNotesPayload([{ note: "  " }, { note: "Hello" }]),
    ).toEqual([{ note: "Hello" }])
  })

  it("throws on invalid payload shape", () => {
    expect(() => parseEntityMembersWorkspacePayload({})).toThrow(
      "Invalid entityMembers payload",
    )
  })
})
