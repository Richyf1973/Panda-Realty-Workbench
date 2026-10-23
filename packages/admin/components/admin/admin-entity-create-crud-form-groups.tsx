"use client"

import type { ReactNode } from "react"
import { cn } from "@repo/ui/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs"
import { AdminEntityCrudRelatedCollectionsSection } from "./admin-entity-crud-related-collections"
import { notifyAdminRelatedInlineDraftSync } from "../../admin-related-inline-draft-sync"
import type { AdminRenderCrudFormAfterMainFieldsArgs } from "../../admin-client-registry-context"
import type { AdminEntityDefinition } from "../../admin-entity-types"
import type { AdminEntityCrudListRelationFieldOptionsMap } from "../../admin-entity-crud-relation-field-options-types"
import type { AdminEntityCrudFormSubscribeApi } from "../../admin-entity-crud-form-subscribe-api"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import type { AdminEntityColumn } from "../../admin-entity-types"
import { renderAdminEntityCrudFormGroupFieldsGrid } from "./admin-entity-crud-form-grid"

export type RenderCreateFormGroupsArgs = {
  readonly slug: AdminEntitySlug
  readonly entityDefinition: AdminEntityDefinition
  readonly resolvedFormGroups: Array<{ key: string; label: string; cols: AdminEntityColumn[] }>
  readonly hasFormGroups: boolean
  readonly formGroupsMode: "sections" | "tabs"
  readonly form: NonNullable<AdminRenderCrudFormAfterMainFieldsArgs["form"]>
  readonly relationFieldOptions: AdminEntityCrudListRelationFieldOptionsMap
  readonly wideGrid: boolean
  readonly isCompact: boolean
  readonly renderCrudFormGroupBody: Parameters<typeof renderAdminEntityCrudFormGroupFieldsGrid>[0]["renderCrudFormGroupBody"]
  readonly renderCrudFormBeforeRelatedCollections?: ((args: { slug: string; variant: "create"; entityRowId: null }) => ReactNode | null | undefined) | null
  readonly renderCreateField: Parameters<typeof renderAdminEntityCrudFormGroupFieldsGrid>[0]["renderField"]
  readonly afterMainFieldsSideRailCreate: boolean
  readonly defaultMainBody: ReactNode
  readonly afterMainFieldsResolvedCreate: ReactNode
  readonly adminUiMutationsDisabled: boolean
  readonly compactCreateReadOnly: boolean
  readonly promoteCreateDialogToEditFromApiRow?: ((createdRow: Record<string, unknown>) => void) | undefined
}

export function renderCreateFormGroups(args: RenderCreateFormGroupsArgs): ReactNode {
  const {
    slug,
    entityDefinition,
    resolvedFormGroups,
    hasFormGroups,
    formGroupsMode,
    form,
    relationFieldOptions,
    wideGrid,
    isCompact,
    renderCrudFormGroupBody,
    renderCrudFormBeforeRelatedCollections,
    renderCreateField,
    afterMainFieldsSideRailCreate,
    defaultMainBody,
    afterMainFieldsResolvedCreate,
    adminUiMutationsDisabled,
    compactCreateReadOnly,
    promoteCreateDialogToEditFromApiRow,
  } = args

  if (afterMainFieldsSideRailCreate) {
    return (
      <>
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            "overflow-y-auto scrollbar-galaxy md:overflow-hidden",
          )}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row md:items-stretch md:overflow-hidden">
            <div
              data-testid={`admin-entity-crud-side-rail-main-scroll--${slug}`}
              className={cn(
                "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto scrollbar-galaxy",
                "md:min-h-[min(52vh,28rem)]",
              )}
            >
              <div className="min-w-0 shrink-0">
                {defaultMainBody}
                {hasFormGroups && formGroupsMode === "sections" ? (
                  <div
                    className={cn(
                      isCompact ? "space-y-4 px-3 pb-3" : "space-y-6 px-4 pb-4",
                    )}
                  >
                    {resolvedFormGroups.map(({ key, label, cols: groupCols }, groupIndex) => (
                      <section
                        key={key}
                        data-testid={`admin-entity-crud-form-group-section--create--side-rail--${slug}--${groupIndex}--${key}`}
                      >
                        <div className="mb-3 flex items-center gap-3">
                          <h3 className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {label}
                          </h3>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                        {renderAdminEntityCrudFormGroupFieldsGrid({
                          renderCrudFormGroupBody,
                          slug,
                          variant: "create",
                          entityRowId: null,
                          entityDefinition,
                          group: { key, label, cols: groupCols },
                          form,
                          crudListRelationFieldOptions: relationFieldOptions,
                          wideGrid,
                          isCompact,
                          renderField: renderCreateField,
                        })}
                      </section>
                    ))}
                  </div>
                ) : null}
              </div>
              {hasFormGroups && formGroupsMode === "tabs" ? (
                <div
                  className="flex min-h-0 min-w-0 shrink-0 flex-col border-t border-border/60"
                  data-testid={`admin-entity-crud-form-groups-tabs-region--create--${slug}`}
                >
                  <Tabs
                    defaultValue={resolvedFormGroups[0]?.key}
                    className="flex min-h-0 min-w-0 flex-col"
                    data-testid={`admin-entity-crud-form-groups-tabs--create--${slug}`}
                  >
                    <TabsList
                      className="mx-4 mt-3 mb-1 w-auto shrink-0 flex-nowrap justify-start overflow-x-auto"
                      data-testid={`admin-entity-crud-form-groups-tab-list--create--${slug}`}
                    >
                      {resolvedFormGroups.map(({ key, label }) => (
                        <TabsTrigger
                          key={key}
                          value={key}
                          className="shrink-0"
                          data-testid={`admin-entity-crud-form-groups-tab-trigger--create--${slug}--${key}`}
                        >
                          {label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {resolvedFormGroups.map(({ key, label, cols: groupCols }) => (
                      <TabsContent
                        key={key}
                        value={key}
                        className="min-h-0 flex-1 overflow-y-auto scrollbar-galaxy"
                        data-testid={`admin-entity-crud-form-groups-tab-panel--create--${slug}--${key}`}
                      >
                        {renderAdminEntityCrudFormGroupFieldsGrid({
                          renderCrudFormGroupBody,
                          slug,
                          variant: "create",
                          entityRowId: null,
                          entityDefinition,
                          group: { key, label, cols: groupCols },
                          form,
                          crudListRelationFieldOptions: relationFieldOptions,
                          wideGrid,
                          isCompact,
                          extraGridClassName: isCompact ? "p-3" : "p-4",
                          renderField: renderCreateField,
                        })}
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              ) : null}
              {entityDefinition.crudRelatedCollections?.length ? (
                <div className="flex min-h-0 min-w-0 shrink-0 flex-col">
                  {renderCrudFormBeforeRelatedCollections?.({
                    slug,
                    variant: "create",
                    entityRowId: null,
                  }) ?? null}
                  <AdminEntityCrudRelatedCollectionsSection
                    slug={slug}
                    entityDefinition={entityDefinition}
                    variant="create"
                    entityRowId={null}
                    onExtrasPayloadSynced={notifyAdminRelatedInlineDraftSync}
                    parentCrudForm={form as unknown as AdminEntityCrudFormSubscribeApi}
                    parentCrossPageViewOnly={
                      adminUiMutationsDisabled === true || compactCreateReadOnly
                    }
                    promoteCreateDialogToEditFromApiRow={promoteCreateDialogToEditFromApiRow}
                  />
                </div>
              ) : null}
            </div>
            <aside
              data-testid={`admin-entity-crud-after-main-fields-side-rail--${slug}`}
              className={cn(
                "flex min-h-0 shrink-0 flex-col overflow-hidden border-border/80 max-md:max-h-[min(70vh,32rem)] max-md:border-t md:border-l md:border-border/60",
                "w-full md:w-[min(20rem,32vw)] md:max-w-88",
              )}
            >
              <div
                data-testid={`admin-entity-crud-after-main-fields-side-rail-scroll--${slug}`}
                className={cn(
                  "min-h-0 flex-1 overflow-y-auto scrollbar-galaxy",
                  isCompact ? "p-3" : "p-4",
                )}
              >
                {afterMainFieldsResolvedCreate}
              </div>
            </aside>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div
        className={cn(
          "shrink-0 overflow-y-auto scrollbar-galaxy",
          entityDefinition.crudRelatedCollections?.length ||
          (hasFormGroups && formGroupsMode === "tabs")
            ? "max-md:max-h-[min(40vh,22rem)] md:max-h-[min(55vh,32rem)]"
            : "max-h-[min(55vh,32rem)]",
        )}
      >
        {defaultMainBody}
        {hasFormGroups && formGroupsMode === "sections" ? (
          <div
            className={cn(
              isCompact ? "space-y-4 px-3 pb-3" : "space-y-6 px-4 pb-4",
            )}
          >
            {resolvedFormGroups.map(({ key, label, cols: groupCols }, groupIndex) => (
              <section
                key={key}
                data-testid={`admin-entity-crud-form-group-section--create--stack--${slug}--${groupIndex}--${key}`}
              >
                <div className="mb-3 flex items-center gap-3">
                  <h3 className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </h3>
                  <div className="h-px flex-1 bg-border" />
                </div>
                {renderAdminEntityCrudFormGroupFieldsGrid({
                  renderCrudFormGroupBody,
                  slug,
                  variant: "create",
                  entityRowId: null,
                  entityDefinition,
                  group: { key, label, cols: groupCols },
                  form,
                  crudListRelationFieldOptions: relationFieldOptions,
                  wideGrid,
                  isCompact,
                  renderField: renderCreateField,
                })}
              </section>
            ))}
          </div>
        ) : null}
      </div>
      {hasFormGroups && formGroupsMode === "tabs" ? (
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col border-t border-border/60"
          data-testid={`admin-entity-crud-form-groups-tabs-region--create--${slug}`}
        >
          <Tabs
            defaultValue={resolvedFormGroups[0]?.key}
            className="flex min-h-0 min-w-0 flex-1 flex-col"
            data-testid={`admin-entity-crud-form-groups-tabs--create--${slug}`}
          >
            <TabsList
              className="mx-4 mt-3 mb-1 w-auto shrink-0 flex-nowrap justify-start overflow-x-auto"
              data-testid={`admin-entity-crud-form-groups-tab-list--create--${slug}`}
            >
              {resolvedFormGroups.map(({ key, label }) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="shrink-0"
                  data-testid={`admin-entity-crud-form-groups-tab-trigger--create--${slug}--${key}`}
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            {resolvedFormGroups.map(({ key, label, cols: groupCols }) => (
              <TabsContent
                key={key}
                value={key}
                className="min-h-0 flex-1 overflow-y-auto scrollbar-galaxy"
                data-testid={`admin-entity-crud-form-groups-tab-panel--create--${slug}--${key}`}
              >
                {renderAdminEntityCrudFormGroupFieldsGrid({
                  renderCrudFormGroupBody,
                  slug,
                  variant: "create",
                  entityRowId: null,
                  entityDefinition,
                  group: { key, label, cols: groupCols },
                  form,
                  crudListRelationFieldOptions: relationFieldOptions,
                  wideGrid,
                  isCompact,
                  extraGridClassName: isCompact ? "p-3" : "p-4",
                  renderField: renderCreateField,
                })}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      ) : null}
      {entityDefinition.crudRelatedCollections?.length ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {renderCrudFormBeforeRelatedCollections?.({
            slug,
            variant: "create",
            entityRowId: null,
          }) ?? null}
          <AdminEntityCrudRelatedCollectionsSection
            slug={slug}
            entityDefinition={entityDefinition}
            variant="create"
            entityRowId={null}
            onExtrasPayloadSynced={notifyAdminRelatedInlineDraftSync}
            parentCrudForm={form as unknown as AdminEntityCrudFormSubscribeApi}
            parentCrossPageViewOnly={
              adminUiMutationsDisabled === true || compactCreateReadOnly
            }
            promoteCreateDialogToEditFromApiRow={promoteCreateDialogToEditFromApiRow}
          />
        </div>
      ) : null}
      {afterMainFieldsResolvedCreate}
    </>
  )
}
