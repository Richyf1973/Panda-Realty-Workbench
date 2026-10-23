import type {
  AdminEntityDefinition,
  AdminEntityListAppendWhereHintFilter,
  ListOrderSpec,
} from "@repo/admin/admin-entity-types"

import { entitiesEntityColumns } from "@/lib/admin/entities-columns"

/**
 * `contacts` — a Contacts-only view of `panda_realty.entities` (entity_category_id = 4),
 * served by the catch-all admin route/API. The category lock and the representative-aware
 * general search live in `pandaPropertiesAppendListWhere` (slug "contacts"); the search box
 * is `ContactsGeneralSearchBar` (rendered via `renderPropertyListAboveTable`). It reuses the
 * Entities columns, grid card, and edit dialog so opening a contact matches the Entities page.
 */
const CONTACTS_APPEND_WHERE_HINT_FILTERS = [
  {
    // Hidden: value is written to the URL by ContactsGeneralSearchBar and handled
    // server-side in pandaPropertiesAppendListWhere (slug "contacts").
    queryParam: "generalSearch",
    groupLabel: "",
    allLabel: "All",
    uiLayout: "side" as const,
    hidden: true,
    options: [] as const,
  },
] as const satisfies readonly AdminEntityListAppendWhereHintFilter[]

export const contactsEntity = {
  adminPage: true as const,
  slug: "contacts" as const,
  schemaSqlName: "panda_realty.entities",
  apiBase: "/api/admin/contacts" as const,
  queryKey: ["admin", "contacts"] as const,
  nav: { label: "Contacts" },
  metadataTitle: "Contacts · Admin",
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
    "emailAddress",
    "contact",
    "updatedAt",
  ] as const,
  formColumnOrder: [
    "entityName",
    "entityCategoryId",
    "contactCategoryId",
    "association",
    "leadSourceId",
    "emailAddress",
    "contact",
    "website",
    "address",
    "esuburb",
    "estate",
    "epostcode",
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
  listAppendWhereHintFilters: CONTACTS_APPEND_WHERE_HINT_FILTERS,
  ui: {
    title: "Contacts",
    singular: "contact",
    addCardTitle: "Add contact",
    listTitle: "Contacts",
    loadErrorLabel: "Could not load contacts.",
    emptyLabel: "No contacts found.",
  },
  crudFormGroupsMode: "sections" as const,
  crudFormGroups: [
    { key: "contact", label: "Contact", columnKeys: ["emailAddress", "contact", "website"] as const },
    { key: "address", label: "Address", columnKeys: ["address", "esuburb", "estate", "epostcode"] as const },
  ],
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
