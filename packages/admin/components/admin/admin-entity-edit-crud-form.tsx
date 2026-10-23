"use client"

import { useForm } from "@tanstack/react-form"
import { useStore } from "@tanstack/react-store"
import type { UseMutationResult } from "@tanstack/react-query"
import {
  useCallback,
  useMemo,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { Button } from "@repo/ui/button"
import {
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@repo/ui/dialog"
import { Label } from "@repo/ui/label"
import { cn } from "@repo/ui/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs"
import { useCompactAdminListViewport } from "@repo/ui/use-compact-admin-list-viewport"
import { AdminEntityCrudRelatedCollectionsSection } from "./admin-entity-crud-related-collections"
import { notifyAdminRelatedInlineDraftSync } from "../../admin-related-inline-draft-sync"
import {
  useAdminClientRegistry,
  type AdminRenderCrudFormAfterMainFieldsArgs,
} from "../../admin-client-registry-context"
import type { AdminEntityCrudListRelationFieldOptionsMap } from "../../admin-entity-crud-relation-field-options-types"
import type { AdminEntityColumn, AdminEntityDefinition } from "../../admin-entity-types"
import {
  buildAdminEntityPatchRequestPayload,
  listAdminEntityPatchBodyBlockingIssues,
  type AdminEntityCreateMutationVariables,
  type AdminEntityCrudBodyFieldIssue,
} from "../../admin-entity-crud-form-values"
import {
  ADMIN_ENTITY_CRUD_FALLBACK_PAYLOAD_BUILD_ERROR_MESSAGE,
  notifyAndScheduleFocusFirstPayloadIssueField,
} from "../../admin-entity-crud-payload-submit-side-effects"
import { AdminEntityCrudPayloadIssuesAlert } from "./admin-entity-crud-payload-issues-alert"
import { buildAdminEntityPatchRequestPayloadPartial } from "../../admin-entity-patch-partial"
import { partitionAdminEntityCrudColumnsMainAndManyRelationSide } from "../../admin-entity-many-relation-form"
import {
  ADMIN_ENTITY_CRUD_FIELD_CELL_CLASS,
  ADMIN_ENTITY_CRUD_FIELD_ERROR_FOOTER_CLASS,
  ADMIN_ENTITY_CRUD_FORM_FIELDS_GRID_CLASS,
  ADMIN_ENTITY_CRUD_FORM_SIDE_MANY_RELATION_GRID_TEMPLATE_COLUMNS,
  ADMIN_ENTITY_CRUD_MUTATION_ERROR_GRID_AREA,
  ADMIN_ENTITY_CRUD_FORM_GRID_TEMPLATE_COLUMNS_WIDE,
  buildAdminEntityCrudFormGridLayout,
} from "../../admin-entity-form-grid"
import { formatUnknownErrorMessage } from "../../read-api-error"
import { fieldErrorsText } from "../../field-errors-text"
import type { AdminEntityCrudFormSubscribeApi } from "../../admin-entity-crud-form-subscribe-api"
import type { AdminEntitySlug } from "../../admin-entity-slug-client"
import { adminEntityLocksCrudOnCompactViewport } from "../../admin-entity-crud-compact-viewport"
import { useAdminEntityCrudRelationFieldOptionsMerged } from "./use-admin-entity-crud-relation-field-options-merged"
import { adminEntityColumnFormLabel } from "../../admin-entity-column-form-label"
import { AdminEntityCrudManyRelationCheckboxControl } from "./admin-entity-crud-many-relation-checkbox-control"
import {
  type AdminEntityStringMapForm,
  adminCrudFormLatestStringMapValues,
  chainAdminCrudFieldStringChange,
  partitionCrudDeferredColumns,
  buildAdminEntityCrudFormGroupPartition,
  adminEntityFieldRequiredOnEdit,
  adminEntityColumnShownInCrudForm,
  crudFormFieldGridSpan,
} from "./admin-entity-crud-form-column-utils"
import {
  useAdminCrudFormWideGridLayout,
  renderAdminEntityCrudFormGroupFieldsGrid,
} from "./admin-entity-crud-form-grid"
import { useAdminCrudServerFieldErrors } from "./admin-entity-crud-server-field-errors"
import { queryAdminAsyncSearchTrigger } from "../../admin-entity-async-search-dom"
import type {
  AdminEntityCrudDialogState,
  AdminEntityEditPatchDiffBaseline,
  AdminNestedEditUiContext,
} from "./admin-entity-crud-dialog-state"
import { useAdminCrudFormInteractionLocked } from "../../admin-crud-form-interaction-lock-context"
import {
  createAdminEntityEditCrudRenderEditField,
  type AdminEntityEditCrudRenderEditFieldDeps,
} from "./admin-entity-edit-crud-form-render-edit-field"

export function AdminEntityEditCrudForm({
  slug,
  entityDefinition,
  patchCols,
  rowId,
  initialValues,
  listDetailSeed,
  editDetailSourceRow,
  patchDiffBaseline,
  schemaSqlName,
  singular,
  updateMutation,
  crudListRelationFieldOptions,
  crossPageFormLocked = false,
  onCancel,
  onEditRelatedDetailLoaded,
  refetchEditDialogDetailFromApi,
  onDelete,
  deletePending = false,
  onAddNew,
  nestedEditUiContext,
}: {
  slug: AdminEntitySlug
  entityDefinition: AdminEntityDefinition
  patchCols: AdminEntityColumn[]
  rowId: string
  initialValues: Record<string, string>
  listDetailSeed?: Record<string, unknown>
  /**
   * Raw **GET** response used to hydrate list-relation embeds (e.g. `inventory`) in async-search
   * fields without a duplicate `GET` for the option label. Used by nested line edit; optional
   * elsewhere until list→edit also wires a full row.
   */
  editDetailSourceRow?: Record<string, unknown> | null
  patchDiffBaseline?: AdminEntityEditPatchDiffBaseline
  schemaSqlName: string
  singular: string
  updateMutation: Pick<
    UseMutationResult<
      Record<string, unknown>,
      Error,
      {
        id: string
        patch: Record<string, unknown>
        partialExtrasBaseline?: Record<string, unknown>
        targetEntitySlug?: AdminEntitySlug
        afterSuccess?: "keepOpen" | "close"
      }
    >,
    "mutate" | "isPending" | "isError" | "error"
  >
  crudListRelationFieldOptions: AdminEntityCrudListRelationFieldOptionsMap
  crossPageFormLocked?: boolean
  onCancel: () => void
  onEditRelatedDetailLoaded?: (detail: Record<string, unknown>) => void
  /** Refetches parent GET detail — updates TanStack cache and `listDetailSeed` after side-effect APIs. */
  refetchEditDialogDetailFromApi?: () => Promise<void>
  onDelete?: () => void
  deletePending?: boolean
  onAddNew?: () => void
  nestedEditUiContext?: AdminNestedEditUiContext
}) {
  const {
    adminEntities,
    adminUiMutationsDisabled = false,
    adminEntityCrudExtrasForSaveRef,
    adminEntityCrudBeforePatchRef,
    renderCrudFormBeforeRelatedCollections,
    renderCrudFormAfterMainFields,
    crudFormAfterMainFieldsSideRailSlugs,
    renderCrudFormGroupBody,
    renderCrudDialogFormBody,
    renderCrudFormComputedField,
    renderCrudDialogCompactBody,
    adminEntityPartialPatchBySlug,
    crudFormFieldChangeEffectBySlug,
    crudFormClientSubmitValidatorBySlug,
    crudFormNormalizeValuesBeforeSubmitBySlug,
    crudFormServerErrorToFieldErrorsBySlug,
    notifyAdminEntityCrudPayloadFieldIssues,
  } = useAdminClientRegistry()
  const compactVp = useCompactAdminListViewport()
  const usePartialPatch =
    adminEntityPartialPatchBySlug?.[slug] === true && patchDiffBaseline != null
  const defaultValues = useMemo(
    () => ({ ...initialValues }) as AdminEntityStringMapForm,
    [initialValues],
  )

  const [clientSubmitValidatorMessage, setClientSubmitValidatorMessage] = useState<
    string | null
  >(null)
  const [clientPayloadFieldIssues, setClientPayloadFieldIssues] = useState<
    AdminEntityCrudBodyFieldIssue[] | null
  >(null)

  const clearClientSubmitAlerts = useCallback(() => {
    setClientSubmitValidatorMessage(null)
    setClientPayloadFieldIssues(null)
  }, [])
  const pendingPatchAfterSuccessRef = useRef<"keepOpen" | "close">("keepOpen")

  const compactLocksEditing = adminEntityLocksCrudOnCompactViewport(entityDefinition)

  const form = useForm({
    defaultValues,
    listeners: {
      onChange: () => {
        clearClientSubmitAlerts()
      },
    },
    onSubmit: async ({ value }) => {
      if (updateMutation.isPending) return
      if (
        crossPageFormLocked ||
        adminUiMutationsDisabled ||
        (compactVp && compactLocksEditing)
      )
        return
      const afterSuccess = pendingPatchAfterSuccessRef.current
      pendingPatchAfterSuccessRef.current = "keepOpen"
      crudFormNormalizeValuesBeforeSubmitBySlug?.[slug]?.({
        variant: "edit",
        form: form as unknown as AdminEntityCrudFormSubscribeApi,
      })
      const valueNow = adminCrudFormLatestStringMapValues(
        form,
        value as AdminEntityStringMapForm,
      )
      const msg = crudFormClientSubmitValidatorBySlug?.[slug]?.({
        variant: "edit",
        value: valueNow,
        crudExtrasForSave: adminEntityCrudExtrasForSaveRef?.current,
      })
      if (msg) {
        setClientPayloadFieldIssues(null)
        setClientSubmitValidatorMessage(msg)
        return
      }
      if (usePartialPatch && patchDiffBaseline) {
        const patch = buildAdminEntityPatchRequestPayloadPartial({
          cfg: entityDefinition,
          patchCols,
          value: valueNow,
          entities: adminEntities,
          baselineForm: patchDiffBaseline.formValues,
        })
        if (patch == null) {
          const issues = listAdminEntityPatchBodyBlockingIssues(patchCols, valueNow)
          if (issues.length > 0) {
            setClientSubmitValidatorMessage(null)
            setClientPayloadFieldIssues(issues)
            const fieldKeys = issues.map((i) => i.key)
            notifyAndScheduleFocusFirstPayloadIssueField({
              slug,
              fieldKeys,
              variant: "edit",
              notifyAdminEntityCrudPayloadFieldIssues,
            })
          } else {
            setClientPayloadFieldIssues(null)
            setClientSubmitValidatorMessage(ADMIN_ENTITY_CRUD_FALLBACK_PAYLOAD_BUILD_ERROR_MESSAGE)
          }
          return
        }
        await adminEntityCrudBeforePatchRef?.current?.()
        updateMutation.mutate({
          id: rowId,
          patch,
          partialExtrasBaseline: patchDiffBaseline.extrasByKey,
          targetEntitySlug: slug,
          afterSuccess,
        })
        return
      }
      const patch = buildAdminEntityPatchRequestPayload(
        entityDefinition,
        patchCols,
        valueNow,
        adminEntities,
      )
      if (!patch) {
        const issues = listAdminEntityPatchBodyBlockingIssues(patchCols, valueNow)
        if (issues.length > 0) {
          setClientSubmitValidatorMessage(null)
          setClientPayloadFieldIssues(issues)
          const fieldKeys = issues.map((i) => i.key)
          notifyAndScheduleFocusFirstPayloadIssueField({
            slug,
            fieldKeys,
            variant: "edit",
            notifyAdminEntityCrudPayloadFieldIssues,
          })
        } else {
          setClientPayloadFieldIssues(null)
          setClientSubmitValidatorMessage(ADMIN_ENTITY_CRUD_FALLBACK_PAYLOAD_BUILD_ERROR_MESSAGE)
        }
        return
      }
      await adminEntityCrudBeforePatchRef?.current?.()
      updateMutation.mutate({ id: rowId, patch, targetEntitySlug: slug, afterSuccess })
    },
  })

  const { mutationErrorSuppressed: updateMutationErrorSuppressed } =
    useAdminCrudServerFieldErrors({
      variant: "edit",
      isError: updateMutation.isError,
      error: updateMutation.error,
      isPending: updateMutation.isPending,
      entityDefinition,
      mapper: crudFormServerErrorToFieldErrorsBySlug?.[slug],
      form,
    })

  const formDensity = entityDefinition.crudDialogFormDensity ?? "default"
  const isCompact = formDensity === "compact"
  const formValues = useStore(form.store, (s) => s.values as AdminEntityStringMapForm)
  const hasClientSubmitAlert =
    clientSubmitValidatorMessage != null ||
    (clientPayloadFieldIssues != null && clientPayloadFieldIssues.length > 0)
  const relationFieldOptions = useAdminEntityCrudRelationFieldOptionsMerged(
    slug,
    "patch",
    crudListRelationFieldOptions,
    formValues,
  )

  const interactionLockedFromChildSources = useAdminCrudFormInteractionLocked()
  const crossPageOrMutationsViewOnly =
    crossPageFormLocked === true || adminUiMutationsDisabled === true
  const compactViewportReadOnly = compactVp && compactLocksEditing
  const effectiveViewOnly =
    crossPageOrMutationsViewOnly || compactViewportReadOnly
  const formBodyInteractionsLocked = interactionLockedFromChildSources

  const fieldChangeEffect = crudFormFieldChangeEffectBySlug?.[slug]
  const chainFieldChange = useMemo(
    () => (fieldKey: string, handleChange: (v: string) => void) =>
      chainAdminCrudFieldStringChange(
        fieldChangeEffect,
        {
          variant: "edit",
          slug,
          form: form as unknown as AdminEntityCrudFormSubscribeApi,
        },
        fieldKey,
        handleChange,
      ),
    [fieldChangeEffect, slug, form],
  )

  const { mainCols: colsExcludingDeferred, deferredCols } = useMemo(
    () => partitionCrudDeferredColumns(patchCols, entityDefinition),
    [patchCols, entityDefinition],
  )

  const { mainCols, sideManyCols } = useMemo(
    () =>
      partitionAdminEntityCrudColumnsMainAndManyRelationSide(
        slug,
        colsExcludingDeferred,
        adminEntities,
      ),
    [slug, colsExcludingDeferred, adminEntities],
  )
  const hasSideMany = sideManyCols.length > 0

  const groupedKeySet = useMemo(
    () =>
      new Set(
        entityDefinition.crudFormGroups?.flatMap((g) => [...g.columnKeys]) ??
          [],
      ),
    [entityDefinition],
  )
  const hasFormGroups = groupedKeySet.size > 0

  const colsForMainGrid = hasSideMany ? mainCols : colsExcludingDeferred
  const colsForUngroupedGrid = hasFormGroups
    ? colsForMainGrid.filter((c) => !groupedKeySet.has(c.key))
    : colsForMainGrid
  const visibleColsForUngroupedGrid = useMemo(
    () => colsForUngroupedGrid.filter((c) => adminEntityColumnShownInCrudForm(c, formValues)),
    [colsForUngroupedGrid, formValues],
  )

  const crudFormGridLayout = useMemo(() => {
    return buildAdminEntityCrudFormGridLayout(
      visibleColsForUngroupedGrid.map((c) => crudFormFieldGridSpan(c)),
      {
        includeMutationErrorRow: !hasSideMany && updateMutation.isError && !updateMutationErrorSuppressed,
      },
    )
  }, [visibleColsForUngroupedGrid, hasSideMany, updateMutation.isError, updateMutationErrorSuppressed])

  const resolvedFormGroups = useMemo(
    () => buildAdminEntityCrudFormGroupPartition(colsForMainGrid, entityDefinition).groups,
    [colsForMainGrid, entityDefinition],
  )
  const formGroupsMode = entityDefinition.crudFormGroupsMode ?? "sections"

  const hasCrudRelatedCollections =
    (entityDefinition.crudRelatedCollections?.length ?? 0) > 0

  const wideGrid = useAdminCrudFormWideGridLayout()
  const crudFormGridStyle: CSSProperties = {
    gridTemplateAreas: wideGrid
      ? crudFormGridLayout.gridTemplateAreasWide
      : crudFormGridLayout.gridTemplateAreasNarrow,
    gridTemplateColumns: wideGrid
      ? ADMIN_ENTITY_CRUD_FORM_GRID_TEMPLATE_COLUMNS_WIDE
      : "1fr",
  }

  const splitWide = wideGrid && hasSideMany

  const renderEditField = useMemo(
    () =>
      createAdminEntityEditCrudRenderEditField({
        slug,
        adminEntities,
        form: form as AdminEntityEditCrudRenderEditFieldDeps["form"],
        renderCrudFormComputedField,
        relationFieldOptions,
        chainFieldChange,
        formValues,
        effectiveViewOnly,
        isCompact,
        listDetailSeed,
        editDetailSourceRow: editDetailSourceRow ?? null,
        rowId,
      }),
    [
      slug,
      adminEntities,
      form,
      renderCrudFormComputedField,
      relationFieldOptions,
      chainFieldChange,
      formValues,
      effectiveViewOnly,
      isCompact,
      listDetailSeed,
      editDetailSourceRow,
      rowId,
    ],
  )

  const focusItemCodeOnInventoryCountItemEdit =
    slug.endsWith("-inventory-count-items") && !effectiveViewOnly

  useLayoutEffect(() => {
    if (!focusItemCodeOnInventoryCountItemEdit) return
    let raf2 = 0
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        const el = queryAdminAsyncSearchTrigger(document, "edit", slug, "itemCode")
        if (el?.isConnected) {
          try {
            el.focus({ preventScroll: true })
          } catch {
            el.focus()
          }
        }
      })
    })
    return () => {
      window.cancelAnimationFrame(raf1)
      if (raf2) window.cancelAnimationFrame(raf2)
    }
  }, [focusItemCodeOnInventoryCountItemEdit, slug, rowId])

  const mainFieldsGrid = (
    <div
      className={
        splitWide
          ? cn("grid min-w-0", isCompact ? "gap-2" : "gap-4")
          : cn(
              ADMIN_ENTITY_CRUD_FORM_FIELDS_GRID_CLASS,
              isCompact && "admin-entity-crud-form-fields-grid--compact",
            )
      }
      data-testid={`admin-entity-crud-main-fields-grid--edit--${slug}`}
      style={crudFormGridStyle}
    >
      {visibleColsForUngroupedGrid.map((col, fieldIndex) =>
        renderEditField(col, {
          gridArea: crudFormGridLayout.fieldAreaNames[fieldIndex] ?? "auto",
        }),
      )}
      {!hasSideMany && hasClientSubmitAlert ? (
        <div
          className="min-w-0"
          style={{ gridArea: ADMIN_ENTITY_CRUD_MUTATION_ERROR_GRID_AREA }}
        >
          {clientPayloadFieldIssues?.length ? (
            <AdminEntityCrudPayloadIssuesAlert slug={slug} issues={clientPayloadFieldIssues} />
          ) : (
            <p
              className="min-w-0 text-sm text-destructive"
              role="alert"
              data-testid={`admin-entity-crud-client-validation-error--${slug}`}
            >
              {clientSubmitValidatorMessage}
            </p>
          )}
        </div>
      ) : null}
      {!hasSideMany && updateMutation.isError && !updateMutationErrorSuppressed ? (
        <p
          className="min-w-0 text-sm text-destructive"
          style={{ gridArea: ADMIN_ENTITY_CRUD_MUTATION_ERROR_GRID_AREA }}
          role="alert"
          data-testid={`admin-entity-edit-error--${slug}`}
        >
          {formatUnknownErrorMessage(updateMutation.error)}
        </p>
      ) : null}
    </div>
  )

  const sideManyFieldNodes = sideManyCols.map((col) => (
    <form.Field
      key={col.key}
      name={col.key}
      validators={{
        onSubmit: () => undefined,
      }}
    >
      {(field) => (
        <div
          className={cn(
            ADMIN_ENTITY_CRUD_FIELD_CELL_CLASS,
            splitWide ? "min-h-0 flex-1" : null,
          )}
          data-testid={`admin-entity-edit-field--${slug}--${col.key}`}
        >
          <Label>{adminEntityColumnFormLabel(col)}</Label>
          {relationFieldOptions[col.key] != null ? (
            <AdminEntityCrudManyRelationCheckboxControl
              variant="edit"
              slug={slug}
              col={col}
              value={field.state.value}
              onChange={chainFieldChange(col.key, field.handleChange)}
              options={relationFieldOptions[col.key]!.options}
              optionsPending={
                relationFieldOptions[col.key]!.optionsPending
              }
              layout={splitWide ? "sideRail" : "default"}
              readOnly={effectiveViewOnly}
            />
          ) : null}
          <div className={ADMIN_ENTITY_CRUD_FIELD_ERROR_FOOTER_CLASS}>
            {!field.state.meta.isValid ? (
              <p
                className="text-sm text-destructive"
                role="alert"
                data-testid={`admin-entity-edit-field-error--${slug}--${col.key}`}
              >
                {fieldErrorsText(field.state.meta.errors)}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </form.Field>
  ))

  const mutationErrorBlock =
    hasSideMany &&
    ((updateMutation.isError && !updateMutationErrorSuppressed) || hasClientSubmitAlert) ? (
      <>
        {hasClientSubmitAlert ? (
          clientPayloadFieldIssues?.length ? (
            <AdminEntityCrudPayloadIssuesAlert slug={slug} issues={clientPayloadFieldIssues} />
          ) : (
            <p
              className="min-w-0 text-sm text-destructive"
              role="alert"
              data-testid={`admin-entity-crud-client-validation-error--${slug}`}
            >
              {clientSubmitValidatorMessage}
            </p>
          )
        ) : null}
        {updateMutation.isError && !updateMutationErrorSuppressed ? (
          <p
            className="min-w-0 text-sm text-destructive"
            role="alert"
            data-testid={`admin-entity-edit-error--${slug}`}
          >
            {formatUnknownErrorMessage(updateMutation.error)}
          </p>
        ) : null}
      </>
    ) : null

  const defaultMainBody = hasSideMany ? (
    splitWide ? (
      <div
        className={cn(
          "min-w-0",
          isCompact ? "space-y-2 p-3" : "space-y-4 p-4",
        )}
        data-testid={`admin-entity-crud-default-main--edit--${slug}`}
      >
        <div
          className={cn(
            "grid min-h-[min(50vh,26rem)] w-full items-stretch",
            isCompact ? "gap-2" : "gap-4",
          )}
          style={{
            gridTemplateColumns:
              ADMIN_ENTITY_CRUD_FORM_SIDE_MANY_RELATION_GRID_TEMPLATE_COLUMNS,
          }}
        >
          {mainFieldsGrid}
          <aside
            className={cn(
              "flex min-h-0 min-w-0 flex-col border-l border-border/60 bg-muted/10",
              isCompact ? "gap-2 pl-3" : "gap-4 pl-4",
            )}
            data-testid={`admin-entity-crud-many-relation-side--${slug}`}
          >
            {sideManyFieldNodes}
          </aside>
        </div>
        {mutationErrorBlock}
      </div>
    ) : (
      <div
        className={cn(
          "min-w-0",
          isCompact ? "space-y-2 p-3" : "space-y-4 p-4",
        )}
        data-testid={`admin-entity-crud-default-main--edit--${slug}`}
      >
        {mainFieldsGrid}
        <div
          className={cn(
            "border-t border-border/80",
            isCompact ? "pt-2" : "pt-4",
          )}
          data-testid={`admin-entity-crud-many-relation-side--${slug}`}
        >
          {sideManyFieldNodes}
        </div>
        {mutationErrorBlock}
      </div>
    )
  ) : (
    mainFieldsGrid
  )

  const compactDialogBody =
    compactViewportReadOnly && compactVp
      ? renderCrudDialogCompactBody?.({
          slug,
          variant: "edit",
          entityRowId: rowId,
          entityDefinition,
          form: form as unknown as NonNullable<
            AdminRenderCrudFormAfterMainFieldsArgs["form"]
          >,
          listDetailSeed,
          crudDeferredFieldCols: deferredCols,
          patchCols,
          crudListRelationFieldOptions: relationFieldOptions,
        })
      : null

  const customFormBody =
    compactDialogBody == null
      ? (renderCrudDialogFormBody?.({
          slug,
          variant: "edit",
          entityRowId: rowId,
          entityDefinition,
          isCompact,
          form: form as unknown as NonNullable<
            AdminRenderCrudFormAfterMainFieldsArgs["form"]
          >,
          listDetailSeed,
          crudListRelationFieldOptions: relationFieldOptions,
          ...(nestedEditUiContext != null ? { nestedEditUiContext } : {}),
        }) ?? null)
      : null

  const afterMainFieldsRawEdit =
    renderCrudFormAfterMainFields?.({
      slug,
      variant: "edit",
      entityRowId: rowId,
      form: form as unknown as NonNullable<
        AdminRenderCrudFormAfterMainFieldsArgs["form"]
      >,
      crudDeferredFieldCols: deferredCols,
      ...(listDetailSeed != null ? { listDetailSeed } : {}),
    }) ?? null

  const afterMainFieldsResolvedEdit =
    afterMainFieldsRawEdit != null && deferredCols.length > 0 ? (
      <div
        className={cn(
          "shrink-0 border-t border-border/80",
          isCompact ? "px-3 py-2" : "px-4 py-3",
        )}
        data-testid={`admin-entity-crud-after-main-fields-deferred--edit--${slug}`}
      >
        {afterMainFieldsRawEdit}
      </div>
    ) : (
      afterMainFieldsRawEdit
    )

  const afterMainFieldsSideRailEdit =
    compactDialogBody == null &&
    customFormBody == null &&
    crudFormAfterMainFieldsSideRailSlugs?.has(slug) === true &&
    afterMainFieldsResolvedEdit != null

  return (
    <form
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        (compactDialogBody != null || customFormBody != null) && "min-h-0 overflow-hidden",
        isCompact && "admin-entity-crud-dialog-form--compact",
      )}
      data-testid={`admin-entity-edit-form--${slug}`}
      autoComplete="off"
      aria-busy={formBodyInteractionsLocked}
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <DialogHeader
        className={cn(
          "shrink-0 border-b border-border/80",
          isCompact ? "gap-1 px-3 pt-3 pb-2" : "px-4 pt-4 pb-3",
        )}
        data-testid={`admin-entity-crud-dialog-header--edit--${slug}`}
      >
        <DialogTitle
          className={cn(isCompact && "text-base")}
          data-testid={`admin-entity-edit-dialog-title--${slug}`}
        >
          {effectiveViewOnly ? "View" : "Edit"} {singular}
        </DialogTitle>
        <DialogDescription
          className="sr-only"
          data-testid={`admin-entity-crud-dialog-description--edit--${slug}`}
        >
          {effectiveViewOnly ? "View fields" : "Update fields"} for this row in{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            {schemaSqlName}
          </code>
          .
        </DialogDescription>
      </DialogHeader>
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          compactDialogBody != null || customFormBody != null
            ? "overflow-hidden"
            : afterMainFieldsSideRailEdit
              ? "overflow-y-auto overflow-x-hidden scrollbar-galaxy md:overflow-hidden"
              : hasCrudRelatedCollections
                ? "overflow-y-auto overflow-x-hidden scrollbar-galaxy"
                : "scrollbar-galaxy overflow-y-auto overflow-x-hidden",
        )}
        data-testid={`admin-entity-crud-dialog-body--edit--${slug}`}
      >
        <fieldset
          disabled={formBodyInteractionsLocked}
          data-testid={`admin-entity-crud-form-body-fieldset--${slug}`}
          className={cn(
            "min-w-0 flex flex-col border-0 p-0",
            (compactDialogBody != null || customFormBody != null || !hasCrudRelatedCollections) && "flex-1 min-h-0",
            compactDialogBody != null && "basis-0",
            afterMainFieldsSideRailEdit && "md:min-h-0",
            formBodyInteractionsLocked && "opacity-65",
          )}
        >
          <legend className="sr-only">
            {effectiveViewOnly ? "Row fields (read-only)" : "Row fields"}
          </legend>
          {compactDialogBody != null ? (
            <>
              <div
                className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden"
                data-testid={`admin-entity-crud-compact-body--${slug}`}
              >
                {compactDialogBody}
              </div>
              {entityDefinition.crudRelatedCollections?.length ? (
                <div className="hidden" aria-hidden="true">
                  {renderCrudFormBeforeRelatedCollections?.({
                    slug,
                    variant: "edit",
                    entityRowId: rowId,
                  }) ?? null}
                  <AdminEntityCrudRelatedCollectionsSection
                    slug={slug}
                    entityDefinition={entityDefinition}
                    variant="edit"
                    entityRowId={rowId}
                    listDetailSeed={listDetailSeed}
                    onExtrasPayloadSynced={notifyAdminRelatedInlineDraftSync}
                    onEditDetailPayloadLoaded={onEditRelatedDetailLoaded}
                    parentCrudForm={
                      form as unknown as AdminEntityCrudFormSubscribeApi
                    }
                    parentCrossPageViewOnly={effectiveViewOnly}
                    refetchParentEntityDetail={refetchEditDialogDetailFromApi}
                  />
                </div>
              ) : null}
            </>
          ) : customFormBody != null ? (
            <>
              <div
                className="scrollbar-galaxy flex min-h-0 flex-1 flex-col overflow-y-auto"
                data-testid={`admin-entity-crud-custom-form-scroll--edit--${slug}`}
              >
                {customFormBody}
              </div>
              {hasClientSubmitAlert ? (
                clientPayloadFieldIssues?.length ? (
                  <div
                    className={cn(
                      "shrink-0 min-w-0 px-4 py-2",
                      isCompact && "px-3 py-1",
                    )}
                  >
                    <AdminEntityCrudPayloadIssuesAlert slug={slug} issues={clientPayloadFieldIssues} />
                  </div>
                ) : (
                  <p
                    className={cn(
                      "shrink-0 min-w-0 px-4 py-2 text-sm text-destructive",
                      isCompact && "px-3 py-1",
                    )}
                    role="alert"
                    data-testid={`admin-entity-crud-client-validation-error--${slug}`}
                  >
                    {clientSubmitValidatorMessage}
                  </p>
                )
              ) : updateMutation.isError && !updateMutationErrorSuppressed ? (
                <p
                  className={cn(
                    "shrink-0 min-w-0 px-4 py-2 text-sm text-destructive",
                    isCompact && "px-3 py-1",
                  )}
                  role="alert"
                  data-testid={`admin-entity-edit-error--${slug}`}
                >
                  {formatUnknownErrorMessage(updateMutation.error)}
                </p>
              ) : null}
            </>
          ) : afterMainFieldsSideRailEdit ? (
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
                            isCompact
                              ? "space-y-4 px-3 pb-3"
                              : "space-y-6 px-4 pb-4",
                          )}
                        >
                          {resolvedFormGroups.map(({ key, label, cols: groupCols }, groupIndex) => (
                            <section
                              key={key}
                              data-testid={`admin-entity-crud-form-group-section--edit--side-rail--${slug}--${groupIndex}--${key}`}
                              className="mb-4"
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
                                variant: "edit",
                                entityRowId: rowId,
                                entityDefinition,
                                ...(listDetailSeed != null ? { listDetailSeed } : {}),
                                group: { key, label, cols: groupCols },
                                form: form as unknown as NonNullable<
                                  AdminRenderCrudFormAfterMainFieldsArgs["form"]
                                >,
                                crudListRelationFieldOptions: relationFieldOptions,
                                wideGrid,
                                isCompact,
                                renderField: renderEditField,
                              })}
                            </section>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {hasFormGroups && formGroupsMode === "tabs" ? (
                      <div
                        className="flex min-h-0 min-w-0 shrink-0 flex-col border-t border-border/60"
                        data-testid={`admin-entity-crud-form-groups-tabs-region--edit--${slug}`}
                      >
                        <Tabs
                          defaultValue={resolvedFormGroups[0]?.key}
                          className="flex min-h-0 min-w-0 flex-col"
                          data-testid={`admin-entity-crud-form-groups-tabs--edit--${slug}`}
                        >
                          <TabsList
                            className="mx-4 mt-3 mb-1 w-auto shrink-0 flex-nowrap justify-start overflow-x-auto"
                            data-testid={`admin-entity-crud-form-groups-tab-list--edit--${slug}`}
                          >
                            {resolvedFormGroups.map(({ key, label }) => (
                              <TabsTrigger
                                key={key}
                                value={key}
                                className="shrink-0"
                                data-testid={`admin-entity-crud-form-groups-tab-trigger--edit--${slug}--${key}`}
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
                              data-testid={`admin-entity-crud-form-groups-tab-panel--edit--${slug}--${key}`}
                            >
                              {renderAdminEntityCrudFormGroupFieldsGrid({
                                renderCrudFormGroupBody,
                                slug,
                                variant: "edit",
                                entityRowId: rowId,
                                entityDefinition,
                                ...(listDetailSeed != null ? { listDetailSeed } : {}),
                                group: { key, label, cols: groupCols },
                                form: form as unknown as NonNullable<
                                  AdminRenderCrudFormAfterMainFieldsArgs["form"]
                                >,
                                crudListRelationFieldOptions: relationFieldOptions,
                                wideGrid,
                                isCompact,
                                extraGridClassName: isCompact ? "p-3" : "p-4",
                                renderField: renderEditField,
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
                          variant: "edit",
                          entityRowId: rowId,
                        }) ?? null}
                        <AdminEntityCrudRelatedCollectionsSection
                          slug={slug}
                          entityDefinition={entityDefinition}
                          variant="edit"
                          entityRowId={rowId}
                          listDetailSeed={listDetailSeed}
                          onExtrasPayloadSynced={notifyAdminRelatedInlineDraftSync}
                          onEditDetailPayloadLoaded={onEditRelatedDetailLoaded}
                          parentCrudForm={
                            form as unknown as AdminEntityCrudFormSubscribeApi
                          }
                          parentCrossPageViewOnly={effectiveViewOnly}
                          refetchParentEntityDetail={
                            refetchEditDialogDetailFromApi
                          }
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
                      {afterMainFieldsResolvedEdit}
                    </div>
                  </aside>
                </div>
              </div>
            </>
          ) : (
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
                      isCompact
                        ? "space-y-4 px-3 pb-3"
                        : "space-y-6 px-4 pb-4",
                    )}
                  >
                    {resolvedFormGroups.map(({ key, label, cols: groupCols }, groupIndex) => (
                      <section
                        key={key}
                        data-testid={`admin-entity-crud-form-group-section--edit--stack--${slug}--${groupIndex}--${key}`}
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
                          variant: "edit",
                          entityRowId: rowId,
                          entityDefinition,
                          ...(listDetailSeed != null ? { listDetailSeed } : {}),
                          group: { key, label, cols: groupCols },
                          form: form as unknown as NonNullable<
                            AdminRenderCrudFormAfterMainFieldsArgs["form"]
                          >,
                          crudListRelationFieldOptions: relationFieldOptions,
                          wideGrid,
                          isCompact,
                          renderField: renderEditField,
                        })}
                      </section>
                    ))}
                  </div>
                ) : null}
              </div>
              {hasFormGroups && formGroupsMode === "tabs" ? (
                <div
                  className="flex min-h-0 min-w-0 flex-1 flex-col border-t border-border/60"
                  data-testid={`admin-entity-crud-form-groups-tabs-region--edit--${slug}`}
                >
                  <Tabs
                    defaultValue={resolvedFormGroups[0]?.key}
                    className="flex min-h-0 min-w-0 flex-1 flex-col"
                    data-testid={`admin-entity-crud-form-groups-tabs--edit--${slug}`}
                  >
                    <TabsList
                      className="mx-4 mt-3 mb-1 w-auto shrink-0 flex-nowrap justify-start overflow-x-auto"
                      data-testid={`admin-entity-crud-form-groups-tab-list--edit--${slug}`}
                    >
                      {resolvedFormGroups.map(({ key, label }) => (
                        <TabsTrigger
                          key={key}
                          value={key}
                          className="shrink-0"
                          data-testid={`admin-entity-crud-form-groups-tab-trigger--edit--${slug}--${key}`}
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
                        data-testid={`admin-entity-crud-form-groups-tab-panel--edit--${slug}--${key}`}
                      >
                        {renderAdminEntityCrudFormGroupFieldsGrid({
                          renderCrudFormGroupBody,
                          slug,
                          variant: "edit",
                          entityRowId: rowId,
                          entityDefinition,
                          ...(listDetailSeed != null ? { listDetailSeed } : {}),
                          group: { key, label, cols: groupCols },
                          form: form as unknown as NonNullable<
                            AdminRenderCrudFormAfterMainFieldsArgs["form"]
                          >,
                          crudListRelationFieldOptions: relationFieldOptions,
                          wideGrid,
                          isCompact,
                          extraGridClassName: isCompact ? "p-3" : "p-4",
                          renderField: renderEditField,
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
                    variant: "edit",
                    entityRowId: rowId,
                  }) ?? null}
                  <AdminEntityCrudRelatedCollectionsSection
                    slug={slug}
                    entityDefinition={entityDefinition}
                    variant="edit"
                    entityRowId={rowId}
                    listDetailSeed={listDetailSeed}
                    onExtrasPayloadSynced={notifyAdminRelatedInlineDraftSync}
                    onEditDetailPayloadLoaded={onEditRelatedDetailLoaded}
                    parentCrudForm={
                      form as unknown as AdminEntityCrudFormSubscribeApi
                    }
                    parentCrossPageViewOnly={effectiveViewOnly}
                    refetchParentEntityDetail={refetchEditDialogDetailFromApi}
                  />
                </div>
              ) : null}
              {afterMainFieldsResolvedEdit}
            </>
          )}
        </fieldset>
      </div>
      {(() => {
        const showFooterCancel = !compactVp
        const showEditSubmit = !effectiveViewOnly
        const showDelete = onDelete != null && !effectiveViewOnly
        const showAddNew = onAddNew != null && !effectiveViewOnly
        if (!showFooterCancel && !showEditSubmit && !showDelete && !showAddNew) return null
        return (
          <DialogFooter
            className={cn(
              "mx-0 mt-0 mb-0 w-full flex-nowrap! flex-col! gap-2 border-t bg-muted/50 flex! sm:flex-row! sm:items-center sm:justify-between",
              isCompact ? "px-3 py-2" : "px-4 py-3",
            )}
            data-testid={`admin-entity-crud-dialog-footer--edit--${slug}`}
          >
            {showAddNew || showDelete ? (
              <div className="flex shrink-0 flex-wrap gap-2 sm:mr-auto">
                {showAddNew ? (
                  <Button
                    type="button"
                    variant="outline"
                    size={isCompact ? "sm" : "default"}
                    data-testid={`admin-entity-edit-add-new--${slug}`}
                    onClick={onAddNew}
                    disabled={updateMutation.isPending}
                  >
                    Add New
                  </Button>
                ) : null}
                {showDelete ? (
                  <Button
                    type="button"
                    variant="destructive"
                    size={isCompact ? "sm" : "default"}
                    data-testid={`admin-entity-crud-dialog-delete--${slug}`}
                    onClick={onDelete}
                    disabled={deletePending || updateMutation.isPending}
                  >
                    {deletePending ? "Deleting…" : "Delete"}
                  </Button>
                ) : null}
              </div>
            ) : null}
            {showFooterCancel || showEditSubmit ? (
              <div
                className="flex flex-wrap items-center justify-end gap-2"
                data-testid={`admin-entity-crud-dialog-footer-actions--edit--${slug}`}
              >
                {showFooterCancel ? (
                  <Button
                    type="button"
                    variant="outline"
                    size={isCompact ? "sm" : "default"}
                    data-testid={`admin-entity-crud-dialog-cancel--${slug}`}
                    onClick={onCancel}
                    disabled={updateMutation.isPending}
                  >
                    {effectiveViewOnly ? "Close" : "Cancel"}
                  </Button>
                ) : null}
                {showEditSubmit ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size={isCompact ? "sm" : "default"}
                      disabled={updateMutation.isPending || formBodyInteractionsLocked}
                      data-testid={`admin-entity-edit-save-and-close--${slug}`}
                      onMouseDown={() => {
                        pendingPatchAfterSuccessRef.current = "close"
                      }}
                      onClick={() => {
                        void form.handleSubmit()
                      }}
                    >
                      {updateMutation.isPending ? "Saving…" : "Save & Close"}
                    </Button>
                    <Button
                      type="submit"
                      size={isCompact ? "sm" : "default"}
                      disabled={updateMutation.isPending || formBodyInteractionsLocked}
                      data-testid={`admin-entity-edit-submit--${slug}`}
                      onMouseDown={() => {
                        pendingPatchAfterSuccessRef.current = "keepOpen"
                      }}
                    >
                      {updateMutation.isPending ? "Saving…" : "Save changes"}
                    </Button>
                  </>
                ) : null}
              </div>
            ) : null}
          </DialogFooter>
        )
      })()}
    </form>
  )
}
