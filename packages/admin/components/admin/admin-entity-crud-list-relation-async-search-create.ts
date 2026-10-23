"use client"

import type { QueryClient } from "@tanstack/react-query"

import { adminEntityRelatedRowDetailLabelQueryKey } from "../../admin-entity-relation-async-search-queries"
import type { AdminEntityColumnListRelation, AdminEntityDefinition } from "../../admin-entity-types"
import type { AdminNestedEntityCrudContextValue } from "./admin-nested-entity-crud-context"

type CreateRelConfig = NonNullable<AdminEntityColumnListRelation["crudAsyncSearchCreateRelated"]>

// ─── Button state derivation ──────────────────────────────────────────────────

export interface CreateRelatedButtonState {
  showCreateRelatedFooter: boolean
  createRelatedButtonEnabled: boolean
  createRelatedButtonLabel: string
  createRelatedDisabledTitle: string | undefined
}

export function deriveCreateRelatedButtonState({
  createRel,
  disabled,
  open,
  nestedCrud,
  adminUiMutationsDisabled,
  trimmedPopoverQuery,
  exactIdMatchForQuery,
  usingPreloadedOptions,
  listQueryIsError,
  relCfg,
}: {
  createRel: CreateRelConfig | undefined
  disabled: boolean
  open: boolean
  nestedCrud: AdminNestedEntityCrudContextValue | null | undefined
  adminUiMutationsDisabled: boolean
  trimmedPopoverQuery: string
  exactIdMatchForQuery: boolean
  usingPreloadedOptions: boolean
  listQueryIsError: boolean
  relCfg: AdminEntityDefinition | undefined
}): CreateRelatedButtonState {
  const showCreateRelatedFooter = createRel != null && !disabled && open
  const createRelatedButtonEnabled =
    showCreateRelatedFooter &&
    nestedCrud != null &&
    !adminUiMutationsDisabled &&
    trimmedPopoverQuery !== "" &&
    !exactIdMatchForQuery &&
    (usingPreloadedOptions ? true : !listQueryIsError) &&
    relCfg != null
  const createRelatedButtonLabel =
    createRel?.buttonLabel?.trim() || `New ${relCfg?.ui.singular ?? "record"}`
  const createRelatedDisabledTitle = (() => {
    if (!showCreateRelatedFooter) return undefined
    if (nestedCrud == null) {
      return "Wrap the admin shell with AdminNestedEntityCrudProvider to enable quick-create."
    }
    if (relCfg == null) return "Missing related entity configuration."
    if (adminUiMutationsDisabled) return "Mutations are disabled for this session."
    if (trimmedPopoverQuery === "") return "Type a value to prefill the new record."
    if (exactIdMatchForQuery) return "A list row already matches this code — pick it above."
    if (!usingPreloadedOptions && listQueryIsError) return "Fix the search error, then try again."
    return undefined
  })()
  return {
    showCreateRelatedFooter,
    createRelatedButtonEnabled,
    createRelatedButtonLabel,
    createRelatedDisabledTitle,
  }
}

// ─── Open create dialog handler ───────────────────────────────────────────────

export interface OpenRelatedCreateDialogParams {
  createRelatedButtonEnabled: boolean
  createRel: CreateRelConfig | undefined
  nestedCrud: AdminNestedEntityCrudContextValue | null | undefined
  relCfg: AdminEntityDefinition | undefined
  relatedSlug: string
  trimmedPopoverQuery: string
  queryClient: QueryClient
  setOpen: (v: boolean) => void
  setPopoverSearch: (v: string) => void
  onChange: (next: string) => void
  onBlur: () => void
  invalidateRelatedEntityRelationOptions: () => void
}

export async function openRelatedCreateDialog(
  params: OpenRelatedCreateDialogParams,
): Promise<void> {
  const {
    createRelatedButtonEnabled,
    createRel,
    nestedCrud,
    relCfg,
    relatedSlug,
    trimmedPopoverQuery,
    queryClient,
    setOpen,
    setPopoverSearch,
    onChange,
    onBlur,
    invalidateRelatedEntityRelationOptions,
  } = params

  if (!createRelatedButtonEnabled || createRel == null || nestedCrud == null || relCfg == null) {
    return
  }
  const q = trimmedPopoverQuery

  if (createRel.onBeforeCreate != null) {
    const existing = await createRel.onBeforeCreate({ searchText: q })
    if (existing != null) {
      setOpen(false)
      setPopoverSearch("")
      onBlur()
      onChange(existing.existingId)
      void queryClient.invalidateQueries({
        queryKey: adminEntityRelatedRowDetailLabelQueryKey(relCfg, existing.existingId),
      })
      invalidateRelatedEntityRelationOptions()
      return
    }
  }

  const seedColumns = relCfg.columns as readonly { key: string; textUppercaseOnChange?: boolean }[]
  const seedValues = {
    ...Object.fromEntries(
      createRel.seedColumnKeysFromSearchText.map((k) => {
        const colDef = seedColumns.find((c) => c.key === k)
        const v = colDef?.textUppercaseOnChange === true ? q.toUpperCase() : q
        return [k, v]
      }),
    ),
    ...(createRel.seedFixedValues ?? {}),
  }

  setOpen(false)
  setPopoverSearch("")
  onBlur()
  nestedCrud.openNestedEntityCreate({
    slug: relatedSlug,
    seedValues,
    onSuccess: (row) => {
      const raw = row[relCfg.idColumn.jsonKey]
      if (raw == null) return
      const id = String(raw)
      onChange(id)
      void queryClient.invalidateQueries({
        queryKey: adminEntityRelatedRowDetailLabelQueryKey(relCfg, id),
      })
      invalidateRelatedEntityRelationOptions()
    },
  })
}
