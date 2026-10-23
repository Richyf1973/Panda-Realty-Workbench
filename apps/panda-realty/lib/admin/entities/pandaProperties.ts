import type {
  AdminEntityDefinition,
  AdminEntityListBooleanFilter,
  AdminEntityListRelationFilterSpec,
  ListOrderSpec,
} from "@repo/admin/admin-entity-types"
import { pandaPropertiesColumns } from "../pandaPropertiesColumns"
import { pandaPropertiesListFilters } from "../pandaPropertiesListFilters"

const PROPERTY_RELATION_BODY_KEYS = [
  "propertyBuyers",
  "propertyTenants",
] as const

export const pandaPropertiesEntity = {
  adminPage: true as const,
  slug: "properties" as const,
  schemaSqlName: "panda_realty.panda_properties",
  apiBase: "/api/admin/properties" as const,
  queryKey: ["admin", "properties"] as const,
  nav: { label: "Properties" },
  metadataTitle: "Properties · Admin",
  idColumn: {
    jsonKey: "propertyListId" as const,
    valueType: "integer" as const,
  },
  entityPageWidth: "fluid" as const,
  crudDialogWidth: "fluid" as const,
  crudDialogHeight: "extraTallFixed" as const,
  /** Panda property dialog: list/card still add/delete; footer stays save-only. */
  crudEditDialogHideFooterAddNew: true as const,
  crudEditDialogHideFooterDelete: true as const,
  listRowClickOpensEditDialog: true as const,
  listRowLinksFirst: true as const,
  /**
   * Freeze the leading columns (row-links icons + Status + Street) to the left of the standard table
   * so the rest scroll horizontally. Frozen columns use fixed widths (set on propertyStatusId and
   * streetAddress in the column defs); the row-links icon column width is fixed here.
   */
  listStickyStartColumnKey: "streetAddress" as const,
  listStickyStartRowLinksWidthPx: 128,
  /**
   * Due-date highlight: tint the whole row green when a critical date is due/overdue and uncleared.
   * The upcoming-condition warning is shown as a passive tick in the actions column (see
   * PropertyDueWarningIndicator) — red within 3 days, gold beyond — not a row tint, so it stays
   * visible in dark mode.
   */
  listRowHighlight: {
    field: "dueHighlightActive",
    className: "bg-green-100 dark:bg-green-950/40",
    labelsField: "dueHighlightLabels",
  } as const,
  deleteLabelColumnKey: "streetAddress" as const,
  listColumnOrder: [
    "propertyStatusId",
    "streetAddress",
    "suburb",
    "combinedOwner",
    "state",
    "postcode",
    "propertyType",
    "bed",
    "bath",
    "car",
    "landSize",
    "salePrice",
    "saleDate",
  ] as const,
  formColumnOrder: [
    "streetAddress",
    "suburb",
    "state",
    "postcode",
    "propertyImage",
    "propertyType",
    "bed",
    "bath",
    "car",
    "buildingArea",
    "landSize",
    "councilArea",
    "yearBuilt",
    "salePrice",
    "priceUndisclosed",
    "saleDate",
    "settlementDate",
    "saleType",
    "contractDate",
    "disclosureDate",
    "commissionRate",
    "agency",
    "agent",
    "propertyStatusId",
    "buyerName",
    "buyerId",
    "isFavorite",
    "excludeFromReport",
    "appraisedAmount",
    "improve",
    "construction",
    "landUse1",
    "zoning",
    "developmentZone",
    "primaryPlan",
    "rpd",
    "valuationNo",
    "valuationType",
    "valuationAmount",
    "valuationDate",
    "ownerType",
    "owner1name",
    "owner1address",
    "owner1phone",
    "owner1email",
    "owner1mobile",
    "owner1abn",
    "owner1nameLine2",
    "owner1acn",
    "owner1gstRegistered",
    "owner1address2",
    "owner1fax",
    "owner2name",
    "owner2address",
    "owner2phone",
    "owner2email",
    "owner2mobile",
    "owner2abn",
    "owner2nameLine2",
    "owner2acn",
    "owner2gstRegistered",
    "owner2address2",
    "owner2fax",
    "owner3name",
    "owner3address",
    "owner3phone",
    "owner3email",
    "owner3mobile",
    "owner3abn",
    "owner3nameLine2",
    "owner3acn",
    "owner3gstRegistered",
    "owner3address2",
    "owner3fax",
    "primaryPhoneOwnerNum",
    "primaryEmailOwnerNum",
    "vendor1name",
    "vendor1address",
    "vendor2name",
    "vendor2address",
    "vendor3name",
    "vendor3address",
    "relationship",
    "openInRpp",
    "advertisementId",
    "formattedTS",
    "propertyAltLinks",
    "propertyAltLink",
  ] as const,
  columns: pandaPropertiesColumns,
  /**
   * Default order: next condition due ascending, so properties under contract surface with the
   * soonest condition (overdue/due-today first) on top. Postgres ASC sorts NULLs last, so
   * properties with no live condition fall into a bottom group ordered alphabetically by street
   * (the secondary key). propertyListId is the final stable tie-break. Clicking a column header
   * overrides this for the session; a fresh visit (no sortKey) resets to it.
   */
  listOrderBy: [
    { columnKey: "nextConditionDue", direction: "asc" },
    { columnKey: "streetAddress", direction: "asc" },
    { columnKey: "propertyListId", direction: "asc" },
  ] as const satisfies readonly ListOrderSpec[],
  listSearch: {
    columnKeys: [
      "streetAddress",
      "suburb",
      "postcode",
      "propertyType",
      "agency",
      "agent",
      "buyerName",
      "owner1name",
      "owner2name",
      "owner3name",
      "advertisementId",
      "rpd",
      "valuationNo",
    ] as const,
    wordSplitColumnKeys: ["owner1name", "owner2name", "owner3name"] as const,
    trigger: "submit",
  },
  listBooleanFilter: {
    columnKey: "isFavorite",
    uiLayout: "side",
    uiStyle: "switch",
    defaultSegment: "true",
    labels: {
      all: "All",
      true: "Favorites",
      false: "Non-favorites",
    },
  } as const satisfies AdminEntityListBooleanFilter,
  listRelationFilters: [
    {
      columnKey: "propertyStatusId",
      multiSelect: true,
      uiLayout: "side",
      persistenceKeys: {
        favorites: "panda-realty:list-filter:properties:propertyStatusId:favorites",
        hidden: "panda-realty:list-filter:properties:propertyStatusId:hidden",
      },
    },
  ] as const satisfies readonly AdminEntityListRelationFilterSpec[],
  // When a map-area filter is active, ignore the favourites toggle (which defaults on) and the
  // Status filter so the map returns every matching street regardless of those toolbar filters.
  listFiltersBypassedByAppendWhereHint: [
    {
      whenHintPresent: "streetFilter",
      bypassBooleanFilter: true,
      bypassRelationFilterColumnKeys: ["propertyStatusId"],
    },
  ],
  listAppendWhereHintFilters: pandaPropertiesListFilters,
  listSideFiltersPanelCollapsible: true,
  listHidePageTitle: true,
  listMobileCard: {
    titleColumnKey: "streetAddress",
    hideTitleFieldLabel: true,
    groups: [
      {
        layout: "rows" as const,
        columnKeys: ["propertyStatusId", "combinedOwner", "suburb"] as const,
      },
      {
        layout: "grid2" as const,
        columnKeys: ["state", "postcode"] as const,
      },
    ],
  },
  ui: {
    title: "Properties",
    singular: "property",
    addCardTitle: "Add property",
    listTitle: "Properties",
    loadErrorLabel: "Could not load properties.",
    emptyLabel: "No properties yet.",
  },
  extraCreateBodyKeys: PROPERTY_RELATION_BODY_KEYS,
  extraPatchBodyKeys: PROPERTY_RELATION_BODY_KEYS,
  extraPatchOmitUntilDetailLoaded: PROPERTY_RELATION_BODY_KEYS,
  /** After nested **entities** edit from buyer/contact/tenant inline rows, refetch property GET so embeds refresh. */
  refreshListDetailSeedAfterNestedRelatedEntityPatch: ["entities"] as const,
  /** After nested **property-entities** save (buyer workspace offers, etc.), refetch property GET so Latest Buyer Offers + inline rows stay in sync. */
  refreshListDetailSeedAfterNestedChildPatch: {
    nestedChildEntitySlug: "property-entities",
    childFkToParentJsonKey: "propertyListId",
  },
  /**
   * Scope `property-status` options to pipeline = 'buyers' when rendering the buyers inline table.
   * `parentDetailJsonKey: "_unused"` + `optionalWhenEmpty` + `whenEmptyRelationFilterValue` acts as
   * a static sentinel — always sends `pipeline=buyers` regardless of any form field value.
   */
  crudRelationOptionFiltersFromParentDetail: [
    {
      relatedEntitySlug: "property-status" as const,
      selections: [
        {
          relatedListFilterColumnKey: "pipeline" as const,
          parentDetailJsonKey: "_unused" as const,
          optionalWhenEmpty: true as const,
          whenEmptyRelationFilterValue: "buyers" as const,
        },
      ],
    },
  ],
  /**
   * Server loads all property_entities once; mergeAdminEntityDetailForApi splits
   * the result into propertyBuyers/Contacts/Tenants by entity category.
   * The form body renders three separate AdminEntityCrudRelatedCollectionsSection
   * instances — one per category — using virtual entity definitions derived here.
   * Property sellers are now displayed via direct owner fields (owner1name, owner1address, etc.)
   */
  crudRelatedCollections: [
    {
      jsonKey: "propertyEntities",
      tabLabel: "Entities",
      tabValue: "property-entities",
      childEntitySlug: "property-entities",
      parentFkColumnKey: "propertyListId",
      inlineEditableColumnKeys: ["entityId", "propertyEntityNote", "isOriginalOwner"] as const,
      inlineHydrateKeysFromServerRow: ["propertyEntity"] as const,
      persistWhenAnyEditableContent: true,
    },
  ],
} as const satisfies AdminEntityDefinition
