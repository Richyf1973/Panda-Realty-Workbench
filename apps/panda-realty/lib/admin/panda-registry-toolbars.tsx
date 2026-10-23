"use client"

import type { ReactNode } from "react"

import type { AdminRenderAdminEntityListAboveTableArgs, AdminRenderCrudRelatedTableToolbarArgs } from "@repo/admin/admin-client-registry-types"
import { PropertiesAboveTableWrapper } from "@/components/admin/properties-above-table-wrapper"
import { PropertyTypesSyncButton } from "@/components/admin/property-types-sync-button"
import { PandaPropertyAddEntityToolbar } from "@/components/admin/panda-property-add-entity-toolbar"
import { ContactsGeneralSearchBar } from "@/components/admin/contacts-general-search-bar"

export function renderPropertyCrudRelatedTableToolbar(
  args: AdminRenderCrudRelatedTableToolbarArgs,
): ReactNode {
  const key = args.collection.registryRelatedTableToolbarKey
  if (key === "panda-property-add-buyer") {
    return (
      <PandaPropertyAddEntityToolbar
        {...args}
        categoryId={1}
        buttonLabel="Add new buyer"
        dialogAddTitle="Add Buyer"
        createPrimarySubmitLabel="Create & Edit"
      />
    )
  }
  if (key === "panda-property-add-contact") {
    return <PandaPropertyAddEntityToolbar {...args} categoryId={4} buttonLabel="Add new contact" />
  }
  if (key === "panda-property-add-tenant") {
    return <PandaPropertyAddEntityToolbar {...args} categoryId={3} buttonLabel="Add new tenant" />
  }
  return null
}

export function renderPropertyListAboveTable(
  args: AdminRenderAdminEntityListAboveTableArgs,
): ReactNode {
  if (args.slug === "properties") {
    return (
      <PropertiesAboveTableWrapper
        onListRefetch={args.onListRefetch}
        adminUiMutationsDisabled={args.adminUiMutationsDisabled}
        totalCount={args.totalCount}
        hasActiveListFilters={args.hasActiveListFilters}
      />
    )
  }
  if (args.slug === "property-types") {
    return (
      <PropertyTypesSyncButton
        onListRefetch={args.onListRefetch}
        adminUiMutationsDisabled={args.adminUiMutationsDisabled}
      />
    )
  }
  if (args.slug === "contacts") {
    return <ContactsGeneralSearchBar />
  }
  return null
}
