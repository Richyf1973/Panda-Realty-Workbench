export type ExportColumn = { key: string; label: string; enabled: boolean }

export type ExportPhase =
  | { phase: "idle" }
  | { phase: "preparing" }
  | { phase: "ready"; count: number }
  | { phase: "exporting" }
  | { phase: "done" }
  | { phase: "error"; message: string }

export interface PropertiesExportToolbarProps {
  totalCount: number
  hasActiveListFilters: boolean
  adminUiMutationsDisabled?: boolean
}
