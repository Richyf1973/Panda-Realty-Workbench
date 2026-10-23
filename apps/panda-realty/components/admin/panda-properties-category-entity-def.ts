import type { AdminEntityDefinition } from "@repo/admin/admin-entity-types"

/** Shared embed preview columns shown in every category inline table. */
const ENTITY_EMBED_COLUMNS = [
  {
    key: "entityPhoneNumber",
    label: "Phone Number",
    embedJsonKey: "propertyEntity",
    field: "phoneNumber",
    displayAsDisabledInput: true,
    listCellLinkType: "tel" as const,
  },
  {
    key: "entityEmailAddress",
    label: "Email Address",
    embedJsonKey: "propertyEntity",
    field: "emailAddress",
    displayAsDisabledInput: true,
    listCellLinkType: "mailto" as const,
  },
  {
    key: "entityAddress",
    label: "Address",
    embedJsonKey: "propertyEntity",
    field: "address",
    displayAsDisabledInput: true,
  },
] as const

const BASE_COLLECTION_SHAPE = {
  childEntitySlug: "property-entities",
  parentFkColumnKey: "propertyListId",
  inlineEditableColumnKeys: ["entityId"],
  inlineHydrateKeysFromServerRow: ["propertyEntity"],
  inlineRelationEmbedColumns: ENTITY_EMBED_COLUMNS,
  inlineTableColumnOrder: [
    "entityId",
    "entityPhoneNumber",
    "entityEmailAddress",
    "entityAddress",
  ],
  persistWhenAnyEditableContent: true,
} as const

export type CategoryKey = "propertyBuyers" | "propertyContacts" | "propertyTenants"

// Entity category IDs from panda_realty.entity_categories
// buyer=1, tenant=3, contact=4
const CATEGORY_COLLECTIONS: Record<
  CategoryKey,
  { tabLabel: string; tabValue: string; entityIdLabel: string; categoryId: number }
> = {
  propertyBuyers: {
    tabLabel: "Property Buyers",
    tabValue: "property-buyers",
    entityIdLabel: "Buyer Name",
    categoryId: 1,
  },
  propertyContacts: {
    tabLabel: "Property Contacts",
    tabValue: "property-contacts",
    entityIdLabel: "Contact Name",
    categoryId: 4,
  },
  propertyTenants: {
    tabLabel: "Property Tenants",
    tabValue: "property-tenants",
    entityIdLabel: "Tenant Name",
    categoryId: 3,
  },
}

/** Registry toolbar keys for the "Add new buyer/contact/tenant" buttons. */
const CATEGORY_TOOLBAR_KEYS: Record<CategoryKey, string> = {
  propertyBuyers: "panda-property-add-buyer",
  propertyContacts: "panda-property-add-contact",
  propertyTenants: "panda-property-add-tenant",
}

/** Full **entities** record (name, contact, notes) — same pattern as Vibram `openRelatedTargetInNestedCrudDialog` on payment DR lines. */
function openRelatedEntityInNestedCrudDialogForCategory(
  jsonKey: CategoryKey,
):
  | {
      lineColumnKey: string
      rowIdColumnKey?: string
      relatedEntitySlug: "entities"
      ariaLabel: string
      tooltip: string
      dialogEditSingular?: string
    }
  | undefined {
  switch (jsonKey) {
    case "propertyBuyers":
      // lineColumnKey points to a non-editable column so the button renders in the
      // actions column (alongside delete) rather than beside the buyer name field.
      // rowIdColumnKey supplies the actual entityId used to open the entity form.
      return {
        lineColumnKey: "propertyEntityId",
        rowIdColumnKey: "entityId",
        relatedEntitySlug: "entities",
        ariaLabel: "Edit buyer profile",
        tooltip:
          "Open the entity form for this buyer (name, contact details, notes)",
        dialogEditSingular: "Buyer",
      }
    case "propertyContacts":
      return {
        lineColumnKey: "entityId",
        relatedEntitySlug: "entities",
        ariaLabel: "Edit contact profile",
        tooltip:
          "Open the entity form for this contact (name, contact details, notes)",
      }
    case "propertyTenants":
      return {
        lineColumnKey: "entityId",
        relatedEntitySlug: "entities",
        ariaLabel: "Edit tenant profile",
        tooltip:
          "Open the entity form for this tenant (name, contact details, notes)",
      }
    default:
      return undefined
  }
}

/** Build a single-collection entity definition for one category section. */
export function buildCategoryEntityDef(
  base: AdminEntityDefinition,
  jsonKey: CategoryKey,
  options?: {
    openBuyerWorkspaceNested?: boolean
    openEntityWorkspaceNested?: boolean
  },
): AdminEntityDefinition {
  const { tabLabel, tabValue, entityIdLabel, categoryId } = CATEGORY_COLLECTIONS[jsonKey]

  const openRelatedTargetInNestedCrudDialog =
    options?.openBuyerWorkspaceNested || options?.openEntityWorkspaceNested
      ? openRelatedEntityInNestedCrudDialogForCategory(jsonKey)
      : undefined

  return {
    ...base,
    crudRelatedCollections: [
      {
        ...BASE_COLLECTION_SHAPE,
        jsonKey,
        tabLabel,
        tabValue,
        inlineColumnLabelOverrides: {
          entityId: entityIdLabel,
        },
        inlineCreateRelatedSeedFixedValues: {
          entityId: { entityCategoryId: String(categoryId) },
        },
        registryRelatedTableToolbarKey: CATEGORY_TOOLBAR_KEYS[jsonKey],
        ...(jsonKey === "propertyBuyers"
          ? {
              inlineEditableColumnKeys: ["entityId", "buyerPipelineStatusId"] as const,
              inlineHydrateKeysFromServerRow: ["propertyEntity", "buyerPipelineStatus"] as const,
              inlineTableColumnOrder: [
                "entityId",
                "entityPhoneNumber",
                "entityEmailAddress",
                "entityAddress",
                "buyerPipelineStatusId",
              ],
              inlineNewDraftSeedFirstRelationOptionKeys: ["buyerPipelineStatusId"] as const,
            }
          : {}),
        ...(jsonKey === "propertyContacts"
          ? {
              inlineEditableColumnKeys: [
                "entityId",
                "contactCategoryId",
                "association",
              ] as const,
              inlineHydrateKeysFromServerRow: [
                "propertyEntity",
                "contactCategory",
              ] as const,
              inlineTableColumnOrder: [
                "entityId",
                "contactCategoryId",
                "association",
                "entityPhoneNumber",
                "entityEmailAddress",
                "entityAddress",
              ],
            }
          : {}),
        ...(openRelatedTargetInNestedCrudDialog != null
          ? { openRelatedTargetInNestedCrudDialog }
          : {}),
        // Buyer workspace (offers/notes/files) is now accessible from the entity
        // form directly, so the per-row "open workspace" button is no longer needed
        // for buyers. Contacts and tenants still use it.
        ...(options?.openEntityWorkspaceNested
          ? {
              openChildInNestedCrudDialog: {
                ariaLabel: "Open entity workspace",
                tooltip: "Edit linked entity, note, and original owner",
              },
            }
          : {}),
      },
    ],
    extraCreateBodyKeys: [jsonKey] as never,
    extraPatchBodyKeys: [jsonKey] as never,
    extraPatchOmitUntilDetailLoaded: [jsonKey] as never,
    ...(jsonKey === "propertyContacts"
      ? {
          crudRelationOptionFiltersFromParentDetail: [
            ...(base.crudRelationOptionFiltersFromParentDetail ?? []),
            {
              relatedEntitySlug: "entities" as const,
              selections: [
                {
                  relatedListFilterColumnKey: "entityCategoryId" as const,
                  fixedRelationFilterValue: "4",
                },
              ],
            },
          ],
        }
      : {}),
  } as AdminEntityDefinition
}
