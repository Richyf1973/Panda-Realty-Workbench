import type {
  AdminEntityDefinition,
  ListOrderSpec,
} from "@repo/admin/admin-entity-types"

import { entitiesEntityColumns } from "@/lib/admin/entities-columns"

export const entitiesEntity = {
  adminPage: true as const,
  slug: "entities" as const,
  schemaSqlName: "panda_realty.entities",
  apiBase: "/api/admin/entities" as const,
  queryKey: ["admin", "entities"] as const,
  nav: { label: "Entities" },
  metadataTitle: "Entities · Admin",
  idColumn: {
    jsonKey: "entityId" as const,
    valueType: "integer" as const,
  },
  entityPageWidth: "wide" as const,
  crudDialogWidth: "fluid" as const,
  crudDialogHeight: "extraTallFixed" as const,
  crudDialogFormDensity: "compact" as const,
  crudCompactViewport: "editable" as const,
  deleteLabelColumnKey: "entityName" as const,
  listColumnOrder: [
    "entityId",
    "entityName",
    "entityCategoryId",
    "contactCategoryId",
    "leadSourceId",
    "emailAddress",
    "contact",
    "isSeller",
    "toBeContacted",
    "customerType",
    "updatedAt",
  ] as const,
  formColumnOrder: [
    // Row 1 — identity
    "entityName",
    // Row 2 — category / type
    "entityCategoryId",
    "contactCategoryId",
    "association",
    // Row 3 — status / source
    "leadSourceId",
    // Row 4 — primary contact
    "emailAddress",
    "contact",
    // Row 5 — secondary contact
    "website",
    // Row 6 — address
    "address",
    "esuburb",
    "estate",
    "epostcode",
    // Row 7 — notes
    "notes",
  ] as const,
  columns: entitiesEntityColumns,
  listOrderBy: [
    { columnKey: "entityName", direction: "asc" },
    { columnKey: "entityId", direction: "asc" },
  ] as const satisfies readonly ListOrderSpec[],
  listGrid: {
    defaultMode: "grid",
    previewColumnCount: 4,
    registryGridItemKey: "panda-entities-card",
  },
  listSearch: {
    columnKeys: [
      "entityName",
      "emailAddress",
      "contact",
      "address",
      "website",
    ] as const,
  },
  listRelationFilters: [
    { columnKey: "entityCategoryId", multiSelect: true },
  ] as const,
  ui: {
    title: "Entities",
    singular: "entity",
    addCardTitle: "Add entity",
    listTitle: "Entities",
    loadErrorLabel: "Could not load entities.",
    emptyLabel: "No entities yet.",
  },
  crudFormGroupsMode: "sections" as const,
  crudFormGroups: [
    { key: "contact", label: "Contact", columnKeys: ["emailAddress", "contact", "website"] as const },
    { key: "address", label: "Address", columnKeys: ["address", "esuburb", "estate", "epostcode"] as const },
  ],
  extraCreateBodyKeys: ["entityBuyerStatuses"] as const,
  extraPatchBodyKeys: ["entityBuyerStatuses"] as const,
  extraPatchOmitUntilDetailLoaded: ["entityBuyerStatuses"] as const,
  crudRelatedCollections: [
    {
      mode: "custom" as const,
      jsonKey: "entityMembers",
      tabLabel: "Members",
      tabValue: "entity-members",
      customRelatedPanelKey: "entity-members-panel",
    },
  ],
} as const satisfies AdminEntityDefinition
