import type { AdminEntityPageWidthPreset } from "@repo/admin/admin-entity-page-width-presets"

/** Where primary admin entity links render: top bar vs shadcn sidebar (see `PandaRealtyAppChrome`). */
export type AdminNavPlacement = "header" | "sidebar"

export const frontendConfig = {
  admin: {
    entityPageWidth: "wide" satisfies AdminEntityPageWidthPreset,
    entityListPageSizeOptions: [25, 50, 100],
    /** Sidebar scales better as more entities are added. */
    navPlacement: "sidebar" satisfies AdminNavPlacement,
  },
} as const
