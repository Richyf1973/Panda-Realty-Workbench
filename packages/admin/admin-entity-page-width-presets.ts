/**
 * Max-width presets for `/admin/[slug]` shells (full Tailwind literals for JIT).
 * Kept in a tiny module so `admin-entity-types.ts` and entity files can reference
 * `AdminEntityPageWidthPreset` without importing the layout resolver (avoids cycles).
 */
export const adminEntityPageWidthPresets = {
  /** One step below `narrow` (`max-w-5xl`); use for very simple list shells. */
  extraNarrow: "max-w-4xl",
  narrow: "max-w-5xl",
  medium: "max-w-6xl",
  wide: "max-w-7xl",
  extraWide: "max-w-screen-2xl",
  /** Grows with the viewport but caps at 96rem. */
  fluid: "max-w-[min(100%,96rem)]",
} as const

export type AdminEntityPageWidthPreset = keyof typeof adminEntityPageWidthPresets
