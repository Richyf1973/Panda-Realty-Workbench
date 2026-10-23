import { describe, expect, it } from "vitest"

import { frontendConfig } from "./frontend"

describe("frontendConfig", () => {
  it("defines admin list page sizes", () => {
    expect(frontendConfig.admin.entityListPageSizeOptions.length).toBeGreaterThan(0)
  })

  it("uses sidebar admin nav for scalability", () => {
    expect(frontendConfig.admin.navPlacement).toBe("sidebar")
  })
})
